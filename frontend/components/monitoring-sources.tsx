"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { TableRegion } from "@/components/ui/table-region";
import { LoadState, useData } from "@/components/workspace";
import { date } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import type { Page } from "@/lib/types";

type Run = {
  id: string;
  source_code: string;
  created_by: string;
  query: { query: string; search_type: string; limit: number };
  state: string;
  started_at: string;
  finished_at: string | null;
  error_code: string | null;
  returned_count: number | null;
  duplicate_count: number | null;
  saved_count: number;
};
type Result = {
  raw_response_sha256: string;
  has_more: boolean;
  items: {
    id: string;
    text: string | null;
    timestamp: string | null;
    permalink: string;
  }[];
};
type Source = {
  code: string;
  state: string;
  access_status: string;
  action_href: string;
  last_success_at: string | null;
  last_attempt: Run | null;
  token_configured: boolean | null;
  retry_after_seconds: number;
};
const labels: Record<string, [string, string]> = {
  READY: ["Готов к ручному действию", "Қолмен әрекетке дайын"],
  DISABLED: ["Выключен", "Өшірулі"],
  BLOCKED: ["Нет доступа", "Қолжетімсіз"],
  RUNNING: ["Выполняется", "Орындалуда"],
  RATE_LIMITED: ["Пауза / лимит", "Үзіліс / шектеу"],
  ERROR: ["Ошибка", "Қате"],
  SUCCEEDED: ["Найдены публикации", "Жарияланымдар табылды"],
  EMPTY: ["Ответ получен: 0 публикаций", "Жауап алынды: 0 жарияланым"],
  INTERRUPTED: ["Исход неизвестен", "Нәтижесі белгісіз"],
  CSV: ["Файлы CSV", "CSV файлдары"],
  THREADS: ["Поиск Threads", "Threads іздеуі"],
  LICENSED_NEWS: [
    "Открытые страницы AN GROUPS / Primeminister.kz",
    "AN GROUPS / Primeminister.kz ашық беттері",
  ],
  OPEN_REGISTER: ["Справочный PDF КЖК", "ҚТК анықтамалық PDF"],
  SOCIAL_MANUAL: [
    "Instagram / TikTok и другие площадки",
    "Instagram / TikTok және басқа платформалар",
  ],
};
function select(values: Record<string, string | null>) {
  const next = new URLSearchParams(window.location.search);
  Object.entries(values).forEach(([key, value]) =>
    value === null ? next.delete(key) : next.set(key, value),
  );
  window.history.pushState(null, "", `${window.location.pathname}?${next}`);
}
function useRunUpdates(reload: () => void) {
  useEffect(() => {
    window.addEventListener("saq-monitoring-runs-updated", reload);
    return () =>
      window.removeEventListener("saq-monitoring-runs-updated", reload);
  }, [reload]);
}
const errorLabels: Record<string, [string, string]> = {
  DISABLED: ["Поиск выключен в настройках", "Іздеу баптауларда өшірілген"],
  TOKEN_MISSING: ["Токен не настроен", "Токен бапталмаған"],
  TOKEN_INVALID: ["Некорректная настройка токена", "Токен баптауы қате"],
  AUTH_REQUIRED: ["Источник отклонил токен", "Дереккөз токенді қабылдамады"],
  ACCESS_DENIED: [
    "Источник не предоставил доступ к поиску",
    "Дереккөз іздеуге рұқсат бермеді",
  ],
  LOCAL_COOLDOWN: [
    "Запрос выполняется или действует пауза",
    "Сұрау орындалуда немесе үзіліс бар",
  ],
  RATE_LIMITED: ["Достигнут лимит площадки", "Платформа шегіне жетті"],
  TIMEOUT: ["Источник не ответил вовремя", "Дереккөз уақытында жауап бермеді"],
  TLS_FAILED: [
    "Сертификат источника не прошёл проверку",
    "Дереккөз сертификаты тексеруден өтпеді",
  ],
  RESPONSE_INVALID: [
    "Ответ источника не прошёл проверку",
    "Дереккөз жауабы тексеруден өтпеді",
  ],
  OUTCOME_UNKNOWN: [
    "Прерванная попытка; результат неизвестен",
    "Үзілген әрекет; нәтижесі белгісіз",
  ],
  INTERNAL_ERROR: ["Внутренняя ошибка обработки", "Өңдеудің ішкі қатесі"],
};
function RunError({ code }: { code: string }) {
  const { t } = useLocale();
  return (
    <span>
      {errorLabels[code]
        ? t(...errorLabels[code])
        : t(
            "Не удалось получить проверенный ответ источника",
            "Дереккөздің тексерілген жауабын алу мүмкін болмады",
          )}{" "}
      · <code>{code}</code>
    </span>
  );
}
function RunStatus({ state }: { state: string }) {
  const { t } = useLocale();
  const copy = labels[state];
  return (
    <span className={`monitor-state monitor-state-${state.toLowerCase()}`}>
      {copy ? t(...copy) : state}
    </span>
  );
}

export function MonitoringSources({
  onOpenTool,
  onOpenCsv,
}: {
  onOpenTool: (target: string) => void;
  onOpenCsv: () => void;
}) {
  const { t } = useLocale();
  const sources = useData<{ items: Source[] }>("/monitoring/sources");
  useRunUpdates(sources.reload);
  const descriptions: Record<string, string> = {
    CSV: t(
      "Выбранный файл. История — в журнале CSV; автоматического поиска нет.",
      "Таңдалған файл. Тарихы CSV журналында; автоматты іздеу жоқ.",
    ),
    THREADS: t(
      "Одна страница официального поиска по словам. Охват и принадлежность к рекламе требуют проверки.",
      "Ресми сөздік іздеудің бір беті. Қамтуы мен жарнамаға қатысын тексеру қажет.",
    ),
    LICENSED_NEWS: t(
      "Импорт по кнопке или отдельному расписанию: условия оплаты AN GROUPS (/payment) или информационная статья Primeminister.kz. Сохраняются HTML и текст; общего обхода сайтов нет.",
      "Батырмамен немесе бөлек кестемен импорттау: AN GROUPS төлем шарттары (/payment) немесе Primeminister.kz мақаласы. HTML мен мәтін сақталады; сайттарды толық шолу жоқ.",
    ),
    OPEN_REGISTER: t(
      "Загрузка и поиск по предоставленному PDF. Применимость документа к очереди проверяется отдельно.",
      "Берілген PDF жүктеу және іздеу. Құжаттың кезекке қолданылуы бөлек тексеріледі.",
    ),
    SOCIAL_MANUAL: t(
      "Автоматического коннектора нет. Можно вручную добавить текст, ссылку или изображение.",
      "Автоматты коннектор жоқ. Мәтін, сілтеме немесе суретті қолмен қосуға болады.",
    ),
  };
  return (
    <section
      className="panel monitoring-source-catalog"
      aria-labelledby="monitoring-source-title"
    >
      <div className="panel-heading">
        <h2 id="monitoring-source-title">
          {t("Источники и доступ", "Дереккөздер мен қолжетімділік")}
        </h2>
        <Button variant="outline" onClick={sources.reload}>
          {t("Обновить состояния", "Күйлерді жаңарту")}
        </Button>
      </div>
      <p>
        {t(
          "Состояния показывают возможности этого приложения. Дата успеха относится к прошлой попытке и не гарантирует текущий доступ. Просмотр не запускает поиск.",
          "Күйлер осы қолданбаның мүмкіндіктерін көрсетеді. Сәттілік күні бұрынғы әрекетке қатысты, қазіргі қолжетімділікке кепіл емес. Қарау іздеуді бастамайды.",
        )}
      </p>
      {!sources.data || sources.error ? (
        <LoadState error={sources.error} retry={sources.reload} />
      ) : (
        <TableRegion
          label={t("Доступность источников", "Дереккөздердің қолжетімділігі")}
        >
          <table className="monitoring-source-table">
            <thead>
              <tr>
                <th>{t("Источник и охват", "Дереккөз және қамту")}</th>
                <th>{t("Состояние", "Күйі")}</th>
                <th>{t("Последний успех", "Соңғы сәтті әрекет")}</th>
                <th>{t("Действие", "Әрекет")}</th>
              </tr>
            </thead>
            <tbody>
              {sources.data.items.map((source) => (
                <tr key={source.code}>
                  <td>
                    <strong>{t(...labels[source.code])}</strong>
                    <p>{descriptions[source.code]}</p>
                  </td>
                  <td>
                    <RunStatus state={source.state} />
                    {source.code === "THREADS" && (
                      <>
                        <p>
                          {source.token_configured
                            ? t(
                                "Токен настроен; права проверяются запросом.",
                                "Токен бапталған; құқықтар сұраумен тексеріледі.",
                              )
                            : t("Токен не настроен.", "Токен бапталмаған.")}
                        </p>
                        {source.retry_after_seconds > 0 && (
                          <p>
                            {t("Пауза, секунд", "Үзіліс, секунд")}:{" "}
                            {source.retry_after_seconds}
                          </p>
                        )}
                      </>
                    )}
                    {source.last_attempt?.error_code && (
                      <p>
                        <RunError code={source.last_attempt.error_code} />
                      </p>
                    )}
                  </td>
                  <td>
                    {source.last_success_at
                      ? date(source.last_success_at)
                      : t(
                          "Успешная попытка не зафиксирована",
                          "Сәтті әрекет тіркелмеген",
                        )}
                  </td>
                  <td>
                    <div className="monitoring-actions">
                      {source.code === "THREADS" ||
                      source.code === "OPEN_REGISTER" ? (
                        <Button
                          variant="outline"
                          onClick={() =>
                            onOpenTool(
                              source.code === "THREADS"
                                ? "monitoring-threads"
                                : "open-register-title",
                            )
                          }
                        >
                          {t("Открыть инструмент", "Құралды ашу")}
                        </Button>
                      ) : source.code === "CSV" ? (
                        <Button variant="outline" onClick={onOpenCsv}>
                          {t("Открыть импорт", "Импортты ашу")}
                        </Button>
                      ) : (
                        <Link href={source.action_href}>
                          {t("Добавить материал", "Материал қосу")}
                        </Link>
                      )}
                      {source.code === "THREADS" && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            select({ section: "runs", run_source: "THREADS" })
                          }
                        >
                          {t("История запусков", "Іске қосу тарихы")}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableRegion>
      )}
    </section>
  );
}

function RunDetail({ id }: { id: string }) {
  const { t } = useLocale();
  const path = `/monitoring/runs/${encodeURIComponent(id)}`;
  const detail = useData<Run & { result: Result | null }>(path);
  if (!detail.data || detail.error || detail.resolvedPath !== path)
    return <LoadState error={detail.error} retry={detail.reload} />;
  const run = detail.data;
  return (
    <section
      className="panel monitoring-run-detail"
      aria-labelledby="monitoring-run-title"
    >
      <div className="panel-heading">
        <h3 id="monitoring-run-title">
          {t("Запуск", "Іске қосу")} {run.id}
        </h3>
        <Button variant="outline" onClick={detail.reload}>
          {t("Обновить запуск", "Іске қосуды жаңарту")}
        </Button>
      </div>
      <RunStatus state={run.state} />
      <dl className="monitoring-run-facts">
        <dt>{t("Запрос", "Сұрау")}</dt>
        <dd>{run.query.query}</dd>
        <dt>{t("Начат / завершён", "Басталды / аяқталды")}</dt>
        <dd>
          {date(run.started_at)} /{" "}
          {run.finished_at
            ? date(run.finished_at)
            : t("Не зафиксировано", "Тіркелмеген")}
        </dd>
        <dt>{t("Автор запуска", "Іске қосқан")}</dt>
        <dd>{run.created_by}</dd>
        <dt>{t("Причина", "Себеп")}</dt>
        <dd>{run.error_code ? <RunError code={run.error_code} /> : "—"}</dd>
      </dl>
      <p>
        {t(
          "Сохранённый ответ поиска. Полученные публикации не добавлены в рекламу; правовой статус не проверен. Одна страница не даёт полного охвата.",
          "Іздеудің сақталған жауабы. Алынған жарияланымдар жарнамаға қосылмаған; құқықтық мәртебесі тексерілмеген. Бір бет толық қамтуды бермейді.",
        )}
      </p>
      {!run.result && (
        <p>
          {t(
            "Результат не получен или исход неизвестен. Нулевое число находок не подставляется. Повторный запрос автоматически не отправляется.",
            "Нәтиже алынбаған немесе белгісіз. Табылғандар саны нөл деп көрсетілмейді. Сұрау автоматты түрде қайталанбайды.",
          )}
        </p>
      )}
      {run.result && (
        <>
          <p className="monitoring-run-hash">
            SHA-256 {run.result.raw_response_sha256}
          </p>
          {run.result.has_more && (
            <p>
              {t(
                "У источника есть следующая страница; она не запрашивалась.",
                "Дереккөзде келесі бет бар; ол сұралмаған.",
              )}
            </p>
          )}
          {!run.result.items.length && (
            <p>
              {t(
                "В этом ответе публикаций нет. Это не доказывает отсутствие рекламы.",
                "Бұл жауапта жарияланымдар жоқ. Бұл жарнаманың жоқтығын дәлелдемейді.",
              )}
            </p>
          )}
          {run.result.items.map((post) => (
            <article className="monitoring-record" key={post.id}>
              <h4>Threads {post.id}</h4>
              <p>{date(post.timestamp)}</p>
              <p className="monitoring-run-text">
                {post.text || t("Текст не предоставлен", "Мәтін берілмеген")}
              </p>
              <a href={post.permalink} target="_blank" rel="noreferrer">
                {t("Открыть источник", "Дереккөзді ашу")}
              </a>
            </article>
          ))}
        </>
      )}
    </section>
  );
}

export function MonitoringRuns() {
  const { t } = useLocale();
  const params = useSearchParams();
  const rawPage = Number(params.get("run_page") || 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const state = params.get("run_state") || "";
  const id = params.get("run_id");
  const query = new URLSearchParams({ page: String(page), page_size: "10" });
  if (state) query.set("state", state);
  if (params.get("run_source"))
    query.set("source_code", params.get("run_source")!);
  const path = `/monitoring/runs?${query}`;
  const history = useData<Page<Run>>(path);
  useRunUpdates(history.reload);
  const data =
    history.resolvedPath === path && !history.error ? history.data : null;
  return (
    <div className="monitoring-runs">
      <section className="panel" aria-labelledby="monitoring-runs-title">
        <div className="panel-heading">
          <h2 id="monitoring-runs-title">
            {t("История запусков", "Іске қосу тарихы")}
          </h2>
          <Button variant="outline" onClick={history.reload}>
            {t("Обновить историю", "Тарихты жаңарту")}
          </Button>
        </div>
        <p>
          {t(
            "Здесь записаны явные попытки поиска Threads начиная с подключения журнала. Загрузки файлов находятся в журнале CSV. Старые попытки не восстанавливаются задним числом.",
            "Мұнда журнал қосылғаннан кейінгі Threads іздеу әрекеттері жазылған. Файл жүктеулері CSV журналында. Бұрынғы әрекеттер кейіннен қалпына келтірілмейді.",
          )}
        </p>
        <label className="monitoring-field" htmlFor="monitor-run-state">
          {t("Состояние запуска", "Іске қосу күйі")}
          <select
            id="monitor-run-state"
            value={state}
            onChange={(event) =>
              select({
                run_state: event.target.value || null,
                run_page: "1",
                run_id: null,
              })
            }
          >
            <option value="">{t("Все состояния", "Барлық күйлер")}</option>
            {[
              "RUNNING",
              "SUCCEEDED",
              "EMPTY",
              "BLOCKED",
              "RATE_LIMITED",
              "ERROR",
              "INTERRUPTED",
            ].map((value) => (
              <option key={value} value={value}>
                {t(...labels[value])}
              </option>
            ))}
          </select>
        </label>
        {!data ? (
          <LoadState error={history.error} retry={history.reload} />
        ) : (
          <>
            {!data.items.length ? (
              <p>
                {t(
                  "Попыток по выбранному фильтру нет.",
                  "Таңдалған сүзгі бойынша әрекеттер жоқ.",
                )}
              </p>
            ) : (
              <TableRegion
                label={t("Запуски мониторинга", "Мониторинг іске қосулары")}
              >
                <table className="monitoring-runs-table">
                  <thead>
                    <tr>
                      <th>{t("Запрос / время", "Сұрау / уақыт")}</th>
                      <th>{t("Состояние", "Күйі")}</th>
                      <th>{t("Получено / повторов", "Алынған / қайталау")}</th>
                      <th>{t("Сохранено в рекламу", "Жарнамаға сақталған")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((run) => (
                      <tr key={run.id}>
                        <td>
                          <Button
                            variant="outline"
                            onClick={() => select({ run_id: run.id })}
                          >
                            {run.query.query}
                          </Button>
                          <p>{date(run.started_at)}</p>
                        </td>
                        <td>
                          <RunStatus state={run.state} />
                          {run.error_code && (
                            <p>
                              <RunError code={run.error_code} />
                            </p>
                          )}
                        </td>
                        <td>
                          {run.returned_count === null
                            ? "—"
                            : run.returned_count}{" "}
                          /{" "}
                          {run.duplicate_count === null
                            ? "—"
                            : run.duplicate_count}
                        </td>
                        <td>{run.saved_count}</td>
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
              label={t("Страницы запусков", "Іске қосу беттері")}
              statusLabel={t(
                `Страница ${page} из ${Math.max(1, Math.ceil(data.total / 10))}`,
                `${Math.max(1, Math.ceil(data.total / 10))} беттің ${page}-беті`,
              )}
              previousLabel={t("Предыдущая страница", "Алдыңғы бет")}
              nextLabel={t("Следующая страница", "Келесі бет")}
              onPageChange={(next) => select({ run_page: String(next) })}
            />
          </>
        )}
      </section>
      {id && <RunDetail key={id} id={id} />}
    </div>
  );
}
