"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { Auth, LoadState, Notice, useData } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { TableRegion } from "@/components/ui/table-region";
import { Pagination } from "@/components/ui/pagination";
import { date, upload } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import type { Page } from "@/lib/types";

type Entry = {
  rows: number[];
  kind: "TEXT" | "RESEARCH" | "LINK";
  source_label: string;
  source_url: string | null;
  text: string;
  status: "NEW" | "CHANGED" | "DUPLICATE" | "DUPLICATE_IN_FILE";
  advertisement_id: string | null;
  previous_advertisement_id: string | null;
  duplicate_of: number | null;
  candidates: { id: string; name: string; address: string }[];
};
type Preview = {
  row_count: number;
  preview_digest: string;
  existing_batch_id: string | null;
  entries: Entry[];
};
type Batch = {
  id: string;
  filename: string;
  created_at: string;
  is_demo: boolean;
  original_asset_id: string;
  created_count: number;
  duplicate_count: number;
  entries: Entry[];
};
const endpoint = "/monitoring/csv-imports";

function Entries({ entries }: { entries: Entry[] }) {
  const { t } = useLocale();
  const statuses = {
    NEW: t("Новый материал", "Жаңа материал"),
    CHANGED: t("Новая версия", "Жаңа нұсқа"),
    DUPLICATE: t("Уже сохранён", "Сақталған"),
    DUPLICATE_IN_FILE: t("Повтор в файле", "Файлдағы қайталау"),
  };
  return (
    <TableRegion label={t("Материалы CSV", "CSV материалдары")}>
      <table className="csv-import-table">
        <thead>
          <tr>
            <th>{t("Строки", "Жолдар")}</th>
            <th>{t("Материал и источник", "Материал және дереккөз")}</th>
            <th>{t("Результат проверки", "Тексеру нәтижесі")}</th>
            <th>{t("Возможные объекты", "Ықтимал нысандар")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.rows[0]}>
              <td>{entry.rows.join(", ")}</td>
              <td>
                <strong>{entry.source_label}</strong>
                <p className="muted">
                  {entry.kind === "RESEARCH"
                    ? t("Наблюдение автора файла", "Файл авторының бақылауы")
                    : entry.kind === "LINK"
                      ? t("Ссылка без оригинала", "Түпнұсқасыз сілтеме")
                      : t("Текст из файла", "Файлдағы мәтін")}
                </p>
                {entry.source_url && (
                  <a href={entry.source_url} target="_blank" rel="noreferrer">
                    {t("Источник", "Дереккөз")}
                  </a>
                )}
                <details>
                  <summary>{t("Посмотреть текст", "Мәтінді көру")}</summary>
                  <pre className="csv-import-text">{entry.text}</pre>
                </details>
              </td>
              <td>
                <span>{statuses[entry.status]}</span>
                {entry.duplicate_of !== null && (
                  <p>
                    {t("Строка", "Жол")} {entry.duplicate_of}
                  </p>
                )}
                {entry.advertisement_id && (
                  <p>
                    <Link href={`/advertisements/${entry.advertisement_id}`}>
                      {t("Открыть материал", "Материалды ашу")}
                    </Link>
                  </p>
                )}
                {entry.previous_advertisement_id && (
                  <p>
                    <Link
                      href={`/advertisements/${entry.previous_advertisement_id}`}
                    >
                      {t("Предыдущая версия", "Алдыңғы нұсқа")}
                    </Link>
                  </p>
                )}
              </td>
              <td>
                {entry.candidates.length ? (
                  <ul>
                    {entry.candidates.map((candidate) => (
                      <li key={candidate.id}>
                        <Link href={`/properties/${candidate.id}`}>
                          {candidate.name}
                        </Link>
                        <p className="muted">{candidate.address}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  t("Совпадение не найдено", "Сәйкестік табылмады")
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableRegion>
  );
}

function Receipt({ id }: { id: string }) {
  const { t } = useLocale();
  const detail = useData<Batch>(`${endpoint}/${encodeURIComponent(id)}`);
  if (!detail.data || detail.error)
    return <LoadState error={detail.error} retry={detail.reload} />;
  return (
    <section
      aria-label={t("Сохранённый пакет", "Сақталған пакет")}
      className="panel csv-import-receipt"
    >
      <h3>
        {detail.data.filename} {detail.data.is_demo && "· DEMO"}
      </h3>
      <p>
        {t("Сохранено новых", "Жаңа сақталған")}: {detail.data.created_count} ·{" "}
        {t("Повторов", "Қайталанған")}: {detail.data.duplicate_count}
      </p>
      <a href={`/api/v1/assets/${detail.data.original_asset_id}`} download>
        {t("Скачать исходный CSV", "Бастапқы CSV жүктеу")}
      </a>
      <Entries entries={detail.data.entries} />
    </section>
  );
}

/** Mounted across local tabs; files never enter persistent browser storage. */
export function CsvImport() {
  const { t } = useLocale();
  const { user } = useContext(Auth);
  const params = useSearchParams();
  const requestedPage = Number(params.get("csv_page") || 1);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const selected = params.get("csv_batch_id");
  const history = useData<Page<Batch>>(`${endpoint}?page=${page}&page_size=10`);
  const [file, setFile] = useState<File | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Batch | null>(null);
  const commandKey = useRef<string | null>(null);
  const pending = useRef(false);
  const errorSummary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) errorSummary.current?.focus();
  }, [error]);
  function select(values: Record<string, string>) {
    const next = new URLSearchParams(window.location.search);
    Object.entries(values).forEach(([key, value]) => next.set(key, value));
    window.history.pushState(null, "", `${window.location.pathname}?${next}`);
  }
  function invalidate() {
    setPreview(null);
    setSaved(null);
    setError("");
    commandKey.current = null;
  }
  function body() {
    const result = new FormData();
    result.set("file", file!);
    result.set("is_demo", String(isDemo));
    return result;
  }
  async function check(event: FormEvent) {
    event.preventDefault();
    if (!file || pending.current) return;
    invalidate();
    if (!file.size || file.size > 262144) {
      setError(
        t(
          "Выберите непустой CSV до 256 КиБ.",
          "256 КиБ дейінгі бос емес CSV таңдаңыз.",
        ),
      );
      return;
    }
    pending.current = true;
    setBusy("preview");
    try {
      setPreview(
        await upload<Preview>(
          `${endpoint}/preview`,
          body(),
          crypto.randomUUID(),
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(null);
    }
  }
  async function commit() {
    if (!file || !preview || pending.current) return;
    pending.current = true;
    setBusy("commit");
    setError("");
    commandKey.current ||= crypto.randomUUID();
    const data = body();
    data.set("preview_digest", preview.preview_digest);
    try {
      const result = await upload<Batch>(endpoint, data, commandKey.current);
      setSaved(result);
      history.reload();
      select({ csv_batch_id: result.id, csv_page: "1" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(null);
    }
  }
  const newCount =
    preview?.entries.filter((entry) =>
      ["NEW", "CHANGED"].includes(entry.status),
    ).length || 0;
  return (
    <div className="csv-import">
      <section className="panel" aria-labelledby="csv-import-title">
        <h2 id="csv-import-title">
          {t("Импорт материалов CSV", "CSV материалдарын импорттау")}
        </h2>
        <p>
          {t(
            "Загрузите таблицу, проверьте материалы и отдельно подтвердите сохранение. Ссылки не загружаются; связи с ЖК и факторы остаются на проверке аналитика.",
            "Кестені жүктеп, материалдарды тексеріңіз және сақтауды бөлек растаңыз. Сілтемелер жүктелмейді; ТК байланыстары мен факторларын талдаушы тексереді.",
          )}
        </p>
        <a href="/api/v1/monitoring/csv-imports/template" download>
          {t("Скачать шаблон CSV", "CSV үлгісін жүктеу")}
        </a>
        <p className="muted" id="csv-help">
          {t(
            "UTF-8, запятая или точка с запятой, до 100 строк и 256 КиБ. Поддерживается таблица социального аудита. Дата публикации: ISO 8601 с часовым поясом. После перезагрузки страницы файл нужно выбрать заново.",
            "UTF-8, үтір немесе нүктелі үтір, 100 жолға және 256 КиБ дейін. Әлеуметтік аудит кестесі қолдау табады. Жарияланым күні: уақыт белдеуімен ISO 8601. Бет жаңартылса, файлды қайта таңдаңыз.",
          )}
        </p>
        {error && (
          <div
            ref={errorSummary}
            tabIndex={-1}
            aria-label={t("Ошибка импорта", "Импорт қатесі")}
          >
            <Notice error={error} />
            <a href="#csv-file">
              {t("Вернуться к выбору файла", "Файл таңдауға оралу")}
            </a>
          </div>
        )}
        {user?.role === "analyst" ? (
          <form onSubmit={check} className="monitoring-form">
            <fieldset disabled={busy !== null}>
              <legend>{t("Файл и тип данных", "Файл және дерек түрі")}</legend>
              <div className="monitoring-fields">
                <label className="monitoring-field" htmlFor="csv-file">
                  {t("CSV-файл", "CSV файлы")}
                  <input
                    id="csv-file"
                    type="file"
                    accept=".csv,text/csv"
                    required
                    aria-describedby="csv-help"
                    onChange={(event) => {
                      setFile(event.target.files?.[0] || null);
                      invalidate();
                    }}
                  />
                </label>
                <label className="monitoring-field" htmlFor="csv-mode">
                  {t("Тип данных", "Дерек түрі")}
                  <select
                    id="csv-mode"
                    value={String(isDemo)}
                    onChange={(event) => {
                      setIsDemo(event.target.value === "true");
                      invalidate();
                    }}
                  >
                    <option value="false">
                      {t(
                        "Реальные наблюдения · без подтверждения",
                        "Нақты бақылаулар · расталмаған",
                      )}
                    </option>
                    <option value="true">DEMO</option>
                  </select>
                </label>
              </div>
              <Button type="submit" disabled={!file}>
                {t("Проверить файл", "Файлды тексеру")}
              </Button>
            </fieldset>
          </form>
        ) : (
          <p>
            {t(
              "Загрузка доступна аналитику. Журнал можно просматривать.",
              "Жүктеу талдаушыға қолжетімді. Журналды көруге болады.",
            )}
          </p>
        )}
        {busy && (
          <p role="status">
            {busy === "preview"
              ? t("Проверяем строки…", "Жолдарды тексеру…")
              : t("Сохраняем пакет…", "Пакетті сақтау…")}
          </p>
        )}
        {preview && (
          <section aria-labelledby="csv-preview-title">
            <h3 id="csv-preview-title">
              {t("Предпросмотр", "Алдын ала қарау")} ·{" "}
              {isDemo ? "DEMO" : t("Реальные данные", "Нақты деректер")}
            </h3>
            <p>
              {t("Строк", "Жолдар")}: {preview.row_count} ·{" "}
              {t("Материалов", "Материалдар")}: {preview.entries.length} ·{" "}
              {t("Новых", "Жаңа")}: {newCount} · {t("Повторов", "Қайталау")}:{" "}
              {preview.entries.length - newCount}
            </p>
            <p>
              {t(
                "Возможные объекты — подсказки по названию. Импорт не создаёт досье, не подтверждает нарушения и не запускает анализ.",
                "Ықтимал нысандар — атауы бойынша ұсыныстар. Импорт досье жасамайды, бұзушылықты растамайды және талдауды іске қоспайды.",
              )}
            </p>
            <Entries entries={preview.entries} />
            {preview.existing_batch_id ? (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  select({ csv_batch_id: preview.existing_batch_id! })
                }
              >
                {t("Пакет уже сохранён — открыть", "Пакет сақталған — ашу")}
              </Button>
            ) : (
              !saved && (
                <Button type="button" disabled={busy !== null} onClick={commit}>
                  {t("Сохранить пакет", "Пакетті сақтау")}
                </Button>
              )
            )}
            {saved && (
              <p role="status">
                {t(
                  "Пакет сохранён. Продолжите проверку через материалы в журнале.",
                  "Пакет сақталды. Тексеруді журналдағы материалдар арқылы жалғастырыңыз.",
                )}
              </p>
            )}
          </section>
        )}
      </section>
      <section className="panel" aria-labelledby="csv-history-title">
        <h2 id="csv-history-title">{t("Журнал загрузок", "Жүктеу журналы")}</h2>
        {!history.data || history.error ? (
          <LoadState error={history.error} retry={history.reload} />
        ) : (
          <>
            {history.data.items.length ? (
              <TableRegion label={t("Журнал загрузок", "Жүктеу журналы")}>
                <table>
                  <thead>
                    <tr>
                      <th>{t("Файл", "Файл")}</th>
                      <th>{t("Получен", "Алынған")}</th>
                      <th>{t("Новых / повторов", "Жаңа / қайталау")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.data.items.map((batch) => (
                      <tr key={batch.id}>
                        <td>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => select({ csv_batch_id: batch.id })}
                          >
                            {batch.filename}
                          </Button>{" "}
                          {batch.is_demo && "DEMO"}
                        </td>
                        <td>{date(batch.created_at)}</td>
                        <td>
                          {batch.created_count} / {batch.duplicate_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableRegion>
            ) : (
              <p>{t("Загрузок пока нет.", "Әзірге жүктеу жоқ.")}</p>
            )}
            <Pagination
              statusLabel={t(
                `Страница ${page} из ${Math.max(1, Math.ceil(history.data.total / 10))}`,
                `${Math.max(1, Math.ceil(history.data.total / 10))} беттің ${page}-беті`,
              )}
              page={page}
              pageSize={10}
              total={history.data.total}
              label={t("Страницы загрузок", "Жүктеу беттері")}
              onPageChange={(next) => select({ csv_page: String(next) })}
              previousLabel={t("Предыдущая страница", "Алдыңғы бет")}
              nextLabel={t("Следующая страница", "Келесі бет")}
            />
          </>
        )}
      </section>
      {selected && <Receipt key={selected} id={selected} />}
    </div>
  );
}
