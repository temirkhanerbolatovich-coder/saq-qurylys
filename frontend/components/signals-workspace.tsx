"use client";

import { PdfDownload } from "@/components/pdf-download";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ApiError, api, command, date } from "@/lib/api";
import { statusLabel } from "@/lib/status-labels";
import { factorLabels } from "@/lib/presentation";
import type {
  Job,
  Page,
  Property,
  PropertyDetail,
  Signal,
  SignalDetail,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { PropertyPicker } from "@/components/property-picker";
import { mechanismLabels } from "@/components/legal-basis-review";
import { useReviewDraft } from "@/lib/use-review-draft";
import {
  Auth,
  Demo,
  LoadState,
  Notice,
  PageTitle,
  RiskSummary,
  useData,
  Zone,
} from "@/components/workspace";

const stateLabels: Record<Signal["state"], string> = {
  DRAFT: "Ожидает решения",
  CONFIRMED: "Подтверждён аналитиком",
  RETURNED: "Возвращён на доработку",
};

/** Resolve only names absent from the initial registry page, bounded by the signal page. */
function useSignalPropertyNames(signals: Signal[], registry: Property[]) {
  const [names, setNames] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState({ ids: "", message: "" });
  const [attempt, setAttempt] = useState(0);
  const ids = [...new Set(signals.map((signal) => signal.property_id))]
    .filter((id) => !names[id] && !registry.some((row) => row.id === id))
    .sort()
    .join(",");
  useEffect(() => {
    if (!ids) return;
    const controller = new AbortController();
    Promise.all(
      ids.split(",").map((id) =>
        api<PropertyDetail>(`/properties/${id}`, {
          signal: controller.signal,
        }),
      ),
    )
      .then((rows) => {
        if (!controller.signal.aborted)
          setNames((previous) => ({
            ...previous,
            ...Object.fromEntries(
              rows.map((row) => [row.property.id, row.property.name]),
            ),
          }));
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setFailure({ ids, message: error.message });
      });
    return () => controller.abort();
  }, [ids, attempt]);
  return {
    names,
    error: failure.ids === ids ? failure.message : "",
    retry: () => setAttempt((value) => value + 1),
  };
}
const pdfLabels: Record<Signal["pdf_state"], string> = {
  NOT_REQUESTED: "PDF ещё не запрошен",
  QUEUED: "PDF готовится",
  READY: "PDF готов",
  FAILED: "Генерация PDF завершилась ошибкой",
};

function signalVersionUrl(search: string, signalId: string) {
  const next = new URLSearchParams(search);
  next.set("signal_id", signalId);
  return `/signals?${next.toString()}`;
}

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
      <Button
        onClick={create}
        disabled={busy}
        aria-busy={busy}
        variant="outline"
      >
        {busy ? "Создание снимка…" : "Создать черновик сигнала"}
      </Button>
      {error && <Notice error={error} />}
    </div>
  );
}

export function SignalsView() {
  const params = useSearchParams();
  const router = useRouter();

  const state = params.get("state") || "";
  const stale = params.get("is_stale") || "";
  const propertyId = params.get("property_id") || "";
  const search = params.get("q") || "";

  const requestedPage = Number(params.get("page") || 1);

  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const registry = useData<Page<Property>>("/properties?page_size=100");

  const query = new URLSearchParams({
    page: String(page),
    page_size: "25",
  });

  if (state) query.set("state", state);
  if (stale) query.set("is_stale", stale);
  if (propertyId) query.set("property_id", propertyId);
  if (search.trim()) query.set("q", search.trim());

  const queuePath = `/signals?${query}`;
  const queue = useData<Page<Signal>>(queuePath);

  // Не показываем предыдущую очередь, пока загружается результат нового фильтра.
  const queueError = queue.resolvedPath === queuePath ? queue.error : "";

  const queueData =
    queue.resolvedPath === queuePath && !queueError ? queue.data : null;

  const propertyNames = useSignalPropertyNames(
    queueData?.items ?? [],
    registry.data?.items ?? [],
  );
  function propertyName(id: string) {
    return (
      registry.data?.items.find((row) => row.id === id)?.name ||
      propertyNames.names[id] ||
      `Объект ${id}`
    );
  }

  const [queueSearch, setQueueSearch] = useState(search);
  useEffect(() => setQueueSearch(search), [search]);
  const [filtersOpen, setFiltersOpen] = useState(Boolean(stale || propertyId));

  const firstFilter = useRef<HTMLSelectElement>(null);
  const detailPanel = useRef<HTMLDivElement>(null);
  const focusRequested = useRef(false);

  const activeFilterCount = [state, stale, propertyId].filter(Boolean).length;

  const id = params.get("signal_id") || queueData?.items[0]?.id;

  function searchQueue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams(params);
    const value = queueSearch.trim();
    if (value) next.set("q", value);
    else next.delete("q");
    next.delete("page");
    // Keep the open historical version independent of the search result.
    if (id) next.set("signal_id", id);
    setQueueSearch(value);
    router.push(`/signals?${next.toString()}`, { scroll: false });
  }

  const focusDetail = useCallback(() => {
    detailPanel.current?.focus({ preventScroll: true });
    detailPanel.current?.scrollIntoView({ block: "start" });
  }, []);

  useEffect(() => {
    if (!focusRequested.current) return;

    const frame = requestAnimationFrame(() => {
      focusDetail();
      focusRequested.current = false;
    });

    return () => cancelAnimationFrame(frame);
  }, [id, focusDetail]);

  function filter(name: string, value: string) {
    const next = new URLSearchParams(params);

    if (value) next.set(name, value);
    else next.delete(name);

    if (name !== "page") next.delete("page");

    if (name === "page" && id) next.set("signal_id", id);
    else next.delete("signal_id");

    router.push(`/signals?${next.toString()}`, { scroll: false });
  }

  function resetFilters() {
    const next = new URLSearchParams(params);

    for (const name of [
      "state",
      "is_stale",
      "property_id",
      "page",
      "signal_id",
      "q",
    ]) {
      next.delete(name);
    }

    // Открываем дополнительные фильтры, чтобы фокус попал на доступный элемент.
    setFiltersOpen(true);
    setQueueSearch("");

    router.push(`/signals?${next.toString()}`, { scroll: false });

    requestAnimationFrame(() => firstFilter.current?.focus());
  }

  const currentItems = queueData?.items ?? [];

  const draftsCount = currentItems.filter(
    (signal) => signal.state === "DRAFT",
  ).length;

  const staleCount = currentItems.filter((signal) => signal.is_stale).length;

  return (
    <>
      <PageTitle
        eyebrow="СИГНАЛЫ"
        title="Сигналы для проверки"
        description="Изучайте сохранённые факты, проверяйте версии и фиксируйте решение аналитика. Сигнал помогает организовать проверку, но не устанавливает нарушение. Передачи в ведомства нет."
        action={false}
      />

      <section className="signals-guide" aria-labelledby="signals-guide-title">
        <div className="signals-guide-heading">
          <p className="eyebrow">КАК ПОЛЬЗОВАТЬСЯ</p>
          <h2 id="signals-guide-title">Три шага до понятного результата</h2>
        </div>
        <ol>
          <li>
            <span>1</span>
            <div>
              <strong>Выберите сигнал</strong>
              <small>Нужный объект и версия находятся в списке.</small>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>Проверьте факты</strong>
              <small>Факторы, документы и исходники сохранены в снимке.</small>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>Откройте решение</strong>
              <small>Аналитик обосновывает решение, затем доступен PDF.</small>
            </div>
          </li>
        </ol>
      </section>

      <section className="signals-summary" aria-label="Сводка сигналов">
        <article className="signals-summary-card">
          <span className="signals-summary-card__label">Всего сигналов</span>
          <strong className="signals-summary-card__value">
            {queueData ? queueData.total : "—"}
          </strong>
          <small>По выбранным фильтрам</small>
        </article>

        <article className="signals-summary-card">
          <span className="signals-summary-card__label">Ожидают решения</span>
          <strong className="signals-summary-card__value">
            {queueData ? draftsCount : "—"}
          </strong>
          <small>На текущей странице</small>
        </article>

        <article className="signals-summary-card">
          <span className="signals-summary-card__label">Устаревшие версии</span>
          <strong className="signals-summary-card__value">
            {queueData ? staleCount : "—"}
          </strong>
          <small>На текущей странице</small>
        </article>

        <article className="signals-summary-card">
          <span className="signals-summary-card__label">Объекты в реестре</span>
          <strong className="signals-summary-card__value">
            {registry.data ? registry.data.total : "—"}
          </strong>
          <small>Доступные объекты</small>
        </article>
      </section>

      {id && (
        <a className="text-link signals-selected-link" href="#selected-signal">
          Перейти к открытому сигналу
        </a>
      )}

      <div className="signals-layout">
        <section className="panel padded signals-queue">
          <div className="queue-heading">
            <div>
              <p className="eyebrow">СПИСОК</p>
              <h2>Сигналы</h2>
            </div>

            {queueData && (
              <span className="queue-count" aria-label="Количество сигналов">
                {queueData.total}
              </span>
            )}
          </div>

          <p className="queue-intro">
            Найдите нужный объект, выберите версию и откройте её детали. Фильтры
            и страница сохраняются в ссылке.
          </p>

          <div
            className="signals-primary-filters"
            aria-label="Поиск и основные фильтры"
          >
            <form className="signals-queue-search" onSubmit={searchQueue}>
              <label htmlFor="signal-search">Поиск по всем сигналам</label>
              <input
                id="signal-search"
                type="search"
                maxLength={300}
                value={queueSearch}
                onChange={(event) => setQueueSearch(event.target.value)}
                placeholder="Объект, ID сигнала, версия или статус"
                autoComplete="off"
                aria-describedby="signal-search-help"
              />
              <Button type="submit" variant="outline">
                Найти сигналы
              </Button>
            </form>
            <p id="signal-search-help" className="field-help">
              По текущему и сохранённому названию объекта, ID, версии и статусу.
              Нажмите «Найти сигналы» или Enter. Поиск и фильтры применяются ко
              всей очереди; выбранный снимок остаётся открытым.
            </p>

            <label htmlFor="signal-state">Статус сигнала</label>

            <select
              id="signal-state"
              value={state}
              onChange={(event) => filter("state", event.target.value)}
            >
              <option value="">Все статусы</option>

              {Object.entries(stateLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>

            <div className="signals-filter-actions">
              <details
                className="signals-extra-filters"
                open={filtersOpen || Boolean(stale || propertyId)}
                onToggle={(event) => setFiltersOpen(event.currentTarget.open)}
              >
                <summary>
                  <span>Дополнительные фильтры</span>

                  {activeFilterCount > 0 && (
                    <span className="queue-count">{activeFilterCount}</span>
                  )}
                </summary>

                <div className="signals-extra-filters__content">
                  <PropertyPicker
                    mode="filter"
                    selectRef={firstFilter}
                    value={propertyId}
                    onChange={(value) => filter("property_id", value)}
                  />

                  <label htmlFor="signal-stale">Актуальность сигнала</label>

                  <select
                    id="signal-stale"
                    value={stale}
                    onChange={(event) => filter("is_stale", event.target.value)}
                  >
                    <option value="">Все версии</option>
                    <option value="false">Актуальные для решения</option>
                    <option value="true">Устаревшие</option>
                  </select>
                </div>
              </details>

              {(activeFilterCount > 0 || search || queueSearch) && (
                <Button variant="ghost" type="button" onClick={resetFilters}>
                  Сбросить фильтры сигналов
                </Button>
              )}
            </div>
          </div>

          {registry.error && <Notice error={registry.error} />}
          {propertyNames.error && (
            <div>
              <p className="notice" role="alert">
                Часть названий объектов не загружена: {propertyNames.error}
              </p>
              <Button variant="outline" onClick={propertyNames.retry}>
                Повторить загрузку названий
              </Button>
            </div>
          )}

          {queueError && <LoadState error={queueError} retry={queue.reload} />}

          {queueData ? (
            <>
              {queueData.items.length > 0 ? (
                <div className="candidate-list" aria-label="Очередь сигналов">
                  {queueData.items.map((signal) => {
                    return (
                      <article
                        className={`candidate signal-queue-item${
                          id === signal.id ? " is-selected" : ""
                        }`}
                        key={signal.id}
                      >
                        <div className="signal-queue-topline">
                          <span
                            className={`signal-state ${signal.state.toLowerCase()}`}
                          >
                            {stateLabels[signal.state]}
                          </span>

                          <Demo value={signal.is_demo} />
                        </div>

                        <h3>{propertyName(signal.property_id)}</h3>

                        <div className="signal-queue-meta">
                          <Zone risk={signal.risk_snapshot} />
                          <span>Версия {signal.version}</span>

                          {signal.is_stale && <span>Устарела</span>}
                        </div>

                        <small>Создан: {date(signal.created_at)}</small>

                        <Button
                          variant="outline"
                          onClick={() => {
                            focusRequested.current = true;

                            router.push(
                              signalVersionUrl(params.toString(), signal.id),
                              { scroll: false },
                            );

                            if (id === signal.id) {
                              requestAnimationFrame(focusDetail);
                              focusRequested.current = false;
                            }
                          }}
                          aria-pressed={id === signal.id}
                        >
                          Открыть версию {signal.version}
                        </Button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="notice">
                  {queueData.total > 0
                    ? "На этой странице сигналов нет. Вернитесь на предыдущую страницу."
                    : search.trim()
                      ? "По вашему запросу сигналов не найдено. Измените поиск или фильтры."
                      : "Сигналов по выбранным фильтрам нет. Черновик создаётся в карточке объекта после проверки материалов."}
                </p>
              )}

              <Pagination
                label="Страницы сигналов"
                page={page}
                pageSize={25}
                total={queueData.total}
                onPageChange={(nextPage) => filter("page", String(nextPage))}
              />
            </>
          ) : (
            !queueError && <p role="status">Загрузка сигналов…</p>
          )}
        </section>

        <div
          className="signals-detail"
          id="selected-signal"
          ref={detailPanel}
          tabIndex={-1}
        >
          {params.get("signal_id") &&
            queueData &&
            !queueData.items.some((signal) => signal.id === id) && (
              <p className="notice">
                Открыта версия по ссылке. Фильтры ограничивают очередь, а не
                сохранённый снимок этой версии.
              </p>
            )}

          {id && <SignalCard key={id} id={id} onChange={queue.reload} />}

          {!id && queueData && (
            <section className="panel padded signals-empty-detail">
              <p className="eyebrow">СИГНАЛ НЕ ВЫБРАН</p>

              <h2>Здесь откроются детали проверки</h2>

              <p>
                Если список пуст, сначала откройте объект и создайте черновик
                сигнала после проверки материалов.
              </p>

              <Button asChild>
                <Link href="/properties">Открыть реестр объектов</Link>
              </Button>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function SignalCard({ id, onChange }: { id: string; onChange: () => void }) {
  const params = useSearchParams();
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
  const draft = useReviewDraft(user?.id || "", `signal-decision:${id}`, {
    reason: "",
  });
  const { reason } = draft.values;
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
    if (result) {
      draft.saved();
      setMessage(
        action === "CONFIRM"
          ? "Сигнал подтверждён аналитиком. Решение сохранено."
          : "Сигнал возвращён на доработку. Для новых фактов создайте новую версию.",
      );
    }
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
      if (result) router.push(signalVersionUrl(params.toString(), result.id));
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

  const confirmedFactors = snapshot.factors.filter(
    (factor) => factor.status === "CONFIRMED",
  ).length;

  const nextStep = row.is_stale
    ? "Эта версия сохранена для истории. Для решения откройте более новую версию или создайте новый снимок из текущих фактов."
    : row.state === "DRAFT"
      ? writable
        ? "Проверьте факторы, документы и исходники. Затем добавьте понятное обоснование и сохраните решение."
        : "Сигнал ожидает решения аналитика. Вы можете изучить все сохранённые факты и версии."
      : row.state === "CONFIRMED"
        ? "Решение аналитика сохранено. Ниже можно проверить его обоснование и скачать PDF этой версии."
        : "Версия возвращена на доработку. Причина решения сохранена; новые факты оформляются новой версией.";

  return (
    <section className="panel padded signal-card" data-testid="signal-detail">
      <header className="signal-card-header">
        <div>
          <p className="eyebrow">СОХРАНЁННЫЙ СНИМОК</p>

          <h2>Сигнал · версия {row.version}</h2>

          <p className="signal-property-name">
            <Link href={`/properties/${row.property_id}`}>
              {snapshot.property.name}
            </Link>
          </p>
        </div>

        <div className="signal-card-actions">
          <Demo value={row.is_demo} />
          <Zone risk={row.risk_snapshot} />

          <Button variant="outline" onClick={reload} disabled={busy}>
            Обновить состояние сигнала
          </Button>
        </div>
      </header>
      <RiskSummary risk={row.risk_snapshot} />

      {detail.error && <Notice error={detail.error} />}
      {history.error && <Notice error={history.error} />}
      {error && <Notice error={error} />}

      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}

      <div className="signal-status-grid" aria-label="Краткая сводка сигнала">
        <div>
          <span>Статус</span>
          <strong>{stateLabels[row.state]}</strong>
        </div>

        <div>
          <span>Актуальность</span>
          <strong>
            {row.is_stale
              ? "Устарел для текущего решения"
              : "Актуальная версия риска"}
          </strong>
        </div>

        <div>
          <span>Факторы</span>
          <strong>
            {confirmedFactors} подтверждено из {snapshot.factors.length}
          </strong>
        </div>

        <div>
          <span>Создан</span>
          <strong>{date(row.created_at)}</strong>
        </div>
      </div>

      <div className="signal-next-step">
        <strong>Что делать сейчас</strong>
        <p>{nextStep}</p>
      </div>

      <p className="signal-legal-note">{snapshot.disclaimer}</p>

      {row.is_demo && (
        <p className="notice">
          DEMO: синтетические материалы и решения без юридической силы.
        </p>
      )}

      {row.is_stale && (
        <p className="notice">
          Факты изменились или появилась новая версия. Исторический снимок
          сохранён и не переписывается.
        </p>
      )}

      <nav className="signal-section-nav" aria-label="Разделы сигнала">
        <a href={`#signal-overview-${id}`}>Обзор</a>
        <a href={`#signal-facts-${id}`}>Факты</a>
        <a href={`#signal-decision-${id}`}>Решение</a>
        <a href={`#signal-output-${id}`}>PDF и версии</a>
      </nav>

      <section
        className="signal-section"
        id={`signal-overview-${id}`}
        tabIndex={-1}
      >
        <div className="signal-section-heading">
          <span>1</span>

          <div>
            <p className="eyebrow">ОБЗОР</p>
            <h3>Что важно знать</h3>
          </div>
        </div>

        {snapshot.unknown_information.length ? (
          <div className="signal-unknowns">
            <strong>Нужно уточнить</strong>

            <ul>
              {snapshot.unknown_information.map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="signal-complete-note">
            Отдельные пробелы в снимке не отмечены.
          </p>
        )}

        <p>
          Неподтверждённые коды:{" "}
          {row.risk_snapshot.unknown_codes.join(", ") || "нет"}. Зелёная зона не
          подтверждает безопасность объекта.
        </p>

        <details className="signal-disclosure signal-metadata">
          <summary>Служебные данные снимка</summary>

          <dl>
            <dt>Объект</dt>
            <dd>
              <Link href={`/properties/${row.property_id}`}>
                {snapshot.property.name}
              </Link>
            </dd>

            <dt>Адрес</dt>
            <dd>
              {snapshot.property.city} · {snapshot.property.address}
            </dd>

            <dt>Автор снимка</dt>
            <dd>{row.created_by.display_name}</dd>

            <dt>Риск рассчитан</dt>
            <dd>
              {date(row.risk_snapshot.as_of)} · ревизия{" "}
              {row.risk_snapshot.revision}
            </dd>

            <dt>Версия правил</dt>
            <dd>{row.risk_snapshot.rules_version}</dd>
          </dl>
        </details>
      </section>

      <section
        className="signal-section"
        id={`signal-facts-${id}`}
        tabIndex={-1}
      >
        <div className="signal-section-heading">
          <span>2</span>

          <div>
            <p className="eyebrow">ФАКТЫ</p>
            <h3>Проверяемые материалы</h3>
          </div>
        </div>

        <p className="signal-section-intro">
          Откройте каждую группу и сверьте основания решения. Эти данные
          относятся только к выбранной версии.
        </p>

        <details className="signal-disclosure">
          <summary>
            Факторы риска <span>{snapshot.factors.length}</span>
          </summary>

          <div className="signal-disclosure-content">
            {snapshot.factors.map((factor) => (
              <article
                className={`hypothesis snapshot-factor factor-${factor.status.toLowerCase()}`}
                key={factor.id}
              >
                <strong>
                  {factor.code} · {factorLabels[factor.code] || factor.code} ·{" "}
                  {statusLabel(factor.status)} ·{" "}
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
          </div>
        </details>

        <details className="signal-disclosure">
          <summary>
            Правовые основания <span>{snapshot.legal_bases.length}</span>
          </summary>

          <div className="signal-disclosure-content">
            {snapshot.legal_bases.map((basis) => (
              <article className="hypothesis" key={basis.id}>
                <strong>
                  {basis.issuer} · {statusLabel(basis.verification_status)}
                </strong>

                <p>
                  {basis.document_number || "Номер не указан"} ·{" "}
                  {basis.document_date || "Дата не установлена"}
                </p>

                <p>Область: {basis.scope_description}</p>

                <a
                  className="text-link"
                  href={`/api/v1/assets/${basis.asset_id}`}
                >
                  Исходный документ основания
                </a>
                <PdfDownload
                  kind="assets"
                  id={basis.asset_id}
                  label="Источник в PDF"
                />
              </article>
            ))}

            {!snapshot.legal_bases.length && (
              <p>
                Документы об основании не зафиксированы. Это не подтверждает
                отсутствие.
              </p>
            )}
          </div>
        </details>

        <details className="signal-disclosure">
          <summary>
            Доказательства и исходники <span>{snapshot.evidence.length}</span>
          </summary>

          <div className="signal-disclosure-content">
            {snapshot.evidence.map((evidence) => {
              const asset = snapshot.assets.find(
                (item) => item.id === evidence.asset_id,
              );

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

                  {evidence.methodology && (
                    <p>Методика: {evidence.methodology}</p>
                  )}

                  {evidence.absence_as_of && (
                    <p>
                      Отсутствие проверено на дату:{" "}
                      {date(evidence.absence_as_of)}
                    </p>
                  )}

                  {evidence.scope_description && (
                    <p>Область: {evidence.scope_description}</p>
                  )}

                  {evidence.legal_checks?.map((check) => (
                    <p key={check.mechanism}>
                      {mechanismLabels[check.mechanism] || check.mechanism} ·{" "}
                      {statusLabel(check.result)}: {check.reason}
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
                    <PdfDownload
                      kind="assets"
                      id={evidence.asset_id}
                      label="Источник в PDF"
                    />

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

            {!snapshot.evidence.length && (
              <p>Доказательства в снимке отсутствуют.</p>
            )}
          </div>
        </details>
      </section>

      <section
        className="signal-section signal-decision-section"
        id={`signal-decision-${id}`}
        tabIndex={-1}
      >
        <div className="signal-section-heading">
          <span>3</span>

          <div>
            <p className="eyebrow">РЕШЕНИЕ</p>
            <h3>Решение по этой версии</h3>
          </div>
        </div>

        {decisions.map((decision) => (
          <article className="signal-saved-decision" key={decision.id}>
            <strong>
              {decision.action === "CONFIRM"
                ? "Сигнал подтверждён аналитиком. Решение сохранено."
                : "Сигнал возвращён на доработку. Решение сохранено."}
            </strong>

            <small>
              {decision.actor.display_name} · {date(decision.decided_at)}
            </small>

            <p>{decision.reason}</p>
          </article>
        ))}

        {writable && row.state === "DRAFT" && (
          <div className="review-form signal-decision-form">
            <label htmlFor="signal-reason">
              Обоснование решения по сигналу
            </label>

            <textarea
              id="signal-reason"
              maxLength={2000}
              value={reason}
              onChange={(event) => draft.update({ reason: event.target.value })}
              rows={4}
              aria-describedby="signal-reason-help"
            />

            <p id="signal-reason-help">
              Кратко укажите, какие материалы проверены и почему выбрано это
              решение. Черновик привязан к вашему пользователю и этой версии
              сигнала, сохраняется при переходах, перезагрузке и конфликте. При
              изменении фактов нужен новый снимок.
            </p>
            {draft.restored && (
              <p className="notice" role="status">
                Черновик причины восстановлен. Решение ещё не отправлено.
              </p>
            )}
            {draft.storageError && (
              <p className="notice" role="status">
                {draft.storageError}
              </p>
            )}

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
      </section>

      <section
        className="signal-section"
        id={`signal-output-${id}`}
        tabIndex={-1}
      >
        <div className="signal-section-heading">
          <span>4</span>

          <div>
            <p className="eyebrow">РЕЗУЛЬТАТ</p>
            <h3>PDF и версии</h3>
          </div>
        </div>

        <div className="signal-output-grid">
          <div
            className="signal-output-card"
            id={`signal-pdf-${id}`}
            tabIndex={-1}
          >
            <h4>PDF этой версии</h4>
            {row.pdf_state !== "READY" && (
              <PdfDownload
                kind="signals"
                id={id}
                label="Скачать копию снимка"
              />
            )}

            <p role={row.pdf_state === "QUEUED" ? "status" : undefined}>
              {pdfLabels[row.pdf_state]}
            </p>

            {row.pdf_state === "READY" ? (
              <a className="text-link" href={`/api/v1/signals/${id}/pdf`}>
                Скачать PDF этой версии
              </a>
            ) : writable &&
              ["NOT_REQUESTED", "FAILED"].includes(row.pdf_state) ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => mutate<Job>(`/signals/${id}/pdf`, undefined)}
              >
                {row.pdf_state === "FAILED"
                  ? "Повторить генерацию PDF"
                  : "Сформировать и сохранить PDF"}
              </Button>
            ) : null}

            <small>
              PDF хранит снимок и решение этой версии. Поздние изменения его не
              переписывают.
            </small>
            {row.pdf_state !== "READY" && (
              <p className="field-help">
                «Скачать копию снимка» выдаёт файл без сохранения в системе.
                Формирование PDF сохраняет файл этой версии в архиве.
              </p>
            )}
          </div>

          <div
            className="signal-output-card signal-version-list"
            id={`signal-history-${id}`}
            tabIndex={-1}
          >
            <h4>История объекта</h4>

            {writable && latest && (
              <Button variant="outline" disabled={busy} onClick={nextVersion}>
                Создать новую версию из текущих фактов
              </Button>
            )}

            {row.previous_signal_id && (
              <Link
                className="text-link"
                href={signalVersionUrl(
                  params.toString(),
                  row.previous_signal_id,
                )}
              >
                Предыдущая версия
              </Link>
            )}

            <div className="signal-version-links">
              {history.data?.items.map((version) => (
                <p key={version.id}>
                  <Link
                    aria-current={version.id === id ? "page" : undefined}
                    href={signalVersionUrl(params.toString(), version.id)}
                  >
                    Версия {version.version}
                  </Link>{" "}
                  <small>
                    {stateLabels[version.state]}
                    {version.is_stale ? " · устарела" : ""} ·{" "}
                    {date(version.created_at)}
                  </small>
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
