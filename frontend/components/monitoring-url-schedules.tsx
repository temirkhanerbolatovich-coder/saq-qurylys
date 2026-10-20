"use client";

import Link from "next/link";
import { useContext, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Auth, LoadState, Notice, useData } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { TableRegion } from "@/components/ui/table-region";
import { date } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { useMonitoringCommand } from "@/lib/use-monitoring-command";
import { useReviewDraft } from "@/lib/use-review-draft";
import type { Page } from "@/lib/types";

type Schedule = {
  id: string;
  name: string;
  url: string;
  source_id: string;
  revision: number;
  interval_minutes: number;
  enabled: boolean;
  next_run_at: string | null;
  pause_reason: string | null;
  failure_count: number;
};
type Run = {
  id: string;
  configuration: {
    name: string;
    url: string;
    revision: number;
    interval_minutes: number;
  };
  created_at: string;
  state: string;
  reason: string | null;
  reused_job: boolean;
  advertisement_id: string | null;
};
const base = "/monitoring/url-schedules";
const labels: Record<string, [string, string]> = {
  QUEUED: ["В очереди", "Кезекте"],
  RUNNING: ["Выполняется", "Орындалуда"],
  SUCCEEDED: ["Получено", "Алынды"],
  FAILED: ["Ошибка", "Қате"],
  BLOCKED: ["Остановлено", "Тоқтатылды"],
  DEFERRED: ["Отложено", "Кейінге қалдырылды"],
  SOURCE_QUOTA: ["Пауза по лимиту источника", "Дереккөз лимиті бойынша үзіліс"],
  QUEUE_FULL: [
    "Очередь заполнена; пауза 5 минут",
    "Кезек толы; 5 минут үзіліс",
  ],
  BACKOFF: ["Увеличена пауза после ошибки", "Қатеден кейін үзіліс ұзартылды"],
  ACTOR_NOT_ANALYST: [
    "У автора нет прав аналитика",
    "Авторда талдаушы құқығы жоқ",
  ],
  SOURCE_NOT_APPROVED: [
    "Источник больше не подключён",
    "Дереккөз енді қосылмаған",
  ],
  REPEATED_FAILURE: ["Повторные ошибки", "Қайталанған қателер"],
};
function Status({ code }: { code: string }) {
  const { t } = useLocale();
  return <span>{labels[code] ? t(...labels[code]) : code}</span>;
}
function numberPage(value: string | null) {
  return value && /^[1-9]\d{0,6}$/.test(value) ? Number(value) : 1;
}

export function MonitoringUrlSchedules() {
  const { t } = useLocale(),
    { user } = useContext(Auth);
  const router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams();
  const rawId = params.get("schedule_id");
  const id =
    rawId &&
    /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(rawId) &&
    params.getAll("schedule_id").length === 1
      ? rawId
      : null;
  const page = numberPage(params.get("schedule_page"));
  const path = `${base}?page=${page}&page_size=10`;
  const list = useData<
    Page<Schedule> & {
      source_interval_seconds: number;
      source_hourly_limit: number;
    }
  >(path);
  const data = list.resolvedPath === path && !list.error ? list.data : null;
  function select(patch: Record<string, string | null>) {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(patch))
      if (value === null) next.delete(key);
      else next.set(key, value);
    router.replace(`${pathname}?${next}`, { scroll: false });
  }
  return (
    <details className="monitoring-tool" open={id ? true : undefined}>
      <summary>
        {t("Расписание открытых страниц", "Ашық беттер кестесі")}
        <span>
          {t(
            "Явное включение · получение без решений о риске",
            "Айқын қосу · тәуекел шешімдерінсіз алу",
          )}
        </span>
      </summary>
      <section
        className="panel monitoring-schedules"
        aria-labelledby="monitoring-schedules-title"
      >
        <div className="panel-heading">
          <h2 id="monitoring-schedules-title">
            {t("Регулярное получение", "Тұрақты алу")}
          </h2>
          <Button type="button" variant="outline" onClick={list.reload}>
            {t("Обновить расписания", "Кестелерді жаңарту")}
          </Button>
        </div>
        <p>
          {t(
            "Только подключённые страницы AN GROUPS /payment и статьи Primeminister.kz. Создание и просмотр не запускают получение. Первое получение — через выбранный интервал после отдельного включения.",
            "Тек қосылған AN GROUPS /payment беті мен Primeminister.kz мақалалары. Құру және қарау алуды бастамайды. Алғашқы алу — бөлек қосқаннан кейін таңдалған аралықтан соң.",
          )}
        </p>
        {!data ? (
          <LoadState error={list.error} retry={list.reload} />
        ) : (
          <>
            <p>
              {t(
                `На источник: не чаще одного нового задания за ${data.source_interval_seconds} секунд, до ${data.source_hourly_limit} за час. Ручные загрузки учитываются в лимите расписания.`,
                `Дереккөзге: жаңа тапсырма ${data.source_interval_seconds} секундта бір реттен жиі емес, сағатына ${data.source_hourly_limit} дейін. Қолмен жүктеулер кесте лимитінде ескеріледі.`,
              )}
            </p>
            {!data.items.length ? (
              <p>{t("Расписаний пока нет.", "Кестелер әлі жоқ.")}</p>
            ) : (
              <TableRegion label={t("Список расписаний", "Кестелер тізімі")}>
                <table>
                  <thead>
                    <tr>
                      <th>{t("Страница", "Бет")}</th>
                      <th>{t("Состояние", "Күйі")}</th>
                      <th>{t("Следующее получение", "Келесі алу")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              select({
                                schedule_id: row.id,
                                schedule_run_page: null,
                              })
                            }
                          >
                            {row.name}
                          </Button>
                          <p className="monitoring-url">{row.url}</p>
                        </td>
                        <td>
                          {row.enabled
                            ? t("Включено", "Қосылған")
                            : t("Выключено", "Өшірілген")}
                          {row.pause_reason && (
                            <p>
                              <Status code={row.pause_reason} />
                            </p>
                          )}
                        </td>
                        <td>{row.next_run_at ? date(row.next_run_at) : "—"}</td>
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
              label={t("Страницы расписаний", "Кесте беттері")}
              previousLabel={t("Предыдущая страница", "Алдыңғы бет")}
              nextLabel={t("Следующая страница", "Келесі бет")}
              statusLabel={t(
                `Страница ${page} из ${Math.max(1, Math.ceil(data.total / 10))}`,
                `${Math.max(1, Math.ceil(data.total / 10))} беттің ${page}-беті`,
              )}
              onPageChange={(next) => select({ schedule_page: String(next) })}
            />
          </>
        )}
        {rawId && !id && (
          <Notice
            error={t(
              "Некорректный ID расписания в ссылке.",
              "Сілтемедегі кесте ID қате.",
            )}
          />
        )}
        {id && (
          <ScheduleDetail
            key={`${user?.id}:${id}`}
            id={id}
            onChanged={list.reload}
          />
        )}
        {user?.role === "analyst" && (
          <details>
            <summary>{t("Добавить расписание", "Кесте қосу")}</summary>
            <ScheduleCreate
              key={user.id}
              onCreated={(row) => {
                list.reload();
                select({ schedule_id: row.id, schedule_run_page: null });
              }}
            />
          </details>
        )}
      </section>
    </details>
  );
}

function ScheduleCreate({ onCreated }: { onCreated: (row: Schedule) => void }) {
  const { t } = useLocale(),
    { user } = useContext(Auth);
  const draft = useReviewDraft(user!.id, "url-schedule:create", {
    name: "",
    url: "https://www.angroups.kz/payment",
    interval: "1440",
  });
  const action = useMonitoringCommand("url-schedule:create");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (action.busy) return;
    const selection = new URLSearchParams(window.location.search).get(
      "schedule_id",
    );
    const row = await action.run<Schedule>(base, {
      name: draft.values.name,
      url: draft.values.url,
      interval_minutes: Number(draft.values.interval),
    });
    if (row) {
      draft.update({
        name: "",
        url: "https://www.angroups.kz/payment",
        interval: "1440",
      });
      draft.saved();
      if (
        new URLSearchParams(window.location.search).get("schedule_id") ===
        selection
      )
        onCreated(row);
    }
  }
  return (
    <form className="monitoring-schedule-form" onSubmit={submit}>
      <label>
        {t("Название расписания", "Кесте атауы")}
        <input
          required
          maxLength={100}
          disabled={action.busy}
          value={draft.values.name}
          onChange={(e) => draft.update({ name: e.target.value })}
        />
      </label>
      <label>
        {t("Точный URL страницы", "Беттің нақты URL мекенжайы")}
        <input
          type="url"
          required
          maxLength={2048}
          disabled={action.busy}
          value={draft.values.url}
          onChange={(e) => draft.update({ url: e.target.value })}
        />
      </label>
      <Interval
        value={draft.values.interval}
        disabled={action.busy}
        onChange={(interval) => draft.update({ interval })}
      />
      {action.error && <Notice error={action.error} />}
      {(draft.storageError || action.storageError) && (
        <Notice error={draft.storageError || action.storageError} />
      )}
      <Button type="submit" disabled={action.busy}>
        {action.busy
          ? t("Сохранение…", "Сақталуда…")
          : t("Создать выключенное расписание", "Өшірілген кесте құру")}
      </Button>
    </form>
  );
}

function Interval({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { t } = useLocale();
  return (
    <label>
      {t("Интервал, минут (60–10080)", "Аралық, минут (60–10080)")}
      <input
        type="number"
        min={60}
        max={10080}
        step={1}
        required
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function ScheduleDetail({
  id,
  onChanged,
}: {
  id: string;
  onChanged: () => void;
}) {
  const { t } = useLocale();
  const detail = useData<Schedule>(`${base}/${id}`);
  const params = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  const page = numberPage(params.get("schedule_run_page"));
  const historyPath = `${base}/${id}/runs?page=${page}&page_size=10`;
  const history = useData<Page<Run>>(historyPath);
  function refresh() {
    detail.reload();
    history.reload();
    onChanged();
  }
  return (
    <section
      className="monitoring-schedule-detail"
      aria-labelledby="schedule-detail-title"
    >
      <div className="panel-heading">
        <h3 id="schedule-detail-title">
          {t("Настройка и история", "Баптау және тарих")}
        </h3>
        <Button type="button" variant="outline" onClick={refresh}>
          {t("Обновить выбранное расписание", "Таңдалған кестені жаңарту")}
        </Button>
      </div>
      {!detail.data || detail.error ? (
        <LoadState error={detail.error} retry={detail.reload} />
      ) : (
        <ScheduleSettings row={detail.data} onChanged={refresh} />
      )}
      <h4>{t("История получения", "Алу тарихы")}</h4>
      <p>
        {t(
          "Результат относится к одному URL. Получено — не подтверждение правового статуса; неизменившийся материал может быть повтором. Плановое время зависит от работающего worker и лимитов.",
          "Нәтиже бір URL мекенжайына қатысты. Алынғаны құқықтық мәртебені растамайды; өзгермеген материал қайталау болуы мүмкін. Жоспарлы уақыт worker жұмысына және лимиттерге тәуелді.",
        )}
      </p>
      {!history.data ||
      history.error ||
      history.resolvedPath !== historyPath ? (
        <LoadState error={history.error} retry={history.reload} />
      ) : (
        <>
          {!history.data.items.length ? (
            <p>{t("Запусков ещё нет.", "Іске қосулар әлі жоқ.")}</p>
          ) : (
            <TableRegion label={t("Попытки расписания", "Кесте әрекеттері")}>
              <table>
                <thead>
                  <tr>
                    <th>
                      {t("Время / версия настройки", "Уақыт / баптау нұсқасы")}
                    </th>
                    <th>{t("Исход", "Нәтиже")}</th>
                    <th>{t("Материал", "Материал")}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.items.map((run) => (
                    <tr key={run.id}>
                      <td>
                        {date(run.created_at)}
                        <p>
                          {run.configuration.name} · v
                          {run.configuration.revision}
                        </p>
                        <p className="monitoring-url">
                          {run.configuration.url}
                        </p>
                      </td>
                      <td>
                        <Status code={run.state} />
                        {run.reason && (
                          <p>
                            <Status code={run.reason} />
                          </p>
                        )}
                        {run.reused_job && (
                          <p>
                            {t(
                              "Использовано уже активное задание",
                              "Белсенді тапсырма пайдаланылды",
                            )}
                          </p>
                        )}
                      </td>
                      <td>
                        {run.advertisement_id ? (
                          <Link
                            href={`/advertisements/${run.advertisement_id}`}
                          >
                            {t("Открыть материал", "Материалды ашу")}
                          </Link>
                        ) : (
                          "—"
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
            total={history.data.total}
            label={t("Страницы истории расписания", "Кесте тарихының беттері")}
            previousLabel={t("Предыдущая страница", "Алдыңғы бет")}
            nextLabel={t("Следующая страница", "Келесі бет")}
            statusLabel={t(
              `Страница ${page} из ${Math.max(1, Math.ceil(history.data.total / 10))}`,
              `${Math.max(1, Math.ceil(history.data.total / 10))} беттің ${page}-беті`,
            )}
            onPageChange={(next) => {
              const query = new URLSearchParams(window.location.search);
              query.set("schedule_run_page", String(next));
              router.replace(`${pathname}?${query}`, { scroll: false });
            }}
          />
        </>
      )}
    </section>
  );
}

function ScheduleSettings({
  row,
  onChanged,
}: {
  row: Schedule;
  onChanged: () => void;
}) {
  const { t } = useLocale(),
    { user } = useContext(Auth);
  const draft = useReviewDraft(user!.id, `url-schedule:${row.id}`, {
    name: row.name,
    interval: String(row.interval_minutes),
  });
  const action = useMonitoringCommand(`url-schedule:${row.id}`);
  const [message, setMessage] = useState("");
  const analyst = user?.role === "analyst";
  const changed =
    draft.values.name !== row.name ||
    Number(draft.values.interval) !== row.interval_minutes;
  async function change(enabled?: boolean) {
    if (action.busy) return;
    setMessage("");
    const result = await action.run<Schedule>(
      `${base}/${row.id}/${enabled === undefined ? "settings" : "state"}`,
      {
        expected_revision: row.revision,
        ...(enabled === undefined
          ? {
              name: draft.values.name,
              interval_minutes: Number(draft.values.interval),
            }
          : { enabled }),
      },
    );
    if (result) {
      if (enabled === undefined) draft.saved();
      setMessage(
        t("Сохранено. Состояние обновлено.", "Сақталды. Күй жаңартылды."),
      );
      onChanged();
    }
  }
  return (
    <>
      <p>
        <strong>{row.name}</strong> · v{row.revision} ·{" "}
        {row.enabled ? t("Включено", "Қосылған") : t("Выключено", "Өшірілген")}
      </p>
      <p className="monitoring-url">{row.url}</p>
      {row.pause_reason && (
        <p>
          <Status code={row.pause_reason} />
        </p>
      )}
      <p>
        {t("Следующее получение", "Келесі алу")}:{" "}
        {row.next_run_at ? date(row.next_run_at) : "—"}
      </p>
      {analyst && (
        <>
          <p>
            {t(
              "Выключение останавливает новые задания. Уже поставленное или выполняющееся задание может завершиться. Для изменения настроек сначала выключите расписание.",
              "Өшіру жаңа тапсырмаларды тоқтатады. Кезектегі немесе орындалып жатқан тапсырма аяқталуы мүмкін. Баптауды өзгерту үшін алдымен кестені өшіріңіз.",
            )}
          </p>
          <form
            className="monitoring-schedule-form"
            onSubmit={(e) => {
              e.preventDefault();
              void change();
            }}
          >
            <label>
              {t("Сохранённое название", "Сақталған атау")}
              <input
                required
                maxLength={100}
                disabled={row.enabled || action.busy}
                value={draft.values.name}
                onChange={(e) => draft.update({ name: e.target.value })}
              />
            </label>
            <Interval
              value={draft.values.interval}
              disabled={row.enabled || action.busy}
              onChange={(interval) => draft.update({ interval })}
            />
            <Button
              type="submit"
              variant="outline"
              disabled={row.enabled || action.busy}
            >
              {t("Сохранить настройки", "Баптауларды сақтау")}
            </Button>
          </form>
          <Button
            type="button"
            disabled={action.busy || (!row.enabled && changed)}
            onClick={() => void change(!row.enabled)}
          >
            {action.busy
              ? t("Сохранение…", "Сақталуда…")
              : row.enabled
                ? t("Выключить расписание", "Кестені өшіру")
                : t("Включить расписание", "Кестені қосу")}
          </Button>
          {changed && (
            <p>
              {t(
                "Перед включением сохраните изменённые настройки.",
                "Қосу алдында өзгертілген баптауларды сақтаңыз.",
              )}
            </p>
          )}
        </>
      )}
      {message && <p role="status">{message}</p>}
      {action.error && <Notice error={action.error} />}
      {(draft.storageError || action.storageError) && (
        <Notice error={draft.storageError || action.storageError} />
      )}
    </>
  );
}
