"use client";

import Link from "next/link";
import { useContext, useEffect, useState } from "react";
import { date } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import type { Page } from "@/lib/types";
import { useReviewDraft } from "@/lib/use-review-draft";
import { useMonitoringCommand } from "@/lib/use-monitoring-command";
import {
  positive,
  priorities,
  priorityNames,
  useV2Navigation,
  uuid,
  type Finding,
  type FindingDetail,
  type Observation,
} from "@/lib/monitoring-v2";
import { Auth, Demo, LoadState, useData } from "@/components/workspace";
import { V2Notice as Notice } from "@/components/monitoring-v2-feedback";
import { Button } from "@/components/ui/button";
import { V2Pagination as Pagination } from "@/components/monitoring-v2-feedback";
import { TableRegion } from "@/components/ui/table-region";

export function MonitoringFindings() {
  const { t } = useLocale();
  const { params, select } = useV2Navigation();
  const page = positive(params.get("v2_findings_page"))
    ? Number(params.get("v2_findings_page"))
    : 1;
  const priority = params.get("v2_priority") || "";
  const imported = params.get("v2_imported") || "";
  const run = params.get("v2_findings_run_id");
  const query = new URLSearchParams({ page: String(page), page_size: "10" });
  if (priorities.some((p) => p === priority)) query.set("priority", priority);
  if (imported === "true" || imported === "false")
    query.set("imported", imported);
  if (run && uuid.test(run)) query.set("run_id", run);
  const path = `/monitoring/findings?${query}`;
  const rows = useData<Page<Finding>>(path);
  const data = rows.resolvedPath === path && !rows.error ? rows.data : null;
  const id = params.get("v2_finding_id");
  const version = params.get("v2_finding_version");
  const valid =
    id &&
    uuid.test(id) &&
    params.getAll("v2_finding_id").length === 1 &&
    (version === null ||
      (positive(version) && params.getAll("v2_finding_version").length === 1));
  return (
    <>
      <SavedRun onCaptured={rows.reload} />
      <section
        className="panel v2-panel"
        aria-label={t("Находки V2", "V2 табылғандары")}
      >
        <div className="panel-heading">
          <h3>{t("Находки V2", "V2 табылғандары")}</h3>
          <Button variant="outline" onClick={rows.reload}>
            {t("Обновить находки", "Табылғандарды жаңарту")}
          </Button>
        </div>
        <p>
          {t(
            "Приоритет рассчитан по тексту сохранённой версии. География и объект не подтверждены; реестр ожидает проверки. NOT_RELEVANT — гипотеза, запись не удаляется.",
            "Басымдық сақталған нұсқаның мәтіні бойынша есептелген. География мен нысан расталмаған; тізілімді тексеру қажет. NOT_RELEVANT — болжам, жазба жойылмайды.",
          )}
        </p>
        <div className="monitoring-fields">
          <label className="monitoring-field">
            <span>{t("Приоритет находок", "Табылғандардың басымдығы")}</span>
            <select
              value={priority}
              onChange={(e) =>
                select({
                  v2_priority: e.target.value || null,
                  v2_findings_page: null,
                })
              }
            >
              <option value="">
                {t("Все приоритеты", "Барлық басымдықтар")}
              </option>
              {priorities.map((p) => (
                <option value={p} key={p}>
                  {t(...priorityNames[p])}
                </option>
              ))}
            </select>
          </label>
          <label className="monitoring-field">
            <span>{t("Импорт находок", "Табылғандар импорты")}</span>
            <select
              value={imported}
              onChange={(e) =>
                select({
                  v2_imported: e.target.value || null,
                  v2_findings_page: null,
                })
              }
            >
              <option value="">{t("Все версии", "Барлық нұсқалар")}</option>
              <option value="false">
                {t("Не импортированы", "Импортталмаған")}
              </option>
              <option value="true">{t("Импортированы", "Импортталған")}</option>
            </select>
          </label>
        </div>
        {run && (
          <p className="monitoring-url">
            {t("Версии из запуска", "Іске қосудан алынған нұсқалар")}: {run}{" "}
            <Button
              variant="outline"
              onClick={() =>
                select({ v2_findings_run_id: null, v2_findings_page: null })
              }
            >
              {t("Показать актуальные версии", "Ағымдағы нұсқаларды көрсету")}
            </Button>
          </p>
        )}
        {run && !uuid.test(run) ? (
          <Notice
            error={t(
              "Некорректная ссылка запуска.",
              "Іске қосу сілтемесі қате.",
            )}
          />
        ) : !data ? (
          <LoadState error={rows.error} retry={rows.reload} />
        ) : (
          <>
            {!data.total && (
              <p>
                {t(
                  "По этим фильтрам находок нет. Это не подтверждает отсутствие рекламы, нарушений или применимого основания.",
                  "Бұл сүзгілер бойынша табылғандар жоқ. Бұл жарнаманың, бұзушылықтардың немесе қолданылатын негіздің жоқтығын растамайды.",
                )}
              </p>
            )}
            {!!data.items.length && (
              <TableRegion
                label={t("Таблица находок V2", "V2 табылғандарының кестесі")}
              >
                <table className="v2-findings-table">
                  <thead>
                    <tr>
                      <th>{t("Источник и версия", "Дереккөз және нұсқа")}</th>
                      <th>
                        {t("Предварительный приоритет", "Алдын ала басымдық")}
                      </th>
                      <th>
                        {t("Опубликовано / получено", "Жарияланған / алынған")}
                      </th>
                      <th>{t("Импорт", "Импорт")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((row) => (
                      <tr key={row.version_id}>
                        <td>
                          <Button
                            variant="outline"
                            onClick={() =>
                              select({
                                v2_finding_id: row.id,
                                v2_finding_version: String(row.version),
                              })
                            }
                          >
                            Threads · {row.external_id} · v{row.version}
                          </Button>{" "}
                          <Demo value={row.is_demo} />
                        </td>
                        <td>
                          {t(
                            ...(priorityNames[row.priority] || [
                              row.priority,
                              row.priority,
                            ]),
                          )}
                          <p>
                            {t(
                              "Ожидает проверки реестра",
                              "Тізілім тексеруін күтуде",
                            )}
                          </p>
                        </td>
                        <td>
                          {row.published_at
                            ? date(row.published_at)
                            : t("Не установлена", "Анықталмаған")}
                          <br />
                          {date(row.captured_at)}
                        </td>
                        <td>
                          {row.advertisement_id ? (
                            <Link
                              href={`/advertisements/${row.advertisement_id}`}
                            >
                              {t("Открыть материал", "Материалды ашу")}
                            </Link>
                          ) : (
                            t("Не импортирована", "Импортталмаған")
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableRegion>
            )}
            <Pagination
              page={page}
              pageSize={10}
              total={data.total}
              onPageChange={(n) => select({ v2_findings_page: String(n) })}
              label={t("Страницы находок", "Табылғандар беттері")}
            />
          </>
        )}
      </section>
      {id && !valid && (
        <Notice
          error={t(
            "Некорректная ссылка находки или версии.",
            "Табылған дерек немесе нұсқа сілтемесі қате.",
          )}
        />
      )}
      {valid && (
        <SelectedFinding
          key={`${id}:${version || "current"}`}
          id={id!}
          version={version}
          onImported={rows.reload}
        />
      )}
    </>
  );
}

function SavedRun({ onCaptured }: { onCaptured: () => void }) {
  const { t } = useLocale();
  const { params, select } = useV2Navigation();
  const id = params.get("v2_run_id");
  const [input, setInput] = useState(id || "");
  useEffect(() => {
    setInput(id || "");
  }, [id]);
  return (
    <section
      className="panel v2-panel"
      aria-label={t("Сохранённый запуск V2", "V2 сақталған іске қосуы")}
    >
      <h3>
        {t("Сохранённый запуск → находки", "Сақталған іске қосу → табылғандар")}
      </h3>
      <p>
        {t(
          "Укажите ID запуска V2 из истории или выполните один поиск выше. Чтение запуска и создание находок не обращаются к источнику повторно.",
          "Тарихтан V2 іске қосу ID-сін көрсетіңіз немесе жоғарыда бір іздеуді орындаңыз. Іске қосуды оқу және табылғандарды жасау дереккөзге қайта сұрау жібермейді.",
        )}
      </p>
      <label className="monitoring-field">
        <span>
          {t("ID сохранённого запуска V2", "V2 сақталған іске қосу ID-сі")}
        </span>
        <input
          value={input}
          maxLength={36}
          onChange={(e) => setInput(e.target.value)}
        />
      </label>
      <Button
        variant="outline"
        disabled={!uuid.test(input)}
        onClick={() => select({ v2_run_id: input })}
      >
        {t("Прочитать запуск V2", "V2 іске қосуын оқу")}
      </Button>
      {id && (!uuid.test(id) || params.getAll("v2_run_id").length !== 1) ? (
        <Notice
          error={t("Некорректный ID запуска V2.", "V2 іске қосу ID-сі қате.")}
        />
      ) : (
        id && <RunCapture key={id} id={id} onCaptured={onCaptured} />
      )}
    </section>
  );
}

function RunCapture({
  id,
  onCaptured,
}: {
  id: string;
  onCaptured: () => void;
}) {
  const { user } = useContext(Auth);
  const { t } = useLocale();
  const { select, href } = useV2Navigation();
  const path = `/monitoring/runs/${id}`;
  const run = useData<{
    state: string;
    query: { query?: string; profile_version_id?: string };
    returned_count: number | null;
    result: { has_more: boolean } | null;
  }>(path);
  const action = useMonitoringCommand(`v2:capture:${id}`);
  const draft = useReviewDraft(user?.id || "", `v2:capture:${id}`, {
    reason: "",
  });
  const [message, setMessage] = useState("");
  if (!run.data || run.error || run.resolvedPath !== path)
    return <LoadState error={run.error} retry={run.reload} />;
  const saved = run.data;
  const capturable =
    ["SUCCEEDED", "EMPTY"].includes(saved.state) &&
    !!saved.query.profile_version_id &&
    !!saved.result;
  async function capture() {
    const result = await action.run<{
      outcome: string;
      new_findings: number;
      new_versions: number;
    }>("/monitoring/findings/capture", {
      run_id: id,
      reason: draft.values.reason.trim(),
    });
    if (!result) return;
    onCaptured();
    select({ v2_findings_run_id: id, v2_findings_page: null });
    setMessage(
      `${t("Страница обработана", "Бет өңделді")}: ${result.outcome}. ${t("Новых находок / версий", "Жаңа табылғандар / нұсқалар")}: ${result.new_findings} / ${result.new_versions}.`,
    );
  }
  return (
    <div className="v2-profile">
      <p>
        {t("Состояние запуска", "Іске қосу күйі")}: {saved.state} ·{" "}
        {t("Получено записей", "Алынған жазбалар")}:{" "}
        {saved.returned_count ?? "—"}
      </p>
      <p className="v2-original">{saved.query.query}</p>
      <p>
        {saved.result?.has_more
          ? t(
              "PARTIAL: у источника есть ещё страницы. Они не получены.",
              "PARTIAL: дереккөзде басқа беттер бар. Олар алынбаған.",
            )
          : t(
              "Одна страница. Полное покрытие не подтверждено.",
              "Бір бет. Толық қамту расталмаған.",
            )}
      </p>
      <div className="monitoring-actions">
        <Button variant="outline" onClick={run.reload}>
          {t(
            "Перечитать сохранённый запуск",
            "Сақталған іске қосуды қайта оқу",
          )}
        </Button>
        <Link href={href({ section: "runs", run_id: id })}>
          {t("Подробности запуска", "Іске қосу мәліметтері")}
        </Link>
        <Button
          variant="outline"
          onClick={() =>
            select({ v2_findings_run_id: id, v2_findings_page: null })
          }
        >
          {t("Находки этого запуска", "Осы іске қосудың табылғандары")}
        </Button>
      </div>
      {!capturable && (
        <p>
          {t(
            "Создание находок доступно только для успешно сохранённой страницы профиля V2. Ошибка или блокировка не дают вывод о рекламе или R1.",
            "Табылғандарды жасау V2 профилінің сәтті сақталған беті үшін ғана қолжетімді. Қате не бұғаттау жарнама немесе R1 туралы қорытынды бермейді.",
          )}
        </p>
      )}
      {user?.role === "analyst" && capturable && (
        <fieldset disabled={action.busy}>
          <legend>
            {t("Отдельное сохранение находок", "Табылғандарды бөлек сақтау")}
          </legend>
          <label className="monitoring-field">
            <span>
              {t("Причина сохранения находок", "Табылғандарды сақтау себебі")}
            </span>
            <textarea
              maxLength={2000}
              value={draft.values.reason}
              onChange={(e) => draft.update({ reason: e.target.value })}
            />
          </label>
          <Button
            disabled={!draft.values.reason.trim()}
            onClick={() => void capture()}
          >
            {action.busy
              ? t("Сохранение…", "Сақталуда…")
              : t(
                  "Сохранить находки из запуска",
                  "Іске қосудан табылғандарды сақтау",
                )}
          </Button>
          <Notice
            error={action.error || action.storageError || draft.storageError}
          />
        </fieldset>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}

function SelectedFinding({
  id,
  version,
  onImported,
}: {
  id: string;
  version: string | null;
  onImported: () => void;
}) {
  const { t } = useLocale();
  const { select } = useV2Navigation();
  const path = `/monitoring/findings/${id}${version ? `?version=${version}` : ""}`;
  const detail = useData<FindingDetail>(path);
  const [page, setPage] = useState(1);
  const versionsPath = `/monitoring/findings/${id}/versions?page=${page}&page_size=10`;
  const versions = useData<Page<Finding>>(versionsPath);
  return (
    <section
      className="panel v2-panel"
      aria-label={t("Выбранная находка V2", "Таңдалған V2 табылғаны")}
    >
      <div className="panel-heading">
        <h3>{t("Версия находки", "Табылған дерек нұсқасы")}</h3>
        <Button
          variant="outline"
          onClick={() => {
            detail.reload();
            versions.reload();
          }}
        >
          {t("Обновить выбранную находку", "Таңдалған табылғанды жаңарту")}
        </Button>
      </div>
      <details>
        <summary>
          {t("История версий находки", "Табылған нұсқаларының тарихы")}
        </summary>
        <p>
          {t(
            "Номер отражает порядок записи. Актуальная версия определяется датой получения; поздняя обработка старой страницы её не заменяет.",
            "Нөмір жазу ретін көрсетеді. Ағымдағы нұсқа алу уақытымен анықталады; ескі бетті кейін өңдеу оны алмастырмайды.",
          )}
        </p>
        <Button
          variant="outline"
          onClick={() => select({ v2_finding_version: null })}
        >
          {t(
            "Открыть актуальную версию находки",
            "Табылғанның ағымдағы нұсқасын ашу",
          )}
        </Button>
        {versions.resolvedPath === versionsPath &&
        versions.data &&
        !versions.error ? (
          <>
            <ul>
              {versions.data.items.map((v) => (
                <li key={v.version_id}>
                  <Button
                    variant="outline"
                    onClick={() =>
                      select({ v2_finding_version: String(v.version) })
                    }
                  >
                    v{v.version} · {date(v.captured_at)}
                  </Button>
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              pageSize={10}
              total={versions.data.total}
              onPageChange={setPage}
              label={t(
                "Страницы версий находки",
                "Табылған нұсқаларының беттері",
              )}
            />
          </>
        ) : (
          <LoadState error={versions.error} retry={versions.reload} />
        )}
      </details>
      {detail.resolvedPath === path && detail.data && !detail.error ? (
        <FindingVersion
          key={detail.data.version_id}
          finding={detail.data}
          onImported={() => {
            detail.reload();
            onImported();
          }}
        />
      ) : (
        <LoadState error={detail.error} retry={detail.reload} />
      )}
    </section>
  );
}

function FindingVersion({
  finding: f,
  onImported,
}: {
  finding: FindingDetail;
  onImported: () => void;
}) {
  const { t } = useLocale();
  const { user } = useContext(Auth);
  const { href } = useV2Navigation();
  const [page, setPage] = useState(1);
  const path = `/monitoring/findings/${f.id}/observations?version_id=${f.version_id}&page=${page}&page_size=10`;
  const observations = useData<Page<Observation>>(path);
  const data =
    observations.resolvedPath === path && !observations.error
      ? observations.data
      : null;
  const action = useMonitoringCommand(`v2:import:${f.version_id}`);
  const draft = useReviewDraft(user?.id || "", `v2:import:${f.version_id}`, {
    reason: "",
  });
  // Acknowledgement is intentionally never restored from storage or across versions.
  const [acknowledged, setAcknowledged] = useState(false);
  const [observation, setObservation] = useState("");
  const [adId, setAdId] = useState("");
  const imported = f.advertisement_id || adId;
  async function importText() {
    const result = await action.run<{ advertisement_id: string }>(
      `/monitoring/findings/${f.id}/imports`,
      {
        version_id: f.version_id,
        observation_id: observation,
        reason: draft.values.reason.trim(),
        text_only_acknowledged: acknowledged,
      },
    );
    if (result) {
      setAdId(result.advertisement_id);
      setAcknowledged(false);
      draft.saved();
      onImported();
    }
  }
  return (
    <div className="v2-profile">
      <h4>
        Threads · {f.external_id} · v{f.version} <Demo value={f.is_demo} />
      </h4>
      <p>
        {t(...(priorityNames[f.priority] || [f.priority, f.priority]))} ·{" "}
        {t("Правовой статус не установлен", "Құқықтық мәртебе анықталмаған")}
      </p>
      <dl className="monitoring-run-facts">
        <dt>{t("Опубликовано", "Жарияланған")}</dt>
        <dd>
          {f.published_at
            ? date(f.published_at)
            : t("Не установлена", "Анықталмаған")}
        </dd>
        <dt>{t("Получено", "Алынған")}</dt>
        <dd>{date(f.captured_at)}</dd>
        <dt>{t("Источник", "Дереккөз")}</dt>
        <dd>
          {/^https?:\/\//i.test(f.source_url) ? (
            <a href={f.source_url} target="_blank" rel="noreferrer">
              {f.source_url}
            </a>
          ) : (
            f.source_url
          )}
        </dd>
      </dl>
      <h4>{t("Исходный текст версии", "Нұсқаның бастапқы мәтіні")}</h4>
      <pre className="v2-original" tabIndex={0}>
        {f.text ||
          t(
            "Текст не получен. Медиа не анализировались.",
            "Мәтін алынбаған. Медиа талданбаған.",
          )}
      </pre>
      <p>
        {t(
          "Только текст. Изображения, видео и аудио не скачивались и не анализировались. Для полного вывода нужен просмотр источника. География, ЖК, очередь и применимое основание не подтверждены.",
          "Тек мәтін. Кескіндер, бейне және аудио жүктелмеген және талданбаған. Толық қорытынды үшін дереккөзді қарау қажет. География, кешен, кезек және қолданылатын негіз расталмаған.",
        )}
      </p>
      <details>
        <summary>
          {t(
            "Контекст и происхождение версии",
            "Нұсқаның мәнмәтіні мен шығу тегі",
          )}
        </summary>
        <p>
          {t(
            "Объяснение правила — гипотеза, не решение аналитика",
            "Ереже түсіндірмесі — болжам, талдаушы шешімі емес",
          )}
          : {f.context.priority_reason}
        </p>
        <ul>
          {f.context.matched_spans.map((s, i) => (
            <li key={i}>
              {s.kind}: «{s.text}»
            </li>
          ))}
        </ul>
        <dl className="monitoring-run-facts">
          <dt>{t("Ограничения", "Шектеулер")}</dt>
          <dd>{f.context.content_limits.join(", ")}</dd>
          <dt>{t("Версия правил", "Ереже нұсқасы")}</dt>
          <dd>{f.rules_version}</dd>
          <dt>{t("SHA256 словаря", "Сөздіктің SHA256")}</dt>
          <dd>{f.dictionary_sha256}</dd>
          <dt>{t("SHA256 содержания", "Мазмұнның SHA256")}</dt>
          <dd>{f.content_sha256}</dd>
        </dl>
      </details>
      <h4>{t("Наблюдения этой версии", "Осы нұсқаның бақылаулары")}</h4>
      {!data ? (
        <LoadState error={observations.error} retry={observations.reload} />
      ) : (
        <>
          <ul>
            {data.items.map((o) => (
              <li key={o.id} className="monitoring-url">
                <Link href={href({ section: "runs", run_id: o.run_id })}>
                  {t("Запуск", "Іске қосу")} {o.run_id}
                </Link>{" "}
                · {date(o.captured_at)} ·{" "}
                {o.has_more ? "PARTIAL" : t("Одна страница", "Бір бет")}
                <details>
                  <summary>
                    {t("Происхождение наблюдения", "Бақылаудың шығу тегі")}
                  </summary>
                  <p>
                    {t("Версия профиля", "Профиль нұсқасы")}:{" "}
                    {o.profile_version_id}
                  </p>
                  <p>Query ID: {o.query_id}</p>
                  <p>SHA256: {o.raw_response_sha256}</p>
                </details>
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            pageSize={10}
            total={data.total}
            onPageChange={(p) => {
              setPage(p);
              setObservation("");
              setAcknowledged(false);
            }}
            label={t("Страницы наблюдений", "Бақылаулар беттері")}
          />
        </>
      )}
      {imported ? (
        <p role="status">
          {t(
            "Эта версия импортирована. Анализ и проверка связи выполняются отдельно.",
            "Бұл нұсқа импортталған. Талдау мен байланысты тексеру бөлек орындалады.",
          )}{" "}
          <Link href={`/advertisements/${imported}`}>
            {t(
              "Продолжить проверку материала",
              "Материалды тексеруді жалғастыру",
            )}
          </Link>
        </p>
      ) : (
        user?.role === "analyst" && (
          <fieldset disabled={action.busy}>
            <legend>
              {t(
                "Явный импорт выбранной версии",
                "Таңдалған нұсқаны жеке импорттау",
              )}
            </legend>
            <p>
              {t(
                "Будет создан материал со статусом NEW и точным текстом этой версии. Анализ, создание/связь с объектом, подтверждение R1–R6 и сигнала — отдельные действия.",
                "NEW күйіндегі материал осы нұсқаның дәл мәтінімен жасалады. Талдау, нысанды жасау/байланыстыру, R1–R6 және сигналды растау — бөлек әрекеттер.",
              )}
            </p>
            <label className="monitoring-field">
              <span>{t("Наблюдение для импорта", "Импорт үшін бақылау")}</span>
              <select
                value={observation}
                onChange={(e) => {
                  setObservation(e.target.value);
                  setAcknowledged(false);
                }}
              >
                <option value="">
                  {t(
                    "Выберите наблюдение этой версии",
                    "Осы нұсқаның бақылауын таңдаңыз",
                  )}
                </option>
                {data?.items.map((o) => (
                  <option key={o.id} value={o.id}>
                    {date(o.captured_at)} · {o.run_id}
                  </option>
                ))}
              </select>
            </label>
            <label className="monitoring-field">
              <span>
                {t("Причина импорта находки", "Табылғанды импорттау себебі")}
              </span>
              <textarea
                maxLength={2000}
                value={draft.values.reason}
                onChange={(e) => draft.update({ reason: e.target.value })}
              />
            </label>
            <label className="monitoring-check">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              {t(
                "Подтверждаю: импортируется только текст этой версии; медиа не проверены, риск и связь с объектом не подтверждаются.",
                "Растаймын: осы нұсқаның тек мәтіні импортталады; медиа тексерілмеген, тәуекел мен нысан байланысы расталмайды.",
              )}
            </label>
            <Button
              disabled={
                !f.text?.trim() ||
                !acknowledged ||
                !draft.values.reason.trim() ||
                !data?.items.some((o) => o.id === observation)
              }
              onClick={() => void importText()}
            >
              {action.busy
                ? t("Импорт…", "Импортталуда…")
                : t(
                    "Импортировать текст этой версии",
                    "Осы нұсқаның мәтінін импорттау",
                  )}
            </Button>
            {!f.text?.trim() && (
              <p>
                {t(
                  "Импорт недоступен без исходного текста.",
                  "Бастапқы мәтінсіз импорт қолжетімсіз.",
                )}
              </p>
            )}
            <Notice
              error={action.error || action.storageError || draft.storageError}
            />
          </fieldset>
        )
      )}
    </div>
  );
}
