"use client";
import { useLocale } from "@/lib/locale";
import { useMonitoringCommand } from "@/lib/use-monitoring-command";

import Link from "next/link";
import {
  WorkspaceTabs,
  WorkspacePanel,
  useWorkspaceSection,
} from "@/components/ui/workspace-tabs";
import { PdfDownload } from "@/components/pdf-download";
import { PropertyPicker } from "@/components/property-picker";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { api, date } from "@/lib/api";
import { useReviewDraft } from "@/lib/use-review-draft";
import type {
  Advertisement,
  AuditEvent,
  Page,
  PropertyDetail,
} from "@/lib/types";
import type {
  IncidentCloseReason,
  IncidentState,
  MonitoringCandidate,
  MonitoringCandidateDetail,
  MonitoringComparison,
  MonitoringIncident,
  MonitoringResult,
  RegistryEntry,
  RegistrySnapshot,
} from "@/lib/monitoring-types";
import { Button } from "@/components/ui/button";
import { ThreadsSearch } from "@/components/threads-search";
import { MonitoringV2 } from "@/components/monitoring-v2";
import { OpenRegistry } from "@/components/open-registry";
import { CsvImport } from "@/components/csv-import";
import { MonitoringUrlSchedules } from "@/components/monitoring-url-schedules";
import {
  MonitoringSources,
  MonitoringRuns,
} from "@/components/monitoring-sources";
import { Pagination } from "@/components/ui/pagination";
import { TableRegion } from "@/components/ui/table-region";
import {
  Auth,
  Demo,
  LoadState,
  Notice,
  PageTitle,
  useData,
} from "@/components/workspace";

const prefix = "/monitoring";
const resultLabels: Record<MonitoringResult, string> = {
  MATCHED_APPLICABLE_RECORD: "Найдена применимая запись",
  NO_MATCH_IN_APPROVED_SNAPSHOT: "Совпадение в полном DEMO-списке не найдено",
  RECORD_SCOPE_OR_STATUS_CONFLICT: "Область или статус записи требуют проверки",
  REGISTRY_UNAVAILABLE: "Ожидает доступного реестра",
  COVERAGE_OR_DATE_UNKNOWN: "Охват или даты не позволяют сделать вывод",
  ENTITY_AMBIGUOUS: "Объект или очередь определены неоднозначно",
};
const incidentLabels: Record<IncidentState, string> = {
  OPEN: "Новый",
  IN_REVIEW: "В работе",
  WAITING_DATA: "Ожидает данных",
  CLOSED: "Закрыт",
};
const closeLabels: Record<IncidentCloseReason, string> = {
  MATCH_FOUND: "Найдено применимое основание",
  NOT_APPLICABLE: "Срабатывание не применимо",
  DUPLICATE: "Дубликат",
};

function resultLabel(result: MonitoringResult | null) {
  return result ? resultLabels[result] || result : "Сверка ещё не выполнена";
}
function positivePage(value: string | null) {
  const number = Number(value || 1);
  return Number.isSafeInteger(number) && number > 0 ? number : 1;
}
function value(form: FormData, name: string) {
  return String(form.get(name) || "").trim();
}
function optionalValue(form: FormData, name: string) {
  return value(form, name) || null;
}
function utc(value: string) {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()))
    throw new Error("Проверьте дату и время в форме");
  return parsed.toISOString();
}
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="monitoring-field">
      <span>{label}</span>
      {children}
      {hint && <span className="field-help">{hint}</span>}
    </label>
  );
}

// The same payload keeps its command key after a failed/unknown HTTP response.
function MonitoringDraftNotice({
  draft,
  retryError = "",
}: {
  draft: { restored: boolean; dirty: boolean; storageError: string };
  retryError?: string;
}) {
  return (
    <>
      {draft.restored ? (
        <p className="notice" role="status">
          Черновик восстановлен. Проверьте данные перед отправкой.
        </p>
      ) : draft.dirty && !draft.storageError ? (
        <p className="field-help">Черновик сохранён в этой вкладке.</p>
      ) : null}
      {(draft.storageError || retryError) && (
        <Notice error={draft.storageError || retryError} />
      )}
    </>
  );
}

function snapshotSelections(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => {
        const [id, value] = entry;
        return (
          /^[0-9a-f-]{36}$/i.test(id) &&
          typeof value === "string" &&
          value.length <= 36
        );
      }),
    );
  } catch {
    return {};
  }
}

function revealMonitoringTarget(targetId: string) {
  const target = document.getElementById(targetId);
  // Opening a reference tool must preserve its existing forms, files and result state.
  for (let node = target; node; node = node.parentElement)
    if (node instanceof HTMLDetailsElement) node.open = true;
  target?.focus();
  target?.scrollIntoView({ block: "start" });
}

const monitoringTabs = [
  { id: "candidates", label: "Кандидаты" },
  { id: "incidents", label: "Инциденты" },
  { id: "sources", label: "Источники" },
  { id: "registry", label: "Версии реестра" },
  { id: "imports", label: "Импорт CSV" },
  { id: "runs", label: "Запуски" },
  { id: "v2", label: "Parser V2" },
] as const;
function monitoringSectionForHash(hash: string) {
  if (["monitoring-candidates", "monitoring-detail"].includes(hash))
    return "candidates";
  if (hash === "monitoring-incidents") return "incidents";
  if (["open-register-title", "monitoring-threads"].includes(hash))
    return "sources";
  if (hash === "monitoring-registry") return "registry";
}

export function MonitoringView() {
  const { t } = useLocale();
  const { user } = useContext(Auth);
  const sections = useWorkspaceSection(
    monitoringTabs,
    monitoringSectionForHash,
  );
  const [v2Visited, setV2Visited] = useState(sections.active === "v2");
  useEffect(() => {
    if (sections.active === "v2") setV2Visited(true);
  }, [sections.active]);
  const pendingTool = useRef<string | null>(null);
  useEffect(() => {
    const target = pendingTool.current || window.location.hash.slice(1);
    if (monitoringSectionForHash(target) === sections.active) {
      revealMonitoringTarget(target);
      pendingTool.current = null;
    }
  }, [sections.active]);
  function openTool(section: "sources" | "registry", target: string) {
    if (sections.active === section) revealMonitoringTarget(target);
    else {
      pendingTool.current = target;
      sections.select(section);
    }
  }
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") || "";
  const mode = params.get("is_demo") || "";
  const page = positivePage(params.get("page"));
  const incidentPage = positivePage(params.get("incident_page"));
  const snapshotPage = positivePage(params.get("snapshot_page"));
  const incidentState = params.get("incident_state") || "";
  const candidateId = params.get("candidate_id") || "";
  const relatedPropertyId = params.get("property_id") || "";
  const candidateQuery = new URLSearchParams({
    page: String(page),
    page_size: "10",
  });
  if (q) candidateQuery.set("q", q);
  if (mode) candidateQuery.set("is_demo", mode);
  if (relatedPropertyId) candidateQuery.set("property_id", relatedPropertyId);
  const queuePath = `${prefix}/candidates?${candidateQuery}`;
  const queue = useData<Page<MonitoringCandidate>>(queuePath);
  const queueData =
    queue.resolvedPath === queuePath && !queue.error ? queue.data : null;
  const queueError = queue.resolvedPath === queuePath ? queue.error : "";
  const snapshotPath = `${prefix}/registry-snapshots?page=${snapshotPage}&page_size=10`;
  const snapshots = useData<Page<RegistrySnapshot>>(snapshotPath);
  const snapshotData =
    snapshots.resolvedPath === snapshotPath && !snapshots.error
      ? snapshots.data
      : null;
  const snapshotError =
    snapshots.resolvedPath === snapshotPath ? snapshots.error : "";
  const incidentQuery = new URLSearchParams({
    page: String(incidentPage),
    page_size: "10",
  });
  if (incidentState) incidentQuery.set("state", incidentState);
  if (mode) incidentQuery.set("is_demo", mode);
  const incidentPath = `${prefix}/incidents?${incidentQuery}`;
  const incidents = useData<Page<MonitoringIncident>>(incidentPath);
  const incidentData =
    incidents.resolvedPath === incidentPath && !incidents.error
      ? incidents.data
      : null;
  const incidentError =
    incidents.resolvedPath === incidentPath ? incidents.error : "";
  const versionDraft = useReviewDraft(
    user?.id || "",
    "monitoring:registry-selections",
    { selections: "{}" },
    ["selections"],
  );
  const selections = snapshotSelections(versionDraft.values.selections);
  const [pendingSnapshotId, setPendingSnapshotId] = useState("");
  const snapshotId = candidateId
    ? selections[candidateId] || ""
    : pendingSnapshotId;
  function setSnapshotId(id: string) {
    if (!candidateId) {
      setPendingSnapshotId(id);
      return;
    }
    versionDraft.update({
      selections: JSON.stringify({ ...selections, [candidateId]: id }),
    });
  }
  const [snapshotMetadata, setSelectedSnapshot] =
    useState<RegistrySnapshot | null>(null);
  const selectedSnapshot =
    snapshotData?.items.find((row) => row.id === snapshotId) ||
    (snapshotMetadata?.id === snapshotId ? snapshotMetadata : null);
  function chooseSnapshot(snapshot: RegistrySnapshot | null) {
    setSelectedSnapshot(snapshot);
    setSnapshotId(snapshot?.id || "");
  }
  const detailHeading = useRef<HTMLElement>(null);
  const focusSelection = useRef(false);
  useEffect(() => {
    if (focusSelection.current) {
      detailHeading.current?.focus();
      detailHeading.current?.scrollIntoView({ block: "start" });
      focusSelection.current = false;
    }
  }, [candidateId, sections.active]);
  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [name, nextValue] of Object.entries(changes)) {
      if (nextValue) next.set(name, nextValue);
      else next.delete(name);
    }
    router.push(`/monitoring?${next}`, { scroll: false });
  }
  function selectCandidate(id: string) {
    if (!candidateId && pendingSnapshotId) {
      versionDraft.update({
        selections: JSON.stringify({ ...selections, [id]: pendingSnapshotId }),
      });
      setPendingSnapshotId("");
    }
    focusSelection.current = true;
    update({ candidate_id: id, section: "candidates" });
  }
  function changed() {
    queue.reload();
    incidents.reload();
  }
  return (
    <div className="monitoring-workspace">
      <PageTitle
        eyebrow={t("Кандидаты и предварительные инциденты")}
        title={t("Мониторинг рекламы")}
        description={t(
          "Ручной ввод находок, сохранённые версии реестра и отдельная проверка расхождений.",
        )}
      />
      <div className="monitoring-boundary">
        <strong>{t("Закрытый реестр недоступен. Сверка DEMO.")}</strong>
        <p>
          Открытый документ КЖК доступен во вкладке «Источники» для поиска по
          страницам. Автоматическая сверка реальных объектов ещё не подключена;
          DEMO-список к ним не применяется. Предварительный инцидент не
          подтверждает нарушение и не начисляет R1 или другие баллы риска.
        </p>
        <Button
          variant="outline"
          onClick={() => openTool("sources", "open-register-title")}
        >
          {t("Открыть источники")}
        </Button>
      </div>
      <WorkspaceTabs
        tabs={monitoringTabs.map((tab) => ({ ...tab, label: t(tab.label) }))}
        active={sections.active}
        onSelect={sections.select}
        prefix="monitoring"
        label={t("Разделы мониторинга")}
      />

      <WorkspacePanel
        id="candidates"
        active={sections.active}
        prefix="monitoring"
      >
        <section
          className="panel"
          id="monitoring-candidates"
          tabIndex={-1}
          aria-labelledby="monitoring-candidates-title"
        >
          <div className="panel-heading">
            <div>
              <h2 id="monitoring-candidates-title">
                {t("Кандидаты объектов")}
              </h2>
              <p>
                Отдельная очередь находок. Кандидат ещё не является
                подтверждённым объектом в каталоге ЖК.
              </p>
            </div>
            <Button variant="outline" onClick={queue.reload}>
              {t("Обновить кандидатов")}
            </Button>
          </div>
          <div className="padded">
            <form
              className="monitoring-filters"
              key={`${q}:${mode}`}
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                update({
                  q: value(form, "q"),
                  is_demo: value(form, "mode"),
                  page: null,
                  incident_page: null,
                });
              }}
            >
              <Field label={t("Поиск кандидата")}>
                <input
                  name="q"
                  defaultValue={q}
                  maxLength={200}
                  type="search"
                />
              </Field>
              <Field label={t("Режим материалов")}>
                <select name="mode" defaultValue={mode}>
                  <option value="">{t("Все материалы")}</option>
                  <option value="true">DEMO</option>
                  <option value="false">{t("Реальные")}</option>
                </select>
              </Field>
              <Button type="submit" variant="outline">
                {t("Применить фильтры")}
              </Button>
            </form>
            {relatedPropertyId && (
              <p className="field-help">
                Кандидаты выбранного досье:{" "}
                <Link href={`/properties/${relatedPropertyId}`}>
                  Открыть объект
                </Link>
                . Показаны связанные находки и кандидат, из которого досье
                создано.
              </p>
            )}
            {(q || mode || relatedPropertyId) && (
              <Button
                variant="ghost"
                onClick={() =>
                  update({
                    q: null,
                    is_demo: null,
                    page: null,
                    incident_page: null,
                    property_id: null,
                  })
                }
              >
                {t("Сбросить фильтры")}
              </Button>
            )}
          </div>
          {!queueData ? (
            <div className="padded">
              <LoadState error={queueError} retry={queue.reload} />
            </div>
          ) : (
            <>
              <p className="padded">Найдено кандидатов: {queueData.total}</p>
              {queueData.items.length ? (
                <TableRegion label={t("Кандидаты объектов — таблица")}>
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Объект</th>
                        <th scope="col">Город / очередь</th>
                        <th scope="col">Последняя сверка</th>
                        <th scope="col">Создан</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queueData.items.map((candidate) => (
                        <tr
                          key={candidate.id}
                          aria-selected={candidate.id === candidateId}
                        >
                          <td>
                            <Link
                              href={`/monitoring?${new URLSearchParams({ ...Object.fromEntries(params), candidate_id: candidate.id })}`}
                              onClick={(event) => {
                                event.preventDefault();
                                selectCandidate(candidate.id);
                              }}
                            >
                              {candidate.name}
                            </Link>{" "}
                            <Demo value={candidate.is_demo} />
                            <small>
                              {candidate.address || "Адрес не установлен"}
                            </small>
                            {candidate.property_id && (
                              <small>
                                {candidate.property_link_kind === "LINKED"
                                  ? "Связан с существующим досье"
                                  : "Создано досье"}
                              </small>
                            )}
                          </td>
                          <td>
                            {candidate.city}
                            <small>
                              {candidate.phase || "Очередь не установлена"}
                            </small>
                          </td>
                          <td>{resultLabel(candidate.last_result)}</td>
                          <td>{date(candidate.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableRegion>
              ) : (
                <p className="empty">
                  Кандидатов по этим условиям нет. Добавьте находку из
                  сохранённой публикации или измените фильтры.
                </p>
              )}
              <Pagination
                label={t("Страницы кандидатов")}
                page={queueData.page}
                pageSize={queueData.page_size}
                total={queueData.total}
                onPageChange={(next) => update({ page: String(next) })}
              />
            </>
          )}
          {user?.role === "analyst" && (
            <details className="padded">
              <summary>Добавить кандидата из публикации</summary>
              <CandidateCreate
                advertisementId={params.get("advertisement_id") || ""}
                onCreated={(candidate) => {
                  changed();
                  selectCandidate(candidate.id);
                }}
              />
            </details>
          )}
        </section>

        <section
          className="panel"
          id="monitoring-detail"
          tabIndex={-1}
          ref={detailHeading}
          aria-labelledby="monitoring-detail-title"
        >
          <div className="panel-heading">
            <h2 id="monitoring-detail-title">{t("Сверка кандидата")}</h2>
          </div>
          {candidateId ? (
            <CandidateDetail
              key={candidateId}
              id={candidateId}
              snapshotId={snapshotId}
              onSnapshotChange={(id) => {
                setSnapshotId(id);
                setSelectedSnapshot(null);
              }}
              snapshotPicker={
                <div
                  className="registry-snapshot-picker"
                  role="region"
                  aria-label={t("Выбор версии реестра")}
                >
                  <Field label={t("DEMO-версия реестра")}>
                    <select
                      value={snapshotId}
                      onChange={(event) =>
                        chooseSnapshot(
                          snapshotData?.items.find(
                            (row) => row.id === event.target.value,
                          ) || null,
                        )
                      }
                    >
                      <option value="">Без версии · реестр недоступен</option>
                      {snapshotId &&
                        !snapshotData?.items.some(
                          (row) => row.id === snapshotId,
                        ) && (
                          <option value={snapshotId}>
                            {selectedSnapshot?.label ||
                              "Версия задана вручную · сведения не загружены"}
                          </option>
                        )}
                      {snapshotData?.items.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.label} · {row.city} · {date(row.created_at)} ·
                          DEMO
                        </option>
                      ))}
                    </select>
                  </Field>
                  {selectedSnapshot?.id === snapshotId && (
                    <div className="notice" role="status">
                      <strong>{selectedSnapshot.label} · DEMO</strong>
                      <p>
                        {selectedSnapshot.city} ·{" "}
                        {selectedSnapshot.complete
                          ? "Полный учебный список"
                          : "Частичный учебный список"}{" "}
                        · записей: {selectedSnapshot.entries.length}
                      </p>
                      <p>
                        {t("Охват: ")}
                        {date(selectedSnapshot.coverage_from)} —{" "}
                        {date(selectedSnapshot.coverage_until)}. Пригоден до:{" "}
                        {date(selectedSnapshot.expires_at)}.
                      </p>
                    </div>
                  )}
                  {versionDraft.storageError && (
                    <Notice error={versionDraft.storageError} />
                  )}
                  {!snapshotData ? (
                    <LoadState error={snapshotError} retry={snapshots.reload} />
                  ) : (
                    <>
                      {!snapshotData.total && (
                        <p>Версий пока нет. Можно сверять без реестра.</p>
                      )}
                      <Pagination
                        page={snapshotPage}
                        pageSize={10}
                        total={snapshotData.total}
                        label={t("Страницы выбора версии реестра")}
                        onPageChange={(next) =>
                          update({ snapshot_page: String(next) })
                        }
                      />
                    </>
                  )}
                </div>
              }
              onChooseSnapshot={() =>
                openTool("registry", "monitoring-registry")
              }
              onChanged={changed}
            />
          ) : (
            <p className="empty">
              Выберите кандидата в таблице или добавьте находку.
            </p>
          )}
        </section>
      </WorkspacePanel>
      <WorkspacePanel
        id="incidents"
        active={sections.active}
        prefix="monitoring"
      >
        <section
          className="panel"
          id="monitoring-incidents"
          tabIndex={-1}
          aria-labelledby="monitoring-incidents-title"
        >
          <div className="panel-heading">
            <div>
              <h2 id="monitoring-incidents-title">
                {t("Предварительные инциденты")}
              </h2>
              <p>
                Причина для проверки, а не подтверждённый правовой вывод.
                Повторная сверка дополняет активную карточку той же причины.
              </p>
            </div>
            <Button variant="outline" onClick={incidents.reload}>
              {t("Обновить инциденты")}
            </Button>
          </div>
          <div className="padded">
            <Field label={t("Состояние инцидента")}>
              <select
                value={incidentState}
                onChange={(event) =>
                  update({
                    incident_state: event.target.value,
                    incident_page: null,
                  })
                }
              >
                <option value="">{t("Все состояния")}</option>
                {Object.entries(incidentLabels).map(([state, label]) => (
                  <option key={state} value={state}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            {!incidentData ? (
              <LoadState error={incidentError} retry={incidents.reload} />
            ) : (
              <>
                <p>Найдено инцидентов: {incidentData.total}</p>
                {incidentData.items.length ? (
                  incidentData.items.map((incident) => (
                    <article key={incident.id} className="monitoring-record">
                      <PdfDownload
                        kind="incidents"
                        id={incident.id}
                        label={t("PDF инцидента")}
                      />
                      <h3>
                        <Link
                          href={`/monitoring?${new URLSearchParams({ ...Object.fromEntries(params), candidate_id: incident.candidate_id })}`}
                          onClick={(event) => {
                            event.preventDefault();
                            selectCandidate(incident.candidate_id);
                          }}
                        >
                          {incident.candidate_name}
                        </Link>{" "}
                        <Demo value={incident.is_demo} />
                      </h3>
                      <p>
                        {incidentLabels[incident.state]} · {incident.rule_code}
                      </p>
                      <p className="monitoring-meta">
                        Обновлён {date(incident.updated_at)} · ревизия{" "}
                        {incident.revision}
                      </p>
                      <p>Решения и история доступны в карточке кандидата.</p>
                    </article>
                  ))
                ) : (
                  <p className="empty">Инцидентов по этим условиям нет.</p>
                )}
                <Pagination
                  label={t("Страницы предварительных инцидентов")}
                  page={incidentData.page}
                  pageSize={incidentData.page_size}
                  total={incidentData.total}
                  onPageChange={(next) =>
                    update({ incident_page: String(next) })
                  }
                />
              </>
            )}
          </div>
        </section>
      </WorkspacePanel>
      <WorkspacePanel id="sources" active={sections.active} prefix="monitoring">
        <MonitoringSources
          onOpenTool={(target) => openTool("sources", target)}
          onOpenCsv={() => sections.select("imports")}
        />
        <MonitoringUrlSchedules />
        <details className="monitoring-tool">
          <summary>
            Справочный документ КЖК
            <span>Поиск по страницам · применимость проверяется отдельно</span>
          </summary>
          <OpenRegistry />
        </details>
        <details className="monitoring-tool">
          <summary>
            Дополнительный поиск Threads
            <span>
              Состояние подключения и ограниченный просмотр найденных публикаций
            </span>
          </summary>
          <ThreadsSearch />
        </details>
      </WorkspacePanel>
      <WorkspacePanel
        id="registry"
        active={sections.active}
        prefix="monitoring"
      >
        <details className="monitoring-tool">
          <summary>
            Учебные версии реестра
            <span>Только DEMO · это не государственный реестр</span>
          </summary>
          <section
            className="panel"
            id="monitoring-registry"
            tabIndex={-1}
            aria-labelledby="monitoring-registry-title"
          >
            <div className="panel-heading">
              <div>
                <h2 id="monitoring-registry-title">Версии DEMO-реестра</h2>
                <p>
                  Учебные списки. Сохранённая версия неизменяема; исправления
                  сохраняются новой версией. Это не государственный реестр.
                </p>
              </div>
              <Button variant="outline" onClick={snapshots.reload}>
                Обновить версии
              </Button>
            </div>
            <div className="padded">
              {!snapshotData ? (
                <LoadState error={snapshotError} retry={snapshots.reload} />
              ) : (
                <>
                  <p>Всего версий: {snapshotData.total}</p>
                  {snapshotData.items.length ? (
                    snapshotData.items.map((snapshot) => (
                      <RegistryVersion
                        key={snapshot.id}
                        snapshot={snapshot}
                        selected={snapshot.id === snapshotId}
                        onSelect={() => {
                          chooseSnapshot(snapshot);
                          if (candidateId) {
                            focusSelection.current = true;
                            sections.select("candidates");
                          }
                        }}
                      />
                    ))
                  ) : (
                    <p className="empty">
                      DEMO-версий пока нет. Создайте учебный список.
                    </p>
                  )}
                  <Pagination
                    label={t("Страницы версий DEMO-реестра")}
                    page={snapshotData.page}
                    pageSize={snapshotData.page_size}
                    total={snapshotData.total}
                    onPageChange={(next) =>
                      update({ snapshot_page: String(next) })
                    }
                  />
                </>
              )}
              {user?.role === "analyst" && (
                <details>
                  <summary>Создать версию DEMO-реестра</summary>
                  <SnapshotCreate
                    onCreated={(snapshot) => {
                      chooseSnapshot(snapshot);
                      snapshots.reload();
                    }}
                  />
                </details>
              )}
            </div>
          </section>
        </details>
      </WorkspacePanel>
      <WorkspacePanel id="imports" active={sections.active} prefix="monitoring">
        <CsvImport key={user?.id || "anonymous"} />
      </WorkspacePanel>
      <WorkspacePanel id="runs" active={sections.active} prefix="monitoring">
        <MonitoringRuns />
      </WorkspacePanel>
      <WorkspacePanel id="v2" active={sections.active} prefix="monitoring">
        {v2Visited && <MonitoringV2 />}
      </WorkspacePanel>
    </div>
  );
}

function CandidateCreate({
  advertisementId,
  onCreated,
}: {
  advertisementId: string;
  onCreated: (candidate: MonitoringCandidate) => void;
}) {
  const { t } = useLocale();
  const [adId, setAdId] = useState(advertisementId);
  const [preview, setPreview] = useState<Advertisement | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [saved, setSaved] = useState("");
  const mutation = useMonitoringCommand();
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLParagraphElement>(null);
  async function previewAd() {
    setPreviewBusy(true);
    setPreview(null);
    setPreviewError("");
    const requested = adId.trim();
    try {
      setPreview(
        await api<Advertisement>(
          `/advertisements/${encodeURIComponent(requested)}`,
        ),
      );
    } catch (e) {
      setPreviewError((e as Error).message);
    } finally {
      setPreviewBusy(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview || preview.id !== adId.trim()) return;
    const form = new FormData(event.currentTarget);
    const candidate = await mutation.run<MonitoringCandidate>(
      `${prefix}/candidates`,
      {
        advertisement_id: preview.id,
        name: value(form, "name"),
        city: value(form, "city"),
        address: optionalValue(form, "address"),
        phase: optionalValue(form, "phase"),
        reason: value(form, "reason"),
      },
    );
    if (!candidate) return;
    setSaved(`Кандидат «${candidate.name}» сохранён. Можно выполнить сверку.`);
    formRef.current?.reset();
    setAdId("");
    setPreview(null);
    onCreated(candidate);
    requestAnimationFrame(() => resultRef.current?.focus());
  }
  return (
    <form className="monitoring-form" onSubmit={submit} ref={formRef}>
      <p>
        Сначала откройте сохранённую публикацию и скопируйте её ID из адреса.
        Сопоставление здесь выполняет аналитик. Неизвестные адрес и очередь
        остаются пустыми; система не подставляет вымышленные данные.
      </p>
      <Field label={t("ID сохранённой публикации")}>
        <input
          required
          value={adId}
          onChange={(event) => setAdId(event.target.value)}
          pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
          maxLength={36}
          autoComplete="off"
        />
      </Field>
      <Button
        type="button"
        variant="outline"
        onClick={previewAd}
        disabled={!adId.trim() || previewBusy || mutation.busy}
        aria-busy={previewBusy}
      >
        {previewBusy ? "Получение публикации…" : "Проверить публикацию"}
      </Button>
      {previewError && <Notice error={previewError} />}
      {preview?.id === adId.trim() && (
        <div className="monitoring-preview">
          <p>
            <Link href={`/advertisements/${preview.id}`}>
              {preview.source_label}
            </Link>{" "}
            <Demo value={preview.is_demo} />
            {!preview.is_demo && (
              <strong>Реальный материал — ожидает реестра</strong>
            )}
          </p>
          <p>
            Опубликован: {date(preview.published_at)}; получен:{" "}
            {date(preview.captured_at)}.
          </p>
          <p>{preview.original_text.slice(0, 600)}</p>
        </div>
      )}
      <div className="monitoring-fields">
        <Field label={t("Название кандидата")}>
          <input name="name" required maxLength={300} />
        </Field>
        <Field label={t("Город кандидата")}>
          <input name="city" required minLength={2} maxLength={100} />
        </Field>
        <Field label={t("Адрес кандидата (если известен)")}>
          <input name="address" maxLength={300} />
        </Field>
        <Field label={t("Очередь / корпус кандидата (если известны)")}>
          <input name="phase" maxLength={100} />
        </Field>
      </div>
      <Field label={t("Обоснование выделения объекта")}>
        <textarea name="reason" required maxLength={1000} rows={3} />
      </Field>
      <Button
        type="submit"
        disabled={mutation.busy || preview?.id !== adId.trim()}
        aria-busy={mutation.busy}
      >
        {mutation.busy ? "Сохранение кандидата…" : "Сохранить кандидата"}
      </Button>
      {mutation.error && <Notice error={mutation.error} />}
      {saved && (
        <p
          role="status"
          tabIndex={-1}
          ref={resultRef}
          className="monitoring-success"
        >
          {saved}
        </p>
      )}
    </form>
  );
}

function CandidateDetail({
  id,
  snapshotId,
  snapshotPicker,
  onSnapshotChange,
  onChooseSnapshot,
  onChanged,
}: {
  id: string;
  snapshotId: string;
  snapshotPicker: ReactNode;
  onSnapshotChange: (id: string) => void;
  onChooseSnapshot: () => void;
  onChanged: () => void;
}) {
  const { t } = useLocale();
  const { user } = useContext(Auth);
  const path = `${prefix}/candidates/${encodeURIComponent(id)}`;
  const detail = useData<MonitoringCandidateDetail>(path);
  const data =
    detail.resolvedPath === path && !detail.error ? detail.data : null;
  const draft = useReviewDraft(user?.id || "", `monitoring:compare:${id}`, {
    advertisementId: "",
    reason: "",
  });
  const advertisementId =
    draft.values.advertisementId || data?.advertisements[0]?.id || "";
  const advertisementAvailable = data?.advertisements.some(
    (ad) => ad.id === advertisementId,
  );
  const mutation = useMonitoringCommand(`compare:${id}`);
  const [latest, setLatest] = useState<MonitoringComparison | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  async function compare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !advertisementAvailable) return;
    setLatest(null);
    const form = new FormData(event.currentTarget);
    const comparison = await mutation.run<MonitoringComparison>(
      `${path}/compare`,
      {
        expected_revision: data.candidate.revision,
        snapshot_id: snapshotId.trim() || null,
        advertisement_id: value(form, "advertisement_id"),
        reason: value(form, "reason"),
      },
    );
    if (!comparison) return;
    draft.update({ advertisementId: "", reason: "" });
    draft.saved();
    setLatest(comparison);
    detail.reload();
    onChanged();
    requestAnimationFrame(() => resultRef.current?.focus());
  }
  function reviewed() {
    detail.reload();
    onChanged();
  }
  return (
    <div className="padded">
      <Button type="button" variant="outline" onClick={detail.reload}>
        Обновить карточку кандидата
      </Button>
      {!data ? (
        <LoadState error={detail.error} retry={detail.reload} />
      ) : (
        <>
          <h3>
            {data.candidate.name} <Demo value={data.candidate.is_demo} />
          </h3>
          {!data.candidate.property_id && (
            <CandidatePropertyLink
              candidate={data.candidate}
              onChanged={reviewed}
            />
          )}
          <CandidateDossier candidate={data.candidate} onChanged={reviewed} />
          {data.candidate.property_link_kind === "LINKED" && (
            <CandidatePropertyUnlink
              key={`${data.candidate.id}:${data.candidate.property_id}:${data.candidate.revision}`}
              candidate={data.candidate}
              onChanged={reviewed}
            />
          )}
          <CandidateDossierHistory
            key={data.candidate.revision}
            candidateId={data.candidate.id}
          />
          <PdfDownload
            kind="candidates"
            id={data.candidate.id}
            label={t("PDF карточки кандидата")}
          />
          <p>
            {data.candidate.city} ·{" "}
            {data.candidate.address || "Адрес не установлен"}
            {" · "}
            {data.candidate.phase || "Очередь не установлена"}
          </p>
          <p className="monitoring-meta">
            ID {data.candidate.id} · ревизия {data.candidate.revision}
          </p>
          <h3>{t("Связанные публикации")}</h3>
          <p className="field-help">
            Показано {data.advertisements.length} из {data.advertisement_total}{" "}
            связанных публикаций, не более 100 последних. Для сверки доступны
            показанные материалы.
          </p>
          {data.advertisements.map((ad) => (
            <div className="monitoring-record" key={ad.id}>
              <Link href={`/advertisements/${ad.id}`}>{ad.source_label}</Link>
              <p>
                Дата публикации: {date(ad.published_at)}. Получено:{" "}
                {date(ad.captured_at)}.
              </p>
              {ad.source_url && (
                <p className="monitoring-meta">
                  Исходная ссылка: {ad.source_url}
                </p>
              )}
            </div>
          ))}
          {user?.role === "analyst" && (
            <form
              className="monitoring-form"
              onSubmit={compare}
              aria-label={t("Выполнить сверку кандидата")}
            >
              <h3>{t("Новая сверка")}</h3>
              <MonitoringDraftNotice
                draft={draft}
                retryError={mutation.storageError}
              />
              <p className="field-help">
                Выберите DEMO-версию в списке или оставьте «Без версии» для
                результата «Ожидает доступного реестра». Сверка реального
                материала с DEMO запрещена. Адрес, очередь, даты публикации и
                охват списка влияют на результат; совпадение названия само по
                себе недостаточно.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={onChooseSnapshot}
              >
                Выбрать версию реестра
              </Button>
              <Field label={t("Публикация для сверки")}>
                <select
                  name="advertisement_id"
                  required
                  value={advertisementId}
                  onChange={(event) =>
                    draft.update({ advertisementId: event.target.value })
                  }
                >
                  {advertisementId && !advertisementAvailable && (
                    <option value={advertisementId} disabled>
                      Выбранная публикация недоступна — выберите другую
                    </option>
                  )}
                  {data.advertisements.map((ad) => (
                    <option key={ad.id} value={ad.id}>
                      {ad.source_label}
                    </option>
                  ))}
                </select>
              </Field>
              {snapshotPicker}
              <details>
                <summary>Технический ID версии</summary>
                <p className="field-help">
                  Ручной ввод не загружает описание версии. Для проверки
                  названия и охвата используйте список выше. Выбор сохраняется в
                  этой вкладке отдельно для каждого кандидата.
                </p>
                <Field
                  label={t(
                    "ID DEMO-версии реестра (пусто — реестр недоступен)",
                  )}
                >
                  <input
                    value={snapshotId}
                    onChange={(event) => onSnapshotChange(event.target.value)}
                    maxLength={36}
                    pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
                    autoComplete="off"
                  />
                </Field>
              </details>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onSnapshotChange("")}
              >
                Сверять без реестра
              </Button>
              <Field label={t("Основание запуска сверки")}>
                <textarea
                  name="reason"
                  required
                  maxLength={1000}
                  rows={2}
                  value={draft.values.reason}
                  onChange={(event) =>
                    draft.update({
                      reason: event.target.value,
                      advertisementId,
                    })
                  }
                />
              </Field>
              <Button
                type="submit"
                disabled={
                  mutation.busy ||
                  !advertisementAvailable ||
                  (!data.candidate.is_demo && !!snapshotId.trim())
                }
                aria-busy={mutation.busy}
              >
                {mutation.busy ? "Сверка…" : "Выполнить сверку"}
              </Button>
              {!data.candidate.is_demo && !!snapshotId.trim() && (
                <p className="field-help">
                  Уберите DEMO-версию: для реального объекта доступен только
                  статус ожидания реестра.
                </p>
              )}
              {mutation.error && <Notice error={mutation.error} />}
            </form>
          )}
          {latest && (
            <div
              ref={resultRef}
              tabIndex={-1}
              className="monitoring-success monitoring-result"
              role="status"
            >
              <h3>{t("Последняя выполненная сверка")}</h3>
              <p>
                <strong>{resultLabel(latest.result)}</strong>
              </p>
              <p>{latest.explanation}</p>
              <p className="monitoring-meta">
                {date(latest.created_at)} · публикация {latest.advertisement_id}
                {" · "}версия реестра {latest.snapshot_id || "недоступна"}
              </p>
              <p>Предварительная карточка не начисляет баллы R1–R6.</p>
            </div>
          )}
          <h3>{t("Последние сверки")}</h3>
          <p className="field-help">
            Последние 20 результатов. Новая сверка не переписывает старые
            снимки.
          </p>
          {data.comparisons.length ? (
            data.comparisons.map((comparison) => (
              <article className="monitoring-record" key={comparison.id}>
                <PdfDownload
                  kind="comparisons"
                  id={comparison.id}
                  label={t("PDF сверки")}
                />
                <h4>{resultLabel(comparison.result)}</h4>
                <p>{comparison.explanation}</p>
                <p className="monitoring-meta">
                  {date(comparison.created_at)} · алгоритм{" "}
                  {comparison.algorithm_version}
                  {" · "}версия реестра {comparison.snapshot_id || "недоступна"}
                </p>
                {comparison.matched_entries.length > 0 && (
                  <RegistryEntries entries={comparison.matched_entries} />
                )}
              </article>
            ))
          ) : (
            <p className="empty">
              Сверок ещё нет. Выберите источник и выполните первую сверку.
            </p>
          )}
          <h3>{t("Инциденты кандидата")}</h3>
          <p className="field-help">
            Последние 20 карточек. Закрытая карточка сохраняет историю;
            автоматического подтверждения нарушения нет.
          </p>
          {data.incidents.length ? (
            data.incidents.map((incident) => (
              <IncidentReview
                key={incident.id}
                incident={incident}
                onChanged={reviewed}
              />
            ))
          ) : (
            <p className="empty">Предварительных инцидентов нет.</p>
          )}
        </>
      )}
    </div>
  );
}

function RegistryEntries({ entries }: { entries: RegistryEntry[] }) {
  const { t } = useLocale();
  return (
    <TableRegion label={t("Записи сохранённой версии реестра")}>
      <table>
        <thead>
          <tr>
            <th scope="col">Объект / область</th>
            <th scope="col">Документ</th>
            <th scope="col">Период действия</th>
            <th scope="col">Статус в списке</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={`${entry.document_number}:${index}`}>
              <td>
                {entry.name}
                <small>
                  {entry.city} · {entry.address || "Адрес не установлен"} ·{" "}
                  {entry.phase || "Очередь не установлена"}
                </small>
              </td>
              <td>
                {entry.mechanism === "GUARANTEE"
                  ? "Гарантия КЖК"
                  : "Разрешение МИО"}
                <small>{entry.document_number}</small>
              </td>
              <td>
                {date(entry.valid_from)}
                <small>
                  До{" "}
                  {entry.valid_until
                    ? date(entry.valid_until)
                    : "дата не указана"}
                </small>
              </td>
              <td>{entry.status === "ACTIVE" ? "Действует" : "Отозван"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableRegion>
  );
}

function RegistryVersion({
  snapshot,
  selected,
  onSelect,
}: {
  snapshot: RegistrySnapshot;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useLocale();
  const { user } = useContext(Auth);
  return (
    <article className="monitoring-record">
      <PdfDownload
        kind="registry-snapshots"
        id={snapshot.id}
        label={t("PDF версии реестра")}
      />
      <h3>
        {snapshot.label} <Demo value={snapshot.is_demo} />
      </h3>
      <p>
        {snapshot.city} ·{" "}
        {snapshot.complete
          ? "Полный учебный список"
          : "Частичный учебный список"}{" "}
        · записей: {snapshot.entries.length}
      </p>
      <div className="monitoring-dates">
        <p>
          Охват с<br />
          {date(snapshot.coverage_from)}
        </p>
        <p>
          Охват до
          <br />
          {date(snapshot.coverage_until)}
        </p>
        <p>
          Пригоден для сверки до
          <br />
          {date(snapshot.expires_at)}
        </p>
      </div>
      {user?.role === "analyst" && (
        <Button
          type="button"
          variant="outline"
          onClick={onSelect}
          aria-pressed={selected}
        >
          {selected
            ? "DEMO-версия выбрана для сверки"
            : "Выбрать DEMO-версию для сверки"}
        </Button>
      )}
      <details>
        <summary>Документы и происхождение версии</summary>
        <p className="monitoring-meta">
          ID {snapshot.id}
          <br />
          SHA-256 {snapshot.sha256}
          <br />
          Сохранена {date(snapshot.created_at)} · автор {snapshot.created_by}
        </p>
        {snapshot.entries.length ? (
          <RegistryEntries entries={snapshot.entries} />
        ) : (
          <p>
            Пустой учебный список. Отсутствие совпадения имеет смысл только при
            пригодном полном охвате.
          </p>
        )}
      </details>
    </article>
  );
}

type EntryDraft = Omit<RegistryEntry, "address" | "phase"> & {
  address: string;
  phase: string;
};
function emptyEntry(): EntryDraft {
  return {
    name: "",
    city: "",
    address: "",
    phase: "",
    mechanism: "GUARANTEE",
    document_number: "",
    valid_from: "",
    valid_until: "",
    status: "ACTIVE",
  };
}
function localDate(value: Date) {
  const parts = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return parts.toISOString().slice(0, 16);
}

function SnapshotCreate({
  onCreated,
}: {
  onCreated: (snapshot: RegistrySnapshot) => void;
}) {
  const { t } = useLocale();
  const mutation = useMonitoringCommand();
  const [entries, setEntries] = useState<{ key: number; data: EntryDraft }[]>(
    [],
  );
  const nextEntryKey = useRef(1);
  const [fields, setFields] = useState({
    label: "",
    city: "",
    coverage_from: "",
    coverage_until: "",
    expires_at: "",
    reason: "",
    complete: false,
  });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const savedRef = useRef<HTMLParagraphElement>(null);
  function fillExample() {
    const now = Date.now();
    const from = localDate(new Date(now - 366 * 86400_000));
    setFields({
      label: "DEMO учебный список разрешений",
      city: "Өскемен",
      coverage_from: from,
      coverage_until: localDate(new Date(now + 86400_000)),
      expires_at: localDate(new Date(now + 7 * 86400_000)),
      reason:
        "Синтетический пример для проверки алгоритма. Не государственные данные.",
      complete: true,
    });
    setEntries([
      {
        key: nextEntryKey.current++,
        data: {
          ...emptyEntry(),
          name: "DEMO Оқу үйі",
          city: "Өскемен",
          address: "ул. Учебная, 1",
          phase: "очередь 1",
          document_number: "DEMO-МИО-001",
          mechanism: "MIO_PERMIT",
          valid_from: from,
        },
      },
    ]);
    setSaved("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    let body;
    try {
      body = {
        ...fields,
        label: fields.label.trim(),
        city: fields.city.trim(),
        reason: fields.reason.trim(),
        is_demo: true,
        coverage_from: utc(fields.coverage_from),
        coverage_until: utc(fields.coverage_until),
        expires_at: utc(fields.expires_at),
        entries: entries.map(({ data }) => ({
          ...data,
          name: data.name.trim(),
          city: data.city.trim(),
          address: data.address.trim() || null,
          phase: data.phase.trim() || null,
          document_number: data.document_number.trim(),
          valid_from: utc(data.valid_from),
          valid_until: data.valid_until ? utc(data.valid_until) : null,
        })),
      };
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    const snapshot = await mutation.run<RegistrySnapshot>(
      `${prefix}/registry-snapshots`,
      body,
    );
    if (!snapshot) return;
    setSaved(
      `DEMO-версия «${snapshot.label}» сохранена и выбрана для сверки. Документов: ${snapshot.entries.length}.`,
    );
    onCreated(snapshot);
    requestAnimationFrame(() => savedRef.current?.focus());
  }
  function changeEntry(key: number, name: keyof EntryDraft, next: string) {
    setEntries((current) =>
      current.map((entry) =>
        entry.key === key
          ? { ...entry, data: { ...entry.data, [name]: next } }
          : entry,
      ),
    );
  }
  return (
    <form
      className="monitoring-form"
      onSubmit={submit}
      aria-label={t("Новая версия DEMO-реестра")}
    >
      <p>
        Только синтетические данные. Заполнение примера не сохраняет версию. Для
        отсутствующего документа не выдумывайте номер: удалите запись или
        оставьте список пустым.
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={fillExample}
        disabled={mutation.busy}
      >
        Заполнить DEMO-пример
      </Button>
      <div className="monitoring-fields">
        <Field label={t("Название DEMO-версии")}>
          <input
            required
            maxLength={300}
            value={fields.label}
            onChange={(event) =>
              setFields({ ...fields, label: event.target.value })
            }
          />
        </Field>
        <Field label={t("Город охвата DEMO-версии")}>
          <input
            required
            minLength={2}
            maxLength={100}
            value={fields.city}
            onChange={(event) =>
              setFields({ ...fields, city: event.target.value })
            }
          />
        </Field>
        <Field label={t("Начало охвата публикаций")}>
          <input
            required
            type="datetime-local"
            value={fields.coverage_from}
            onChange={(event) =>
              setFields({ ...fields, coverage_from: event.target.value })
            }
          />
        </Field>
        <Field label={t("Окончание охвата публикаций")}>
          <input
            required
            type="datetime-local"
            min={fields.coverage_from || undefined}
            value={fields.coverage_until}
            onChange={(event) =>
              setFields({ ...fields, coverage_until: event.target.value })
            }
          />
        </Field>
        <Field label={t("Версия пригодна до")}>
          <input
            required
            type="datetime-local"
            value={fields.expires_at}
            onChange={(event) =>
              setFields({ ...fields, expires_at: event.target.value })
            }
          />
        </Field>
      </div>
      <p className="field-help">
        Время вводится в часовом поясе устройства (
        {Intl.DateTimeFormat().resolvedOptions().timeZone}). Система хранит
        точный момент и показывает даты по времени Кызылорды.
      </p>
      <label className="monitoring-check">
        <input
          type="checkbox"
          checked={fields.complete}
          onChange={(event) =>
            setFields({ ...fields, complete: event.target.checked })
          }
        />
        <span>
          Полный учебный список для указанного города и периода. Только полный
          пригодный список позволяет получить «совпадение не найдено».
        </span>
      </label>
      <h3>Документы DEMO-версии</h3>
      <p className="field-help">
        Сейчас записей: {entries.length}. Пустой полный DEMO-список допустим для
        учебного сценария отсутствия совпадения.
      </p>
      {entries.map(({ key, data }, index) => (
        <fieldset className="monitoring-entry" key={key}>
          <legend>DEMO-документ {index + 1}</legend>
          <div className="monitoring-fields">
            <Field label={`Название объекта, документ ${index + 1}`}>
              <input
                required
                minLength={2}
                maxLength={300}
                value={data.name}
                onChange={(event) =>
                  changeEntry(key, "name", event.target.value)
                }
              />
            </Field>
            <Field label={`Город объекта, документ ${index + 1}`}>
              <input
                required
                minLength={2}
                maxLength={100}
                value={data.city}
                onChange={(event) =>
                  changeEntry(key, "city", event.target.value)
                }
              />
            </Field>
            <Field
              label={`Адрес объекта, документ ${index + 1} (если известен)`}
            >
              <input
                maxLength={300}
                value={data.address}
                onChange={(event) =>
                  changeEntry(key, "address", event.target.value)
                }
              />
            </Field>
            <Field
              label={`Очередь / корпус, документ ${index + 1} (если известны)`}
            >
              <input
                maxLength={100}
                value={data.phase}
                onChange={(event) =>
                  changeEntry(key, "phase", event.target.value)
                }
              />
            </Field>
            <Field label={`Основание, документ ${index + 1}`}>
              <select
                value={data.mechanism}
                onChange={(event) =>
                  changeEntry(key, "mechanism", event.target.value)
                }
              >
                <option value="GUARANTEE">Гарантия КЖК</option>
                <option value="MIO_PERMIT">Разрешение МИО</option>
              </select>
            </Field>
            <Field label={`Номер документа ${index + 1}`}>
              <input
                required
                maxLength={200}
                value={data.document_number}
                onChange={(event) =>
                  changeEntry(key, "document_number", event.target.value)
                }
              />
            </Field>
            <Field label={`Действует с, документ ${index + 1}`}>
              <input
                required
                type="datetime-local"
                value={data.valid_from}
                onChange={(event) =>
                  changeEntry(key, "valid_from", event.target.value)
                }
              />
            </Field>
            <Field
              label={`Действует до, документ ${index + 1} (если известно)`}
            >
              <input
                type="datetime-local"
                min={data.valid_from || undefined}
                value={data.valid_until || ""}
                onChange={(event) =>
                  changeEntry(key, "valid_until", event.target.value)
                }
              />
            </Field>
            <Field label={`Статус документа ${index + 1}`}>
              <select
                value={data.status}
                onChange={(event) =>
                  changeEntry(key, "status", event.target.value)
                }
              >
                <option value="ACTIVE">Действует</option>
                <option value="REVOKED">Отозван</option>
              </select>
            </Field>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              setEntries(entries.filter((entry) => entry.key !== key))
            }
            disabled={mutation.busy}
          >
            Удалить DEMO-документ {index + 1}
          </Button>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={entries.length >= 200 || mutation.busy}
        onClick={() =>
          setEntries([
            ...entries,
            { key: nextEntryKey.current++, data: emptyEntry() },
          ])
        }
      >
        Добавить DEMO-документ
      </Button>
      <Field label={t("Обоснование создания DEMO-версии")}>
        <textarea
          required
          rows={3}
          maxLength={1000}
          value={fields.reason}
          onChange={(event) =>
            setFields({ ...fields, reason: event.target.value })
          }
        />
      </Field>
      <Button type="submit" disabled={mutation.busy} aria-busy={mutation.busy}>
        {mutation.busy ? "Сохранение версии…" : "Сохранить DEMO-версию"}
      </Button>
      {(error || mutation.error) && <Notice error={error || mutation.error} />}
      {saved && (
        <p
          role="status"
          tabIndex={-1}
          className="monitoring-success"
          ref={savedRef}
        >
          {saved}
        </p>
      )}
    </form>
  );
}

function CandidateDossierHistory({ candidateId }: { candidateId: string }) {
  const { t } = useLocale();
  const [page, setPage] = useState(1);
  const path = `${prefix}/candidates/${candidateId}/dossier-history?page=${page}&page_size=10`;
  const history = useData<Page<AuditEvent>>(path);
  const data =
    history.resolvedPath === path && !history.error ? history.data : null;
  const labels: Record<string, string> = {
    MONITORING_DOSSIER_CREATED: "Создано досье из кандидата",
    MONITORING_DOSSIER_LINKED: "Кандидат связан с досье",
    MONITORING_DOSSIER_UNLINKED: "Отменена ошибочная связь кандидата",
  };
  return (
    <details className="monitoring-record">
      <summary>История связей с досье</summary>
      {!data ? (
        <LoadState error={history.error} retry={history.reload} />
      ) : (
        <>
          <p>
            Сохранённых решений: {data.total}. Отмена связи не удаляет
            предыдущие решения.
          </p>
          {data.items.map((event) => {
            const propertyId =
              typeof event.details.property_id === "string"
                ? event.details.property_id
                : "";
            const identity = event.details.property_identity;
            const name =
              identity &&
              typeof identity === "object" &&
              "name" in identity &&
              typeof identity.name === "string"
                ? identity.name
                : typeof event.details.name === "string"
                  ? event.details.name
                  : propertyId;
            return (
              <article className="monitoring-record" key={event.id}>
                <strong>
                  {labels[event.action] || "Решение по связи с досье"}
                </strong>
                <p>
                  {date(event.occurred_at)} ·{" "}
                  {event.actor_display_name || "Аналитик"}
                </p>
                {propertyId && (
                  <p>
                    <Link href={`/properties/${propertyId}`}>{name}</Link>
                  </p>
                )}
                <p>{event.reason || "Причина в старой записи не указана"}</p>
                <details>
                  <summary>Данные решения</summary>
                  <p>
                    Ревизия кандидата: {event.old_revision ?? "не указана"} →{" "}
                    {event.new_revision ?? "не указана"}. ID решения: {event.id}
                  </p>
                </details>
              </article>
            );
          })}
          {!data.total && (
            <p className="empty">Решений по связи с досье пока нет.</p>
          )}
          <Pagination
            label={t("Страницы истории связей")}
            page={data.page}
            pageSize={data.page_size}
            total={data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </details>
  );
}

function CandidatePropertyUnlink({
  candidate,
  onChanged,
}: {
  candidate: MonitoringCandidate;
  onChanged: () => void;
}) {
  const { t } = useLocale();
  const { user } = useContext(Auth);
  const draft = useReviewDraft(
    user?.id || "",
    `monitoring:dossier-unlink:${candidate.id}:${candidate.property_id}:${candidate.revision}`,
    { reason: "" },
  );
  const mutation = useMonitoringCommand(
    `dossier-unlink:${candidate.id}:${candidate.property_id}:${candidate.revision}`,
  );
  const [target, setTarget] = useState<PropertyDetail | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api<PropertyDetail>(`/properties/${candidate.property_id}`, {
      signal: controller.signal,
    })
      .then((detail) => {
        setTarget(detail);
        setError("");
      })
      .catch((failure) => {
        if (failure.name !== "AbortError") {
          setTarget(null);
          setError(failure.message);
        }
      });
    return () => controller.abort();
  }, [candidate.property_id, attempt]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target || target.property.id !== candidate.property_id) return;
    const form = new FormData(event.currentTarget);
    const result = await mutation.run<MonitoringCandidate>(
      `${prefix}/candidates/${candidate.id}/unlink-dossier`,
      {
        property_id: candidate.property_id,
        expected_revision: candidate.revision,
        expected_property_revision: target.property.revision,
        reason: draft.values.reason.trim(),
        unlink_confirmed: form.get("unlink_confirmed") === "on",
      },
    );
    if (!result || result.property_id) return;
    draft.saved();
    onChanged();
  }
  if (user?.role !== "analyst") return null;
  return (
    <details className="monitoring-record">
      <summary>Исправить ошибочную связь</summary>
      <p>
        Отмените текущую связь кандидата. После отмены нужное досье выбирается
        отдельным действием. Публикации, факторы и решения остаются на своих
        местах и требуют самостоятельной проверки.
      </p>
      <MonitoringDraftNotice draft={draft} retryError={mutation.storageError} />
      {!target || target.property.id !== candidate.property_id ? (
        <LoadState error={error} retry={() => setAttempt((n) => n + 1)} />
      ) : (
        <>
          <p>
            Сейчас связано: {target.property.name} · {target.property.city} ·{" "}
            {target.property.address}. <Demo value={target.property.is_demo} />
          </p>
          <form
            key={`${candidate.revision}:${target.property.revision}`}
            className="monitoring-form"
            aria-label={t("Отмена ошибочной связи с досье")}
            onSubmit={submit}
          >
            <fieldset
              className="monitoring-link-fields monitoring-form"
              disabled={mutation.busy}
            >
              <legend className="sr-only">Подтверждение отмены связи</legend>
              <Field label={t("Причина отмены связи")}>
                <textarea
                  required
                  maxLength={1000}
                  rows={2}
                  value={draft.values.reason}
                  onChange={(e) => draft.update({ reason: e.target.value })}
                />
              </Field>
              <label>
                <input type="checkbox" name="unlink_confirmed" required /> Я
                проверил ошибку и подтверждаю отмену этой связи
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTarget(null);
                  setAttempt((n) => n + 1);
                }}
              >
                Обновить сведения связанного досье
              </Button>
              <Button
                type="submit"
                variant="danger"
                disabled={mutation.busy}
                aria-busy={mutation.busy}
              >
                {mutation.busy ? "Отмена…" : "Отменить ошибочную связь"}
              </Button>
            </fieldset>
          </form>
        </>
      )}
      {mutation.error && <Notice error={mutation.error} />}
    </details>
  );
}

function CandidatePropertyLink({
  candidate,
  onChanged,
}: {
  candidate: MonitoringCandidate;
  onChanged: () => void;
}) {
  const { t } = useLocale();
  const { user } = useContext(Auth);
  const draft = useReviewDraft(
    user?.id || "",
    `monitoring:dossier-link:${candidate.id}`,
    { propertyId: "", reason: "" },
  );
  const mutation = useMonitoringCommand(`dossier-link:${candidate.id}`);
  const [target, setTarget] = useState<PropertyDetail | null>(null);
  const [targetError, setTargetError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!draft.values.propertyId) return;
    const controller = new AbortController();
    api<PropertyDetail>(`/properties/${draft.values.propertyId}`, {
      signal: controller.signal,
    })
      .then((detail) => {
        setTarget(detail);
        setTargetError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setTarget(null);
          setTargetError(error.message);
        }
      });
    return () => controller.abort();
  }, [draft.values.propertyId, attempt]);
  const selected =
    target?.property.id === draft.values.propertyId ? target.property : null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const result = await mutation.run<MonitoringCandidate>(
      `${prefix}/candidates/${candidate.id}/link-dossier`,
      {
        property_id: selected.id,
        expected_revision: candidate.revision,
        expected_property_revision: selected.revision,
        identity_checked: form.get("identity_checked") === "on",
        reason: draft.values.reason.trim(),
      },
    );
    if (!result?.property_id) return;
    draft.saved();
    onChanged();
  }
  if (user?.role !== "analyst") return null;
  return (
    <details className="monitoring-record">
      <summary>{t("Связать с существующим досье")}</summary>
      <p>
        Кандидат: {candidate.name} · {candidate.city} ·{" "}
        {candidate.address || "Адрес не установлен"} ·{" "}
        {candidate.phase || "Очередь не установлена"}.{" "}
        <Demo value={candidate.is_demo} />
      </p>
      <MonitoringDraftNotice draft={draft} retryError={mutation.storageError} />
      <fieldset
        className="monitoring-link-fields monitoring-form"
        disabled={mutation.busy}
      >
        <legend className="sr-only">
          Выбор и подтверждение досье кандидата
        </legend>
        <PropertyPicker
          value={draft.values.propertyId}
          onChange={(propertyId) => {
            draft.update({ propertyId });
            setTarget(null);
            setTargetError("");
          }}
          isDemo={candidate.is_demo}
        />
        {draft.values.propertyId &&
          (!selected ? (
            <LoadState
              error={targetError}
              retry={() => setAttempt((n) => n + 1)}
            />
          ) : (
            <>
              <p>
                Выбрано досье:{" "}
                <Link
                  href={`/properties/${selected.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {selected.name}
                </Link>{" "}
                · {selected.city} · {selected.address} ·{" "}
                {selected.developer.name}
                . <Demo value={selected.is_demo} />
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTarget(null);
                  setAttempt((n) => n + 1);
                }}
              >
                Обновить сведения досье
              </Button>
              <form
                key={`${selected.id}:${selected.revision}`}
                className="monitoring-form"
                aria-label={t("Связь кандидата с досье")}
                onSubmit={submit}
              >
                <Field label={t("Основание связи с досье")}>
                  <textarea
                    required
                    maxLength={1000}
                    rows={2}
                    value={draft.values.reason}
                    onChange={(e) => draft.update({ reason: e.target.value })}
                  />
                </Field>
                <label>
                  <input type="checkbox" name="identity_checked" required /> Я
                  проверил, что это тот же объект и очередь / корпус
                </label>
                <p className="field-help">
                  Проверьте адрес, очередь и застройщика по источникам. Связь
                  кандидата не переносит публикации, решения по инцидентам,
                  факторы или сигналы. После сохранения смена досье этим
                  действием недоступна.
                </p>
                <Button
                  type="submit"
                  disabled={mutation.busy}
                  aria-busy={mutation.busy}
                >
                  {mutation.busy
                    ? "Сохранение связи…"
                    : "Подтвердить связь с досье"}
                </Button>
              </form>
            </>
          ))}
      </fieldset>
      {mutation.error && <Notice error={mutation.error} />}
    </details>
  );
}

function CandidateDossier({
  candidate,
  onChanged,
}: {
  candidate: MonitoringCandidate;
  onChanged: () => void;
}) {
  const { t } = useLocale();
  const { user } = useContext(Auth);
  const draft = useReviewDraft(
    user?.id || "",
    `monitoring:dossier:${candidate.id}`,
    {
      name: candidate.phase
        ? `${candidate.name} · ${candidate.phase}`
        : candidate.name,
      address: candidate.address || "",
      developerName: "",
      developerBin: "",
      reason: "",
    },
  );
  const mutation = useMonitoringCommand(`dossier:${candidate.id}`);
  const [createdId, setCreatedId] = useState("");
  const propertyId = candidate.property_id || createdId;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await mutation.run<MonitoringCandidate>(
      `${prefix}/candidates/${candidate.id}/dossier`,
      {
        expected_revision: candidate.revision,
        name: draft.values.name.trim(),
        address: draft.values.address.trim(),
        developer_name: draft.values.developerName.trim(),
        developer_bin: draft.values.developerBin.trim() || null,
        reason: draft.values.reason.trim(),
        identity_checked: form.get("identity_checked") === "on",
      },
    );
    if (!result?.property_id) return;
    draft.saved();
    setCreatedId(result.property_id);
    onChanged();
  }
  if (propertyId)
    return (
      <p role="status">
        <Link href={`/properties/${propertyId}`}>
          {candidate.property_link_kind === "LINKED"
            ? "Открыть связанное досье"
            : "Открыть созданное досье"}
        </Link>
        {candidate.property_link_kind === "CREATED" && (
          <small className="field-help">
            {" "}
            Происхождение создания сохраняется; отмена этой связи здесь
            недоступна.
          </small>
        )}
      </p>
    );
  if (user?.role !== "analyst") return null;
  return (
    <details className="monitoring-record">
      <summary>{t("Создать досье объекта")}</summary>
      <p>
        Проверьте название, очередь, адрес и застройщика по источникам. Город:{" "}
        {candidate.city}. <Demo value={candidate.is_demo} />
      </p>
      <Link
        href={`/properties?${new URLSearchParams({ q: candidate.name, is_demo: String(candidate.is_demo) })}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Проверить дубли в реестре (новая вкладка)
      </Link>
      <form
        className="monitoring-form"
        aria-label={t("Создание досье из кандидата")}
        onSubmit={submit}
      >
        <MonitoringDraftNotice
          draft={draft}
          retryError={mutation.storageError}
        />
        <p className="field-help">Все поля обязательны, кроме БИН.</p>
        <div className="monitoring-fields">
          <Field label={t("Название объекта и очередь")}>
            <input
              required
              minLength={2}
              maxLength={300}
              value={draft.values.name}
              onChange={(e) => draft.update({ name: e.target.value })}
            />
          </Field>
          <Field label={t("Адрес объекта")}>
            <input
              required
              minLength={2}
              maxLength={300}
              value={draft.values.address}
              onChange={(e) => draft.update({ address: e.target.value })}
            />
          </Field>
          <Field label={t("Название застройщика")}>
            <input
              required
              minLength={2}
              maxLength={300}
              value={draft.values.developerName}
              onChange={(e) => draft.update({ developerName: e.target.value })}
            />
          </Field>
          <Field label={t("БИН застройщика (если известен)")}>
            <input
              inputMode="numeric"
              pattern="[0-9]{12}"
              maxLength={12}
              value={draft.values.developerBin}
              onChange={(e) => draft.update({ developerBin: e.target.value })}
            />
          </Field>
        </div>
        <Field label={t("Основание создания досье")}>
          <textarea
            required
            maxLength={1000}
            rows={2}
            value={draft.values.reason}
            onChange={(e) => draft.update({ reason: e.target.value })}
          />
        </Field>
        <label>
          <input type="checkbox" name="identity_checked" required /> Я проверил
          сведения и отсутствие дубля в реестре
        </label>
        <p className="field-help">
          Привязка публикаций этим действием не меняется. Правовой статус и
          стадия будут неизвестны; факторов риска и сигнала это действие не
          подтверждает.
        </p>
        <Button
          type="submit"
          disabled={mutation.busy}
          aria-busy={mutation.busy}
        >
          {mutation.busy ? "Создание…" : "Создать новое досье"}
        </Button>
        {mutation.error && <Notice error={mutation.error} />}
      </form>
    </details>
  );
}

function IncidentReview({
  incident,
  onChanged,
}: {
  incident: MonitoringIncident;
  onChanged: () => void;
}) {
  const { t } = useLocale();
  const { user } = useContext(Auth);
  const draft = useReviewDraft(
    user?.id || "",
    `monitoring:incident:${incident.id}`,
    { state: "IN_REVIEW", reason: "", closeReason: "" },
  );
  const targetState = ["IN_REVIEW", "WAITING_DATA", "CLOSED"].includes(
    draft.values.state,
  )
    ? (draft.values.state as IncidentState)
    : "IN_REVIEW";
  const mutation = useMonitoringCommand(`incident:${incident.id}`);
  const [saved, setSaved] = useState("");
  const resultRef = useRef<HTMLParagraphElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const updated = await mutation.run<MonitoringIncident>(
      `${prefix}/incidents/${incident.id}/review`,
      {
        expected_revision: incident.revision,
        state: targetState,
        reason: value(form, "reason"),
        close_reason:
          targetState === "CLOSED" ? value(form, "close_reason") : null,
      },
    );
    if (!updated) return;
    draft.update({ state: "IN_REVIEW", reason: "", closeReason: "" });
    draft.saved();
    setSaved(`Решение сохранено: ${incidentLabels[updated.state]}.`);
    onChanged();
    requestAnimationFrame(() => resultRef.current?.focus());
  }
  return (
    <article
      className="monitoring-record"
      aria-label={`Инцидент ${incident.id}`}
    >
      <h4>{resultLabel(incident.rule_code as MonitoringResult)}</h4>
      <p>
        <strong>{incidentLabels[incident.state]}</strong> · ревизия{" "}
        {incident.revision} <Demo value={incident.is_demo} />
      </p>
      <p className="monitoring-meta">
        ID {incident.id} · обновлён {date(incident.updated_at)}
      </p>
      {incident.close_reason && (
        <p>Причина закрытия: {closeLabels[incident.close_reason]}</p>
      )}
      {user?.role === "analyst" && incident.state !== "CLOSED" && (
        <form
          className="monitoring-form"
          onSubmit={submit}
          aria-label={t("Решение по предварительному инциденту")}
        >
          <MonitoringDraftNotice
            draft={draft}
            retryError={mutation.storageError}
          />
          <Field label={t("Новое состояние инцидента")}>
            <select
              value={targetState}
              onChange={(event) => draft.update({ state: event.target.value })}
            >
              <option value="IN_REVIEW">В работе</option>
              <option value="WAITING_DATA">Ожидает данных</option>
              <option value="CLOSED">Закрыт</option>
            </select>
          </Field>
          {targetState === "CLOSED" && (
            <Field label={t("Причина закрытия инцидента")}>
              <select
                name="close_reason"
                required
                value={
                  Object.hasOwn(closeLabels, draft.values.closeReason)
                    ? draft.values.closeReason
                    : ""
                }
                onChange={(event) =>
                  draft.update({ closeReason: event.target.value })
                }
              >
                <option value="" disabled>
                  Выберите причину
                </option>
                {Object.entries(closeLabels).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label={t("Обоснование решения по инциденту")}>
            <textarea
              name="reason"
              required
              maxLength={1000}
              rows={3}
              value={draft.values.reason}
              onChange={(event) => draft.update({ reason: event.target.value })}
            />
          </Field>
          {targetState === "CLOSED" && (
            <p className="field-help">
              Закрытая карточка сохраняется в истории. Повторное открытие в этом
              этапе не поддерживается.
            </p>
          )}
          <Button
            type="submit"
            variant="outline"
            disabled={mutation.busy}
            aria-busy={mutation.busy}
          >
            {mutation.busy
              ? "Сохранение решения…"
              : "Сохранить решение по инциденту"}
          </Button>
          {mutation.error && <Notice error={mutation.error} />}
        </form>
      )}
      {saved && (
        <p
          role="status"
          tabIndex={-1}
          ref={resultRef}
          className="monitoring-success"
        >
          {saved}
        </p>
      )}
      <details>
        <summary>История решений инцидента</summary>
        <ol aria-label={t("История предварительного инцидента")}>
          {incident.history.map((entry, index) => (
            <li key={`${entry.occurred_at}:${index}`}>
              <p>
                {incidentLabels[entry.state]} · {date(entry.occurred_at)}
              </p>
              <p>{entry.reason}</p>
              <p className="monitoring-meta">
                {entry.action} · автор {entry.actor_id}
              </p>
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}
