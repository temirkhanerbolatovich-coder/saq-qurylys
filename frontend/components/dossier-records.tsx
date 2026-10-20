"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { date } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { statusLabel } from "@/lib/status-labels";
import type {
  Advertisement,
  Asset,
  AuditEvent,
  Evidence,
  Page,
  PropertyDetail,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { DetailDrawer } from "@/components/ui/detail-drawer";
import { Pagination } from "@/components/ui/pagination";
import { TableRegion } from "@/components/ui/table-region";
import { WorkspacePanel, WorkspaceTabs } from "@/components/ui/workspace-tabs";
import { PdfDownload } from "@/components/pdf-download";
import { Demo, LoadState, useData } from "@/components/workspace";

type LegalBasis = PropertyDetail["legal_bases"][number];
type RecordKind = "documents" | "publications" | "evidence" | "history";
type SelectedRecord =
  | { kind: "documents"; id: string; title: string; basis: LegalBasis }
  | { kind: "publications"; id: string; title: string; association?: string }
  | { kind: "evidence"; id: string; title: string }
  | { kind: "history"; id: string; title: string; event: AuditEvent };

export type RecordSource = {
  label: string;
  url?: string | null;
  date?: string | null;
  note?: string | null;
};

/** Source labels are supplied from saved records; absent dates are never inferred. */
export function RecordSources({
  sources,
  note,
}: {
  sources: RecordSource[];
  note?: string;
}) {
  const { t } = useLocale();
  return (
    <footer className="record-sources">
      <h3>{t("Источники и ограничения", "Дереккөздер мен шектеулер")}</h3>
      {sources.length ? (
        <ul>
          {sources.map((source, index) => (
            <li key={`${source.label}:${index}`}>
              {source.url && /^https?:\/\//i.test(source.url) ? (
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.label}
                </a>
              ) : (
                source.label
              )}
              {source.date && (
                <>
                  {" "}
                  · <time dateTime={source.date}>{date(source.date)}</time>
                </>
              )}
              {source.note && <p>{source.note}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p>
          {t("Источник в записи не указан.", "Жазбада дереккөз көрсетілмеген.")}
        </p>
      )}
      {note && <p>{note}</p>}
    </footer>
  );
}

function uuid(value: unknown): string | null {
  return typeof value === "string" &&
    /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value)
    ? value
    : null;
}
const eventNames: Record<string, string> = {
  SOURCE_PACKAGE_IMPORTED: "Импортирован материал источника",
  DEMO_SEEDED: "Добавлены учебные данные",
  PROPERTY_CREATED_FROM_CANDIDATE: "Создано досье из кандидата",
  PROPERTY_CANDIDATE_LINKED: "Кандидат связан с досье",
  PROPERTY_CANDIDATE_UNLINKED: "Отменена ошибочная связь",
  LEGAL_BASIS_CREATED: "Добавлено правовое основание",
  LEGAL_BASIS_REVIEWED: "Проверено правовое основание",
  SUPPORT_DOCUMENT_UPLOADED: "Загружен документ",
  EVIDENCE_CREATED: "Сохранено доказательство",
  RISK_FACTOR_CREATED: "Фактор передан на проверку",
  RISK_FACTOR_REVIEWED: "Проверен фактор риска",
  RISK_INVALIDATED: "Фактор требует повторной проверки",
  PROPERTY_MATCH_REVIEWED: "Проверена привязка публикации",
  HYPOTHESIS_REVIEWED: "Проверена гипотеза",
  SIGNAL_CREATED: "Создан сигнал",
  SIGNAL_CONFIRMED: "Подтверждён сигнал",
  SIGNAL_RETURNED: "Сигнал возвращён на доработку",
};
function eventTitle(event: AuditEvent) {
  return eventNames[event.action] || "Сохранено событие";
}

export function DossierRecords(props: {
  propertyId: string;
  kind: RecordKind;
  detail?: PropertyDetail;
  revision?: string | number;
  sourceEvents?: AuditEvent[];
  visibleDocumentIds?: Set<string>;
  renderDocumentReview?: (basis: LegalBasis) => ReactNode;
}) {
  return props.detail ? (
    <Records {...props} detail={props.detail} />
  ) : (
    <ReadProperty {...props} />
  );
}
function ReadProperty(props: {
  propertyId: string;
  kind: RecordKind;
  revision?: string | number;
  sourceEvents?: AuditEvent[];
  visibleDocumentIds?: Set<string>;
  renderDocumentReview?: (basis: LegalBasis) => ReactNode;
}) {
  const path = `/properties/${props.propertyId}`;
  const result = useData<PropertyDetail>(path);
  return result.resolvedPath === path && result.data && !result.error ? (
    <Records {...props} detail={result.data} />
  ) : (
    <LoadState
      error={result.resolvedPath === path ? result.error : ""}
      retry={result.reload}
    />
  );
}
function Records({
  propertyId,
  kind,
  detail,
  revision,
  sourceEvents = [],
  visibleDocumentIds,
  renderDocumentReview,
}: {
  propertyId: string;
  kind: RecordKind;
  detail: PropertyDetail;
  revision?: string | number;
  sourceEvents?: AuditEvent[];
  visibleDocumentIds?: Set<string>;
  renderDocumentReview?: (basis: LegalBasis) => ReactNode;
}) {
  const { t } = useLocale();
  const [selected, setSelected] = useState<SelectedRecord | null>(null);
  const handledHash = useRef("");
  useEffect(() => {
    if (kind !== "documents") return;
    function openDocument(id: string) {
      const basis = detail.legal_bases.find((item) => item.id === id);
      if (basis)
        setSelected({
          kind: "documents",
          id: basis.id,
          title:
            basis.document_number || t("Правовое основание", "Құқықтық негіз"),
          basis,
        });
    }
    function readHash() {
      const hash = window.location.hash;
      const id = hash.match(/^#dossier-document-([\da-f-]{36})$/i)?.[1];
      if (id && handledHash.current !== hash) {
        handledHash.current = hash;
        openDocument(id);
      }
    }
    function receive(event: Event) {
      const id = (event as CustomEvent<unknown>).detail;
      if (typeof id === "string") openDocument(id);
    }
    readHash();
    window.addEventListener("hashchange", readHash);
    window.addEventListener("saq-open-document", receive);
    return () => {
      window.removeEventListener("hashchange", readHash);
      window.removeEventListener("saq-open-document", receive);
    };
  }, [detail.legal_bases, kind, t]);
  const selectedDocument =
    selected?.kind === "documents"
      ? detail.legal_bases.find((basis) => basis.id === selected.id) ||
        selected.basis
      : null;
  const evidence = Array.from(
    new Set([
      ...detail.factors.flatMap((factor) => factor.evidence_ids),
      ...detail.legal_bases.flatMap((basis) => basis.evidence_ids),
    ]),
  );
  const title =
    kind === "documents"
      ? t("Документы", "Құжаттар")
      : kind === "publications"
        ? t("Публикации", "Жарияланымдар")
        : kind === "evidence"
          ? t("Доказательства", "Дәлелдер")
          : t("История решений", "Шешімдер тарихы");
  return (
    <section className="panel dossier-records" aria-label={title}>
      {kind === "publications" || kind === "history" ? (
        <PagedRecords
          propertyId={propertyId}
          kind={kind}
          revision={revision}
          onSelect={setSelected}
        />
      ) : (
        <>
          <div className="dossier-records-heading">
            <h3>{title}</h3>
            <p>
              {t("Сохранено записей", "Сақталған жазбалар")}:{" "}
              {kind === "documents"
                ? detail.legal_bases.length
                : evidence.length}
            </p>
          </div>
          {kind === "documents" &&
            (detail.legal_bases.length ? (
              <TableRegion label={title}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">{t("Документ", "Құжат")}</th>
                      <th scope="col">{t("Выдан", "Берілген")}</th>
                      <th scope="col">{t("Проверка", "Тексеру")}</th>
                      <th scope="col">{t("Действие", "Әрекет")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.legal_bases
                      .filter(
                        (basis) =>
                          !visibleDocumentIds ||
                          visibleDocumentIds.has(basis.id),
                      )
                      .map((basis) => (
                        <tr key={basis.id}>
                          <td>
                            <button
                              className="dossier-record-button"
                              type="button"
                              onClick={() =>
                                setSelected({
                                  kind,
                                  id: basis.id,
                                  title:
                                    basis.document_number ||
                                    t("Правовое основание", "Құқықтық негіз"),
                                  basis,
                                })
                              }
                            >
                              {basis.document_number ||
                                t("Номер не указан", "Нөмірі көрсетілмеген")}
                            </button>
                            <small>
                              {basis.issuer} · <Demo value={basis.is_demo} />
                            </small>
                            <small>
                              {t("Охват: ", "Қамту аясы: ")}
                              {basis.scope_description}
                            </small>
                            <small>
                              {t("Период: ", "Мерзім: ")}
                              {date(basis.applies_from)} —{" "}
                              {date(basis.applies_until)}
                            </small>
                          </td>
                          <td>{date(basis.document_date)}</td>
                          <td>{statusLabel(basis.verification_status)}</td>
                          <td className="dossier-record-actions">
                            <button
                              type="button"
                              className="dossier-record-button"
                              aria-label={`${t("Открыть документ", "Құжатты ашу")}: ${basis.document_number || basis.id}`}
                              onClick={() =>
                                setSelected({
                                  kind,
                                  id: basis.id,
                                  title:
                                    basis.document_number ||
                                    t("Правовое основание", "Құқықтық негіз"),
                                  basis,
                                })
                              }
                            >
                              {t("Открыть", "Ашу")}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </TableRegion>
            ) : (
              <p className="dossier-records-note">
                {t(
                  "Правовые документы пока не сохранены. Неизвестное основание не означает нарушение.",
                  "Құқықтық құжаттар әлі сақталмаған. Белгісіз негіз заң бұзушылықты білдірмейді.",
                )}
              </p>
            ))}
          {kind === "evidence" &&
            (evidence.length ? (
              <TableRegion label={title}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">
                        {t("Сохранённый материал", "Сақталған материал")}
                      </th>
                      <th scope="col">
                        {t(
                          "Используется в проверке",
                          "Тексеруде пайдаланылады",
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidence.map((id, index) => (
                      <tr key={id}>
                        <td>
                          <button
                            className="dossier-record-button"
                            type="button"
                            onClick={() =>
                              setSelected({
                                kind,
                                id,
                                title: `${t("Доказательство", "Дәлел")} ${index + 1}`,
                              })
                            }
                          >
                            {t("Открыть доказательство", "Дәлелді ашу")}{" "}
                            {index + 1}
                          </button>
                          <small>{id}</small>
                        </td>
                        <td>
                          {detail.factors
                            .filter((factor) =>
                              factor.evidence_ids.includes(id),
                            )
                            .map((factor) => factor.code)
                            .join(", ") ||
                            t("Правовое основание", "Құқықтық негіз")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableRegion>
            ) : (
              <p className="dossier-records-note">
                {t(
                  "К факторам и основаниям пока не прикреплены доказательства.",
                  "Факторлар мен негіздерге дәлелдер әлі тіркелмеген.",
                )}
              </p>
            ))}
        </>
      )}
      {kind === "publications" && (
        <ImportedRecords
          events={sourceEvents}
          confirmedIds={detail.advertisement_ids}
          onSelect={setSelected}
        />
      )}
      <DetailDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title || title}
        closeLabel={t("Закрыть карточку записи", "Жазба карточкасын жабу")}
        description={t(
          "Сохранённые сведения и исходные материалы",
          "Сақталған мәліметтер мен бастапқы материалдар",
        )}
      >
        {selected && (
          <>
            <RecordDetail
              key={`${selected.kind}:${selected.id}`}
              record={
                selectedDocument
                  ? { ...selected, kind: "documents", basis: selectedDocument }
                  : selected
              }
              propertyId={propertyId}
            />
            {selectedDocument && renderDocumentReview && (
              <section
                id={`dossier-document-${selectedDocument.id}`}
                tabIndex={-1}
              >
                {renderDocumentReview(selectedDocument)}
              </section>
            )}
          </>
        )}
      </DetailDrawer>
    </section>
  );
}

function PagedRecords({
  propertyId,
  kind,
  revision,
  onSelect,
}: {
  propertyId: string;
  kind: "publications" | "history";
  revision?: string | number;
  onSelect: (record: SelectedRecord) => void;
}) {
  const { t } = useLocale();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const pageKey = kind === "history" ? "history_page" : "publication_page";
  const requested = Number(params.get(pageKey) || "1");
  const page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  const path =
    kind === "history"
      ? `/properties/${propertyId}/audit?page=${page}&page_size=10&refresh=${encodeURIComponent(String(revision || ""))}`
      : `/advertisements?property_id=${propertyId}&page=${page}&page_size=10`;
  const result = useData<Page<Advertisement | AuditEvent>>(path);
  const data =
    result.resolvedPath === path && !result.error ? result.data : null;
  const title =
    kind === "history"
      ? t("История решений", "Шешімдер тарихы")
      : t("Подтверждённые публикации", "Расталған жарияланымдар");
  return (
    <>
      <div className="dossier-records-heading">
        <div>
          <h3>{title}</h3>
          <p>
            {data
              ? `${t("Всего записей", "Барлық жазбалар")}: ${data.total}`
              : t("Загрузка записей…", "Жазбалар жүктелуде…")}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={result.reload}>
          {t("Обновить", "Жаңарту")}
        </Button>
      </div>
      {!data ? (
        <LoadState
          error={result.resolvedPath === path ? result.error : ""}
          retry={result.reload}
        />
      ) : (
        <>
          {data.items.length ? (
            <TableRegion label={title}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">{t("Запись", "Жазба")}</th>
                    <th scope="col">{t("Дата", "Күні")}</th>
                    <th scope="col">
                      {kind === "history"
                        ? t("Автор", "Автор")
                        : t("Состояние", "Күйі")}
                    </th>
                    <th scope="col">{t("Действие", "Әрекет")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => {
                    const isEvent = "action" in row;
                    const title = isEvent ? eventTitle(row) : row.source_label;
                    const selection: SelectedRecord = isEvent
                      ? { kind: "history", id: row.id, title, event: row }
                      : { kind: "publications", id: row.id, title };
                    return (
                      <tr key={row.id}>
                        <td>
                          <button
                            className="dossier-record-button"
                            type="button"
                            onClick={() => onSelect(selection)}
                          >
                            {title}
                          </button>
                          <small>
                            {isEvent
                              ? row.reason ||
                                t("Причина не записана", "Себебі жазылмаған")
                              : row.source_url ||
                                t(
                                  "Исходная ссылка не указана",
                                  "Бастапқы сілтеме көрсетілмеген",
                                )}
                          </small>
                        </td>
                        <td>
                          {date(isEvent ? row.occurred_at : row.captured_at)}
                        </td>
                        <td>
                          {isEvent ? (
                            row.actor_display_name ||
                            t("Имя не указано", "Аты көрсетілмеген")
                          ) : (
                            <>
                              {statusLabel(row.status)}{" "}
                              <Demo value={row.is_demo} />
                            </>
                          )}
                        </td>
                        <td>
                          <button
                            className="dossier-record-button"
                            type="button"
                            aria-label={`${t("Открыть запись", "Жазбаны ашу")}: ${title}`}
                            onClick={() => onSelect(selection)}
                          >
                            {t("Открыть", "Ашу")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableRegion>
          ) : (
            <p className="dossier-records-note">
              {t("На этой странице записей нет.", "Бұл бетте жазбалар жоқ.")}
            </p>
          )}
          <Pagination
            label={title}
            page={data.page}
            pageSize={data.page_size}
            total={data.total}
            previousLabel={t("Предыдущая", "Алдыңғы")}
            nextLabel={t("Следующая", "Келесі")}
            onPageChange={(next) => {
              const query = new URLSearchParams(params);
              if (next === 1) query.delete(pageKey);
              else query.set(pageKey, String(next));
              router.replace(`${pathname}?${query}`, { scroll: false });
            }}
          />
        </>
      )}
    </>
  );
}

function ImportedRecords({
  events,
  confirmedIds,
  onSelect,
}: {
  events: AuditEvent[];
  confirmedIds: string[];
  onSelect: (record: SelectedRecord) => void;
}) {
  const { t } = useLocale();
  const ids = new Set(confirmedIds);
  const associated = events.filter((event) => {
    const id = uuid(event.details.advertisement_id);
    if (event.action !== "SOURCE_PACKAGE_IMPORTED" || !id || ids.has(id))
      return false;
    ids.add(id);
    return true;
  });
  if (!associated.length) return null;
  return (
    <>
      <div className="dossier-records-heading">
        <h3>
          {t("Материалы строк импорта", "Импорт жолдарының материалдары")}
        </h3>
        <p>
          {t("В просмотренной истории", "Қаралған тарихта")}:{" "}
          {associated.length}
        </p>
      </div>
      <p className="dossier-records-note">
        {t(
          "Связаны по строке переданного файла. Идентичность объекта и привязка публикации не подтверждены.",
          "Берілген файлдың жолы бойынша байланыстырылған. Объектінің сәйкестігі мен жарияланым байланысы расталмаған.",
        )}
      </p>
      <TableRegion
        label={t(
          "Исходные материалы импорта",
          "Импорттың бастапқы материалдары",
        )}
      >
        <table>
          <thead>
            <tr>
              <th scope="col">{t("Материал", "Материал")}</th>
              <th scope="col">{t("Получен", "Алынған")}</th>
            </tr>
          </thead>
          <tbody>
            {associated.map((event) => {
              const id = uuid(event.details.advertisement_id)!;
              const row = event.details.source_row;
              const rowFields =
                row && typeof row === "object"
                  ? (row as Record<string, unknown>)
                  : {};
              const rowId = rowFields.record_id || rowFields.ID;
              const title = `${t("Материал строки", "Жол материалы")} ${typeof rowId === "string" || typeof rowId === "number" ? rowId : typeof row === "string" || typeof row === "number" ? row : t("импорта", "импорт")}`;
              return (
                <tr key={event.id}>
                  <td>
                    <button
                      className="dossier-record-button"
                      type="button"
                      onClick={() =>
                        onSelect({
                          kind: "publications",
                          id,
                          title,
                          association:
                            event.reason ||
                            t(
                              "Связь по строке импорта; идентичность не подтверждена.",
                              "Импорт жолы бойынша байланыс; сәйкестік расталмаған.",
                            ),
                        })
                      }
                    >
                      {title}
                    </button>
                    <small>
                      {t(
                        "Идентичность не подтверждена",
                        "Сәйкестік расталмаған",
                      )}
                    </small>
                  </td>
                  <td>{date(event.occurred_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableRegion>
    </>
  );
}

function RecordDetail({
  record,
  propertyId,
}: {
  record: SelectedRecord;
  propertyId: string;
}) {
  if (record.kind === "publications")
    return <ReadAdvertisement record={record} />;
  if (record.kind === "evidence")
    return <ReadEvidence record={record} propertyId={propertyId} />;
  return <RecordPanels record={record} />;
}
function ReadAdvertisement({
  record,
}: {
  record: Extract<SelectedRecord, { kind: "publications" }>;
}) {
  const result = useData<Advertisement>(`/advertisements/${record.id}`);
  return result.data ? (
    <RecordPanels record={record} advertisement={result.data} />
  ) : (
    <LoadState error={result.error} retry={result.reload} />
  );
}
type EvidenceDetail = Evidence & {
  property_id: string;
  source_url?: string | null;
  kind?: string;
  advertisement_id?: string | null;
  fragment?: { quote?: string };
};
function ReadEvidence({
  record,
  propertyId,
}: {
  record: Extract<SelectedRecord, { kind: "evidence" }>;
  propertyId: string;
}) {
  const { t } = useLocale();
  const result = useData<EvidenceDetail>(`/evidence/${record.id}`);
  if (!result.data)
    return <LoadState error={result.error} retry={result.reload} />;
  if (result.data.property_id !== propertyId)
    return (
      <p role="alert">
        {t(
          "Доказательство относится к другому досье.",
          "Дәлел басқа досьеге тиесілі.",
        )}
      </p>
    );
  return <RecordPanels record={record} evidence={result.data} />;
}

function RecordPanels({
  record,
  advertisement,
  evidence,
}: {
  record: SelectedRecord;
  advertisement?: Advertisement;
  evidence?: EvidenceDetail;
}) {
  const { t } = useLocale();
  const [tab, setTab] = useState("description");
  const id = useId();
  const basis = record.kind === "documents" ? record.basis : null;
  const event = record.kind === "history" ? record.event : null;
  const sourceUrl = advertisement?.source_url || evidence?.source_url;
  const sourceLabel =
    advertisement?.source_label ||
    evidence?.source_label ||
    basis?.issuer ||
    (event
      ? t("Сохранённый журнал решений", "Сақталған шешімдер журналы")
      : null);
  const sourceDate =
    advertisement?.published_at ||
    evidence?.event_at ||
    basis?.document_date ||
    event?.occurred_at;
  const captured = advertisement?.captured_at || evidence?.captured_at;
  const assets: (Pick<Asset, "id"> & Partial<Asset>)[] =
    advertisement?.assets ||
    (basis
      ? [{ id: basis.asset_id }]
      : evidence
        ? [{ id: evidence.asset_id }]
        : []);
  const sources: RecordSource[] = sourceLabel
    ? [{ label: sourceLabel, url: sourceUrl, date: sourceDate }]
    : [];
  const tabs = [
    { id: "description", label: t("Описание", "Сипаттама") },
    {
      id: "sources",
      label: `${t("Источники", "Дереккөздер")} (${sources.length})`,
    },
    { id: "files", label: `${t("Файлы", "Файлдар")} (${assets.length})` },
  ];
  const exportKind =
    record.kind === "documents"
      ? "legal-bases"
      : record.kind === "publications"
        ? "advertisements"
        : record.kind === "history"
          ? "audit"
          : "evidence";
  const demo = advertisement?.is_demo ?? evidence?.is_demo ?? basis?.is_demo;
  return (
    <>
      {demo !== undefined && <Demo value={demo} />}
      {record.kind === "publications" && record.association && (
        <p className="notice">{record.association}</p>
      )}
      <WorkspaceTabs
        tabs={tabs}
        active={tab}
        onSelect={setTab}
        prefix={`record-${id}`}
        label={t("Сведения записи", "Жазба мәліметтері")}
      />
      <WorkspacePanel id="description" active={tab} prefix={`record-${id}`}>
        <div className="dossier-record-panel">
          <dl className="dossier-record-facts">
            {basis && (
              <>
                <Fact
                  label={t("Механизм", "Тетігі")}
                  value={
                    basis.mechanism === "GUARANTEE"
                      ? t("Гарантия", "Кепілдік")
                      : basis.mechanism === "MIO_PERMIT"
                        ? t("Разрешение МИО", "ЖАО рұқсаты")
                        : basis.mechanism
                  }
                />
                <Fact
                  label={t("Статус проверки", "Тексеру мәртебесі")}
                  value={statusLabel(basis.verification_status)}
                />
                <Fact
                  label={t("Область применения", "Қолданылу аясы")}
                  value={basis.scope_description}
                />
                <Fact
                  label={t("Проверено на дату", "Тексеру күні")}
                  value={date(basis.verification_as_of)}
                />
                <Fact
                  label={t("Действует с / до", "Басталу / аяқталу")}
                  value={`${date(basis.applies_from)} / ${date(basis.applies_until)}`}
                />
              </>
            )}
            {advertisement && (
              <>
                <Fact
                  label={t("Состояние", "Күйі")}
                  value={statusLabel(advertisement.status)}
                />
                <Fact
                  label={t("Привязка к объекту", "Объектіге байланысы")}
                  value={
                    advertisement.confirmed_property_id
                      ? t(
                          "Подтверждена отдельным решением",
                          "Жеке шешіммен расталған",
                        )
                      : t("Не подтверждена", "Расталмаған")
                  }
                />
              </>
            )}
            {evidence && (
              <>
                <Fact
                  label={t("Описание", "Сипаттама")}
                  value={evidence.description}
                />
                {evidence.methodology && (
                  <Fact
                    label={t("Методика", "Әдістеме")}
                    value={evidence.methodology}
                  />
                )}
                {evidence.scope_description && (
                  <Fact
                    label={t("Область", "Аясы")}
                    value={evidence.scope_description}
                  />
                )}
              </>
            )}
            {event && (
              <>
                <Fact
                  label={t("Дата события", "Оқиға күні")}
                  value={date(event.occurred_at)}
                />
                <Fact
                  label={t("Автор", "Автор")}
                  value={
                    event.actor_display_name ||
                    t("Имя не указано", "Аты көрсетілмеген")
                  }
                />
                <Fact
                  label={t("Причина", "Себебі")}
                  value={event.reason || t("Не записана", "Жазылмаған")}
                />
                <Fact
                  label={t("Ревизия до / после", "Алдыңғы / кейінгі нұсқа")}
                  value={`${event.old_revision ?? "—"} / ${event.new_revision ?? "—"}`}
                />
              </>
            )}
          </dl>
          {advertisement && (
            <>
              <h3>{t("Исходный текст", "Бастапқы мәтін")}</h3>
              <p className="dossier-record-copy">
                {advertisement.original_text}
              </p>
              <Link href={`/advertisements/${advertisement.id}`}>
                {t(
                  "Открыть рабочую карточку публикации",
                  "Жарияланымның жұмыс карточкасын ашу",
                )}
              </Link>
            </>
          )}
          {evidence?.fragment?.quote && (
            <blockquote className="dossier-record-copy">
              {evidence.fragment.quote}
            </blockquote>
          )}
          {event && (
            <details>
              <summary>
                {t(
                  "Технические сведения события",
                  "Оқиғаның техникалық мәліметтері",
                )}
              </summary>
              <pre className="dossier-record-copy">
                {JSON.stringify(event.details, null, 2)}
              </pre>
            </details>
          )}
          <p className="field-help">
            {t(
              "Просмотр записи не подтверждает источник, привязку, фактор или правовое основание.",
              "Жазбаны қарау дереккөзді, байланысты, факторды немесе құқықтық негізді растамайды.",
            )}
          </p>
        </div>
      </WorkspacePanel>
      <WorkspacePanel id="sources" active={tab} prefix={`record-${id}`}>
        <div className="dossier-record-panel">
          <RecordSources sources={sources} />
          {captured && (
            <p>
              {t("Получено системой", "Жүйеде алынған")}: {date(captured)}
            </p>
          )}
          {!sourceDate && (
            <p>
              {t(
                "Дата исходного источника не указана.",
                "Бастапқы дереккөздің күні көрсетілмеген.",
              )}
            </p>
          )}
        </div>
      </WorkspacePanel>
      <WorkspacePanel id="files" active={tab} prefix={`record-${id}`}>
        <div className="dossier-record-panel">
          {assets.length ? (
            <ul className="dossier-record-files">
              {assets.map((asset, index) => (
                <li key={asset.id}>
                  <strong>
                    {t("Исходный файл", "Бастапқы файл")}{" "}
                    {assets.length > 1 ? index + 1 : ""}
                  </strong>
                  {"sha256" in asset && (
                    <p>
                      SHA-256: <code>{asset.sha256}</code>
                    </p>
                  )}
                  <p>
                    <a href={`/api/v1/assets/${asset.id}`} download>
                      {t(
                        "Скачать сохранённый оригинал",
                        "Сақталған түпнұсқаны жүктеу",
                      )}
                    </a>
                  </p>
                  <PdfDownload
                    kind="assets"
                    id={asset.id}
                    label={t("PDF источника", "Дереккөз PDF")}
                    description={t(
                      "Исходный PDF или производная PDF-копия текста/изображения.",
                      "Бастапқы PDF немесе мәтін/суреттің PDF көшірмесі.",
                    )}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p>
              {t(
                "Файлы к этой записи не прикреплены.",
                "Бұл жазбаға файлдар тіркелмеген.",
              )}
            </p>
          )}
        </div>
      </WorkspacePanel>
      <div className="review-actions">
        <PdfDownload
          kind={exportKind}
          id={record.id}
          label={t("Скачать PDF записи", "Жазба PDF жүктеу")}
        />
        <PdfDownload
          kind={exportKind}
          id={record.id}
          label={t("PDF для печати", "Басып шығаруға PDF")}
          description={t(
            "Откройте скачанный PDF и выберите печать. Интерфейс приложения в файл не включается.",
            "Жүктелген PDF файлын ашып, басып шығаруды таңдаңыз. Қосымша интерфейсі файлға кірмейді.",
          )}
        />
      </div>
    </>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}
