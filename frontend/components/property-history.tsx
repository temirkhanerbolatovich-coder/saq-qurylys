"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";
import { date } from "@/lib/api";
import { factorLabels } from "@/lib/presentation";
import { statusLabel } from "@/lib/status-labels";
import type { AuditEvent, Page } from "@/lib/types";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { LoadState, useData } from "@/components/workspace";

const actionLabels: Record<string, string> = {
  DEMO_SEEDED: "Добавлены учебные данные",
  ADVERTISEMENT_CREATED: "Сохранена публикация",
  ADVERTISEMENT_UPLOADED: "Загружен материал рекламы",
  ANALYSIS_QUEUED: "Анализ поставлен в очередь",
  ANALYSIS_SUCCEEDED: "Анализ завершён",
  ANALYSIS_FAILED: "Ошибка анализа",
  ANALYSIS_BLOCKED: "Анализ требует действия",
  TRANSCRIPTION_CREATED: "Исправлена расшифровка",
  HYPOTHESIS_REVIEWED: "Проверена гипотеза AI",
  PROPERTY_MATCH_REVIEWED: "Проверена связь публикации с объектом",
  SUPPORT_DOCUMENT_UPLOADED: "Загружен подтверждающий документ",
  EVIDENCE_CREATED: "Сохранено доказательство",
  LEGAL_BASIS_CREATED: "Добавлено правовое основание",
  LEGAL_BASIS_REVIEWED: "Проверено правовое основание",
  RISK_FACTOR_CREATED: "Фактор передан на проверку",
  RISK_FACTOR_REVIEWED: "Проверен фактор риска",
  RISK_INVALIDATED: "Фактор требует повторной проверки",
  SIGNAL_CREATED: "Создан снимок сигнала",
  SIGNAL_CONFIRMED: "Сигнал подтверждён",
  SIGNAL_RETURNED: "Сигнал возвращён на доработку",
  SIGNAL_PDF_QUEUED: "PDF поставлен в очередь",
  SIGNAL_PDF_SUCCEEDED: "PDF сформирован",
  SIGNAL_PDF_FAILED: "Ошибка формирования PDF",
  SIGNAL_PDF_BLOCKED: "Формирование PDF требует действия",
};

function textField(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") return null;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" ? field : null;
}

function eventStatus(event: AuditEvent) {
  const { details } = event;
  const before =
    textField(details.before, "status") ||
    textField(details.before, "review_status") ||
    textField(details.before, "verification_status") ||
    textField(details, "before_status");
  const after =
    textField(details.after, "status") ||
    textField(details.after, "review_status") ||
    textField(details.after, "verification_status") ||
    textField(details, "after_status");
  if (!after) return null;
  return before
    ? `${statusLabel(before)} → ${statusLabel(after)}`
    : `Статус: ${statusLabel(after)}`;
}

function eventLink(event: AuditEvent, propertyId: string, inDossier: boolean) {
  if (event.entity_type === "signals")
    return {
      href: `/signals?signal_id=${event.entity_id}`,
      label: "Открыть сигнал",
    };
  if (event.entity_type === "advertisements")
    return {
      href: `/advertisements/${event.entity_id}`,
      label: "Открыть публикацию",
    };
  const advertisement = textField(event.details, "advertisement_id");
  if (
    advertisement &&
    /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(advertisement)
  )
    return {
      href: `/advertisements/${advertisement}`,
      label: "Открыть публикацию",
    };
  if (event.entity_type === "risk_factors")
    return {
      href: inDossier
        ? "#dossier-factors"
        : `/properties/${propertyId}#dossier-factors`,
      label: "Открыть факторы и доказательства",
    };
  if (event.entity_type === "legal_bases")
    return {
      href: inDossier
        ? "#dossier-bases"
        : `/properties/${propertyId}#dossier-bases`,
      label: "Открыть основания",
    };
  return null;
}

/** Reads saved events; does not reconstruct an unrecorded historical risk score. */
export function PropertyHistory({
  id,
  revision,
  compact = false,
}: {
  id: string;
  revision?: string | number;
  compact?: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const heading = useRef<HTMLHeadingElement>(null);
  const Heading = compact ? "h3" : "h2";
  const EventHeading = compact ? "h4" : "h3";
  const requested = Number(params.get("history_page") || "1");
  const page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  const path = `/properties/${id}/audit?page=${page}&page_size=10&refresh=${encodeURIComponent(String(revision || ""))}`;
  const events = useData<Page<AuditEvent>>(path);
  const current = events.resolvedPath === path;
  const error = current ? events.error : "";
  const data = current && !error ? events.data : null;
  const changePage = (next: number) => {
    const query = new URLSearchParams(params.toString());
    if (next === 1) query.delete("history_page");
    else query.set("history_page", String(next));
    router.replace(`${pathname}${query.size ? `?${query}` : ""}`, {
      scroll: false,
    });
    heading.current?.focus();
  };
  const content = (
    <div className="property-history" aria-busy={!data && !error}>
      <Heading ref={heading} id={`history-title-${id}`} tabIndex={-1}>
        История объекта
      </Heading>
      <p className="muted">
        Хронология сохранённых решений и материалов. Новые события сверху. Время
        — UTC+5.
      </p>
      <Button type="button" variant="outline" onClick={events.reload}>
        Обновить историю
      </Button>
      {!data ? (
        <LoadState error={error} retry={events.reload} />
      ) : (
        <>
          <p className="muted">Всего событий: {data.total}</p>
          {!data.items.length ? (
            <p className="empty">
              {data.total
                ? "На этой странице событий нет. Вернитесь к предыдущей странице."
                : "Сохранённых событий пока нет. Новые решения появятся здесь после проверки материалов."}
            </p>
          ) : (
            <ol className="history-timeline" aria-label="События по объекту">
              {data.items.map((event) => {
                const transition = eventStatus(event);
                const link = eventLink(
                  event,
                  id,
                  pathname === `/properties/${id}`,
                );
                return (
                  <li key={event.id}>
                    <time dateTime={event.occurred_at}>
                      {date(event.occurred_at)}
                    </time>
                    <EventHeading>
                      {Object.hasOwn(actionLabels, event.action)
                        ? actionLabels[event.action]
                        : "Сохранено событие"}
                    </EventHeading>
                    {event.risk_code && (
                      <p className="history-factor">
                        {event.risk_code} ·{" "}
                        {factorLabels[event.risk_code] || event.risk_code}
                      </p>
                    )}
                    {transition && (
                      <p className="history-transition">{transition}</p>
                    )}
                    <p className="history-author">
                      Автор: {event.actor_display_name || "Имя не указано"}
                    </p>
                    <p>{event.reason || "Причина в событии не записана."}</p>
                    {link && (
                      <Link className="text-link" href={link.href}>
                        {link.label}
                      </Link>
                    )}
                    <details className="history-record">
                      <summary>Запись аудита</summary>
                      <dl>
                        <dt>Код события</dt>
                        <dd>{event.action}</dd>
                        <dt>ID автора</dt>
                        <dd>{event.actor_id}</dd>
                        <dt>ID события</dt>
                        <dd>{event.id}</dd>
                        {event.new_revision !== null && (
                          <>
                            <dt>Ревизия записи</dt>
                            <dd>
                              {event.old_revision === null
                                ? event.new_revision
                                : `${event.old_revision} → ${event.new_revision}`}
                            </dd>
                          </>
                        )}
                      </dl>
                    </details>
                  </li>
                );
              })}
            </ol>
          )}
          <Pagination
            page={data.page}
            pageSize={data.page_size}
            total={data.total}
            onPageChange={changePage}
            label="Страницы истории объекта"
          />
        </>
      )}
    </div>
  );
  return compact ? (
    <details>
      <summary>Журнал решений по объекту</summary>
      {content}
    </details>
  ) : (
    <section
      className="panel"
      id="dossier-history"
      tabIndex={-1}
      aria-labelledby={`history-title-${id}`}
    >
      {content}
    </section>
  );
}
