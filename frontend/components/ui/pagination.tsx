"use client";

import { Button } from "./button";

/** Uses server pagination metadata; never sorts or paginates a partial client dataset. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  label,
  previousLabel = "Предыдущая страница",
  nextLabel = "Следующая страница",
  statusLabel,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  label: string;
  previousLabel?: string;
  nextLabel?: string;
  statusLabel?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav className="registry-pagination" aria-label={label}>
      <Button
        type="button"
        variant="outline"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        {previousLabel}
      </Button>
      <span role="status" aria-live="polite" aria-atomic="true">
        {statusLabel || `Страница ${page} из ${pages}`}
      </span>
      <Button
        type="button"
        variant="outline"
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
      >
        {nextLabel}
      </Button>
    </nav>
  );
}
