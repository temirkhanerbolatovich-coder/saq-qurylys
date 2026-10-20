"use client";
import { useLocale } from "@/lib/locale";
import Link from "next/link";
import { useState } from "react";
import { date } from "@/lib/api";
import type { Advertisement, Signal, Page } from "@/lib/types";
import { statusLabel } from "@/lib/status-labels";
import { Pagination } from "@/components/ui/pagination";
import { PdfDownload } from "@/components/pdf-download";
import { LoadState, useData } from "@/components/workspace";

export function ObjectRecords({
  kind,
  propertyId,
}: {
  kind: "advertisements" | "signals";
  propertyId: string;
}) {
  const [page, setPage] = useState(1);
  return (
    <RecordPage
      key={`${kind}:${propertyId}:${page}`}
      kind={kind}
      propertyId={propertyId}
      page={page}
      onPage={setPage}
    />
  );
}
function RecordPage({
  kind,
  propertyId,
  page,
  onPage,
}: {
  kind: "advertisements" | "signals";
  propertyId: string;
  page: number;
  onPage: (page: number) => void;
}) {
  const { t } = useLocale();
  const result = useData<Page<Advertisement | Signal>>(
    `/${kind}?property_id=${propertyId}&page=${page}&page_size=10`,
  );
  if (!result.data)
    return <LoadState error={result.error} retry={result.reload} />;
  return (
    <section
      className="panel padded object-records"
      aria-label={t(
        kind === "signals" ? "Версии сигналов объекта" : "Публикации объекта",
      )}
    >
      <p className="field-help" role="status">
        {t("Всего записей: ")}
        {result.data.total}
      </p>
      {result.data.items.map((row) => {
        const signal = "state" in row;
        return (
          <article className="object-record" key={row.id}>
            <div>
              <Link
                href={
                  signal
                    ? `/signals?signal_id=${row.id}`
                    : `/advertisements/${row.id}`
                }
              >
                {signal ? `Сигнал · версия ${row.version}` : row.source_label}
              </Link>
              <p>
                {statusLabel(signal ? row.state : row.status)} ·{" "}
                {date(signal ? row.created_at : row.captured_at)}
              </p>
            </div>
            <PdfDownload
              kind={kind}
              id={row.id}
              label={t(signal ? "PDF этой версии" : "PDF публикации")}
            />
          </article>
        );
      })}
      {!result.data.items.length && (
        <p className="empty">{t("Записей пока нет.")}</p>
      )}
      <Pagination
        label={t(
          kind === "signals"
            ? "Страницы сигналов объекта"
            : "Страницы публикаций объекта",
        )}
        page={result.data.page}
        pageSize={result.data.page_size}
        total={result.data.total}
        onPageChange={onPage}
      />
    </section>
  );
}
