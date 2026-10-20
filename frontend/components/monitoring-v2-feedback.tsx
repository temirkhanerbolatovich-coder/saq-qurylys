"use client";

import { useLocale } from "@/lib/locale";
import { Notice } from "@/components/workspace";
import { Pagination } from "@/components/ui/pagination";

export function V2Notice({ error }: { error: string }) {
  return error ? <Notice error={error} /> : null;
}

/** Localize the existing pagination without introducing another table/navigation system. */
export function V2Pagination(props: Parameters<typeof Pagination>[0]) {
  const { t } = useLocale();
  const pages = Math.max(1, Math.ceil(props.total / props.pageSize));
  return (
    <Pagination
      {...props}
      previousLabel={t("Предыдущая страница", "Алдыңғы бет")}
      nextLabel={t("Следующая страница", "Келесі бет")}
      statusLabel={`${t("Страница", "Бет")} ${props.page} / ${pages}`}
    />
  );
}
