"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, command, date } from "@/lib/api";
import { statusLabel } from "@/lib/status-labels";
import {
  reviewCommandFingerprint,
  useReviewDraft,
} from "@/lib/use-review-draft";
import type {
  AdvertisementReviewItem,
  AdvertisementReviewPage,
  PropertyDetail,
  ReviewAction,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Auth, Demo, LoadState, Notice, useData } from "@/components/workspace";

const actionLabels: Record<ReviewAction, string> = {
  REVIEW_HYPOTHESES: "Проверить гипотезы",
  REVIEW_MATCH: "Проверить привязку к объекту",
  CREATE_PAYMENT_EVIDENCE: "Сохранить доказательство оплаты",
  REVIEW_R2: "Проверить решение R2",
};
const actions = Object.keys(actionLabels) as ReviewAction[];
const sections: Record<string, string> = {
  hypotheses: "hypotheses",
  match: "match",
  factor: "factor",
};

/** Keeps queue controls mounted while the selected material takes priority. */
export function ReviewQueuePanel({
  label,
  selectedId,
  children,
}: {
  label: string;
  selectedId: string;
  children: ReactNode;
}) {
  return (
    <section className="panel review-queue" aria-label={label}>
      <details key={selectedId || "queue"} open={!selectedId}>
        <summary>
          {selectedId ? "Сменить материал · очередь и фильтры" : label}
        </summary>
        <div className="padded">{children}</div>
      </details>
    </section>
  );
}

/** Lists server-derived work; opening a target never submits a review command. */
export function RemainingReviewQueue({
  renderMaterial,
}: {
  renderMaterial: (id: string, onChange: () => void) => ReactNode;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("advertisement_id") || "";
  const rawAction = params.get("action") || "";
  const action = actions.includes(rawAction as ReviewAction) ? rawAction : "";
  const demo = ["true", "false"].includes(params.get("is_demo") || "")
    ? params.get("is_demo")!
    : "";
  const requestedPage = Number(params.get("page") || 1);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const pageSize = [10, 20, 50].includes(Number(params.get("page_size")))
    ? Number(params.get("page_size"))
    : 20;
  const query = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (action) query.set("action", action);
  if (demo) query.set("is_demo", demo);
  // A dossier may supply these server filters; preserve their precise semantics.
  for (const name of ["property_id", "from", "to"]) {
    const value = params.get(name);
    if (value) query.set(name, value);
  }
  const path = `/advertisements/review-queue?${query}`;
  const queue = useData<AdvertisementReviewPage>(path);
  const error = queue.resolvedPath === path ? queue.error : "";
  const data = queue.resolvedPath === path && !error ? queue.data : null;
  const selectedInQueue = data?.items.some(
    (item) => item.advertisement_id === id,
  );
  const section = params.get("review_section") || "";
  const requestedExtraction = params.get("review_extraction_id") || "";

  useEffect(() => {
    if (!id || !sections[section]) return;
    const targetId = `review-${sections[section]}-${id}`;
    // Selected material loads independently. Wait for its actual target to mount.
    const focusTarget = () => {
      const target = document.getElementById(targetId);
      if (!target) return false;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "start" });
      return true;
    };
    if (focusTarget()) return;
    const observer = new MutationObserver(() => {
      if (focusTarget()) observer.disconnect();
    });
    observer.observe(document.getElementById("main-content") || document.body, {
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [id, section, requestedExtraction]);

  function navigate(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== "page") next.delete("page");
    router.push(`/review?${next}`, { scroll: false });
  }
  function materialUrl(advertisementId: string, target?: string) {
    const next = new URLSearchParams(params);
    next.set("advertisement_id", advertisementId);
    next.delete("history_page");
    if (target) next.set("review_section", target);
    else next.delete("review_section");
    const item = data?.items.find(
      (row) => row.advertisement_id === advertisementId,
    );
    if (item) next.set("review_extraction_id", item.extraction_id);
    return `/review?${next}${target ? `#review-${target}-${advertisementId}` : ""}`;
  }
  function resetFilters() {
    const next = new URLSearchParams(params);
    for (const name of [
      "action",
      "is_demo",
      "property_id",
      "from",
      "to",
      "page",
    ])
      next.delete(name);
    router.push(`/review?${next}`, { scroll: false });
  }
  return (
    <>
      <ReviewQueuePanel label="Нерешённые действия материалов" selectedId={id}>
        <div className="review-toolbar">
          <h2>Материалы с нерешёнными действиями</h2>
          <Button variant="outline" onClick={queue.reload}>
            Обновить очередь решений
          </Button>
        </div>
        <p className="field-help">
          Завершение обработки не означает принятие решений. Здесь показаны
          задачи последнего анализа; оригиналы, ошибки и новый анализ доступны в
          «Состояниях обработки».
        </p>
        <div className="review-queue-filters">
          <div>
            <label htmlFor="review-action">Нерешённое действие</label>
            <select
              id="review-action"
              value={action}
              onChange={(event) => navigate("action", event.target.value)}
            >
              <option value="">Все действия</option>
              {actions.map((value) => (
                <option key={value} value={value}>
                  {actionLabels[value]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="review-demo">Режим материалов</label>
            <select
              id="review-demo"
              value={demo}
              onChange={(event) => navigate("is_demo", event.target.value)}
            >
              <option value="">DEMO и реальные</option>
              <option value="true">Только DEMO</option>
              <option value="false">Только реальные</option>
            </select>
          </div>
          <div>
            <label htmlFor="review-actions-page-size">
              Материалов с действиями на странице
            </label>
            <select
              id="review-actions-page-size"
              value={pageSize}
              onChange={(event) => navigate("page_size", event.target.value)}
            >
              {[10, 20, 50].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
        {params.get("property_id") && (
          <p className="field-help">
            Текущая подтверждённая привязка: {params.get("property_id")}.
            Непривязанные материалы не входят в этот фильтр.
          </p>
        )}
        {(params.get("from") || params.get("to")) && (
          <p className="field-help">
            Дата фиксации: от {params.get("from") || "не ограничена"}{" "}
            включительно до {params.get("to") || "не ограничена"} исключительно.
          </p>
        )}
        {(action ||
          demo ||
          params.get("property_id") ||
          params.get("from") ||
          params.get("to")) && (
          <Button variant="ghost" onClick={resetFilters}>
            Сбросить фильтры действий
          </Button>
        )}
        {!data ? (
          <LoadState error={error} retry={queue.reload} />
        ) : (
          <>
            <p role="status">
              Материалов с нерешёнными действиями: <strong>{data.total}</strong>
            </p>
            <details>
              <summary>
                Материалы по видам действий · весь отфильтрованный набор
              </summary>
              <ul>
                {actions.map((value) => (
                  <li key={value}>
                    {actionLabels[value]}: {data.action_totals[value]}
                  </li>
                ))}
              </ul>
              <p className="field-help">
                Один материал может иметь несколько действий. Эти числа нельзя
                складывать как количество материалов.
              </p>
            </details>
            <details
              key={id || "queue"}
              className="review-queue-materials"
              open
            >
              <summary>
                {id
                  ? "Выбрать другой материал с действиями"
                  : "Выберите материал с нерешёнными действиями"}{" "}
                · на странице {data.items.length}
              </summary>
              <ul className="review-queue-list">
                {data.items.map((item) => {
                  const ad = item.advertisement;
                  return (
                    <li key={item.advertisement_id} className="hypothesis">
                      <Link
                        className="review-queue-item"
                        href={materialUrl(ad.id)}
                        aria-current={id === ad.id ? "page" : undefined}
                        scroll={false}
                      >
                        <strong>{ad.source_label}</strong>
                        <span>
                          <Demo value={ad.is_demo} /> {statusLabel(ad.status)}
                        </span>
                        <small>
                          Зафиксировано: {date(ad.captured_at)} · ревизия
                          анализа {item.extraction_revision}
                        </small>
                      </Link>
                      <ul aria-label={`Действия: ${ad.source_label}`}>
                        {item.actions.includes("REVIEW_HYPOTHESES") && (
                          <li>
                            <Link
                              className="text-link"
                              href={materialUrl(ad.id, "hypotheses")}
                              scroll={false}
                            >
                              Проверить гипотезы · осталось{" "}
                              {item.pending_hypothesis_ids.length}
                            </Link>
                          </li>
                        )}
                        {item.actions.includes("REVIEW_MATCH") && (
                          <li>
                            <Link
                              className="text-link"
                              href={materialUrl(ad.id, "match")}
                              scroll={false}
                            >
                              Проверить привязку к объекту
                            </Link>
                          </li>
                        )}
                        {item.actions.includes("CREATE_PAYMENT_EVIDENCE") && (
                          <li>
                            <Link
                              className="text-link"
                              href={materialUrl(ad.id, "factor")}
                              scroll={false}
                            >
                              Сохранить доказательство оплаты
                            </Link>
                          </li>
                        )}
                        {item.actions.includes("REVIEW_R2") &&
                          item.r2_reviews.map((target) => (
                            <li key={target.property_id}>
                              <QueueR2Target
                                key={target.property_id}
                                item={item}
                                target={target}
                                onChange={queue.reload}
                              />
                            </li>
                          ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
              {!data.items.length && (
                <p className="empty">
                  {data.total
                    ? "На этой странице материалов нет. Вернитесь на предыдущую страницу."
                    : "Нерешённых действий по выбранным фильтрам нет. Это не подтверждает безопасность или полноту проверки исходников."}
                </p>
              )}
            </details>
            <Pagination
              label="Страницы нерешённых действий"
              page={data.page}
              pageSize={data.page_size}
              total={data.total}
              onPageChange={(value) => navigate("page", String(value))}
            />
            {id && !selectedInQueue && (
              <p className="field-help">
                Выбранный материал открыт по прямой ссылке. Он может быть вне
                страницы или фильтра либо больше не иметь нерешённых действий.
              </p>
            )}
          </>
        )}
      </ReviewQueuePanel>
      {id
        ? renderMaterial(id, queue.reload)
        : data && (
            <p className="notice">
              Выберите материал; переход к задаче не подтверждает гипотезу,
              привязку или фактор автоматически.
            </p>
          )}
    </>
  );
}

function QueueR2Target({
  item,
  target,
  onChange,
}: {
  item: AdvertisementReviewItem;
  target: AdvertisementReviewItem["r2_reviews"][number];
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Проверить решение R2 по объекту {target.property_id}</summary>
      {open && (
        <QueueR2Decision
          key={`${item.advertisement_id}:${target.property_id}:${target.factor_id || "new"}`}
          item={item}
          target={target}
          onChange={onChange}
        />
      )}
    </details>
  );
}

function QueueR2Decision({
  item,
  target,
  onChange,
}: {
  item: AdvertisementReviewItem;
  target: AdvertisementReviewItem["r2_reviews"][number];
  onChange: () => void;
}) {
  const { user } = useContext(Auth);
  const detail = useData<PropertyDetail>(`/properties/${target.property_id}`);
  const draft = useReviewDraft(
    user?.id || "",
    `queue-r2:${item.advertisement_id}:${target.property_id}:${target.factor_id || "new"}`,
    {
      reason: "",
      commandFingerprint: "",
      commandKey: "",
      factorAsOf: "",
    },
    ["commandFingerprint", "commandKey", "factorAsOf"],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const factor = detail.data?.factors.find((row) => row.code === "R2");
  const ready =
    detail.data?.property.id === target.property_id &&
    !detail.error &&
    (!target.factor_id || factor?.id === target.factor_id);
  const historical =
    target.property_id !== item.advertisement.confirmed_property_id;
  async function save(status?: "CONFIRMED" | "REJECTED") {
    if (!ready || !draft.values.reason.trim() || (status && !factor)) return;
    setBusy(true);
    setError("");
    setMessage("");
    const path = status
      ? `/risk-factors/${factor!.id}/review`
      : `/properties/${target.property_id}/risk-factors`;
    const asOf = draft.values.factorAsOf || new Date().toISOString();
    const body = status
      ? {
          expected_revision: factor!.revision,
          status,
          evidence_ids: target.evidence_ids,
          reason: draft.values.reason.trim(),
        }
      : {
          code: "R2",
          as_of: asOf,
          evidence_ids: target.evidence_ids,
          reason: draft.values.reason.trim(),
        };
    try {
      const fingerprint = await reviewCommandFingerprint(path, body);
      const key =
        draft.values.commandFingerprint === fingerprint &&
        draft.values.commandKey
          ? draft.values.commandKey
          : crypto.randomUUID();
      draft.update({
        commandFingerprint: fingerprint,
        commandKey: key,
        factorAsOf: asOf,
      });
      await command(path, body, key);
      draft.update({ commandFingerprint: "", commandKey: "", factorAsOf: "" });
      draft.saved(["reason", "commandFingerprint", "commandKey", "factorAsOf"]);
      setMessage(
        status
          ? "Решение R2 сохранено. Риск рассчитан сервером."
          : "Фактор R2 создан на проверке; подтверждение требует отдельного решения.",
      );
      detail.reload();
      onChange();
    } catch (failure) {
      setError((failure as Error).message);
      if (failure instanceof ApiError && failure.status === 409) {
        detail.reload();
        onChange();
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="review-form"
      aria-label={`Решение R2: ${target.property_id}`}
    >
      <p>
        {historical
          ? "Исторический R2 относится к прежнему объекту. Доказательства текущей привязки сюда не подставляются."
          : "Это отдельное решение по R2; просмотр очереди не начисляет баллы."}
      </p>
      <Link
        className="text-link"
        href={`/properties/${target.property_id}#dossier-factors`}
      >
        Открыть объект и исходные доказательства R2
      </Link>
      {!detail.data ? (
        <LoadState error={detail.error} retry={detail.reload} />
      ) : (
        <>
          <p>
            Объект: {detail.data.property.name} ·{" "}
            {factor
              ? `R2: ${statusLabel(factor.status)} · ревизия ${factor.revision}`
              : "R2 ещё не создан"}
          </p>
          <Demo value={detail.data.property.is_demo} />
          <p>
            Доказательства этой задачи:{" "}
            {target.evidence_ids.join(", ") || "не указаны"}.
          </p>
          <p className="field-help">
            Подтверждение по устаревшему источнику может быть запрещено
            сервером. Сначала проверьте источник; отклонение также требует
            причины.
          </p>
          {!ready && (
            <p className="notice">
              Состояние фактора изменилось. Обновите очередь и проверьте
              актуальную задачу.
            </p>
          )}
          {detail.error && <Notice error={detail.error} />}
          {draft.restored && (
            <p role="status" className="field-help">
              Восстановлена причина решения R2. Сверьте актуальный фактор и
              доказательства.
            </p>
          )}
          {draft.storageError && <Notice error={draft.storageError} />}
          {user?.role === "analyst" ? (
            <>
              <label
                htmlFor={`queue-r2-reason-${item.advertisement_id}-${target.property_id}`}
              >
                Обоснование решения R2 по объекту {target.property_id}
              </label>
              <textarea
                id={`queue-r2-reason-${item.advertisement_id}-${target.property_id}`}
                rows={3}
                maxLength={2000}
                value={draft.values.reason}
                onChange={(event) =>
                  draft.update({ reason: event.target.value })
                }
              />
              <div className="review-actions">
                {factor ? (
                  <>
                    <Button
                      disabled={
                        busy ||
                        !ready ||
                        !draft.values.reason.trim() ||
                        !target.evidence_ids.length
                      }
                      aria-busy={busy}
                      onClick={() => void save("CONFIRMED")}
                    >
                      Подтвердить R2 этого объекта
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy || !ready || !draft.values.reason.trim()}
                      aria-busy={busy}
                      onClick={() => void save("REJECTED")}
                    >
                      Отклонить R2 этого объекта
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    disabled={
                      busy ||
                      !ready ||
                      !draft.values.reason.trim() ||
                      !target.evidence_ids.length
                    }
                    aria-busy={busy}
                    onClick={() => void save()}
                  >
                    Создать R2 на проверке
                  </Button>
                )}
              </div>
            </>
          ) : (
            <p className="notice">
              Режим просмотра: решение по R2 сохраняет аналитик.
            </p>
          )}
        </>
      )}
      {error && <Notice error={error} />}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
