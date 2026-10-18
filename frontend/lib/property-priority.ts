import type { Property } from "./types";

export function propertyNextAction(row: Property) {
  if (row.legal_verification_status === "PENDING")
    return { label: "Проверить основание, ожидающее решения" };
  if (["UNKNOWN", "REJECTED"].includes(row.legal_verification_status))
    return {
      label: "Установить применимое основание и полноту источников",
    };
  return { label: "Сверить актуальность документов и решений" };
}
