import type { Property } from "./types";

export function propertyNextAction(row: Property) {
  if (row.legal_verification_status === "PENDING")
    return { order: 0, label: "Проверить основание, ожидающее решения" };
  if (["UNKNOWN", "REJECTED"].includes(row.legal_verification_status))
    return {
      order: 1,
      label: "Установить применимое основание и полноту источников",
    };
  return { order: 2, label: "Сверить актуальность документов и решений" };
}

/** Work order within the loaded page, never a replacement for server risk or deadlines. */
export function comparePropertyWork(a: Property, b: Property) {
  return (
    propertyNextAction(a).order - propertyNextAction(b).order ||
    (a.last_reviewed_at ? Date.parse(a.last_reviewed_at) : 0) -
      (b.last_reviewed_at ? Date.parse(b.last_reviewed_at) : 0) ||
    b.risk.score - a.risk.score ||
    a.id.localeCompare(b.id)
  );
}
