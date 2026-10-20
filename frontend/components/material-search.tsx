"use client";
import { useLocale } from "@/lib/locale";

import { useId } from "react";
import { Button } from "@/components/ui/button";

/** Explicit GET search shared by the material library and both review queues. */
export function MaterialSearch({
  query,
  onSearch,
}: {
  query: string;
  onSearch: (query: string) => void;
}) {
  const { t } = useLocale();
  const id = useId();
  return (
    <form
      className="material-search"
      role="search"
      aria-label={t("Поиск материалов")}
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(
          String(new FormData(event.currentTarget).get("q") || "").trim(),
        );
      }}
    >
      <label htmlFor={id}>{t("Текст публикации или название источника")}</label>
      <div className="material-search-controls">
        <input
          key={query}
          id={id}
          name="q"
          type="search"
          maxLength={300}
          defaultValue={query}
          autoComplete="off"
          aria-describedby={`${id}-help`}
        />
        <Button type="submit" variant="outline">
          {t("Найти материалы")}
        </Button>
        {query && (
          <Button type="button" variant="ghost" onClick={() => onSearch("")}>
            {t("Сбросить поиск")}
          </Button>
        )}
      </div>
      <p id={`${id}-help`} className="field-help">
        {t(
          "По всему списку с учётом фильтров. OCR и гипотезы не входят в поиск.",
        )}
      </p>
    </form>
  );
}
