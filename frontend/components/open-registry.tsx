"use client";

import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { api, upload } from "@/lib/api";
import type { Page } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Auth, LoadState, Notice, useData } from "@/components/workspace";

type Register = {
  id: string;
  as_of: string;
  sha256: string;
  publisher: string;
  source_url: string;
  original_url: string;
  page_count: number;
  limitations: string;
  provenance_notice: string;
};
type SearchResult = {
  document: Register;
  query: string;
  total: number;
  items: { page_number: number; snippet: string; matched_terms: string[] }[];
};
const prefix = "/monitoring/open-registry";

export function OpenRegistry() {
  const { user } = useContext(Auth);
  const documents = useData<Page<Register>>(prefix + "?page_size=100");
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const key = useRef(crypto.randomUUID());
  const resultRef = useRef<HTMLElement>(null);
  const id = selected || documents.data?.items[0]?.id || "";
  const document = documents.data?.items.find((item) => item.id === id);
  useEffect(() => {
    if (result) resultRef.current?.focus();
  }, [result]);
  async function search(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    setError("");
    try {
      setResult(
        await api<SearchResult>(
          `${prefix}/search?${new URLSearchParams({ document_id: id, q: query.trim() })}`,
        ),
      );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function importFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved("");
    setResult(null);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const file = form.get("file") as File;
      if (file.size > 5 * 1024 * 1024)
        throw new Error("PDF должен быть не больше 5 МБ");
      const next = await upload<Register>(prefix, form, key.current);
      setSelected(next.id);
      setResult(null);
      documents.reload();
      setSaved(
        `Сохранён реестр на ${next.as_of}, страниц: ${next.page_count}. Решения по объектам не изменились.`,
      );
      key.current = crypto.randomUUID();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="panel padded" aria-labelledby="open-register-title">
      <h2 id="open-register-title" tabIndex={-1}>
        Открытый реестр гарантий КЖК
      </h2>
      <p>
        Поиск по сохранённому документу КЖК. Охват ограничен гарантиями:
        разрешения МИО и полнота всех оснований здесь не проверяются.
      </p>
      {!documents.data ? (
        <LoadState error={documents.error} retry={documents.reload} />
      ) : documents.data.items.length ? (
        <>
          {documents.data.total > documents.data.items.length && (
            <p className="notice">
              Показаны последние {documents.data.items.length} версий из{" "}
              {documents.data.total}.
            </p>
          )}
          <form onSubmit={search}>
            <label htmlFor="open-register-version">Версия документа</label>
            <select
              id="open-register-version"
              value={id}
              disabled={busy || saving}
              onChange={(event) => {
                setSelected(event.target.value);
                setResult(null);
              }}
            >
              {documents.data.items.map((item) => (
                <option key={item.id} value={item.id}>
                  На {item.as_of} · {item.sha256.slice(0, 10)} ·{" "}
                  {item.page_count} стр.
                </option>
              ))}
            </select>
            <label htmlFor="open-register-query">
              Название объекта, адрес или номер договора
            </label>
            <input
              id="open-register-query"
              minLength={2}
              maxLength={100}
              required
              value={query}
              disabled={busy || saving}
              onChange={(event) => {
                setQuery(event.target.value);
                setResult(null);
              }}
            />
            <Button type="submit" disabled={busy || saving} aria-busy={busy}>
              {busy ? "Поиск…" : "Найти в документе"}
            </Button>
          </form>
          {document && (
            <p className="muted">
              Состояние на {document.as_of}. {document.provenance_notice}
            </p>
          )}
        </>
      ) : (
        <p className="notice">
          Документ ещё не загружен. Аналитик может скачать открытый PDF КЖК и
          добавить его ниже.
        </p>
      )}
      {user?.role === "analyst" && (
        <details>
          <summary>Добавить новую версию PDF</summary>
          <p>
            <a
              href="https://khc.kz/ru/equity/uslugi/357/3260/"
              target="_blank"
              rel="noreferrer"
            >
              Открыть реестр на сайте КЖК
            </a>
            , скачать PDF и указать ссылку на исходный файл. Автоматическая
            загрузка с сайта не выполняется.
          </p>
          <form
            onSubmit={importFile}
            onChange={() => {
              key.current = crypto.randomUUID();
              setSaved("");
            }}
          >
            <label htmlFor="open-register-file">
              Исходный PDF КЖК · до 5 МБ
            </label>
            <input
              id="open-register-file"
              name="file"
              type="file"
              accept="application/pdf,.pdf"
              required
              disabled={saving || busy}
            />
            <label htmlFor="open-register-source">Ссылка на исходный PDF</label>
            <input
              id="open-register-source"
              name="source_url"
              type="url"
              required
              maxLength={2048}
              disabled={saving || busy}
            />
            <Button type="submit" disabled={saving || busy} aria-busy={saving}>
              {saving ? "Проверка PDF…" : "Сохранить версию"}
            </Button>
          </form>
        </details>
      )}
      {error && <Notice error={error} />}
      {saved && <p role="status">{saved}</p>}
      {result && (
        <section
          ref={resultRef}
          tabIndex={-1}
          aria-labelledby="open-register-results-title"
        >
          <h3 id="open-register-results-title">
            Найдено страниц: {result.total}
          </h3>
          <p className="notice">{result.document.limitations}</p>
          {!result.items.length && (
            <p>
              Совпадений в этой версии не найдено. Проверьте другое написание и
              другие источники; отсутствие основания не установлено.
            </p>
          )}
          {result.items.map((hit) => (
            <div className="document" key={hit.page_number}>
              <h4>
                Страница {hit.page_number} · состояние на{" "}
                {result.document.as_of}
              </h4>
              <p className="original-text">{hit.snippet}</p>
              <p>Совпали слова: {hit.matched_terms.join(", ")}</p>
            </div>
          ))}
          <a className="text-link" href={result.document.original_url}>
            Скачать сохранённый PDF и проверить страницу
          </a>
          <p>
            <a
              href={result.document.source_url}
              target="_blank"
              rel="noreferrer"
            >
              Исходный файл на сайте КЖК
            </a>
          </p>
        </section>
      )}
    </section>
  );
}
