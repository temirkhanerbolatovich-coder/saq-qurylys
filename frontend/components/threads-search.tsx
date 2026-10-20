"use client";

import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { command, date } from "@/lib/api";
import { ApiError } from "@/lib/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { Auth, LoadState, Notice, useData } from "@/components/workspace";
import { MonitoringQueryBuilder } from "@/components/monitoring-query-builder";

type Connection = {
  state:
    | "DISABLED"
    | "TOKEN_MISSING"
    | "TOKEN_INVALID"
    | "CONFIGURED_UNVERIFIED"
    | "ACCESS_VERIFIED";
  busy: boolean;
  retry_after_seconds: number;
  last_attempt: "NOT_RUN" | "SUCCEEDED" | "FAILED";
};
type SearchResult = {
  run_id?: string;
  request: { query: string; search_type: "RECENT" | "TOP"; limit: number };
  captured_at: string;
  has_more: boolean;
  duplicate_count: number;
  items: {
    id: string;
    text: string | null;
    timestamp: string | null;
    permalink: string;
    media_type: string;
  }[];
};
const connectionLabels: Record<Connection["state"], string> = {
  DISABLED: "Поиск Threads выключен",
  TOKEN_MISSING: "Для Threads не настроен доступ",
  TOKEN_INVALID: "Настройку доступа Threads нужно исправить",
  CONFIGURED_UNVERIFIED: "Threads настроен — доступ ещё не проверен",
  ACCESS_VERIFIED: "Последний запрос Threads выполнен успешно",
};

export function ThreadsSearch() {
  const { t } = useLocale();
  const params = useSearchParams();
  const { user } = useContext(Auth);
  const status = useData<Connection>("/monitoring/threads/status");
  const [query, setQuery] = useState("");
  const queryInput = useRef<HTMLInputElement>(null);
  const [order, setOrder] = useState<"RECENT" | "TOP">("RECENT");
  const [limit, setLimit] = useState(20);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const retry = useRef<{ fingerprint: string; key: string } | null>(null);
  function historyHref(id?: string) {
    const next = new URLSearchParams(params.toString());
    next.set("section", "runs");
    if (id) next.set("run_id", id);
    else next.delete("run_id");
    return `/monitoring?${next}`;
  }
  const ready =
    !status.error &&
    status.resolvedPath === "/monitoring/threads/status" &&
    (status.data?.state === "CONFIGURED_UNVERIFIED" ||
      status.data?.state === "ACCESS_VERIFIED");

  useEffect(() => {
    setCooldown(status.data?.retry_after_seconds ?? 0);
  }, [status.data]);
  useEffect(() => {
    if (result) heading.current?.focus();
  }, [result]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !ready || cooldown) return;
    setBusy(true);
    setResult(null);
    setError("");
    const body = { query: query.trim(), search_type: order, limit };
    const fingerprint = JSON.stringify(body);
    if (retry.current?.fingerprint !== fingerprint)
      retry.current = { fingerprint, key: crypto.randomUUID() };
    try {
      const response = await command<SearchResult>(
        "/monitoring/threads/search",
        body,
        retry.current.key,
      );
      setResult(response);
      retry.current = null;
    } catch (reason) {
      if (reason instanceof ApiError && reason.status !== 500)
        retry.current = null;
      setError(
        reason instanceof Error
          ? reason.message
          : "Поиск не выполнен. Обновите статус и повторите позже.",
      );
    } finally {
      setBusy(false);
      status.reload();
      window.dispatchEvent(new Event("saq-monitoring-runs-updated"));
    }
  }

  return (
    <section
      className="panel"
      id="monitoring-threads"
      tabIndex={-1}
      aria-labelledby="monitoring-threads-title"
    >
      <header className="panel-heading">
        <h2 id="monitoring-threads-title">Поиск в Threads</h2>
        <Button
          variant="outline"
          type="button"
          disabled={busy}
          onClick={status.reload}
        >
          Обновить подключение Threads
        </Button>
      </header>
      <div className="padded">
        {!status.data || status.error ? (
          <LoadState error={status.error} retry={status.reload} />
        ) : (
          <p role="status">
            {connectionLabels[status.data.state]}
            {status.data.busy ? ". Поиск уже выполняется." : ""}
          </p>
        )}
        {!ready && status.data && !status.error && (
          <p>
            Администратор должен подключить официальный доступ Threads.
            Сохранённые материалы и DEMO-сверка доступны ниже.
          </p>
        )}
        <p className="field-help">
          Одна страница результатов по словам. Тег в поисковой фразе
          обрабатывается как текст; полнота охвата, реклама и география требуют
          проверки. Krisha, Instagram и TikTok пока не подключены.
        </p>
        {user?.role === "analyst" && (
          <MonitoringQueryBuilder
            disabled={busy}
            onSelect={(phrase) => {
              setQuery(phrase);
              setResult(null);
              queryInput.current?.focus();
            }}
          />
        )}
        {user?.role === "analyst" ? (
          <form
            className="monitoring-form"
            aria-label="Поиск публикаций Threads"
            onSubmit={search}
          >
            <label className="monitoring-field">
              <span>Поисковая фраза Threads</span>
              <input
                ref={queryInput}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setResult(null);
                }}
                required
                minLength={2}
                maxLength={300}
                disabled={busy}
                placeholder="Например: Өскемен ЖК"
              />
            </label>
            <div className="monitoring-fields">
              <label className="monitoring-field">
                <span>Порядок результатов Threads</span>
                <select
                  value={order}
                  disabled={busy}
                  onChange={(event) => {
                    setOrder(event.target.value as "RECENT" | "TOP");
                    setResult(null);
                  }}
                >
                  <option value="RECENT">Недавние</option>
                  <option value="TOP">По релевантности площадки</option>
                </select>
              </label>
              <label className="monitoring-field">
                <span>Лимит результатов Threads</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={limit}
                  disabled={busy}
                  onChange={(event) => {
                    setLimit(Number(event.target.value));
                    setResult(null);
                  }}
                />
              </label>
            </div>
            <p className="field-help">
              Поисковая фраза будет передана Threads. Публикации не сохраняются
              в реестр рекламы и не создают инциденты.
            </p>
            <Button
              type="submit"
              disabled={!ready || busy || !!status.data?.busy || cooldown > 0}
              aria-busy={busy}
            >
              {busy ? "Идёт поиск…" : "Найти в Threads"}
            </Button>
            {cooldown > 0 && (
              <p className="field-help">
                Следующий запрос доступен через {cooldown} с.
              </p>
            )}
          </form>
        ) : (
          <p>Запуск внешнего поиска доступен аналитику.</p>
        )}
        {busy && (
          <p role="status">
            Ожидаем ответ Threads. Повторный запрос не отправляется.
          </p>
        )}
        {error && (
          <>
            <Notice error={error} />
            <Link href={historyHref()}>
              {t("Открыть историю попыток", "Әрекеттер тарихын ашу")}
            </Link>
          </>
        )}
        {result && (
          <div
            className="monitoring-record"
            aria-label="Результаты поиска Threads"
          >
            <h3 ref={heading} tabIndex={-1}>
              Найдено в Threads: {result.items.length}
            </h3>
            <p>
              Фраза: {result.request.query} · получено{" "}
              {date(result.captured_at)} ·{" "}
              {result.request.search_type === "RECENT"
                ? "недавние"
                : "по релевантности площадки"}
            </p>
            <p>
              {t(
                "Ответ поиска сохраняется в истории запусков. Публикации не добавлены в рекламу. Правовой статус не проверен.",
                "Іздеу жауабы тарихта сақталады. Жарияланымдар жарнамаға қосылмаған. Құқықтық мәртебесі тексерілмеген.",
              )}
            </p>
            {result.run_id && (
              <Link href={historyHref(result.run_id)}>
                {t("Открыть сохранённый запуск", "Сақталған іске қосуды ашу")}
              </Link>
            )}
            {result.has_more && (
              <p>
                У площадки есть следующая страница; здесь показана только
                текущая.
              </p>
            )}
            {result.duplicate_count > 0 && (
              <p>Повторных записей в ответе: {result.duplicate_count}.</p>
            )}
            {!result.items.length && (
              <p>
                Этот запрос не вернул публикаций. Это не доказывает отсутствие
                рекламы или разрешения.
              </p>
            )}
            {result.items.map((post) => (
              <article className="monitoring-record" key={post.id}>
                <h4>Публикация Threads {post.id}</h4>
                <p>
                  Опубликовано: {date(post.timestamp)} · {post.media_type}
                </p>
                <p style={{ whiteSpace: "pre-wrap" }}>
                  {post.text ||
                    "Текст не предоставлен. Изображения и видео не загружались."}
                </p>
                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Открыть публикацию в Threads
                </a>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
