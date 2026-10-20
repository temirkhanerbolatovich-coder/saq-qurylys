"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import { api } from "@/lib/api";
import type { Page, Property, PropertyDetail } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { LoadState, useData } from "@/components/workspace";

type PropertyPickerProps = {
  value: string;
  onChange: (id: string) => void;
  selectRef?: RefObject<HTMLSelectElement | null>;
} & ({ mode?: "match"; isDemo: boolean } | { mode: "filter"; isDemo?: never });

/** Searches the server registry; a page change never changes the analyst's selection. */
export function PropertyPicker({
  value,
  onChange,
  isDemo,
  mode = "match",
  selectRef,
}: PropertyPickerProps) {
  const id = mode === "filter" ? "signal-property" : "match-property";
  const [input, setInput] = useState("");
  const [search, setSearch] = useState({ q: "", page: 1, focus: false });
  const [selected, setSelected] = useState<Property | null>(null);
  const [selectionError, setSelectionError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!value) return;
    const controller = new AbortController();
    api<PropertyDetail>(`/properties/${value}`, { signal: controller.signal })
      .then((detail) => {
        setSelected(detail.property);
        setSelectionError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setSelectionError(error.message);
      });
    return () => controller.abort();
  }, [value, attempt]);
  const query = new URLSearchParams({
    q: search.q,
    page: String(search.page),
    page_size: "25",
  });
  if (isDemo !== undefined) query.set("is_demo", String(isDemo));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch({ q: input.trim(), page: 1, focus: true });
  }
  return (
    <section
      className="property-picker"
      aria-label={
        mode === "filter"
          ? "Выбор объекта сигнала"
          : "Поиск объекта для привязки"
      }
    >
      <form onSubmit={submit} className="property-picker-search">
        <label htmlFor={`${id}-search`}>Найти ЖК, застройщика или БИН</label>
        <input
          id={`${id}-search`}
          type="search"
          maxLength={300}
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <Button type="submit" variant="outline">
          Найти ЖК
        </Button>
      </form>
      <p className="field-help">
        Поиск по всему реестру: название, адрес, альтернативное название,
        застройщик или БИН.
        {isDemo !== undefined &&
          ` Только ${isDemo ? "DEMO" : "реальные"} объекты.`}
        {mode === "match"
          ? " Связь с ЖК подтверждается отдельно."
          : " Выбор фильтрует сигналы; решения не изменяются."}
      </p>
      <PropertyOptions
        key={query.toString()}
        query={query.toString()}
        id={id}
        mode={mode}
        selectRef={selectRef}
        value={value}
        selected={selected?.id === value ? selected : null}
        focusOnLoad={search.focus}
        onChange={onChange}
        onPage={(page) => setSearch({ ...search, page, focus: true })}
      />
      {value && selected?.id !== value && (
        <LoadState
          error={selectionError}
          retry={() => setAttempt((number) => number + 1)}
        />
      )}
    </section>
  );
}

function PropertyOptions({
  query,
  value,
  selected,
  focusOnLoad,
  onChange,
  onPage,
  id,
  mode,
  selectRef,
}: {
  query: string;
  value: string;
  selected: Property | null;
  focusOnLoad: boolean;
  onChange: (id: string) => void;
  onPage: (page: number) => void;
  id: string;
  mode: "match" | "filter";
  selectRef?: RefObject<HTMLSelectElement | null>;
}) {
  const registry = useData<Page<Property>>(`/properties?${query}`);
  const data = registry.data;
  const localSelect = useRef<HTMLSelectElement>(null);
  const select = selectRef || localSelect;
  useEffect(() => {
    if (data && focusOnLoad) select.current?.focus();
  }, [data, focusOnLoad]);
  const outsidePage = value && !data?.items.some((row) => row.id === value);
  return (
    <>
      <label htmlFor={id}>
        {mode === "filter"
          ? "Объект сигнала"
          : "ЖК / очередь · можно выбрать вручную"}
      </label>
      <select
        id={id}
        ref={select}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">
          {mode === "filter" ? "Все объекты" : "Выберите точный объект"}
        </option>
        {outsidePage && (
          <option value={value}>
            {selected ? `${selected.name} · ${selected.address}` : value} ·
            выбран вне страницы
          </option>
        )}
        {data?.items.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name} · {row.address}
          </option>
        ))}
      </select>
      {!data ? (
        <LoadState error={registry.error} retry={registry.reload} />
      ) : (
        <>
          <p role="status" className="field-help">
            Найдено ЖК: {data.total}. На странице: {data.items.length}.
          </p>
          {!data.items.length && (
            <p className="empty">
              Объекты не найдены. Измените поисковый запрос; текущий выбор
              сохранён.
            </p>
          )}
          <Pagination
            label="Страницы выбора ЖК"
            page={data.page}
            pageSize={data.page_size}
            total={data.total}
            onPageChange={onPage}
          />
        </>
      )}
    </>
  );
}
