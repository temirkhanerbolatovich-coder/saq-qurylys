"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useContext, useEffect, useRef, useState } from "react";
import { ApiError, api, command, date } from "@/lib/api";
import type {
  Job,
  Page,
  Property,
  PropertyDetail,
  Signal,
  SignalDetail,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Auth,
  Demo,
  LoadState,
  Notice,
  PageTitle,
  useData,
  Zone,
} from "@/components/workspace";

const stateLabels: Record<Signal["state"], string> = {
  DRAFT: "Ожидает решения",
  CONFIRMED: "Подтверждён аналитиком",
  RETURNED: "Возвращён на доработку",
};
const pdfLabels: Record<Signal["pdf_state"], string> = {
  NOT_REQUESTED: "PDF ещё не запрошен",
  QUEUED: "PDF готовится",
  READY: "PDF готов",
  FAILED: "Генерация PDF завершилась ошибкой",
};

// A failed network response can be retried with the same command key.
function useCommandKey() {
  const current = useRef<{ payload: string; value: string } | null>(null);
  return {
    forPayload(path: string, body: unknown) {
      const payload = JSON.stringify({ path, body });
      if (current.current?.payload !== payload)
        current.current = { payload, value: crypto.randomUUID() };
      return current.current.value;
    },
    clear() {
      current.current = null;
    },
  };
}

export function CreateSignalButton({
  property,
  onChange,
}: {
  property: Property;
  onChange?: () => void;
}) {
  const { user } = useContext(Auth);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const key = useCommandKey();
  const pending = useRef<{
    property_id: string;
    expected_risk_revision: number;
    previous_signal_id: string | null;
  } | null>(null);
  if (user?.role !== "analyst") return null;
  async function create() {
    setBusy(true);
    setError("");
    try {
      const path = "/signals";
      if (
        !pending.current ||
        pending.current.property_id !== property.id ||
        pending.current.expected_risk_revision !== property.risk.revision
      ) {
        const previous = await api<Page<Signal>>(
          `/signals?property_id=${property.id}&page_size=1`,
        );
        pending.current = {
          property_id: property.id,
          expected_risk_revision: property.risk.revision,
          previous_signal_id: previous.items[0]?.id || null,
        };
      }
      const body = pending.current;
      const signal = await command<Signal>(
        path,
        body,
        key.forPayload(path, body),
      );
      key.clear();
      pending.current = null;
      router.push(`/signals?signal_id=${signal.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        pending.current = null;
        onChange?.();
      }
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <Button onClick={create} disabled={busy} variant="outline">
        {busy ? "Создание снимка…" : "Создать черновик сигнала"}
      </Button>
      {error && <Notice error={error} />}
    </div>
  );
}

export function SignalsView() {
  const params = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState(params.get("state") || "");
  const [stale, setStale] = useState(params.get("is_stale") || "");
  const [propertyId, setPropertyId] = useState(params.get("property_id") || "");
  const [page, setPage] = useState(1);
  const registry = useData<Page<Property>>("/properties?page_size=100");
  const query = new URLSearchParams({ page: String(page), page_size: "25" });
  if (state) query.set("state", state);
  if (stale) query.set("is_stale", stale);
  if (propertyId) query.set("property_id", propertyId);
  const queue = useData<Page<Signal>>(`/signals?${query}`);
  const id = params.get("signal_id") || queue.data?.items[0]?.id;
  function filter(change: () => void) {
    change();
    setPage(1);
    router.replace("/signals", { scroll: false });
  }
  return (
    <>
      <PageTitle
        eyebrow="ПРОВЕРЯЕМЫЕ СИГНАЛЫ"
        title="Сигналы"
        description="Неизменяемый снимок фактов, отдельное решение аналитика и PDF конкретной версии. Передачи в ведомства нет."
        action={false}
      />
      <section className="panel padded">
        <div className="review-form">
          <label htmlFor="signal-property">Объект сигнала</label>
          <select
            id="signal-property"
            value={propertyId}
            onChange={(e) => filter(() => setPropertyId(e.target.value))}
          >
            <option value="">Все объекты</option>
            {registry.data?.items.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <label htmlFor="signal-state">Статус сигнала</label>
          <select
            id="signal-state"
            value={state}
            onChange={(e) => filter(() => setState(e.target.value))}
          >
            <option value="">Все статусы</option>
            {Object.entries(stateLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
          <label htmlFor="signal-stale">Актуальность сигнала</label>
          <select
            id="signal-stale"
            value={stale}
            onChange={(e) => filter(() => setStale(e.target.value))}
          >
            <option value="">Все версии</option>
            <option value="false">Актуальные для решения</option>
            <option value="true">Устаревшие</option>
          </select>
        </div>
        {registry.error && <Notice error={registry.error} />}
        {queue.error && <LoadState error={queue.error} retry={queue.reload} />}
        {queue.data ? (
          <>
            <p>Найдено сигналов: {queue.data.total}</p>
            {queue.data.items.length ? (
              <div className="candidate-list" aria-label="Очередь сигналов">
                {queue.data.items.map((signal) => (
                  <article className="candidate" key={signal.id}>
                    <Demo value={signal.is_demo} />
                    <p>
                      {registry.data?.items.find(
                        (property) => property.id === signal.property_id,
                      )?.name || "Объект"}
                    </p>
                    <Zone risk={signal.risk_snapshot} />
                    <p>
                      Версия {signal.version} · {stateLabels[signal.state]}
                      {signal.is_stale ? " · Устарел" : ""}
                    </p>
                    <small>{date(signal.created_at)}</small>
                    <Button
                      variant="outline"
                      onClick={() =>
                        router.push(`/signals?signal_id=${signal.id}`, {
                          scroll: false,
                        })
                      }
                      aria-pressed={id === signal.id}
                    >
                      Открыть версию {signal.version}
                    </Button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="notice">
                Сигналов по выбранным фильтрам нет. Черновик создаётся в
                карточке объекта после проверки материалов.
              </p>
            )}
            <div className="review-actions">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Предыдущая страница
              </Button>
              <Button
                variant="outline"
                disabled={page * 25 >= queue.data.total}
                onClick={() => setPage(page + 1)}
              >
                Следующая страница
              </Button>
            </div>
          </>
        ) : (
          !queue.error && <p role="status">Загрузка сигналов…</p>
        )}
      </section>
      {id && <SignalCard key={id} id={id} onChange={queue.reload} />}
    </>
  );
}

function SignalCard({ id, onChange }: { id: string; onChange: () => void }) {
  const { user } = useContext(Auth);
  const writable = user?.role === "analyst";
  const router = useRouter();
  const detail = useData<SignalDetail>(`/signals/${id}`);
  const signal = detail.data?.signal;
  const history = useData<Page<Signal>>(
    signal
      ? `/signals?property_id=${signal.property_id}&page_size=100`
      : "/signals?page_size=1",
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const key = useCommandKey();
  const refreshDetail = useRef(detail.reload);
  useEffect(() => {
    refreshDetail.current = detail.reload;
  }, [detail.reload]);
  function reload() {
    detail.reload();
    history.reload();
    onChange();
  }
  async function mutate<T>(path: string, body: unknown): Promise<T | null> {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await command<T>(path, body, key.forPayload(path, body));
      key.clear();
      reload();
      return result;
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) reload();
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function decide(action: "CONFIRM" | "RETURN") {
    if (!signal) return;
    const result = await mutate<SignalDetail>(`/signals/${id}/decision`, {
      expected_revision: signal.revision,
      expected_risk_revision: signal.risk_snapshot.revision,
      action,
      reason: reason.trim(),
    });
    if (result)
      setMessage(
        action === "CONFIRM"
          ? "Сигнал подтверждён аналитиком. Решение сохранено."
          : "Сигнал возвращён на доработку. Для новых фактов создайте новую версию.",
      );
  }
  async function nextVersion() {
    if (!signal) return;
    setBusy(true);
    setError("");
    try {
      const current = await api<PropertyDetail>(
        `/properties/${signal.property_id}`,
      );
      const result = await mutate<Signal>("/signals", {
        property_id: signal.property_id,
        previous_signal_id: id,
        expected_risk_revision: current.property.risk.revision,
      });
      if (result) router.push(`/signals?signal_id=${result.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (signal?.pdf_state !== "QUEUED") return;
    let cancelled = false;
    const poll = async () => {
      try {
        if (signal.pdf_job_id) {
          const job = await api<Job>(`/analysis-jobs/${signal.pdf_job_id}`);
          if (!cancelled && ["FAILED", "BLOCKED"].includes(job.state))
            setError(job.error?.error?.message || "PDF не удалось подготовить");
        }
        if (!cancelled) refreshDetail.current();
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };
    const timer = setInterval(poll, 2000);
    void poll();
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // Reload retains the selected version and the analyst's reason.
  }, [signal?.pdf_state, signal?.pdf_job_id]);
  if (!detail.data)
    return <LoadState error={detail.error} retry={detail.reload} />;
  const { snapshot, decisions } = detail.data;
  const row = detail.data.signal;
  const latest =
    !history.data || !history.data.items.some((s) => s.version > row.version);
  return (
    <section className="panel padded" data-testid="signal-detail">
      <div className="review-toolbar">
        <h2>Сигнал · версия {row.version}</h2>
        <Demo value={row.is_demo} />
        <Zone risk={row.risk_snapshot} />
      </div>
      <p className="notice">{snapshot.disclaimer}</p>
      {row.is_demo && (
        <p className="notice">
          DEMO: синтетические материалы и решения без юридической силы.
        </p>
      )}
      <p>
        <strong>{stateLabels[row.state]}</strong>
        {row.is_stale
          ? " · Устарел для текущего решения"
          : " · Актуальная версия риска"}
      </p>
      {row.is_stale && (
        <p className="notice">
          Факты изменились или появилась новая версия. Исторический снимок
          сохранён. Подтверждение этого снимка недоступно.
        </p>
      )}
      <dl>
        <dt>Объект в снимке</dt>
        <dd>
          <Link href={`/properties/${row.property_id}`}>
            {snapshot.property.name}
          </Link>
        </dd>
        <dt>Адрес в снимке</dt>
        <dd>
          {snapshot.property.city} · {snapshot.property.address}
        </dd>
        <dt>Создан</dt>
        <dd>
          {date(row.created_at)} · {row.created_by.display_name}
        </dd>
        <dt>Риск рассчитан</dt>
        <dd>
          {date(row.risk_snapshot.as_of)} · ревизия {row.risk_snapshot.revision}
        </dd>
        <dt>Версия правил</dt>
        <dd>{row.risk_snapshot.rules_version}</dd>
      </dl>
      {detail.error && <Notice error={detail.error} />}
      {history.error && <Notice error={history.error} />}
      {error && <Notice error={error} />}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <Button variant="outline" onClick={reload}>
        Обновить состояние сигнала
      </Button>
      <h3>Неизвестная информация в снимке</h3>
      {snapshot.unknown_information.length ? (
        <ul>
          {snapshot.unknown_information.map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      ) : (
        <p>Отдельные пробелы в снимке не отмечены.</p>
      )}
      <p>
        Неподтверждённые коды:{" "}
        {row.risk_snapshot.unknown_codes.join(", ") || "нет"}. Зелёная зона не
        подтверждает безопасность объекта.
      </p>
      <h3>Факторы в снимке</h3>
      {snapshot.factors.map((factor) => (
        <article className="hypothesis" key={factor.id}>
          <strong>
            {factor.code} · {factor.status} ·{" "}
            {factor.status === "CONFIRMED" ? `+${factor.weight}` : "0"}
          </strong>
          <p>
            Дата оценки: {date(factor.as_of)} · ревизия {factor.revision}
          </p>
          <p>{factor.reason || "Обоснование не указано"}</p>
          <p>Доказательств в снимке: {factor.evidence_ids.length}</p>
        </article>
      ))}
      {!snapshot.factors.length && <p>Факторы не зафиксированы.</p>}
      <h3>Основания в снимке</h3>
      {snapshot.legal_bases.map((basis) => (
        <article className="hypothesis" key={basis.id}>
          <strong>
            {basis.issuer} · {basis.verification_status}
          </strong>
          <p>
            {basis.document_number || "Номер не указан"} ·{" "}
            {basis.document_date || "Дата не установлена"}
          </p>
          <p>Область: {basis.scope_description}</p>
          <a className="text-link" href={`/api/v1/assets/${basis.asset_id}`}>
            Исходный документ основания
          </a>
        </article>
      ))}
      {!snapshot.legal_bases.length && (
        <p>
          Документы об основании не зафиксированы. Это не подтверждает
          отсутствие.
        </p>
      )}
      <h3>Доказательства и происхождение в снимке</h3>
      {snapshot.evidence.map((evidence) => {
        const asset = snapshot.assets.find((a) => a.id === evidence.asset_id);
        return (
          <article className="hypothesis" key={evidence.id}>
            <Demo value={evidence.is_demo} />
            <strong>{evidence.source_label}</strong>
            <p>{evidence.description}</p>
            <p>
              Событие: {date(evidence.event_at || null)} · получено:{" "}
              {date(evidence.captured_at)}
            </p>
            {evidence.fragment?.quote && (
              <blockquote>{evidence.fragment.quote}</blockquote>
            )}
            {evidence.methodology && <p>Методика: {evidence.methodology}</p>}
            {evidence.absence_as_of && (
              <p>
                Отсутствие проверено на дату: {date(evidence.absence_as_of)}
              </p>
            )}
            {evidence.scope_description && (
              <p>Область: {evidence.scope_description}</p>
            )}
            {evidence.legal_checks?.map((check) => (
              <p key={check.mechanism}>
                {check.mechanism} · {check.result}: {check.reason}
              </p>
            ))}
            {asset && (
              <p style={{ overflowWrap: "anywhere" }}>
                SHA-256: {asset.sha256} · {asset.byte_size} байт
              </p>
            )}
            <div className="review-actions">
              <a
                className="text-link"
                href={`/api/v1/assets/${evidence.asset_id}`}
              >
                Сохранённый исходник
              </a>
              {evidence.source_url && (
                <a
                  className="text-link"
                  href={evidence.source_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ссылка на источник
                </a>
              )}
              {evidence.advertisement_id && (
                <Link
                  className="text-link"
                  href={`/advertisements/${evidence.advertisement_id}`}
                >
                  Текущая карточка публикации
                </Link>
              )}
            </div>
          </article>
        );
      })}
      {!snapshot.evidence.length && <p>Доказательства в снимке отсутствуют.</p>}
      <h3>Решение аналитика</h3>
      {decisions.map((decision) => (
        <article className="hypothesis" key={decision.id}>
          <strong>
            {decision.action === "CONFIRM" ? "Подтверждение" : "Возврат"} ·{" "}
            {decision.actor.display_name}
          </strong>
          <p>{date(decision.decided_at)}</p>
          <p>{decision.reason}</p>
        </article>
      ))}
      {writable && row.state === "DRAFT" && (
        <div className="review-form">
          <label htmlFor="signal-reason">Обоснование решения по сигналу</label>
          <textarea
            id="signal-reason"
            maxLength={2000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
          <p>
            Причина сохраняется при обновлении и конфликте версий. При изменении
            фактов нужен новый снимок.
          </p>
          <div className="review-actions">
            <Button
              disabled={
                busy || row.is_stale || !reason.trim() || !!detail.error
              }
              onClick={() => decide("CONFIRM")}
            >
              Подтвердить сигнал
            </Button>
            <Button
              variant="outline"
              disabled={
                busy || row.is_stale || !reason.trim() || !!detail.error
              }
              onClick={() => decide("RETURN")}
            >
              Вернуть на доработку
            </Button>
          </div>
        </div>
      )}
      {!writable && (
        <p className="notice">
          Режим просмотра: решения и новые версии доступны аналитику.
        </p>
      )}
      {writable && latest && (
        <Button variant="outline" disabled={busy} onClick={nextVersion}>
          Создать новую версию из текущих фактов
        </Button>
      )}
      <h3>PDF этой версии</h3>
      <p role={row.pdf_state === "QUEUED" ? "status" : undefined}>
        {pdfLabels[row.pdf_state]}
      </p>
      {row.pdf_state === "READY" ? (
        <a className="text-link" href={`/api/v1/signals/${id}/pdf`}>
          Скачать PDF этой версии
        </a>
      ) : writable && ["NOT_REQUESTED", "FAILED"].includes(row.pdf_state) ? (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => mutate<Job>(`/signals/${id}/pdf`, undefined)}
        >
          {row.pdf_state === "FAILED"
            ? "Повторить генерацию PDF"
            : "Подготовить PDF"}
        </Button>
      ) : null}
      <p>
        PDF содержит сохранённый снимок и решение этой версии. Изменения объекта
        не переписывают его прошлое содержимое.
      </p>
      <h3>История версий объекта</h3>
      {row.previous_signal_id && (
        <Link
          className="text-link"
          href={`/signals?signal_id=${row.previous_signal_id}`}
        >
          Предыдущая версия
        </Link>
      )}
      {history.data?.items.map((version) => (
        <p key={version.id}>
          <Link href={`/signals?signal_id=${version.id}`}>
            Версия {version.version}
          </Link>{" "}
          · {stateLabels[version.state]}
          {version.is_stale ? " · устарела" : ""} · {date(version.created_at)}
        </p>
      ))}
    </section>
  );
}
