import type { Asset, Property } from "./types";

export function assetPdfLabel(asset: Asset) {
  if (asset.mime_type === "application/pdf") return "Скачать исходный PDF";
  return "Скачать PDF-копию источника";
}

export const factorLabels: Record<string, string> = {
  R1: "Отсутствие основания установлено",
  R2: "Прямое предложение внести деньги",
  R3: "Активная реклама строящегося жилья",
  R4: "Коллективное обращение",
  R5: "Расхождение готовности ≥20 п.п.",
  R6: "Подтверждённая задержка",
};

export const zoneLabels: Record<Property["risk"]["zone"], string> = {
  GREEN: "Зелёная",
  YELLOW: "Жёлтая",
  RED: "Красная",
};

export const propertyLevelLabels: Record<Property["level"], string> = {
  PROJECT: "Жилой комплекс",
  PHASE: "Очередь",
  BUILDING: "Корпус",
};

export function propertyRiskContext(row: Property) {
  if (row.risk.zone !== "GREEN") return null;
  if (row.legal_verification_status === "PENDING")
    return "Основание ожидает решения";
  if (row.legal_verification_status === "UNKNOWN")
    return "Основание не проверено";
  if (row.legal_verification_status === "REJECTED")
    return "Основание отклонено";
  return null;
}

// Only an encoded registry query is carried; the return path stays local and fixed.
export function propertyDossierUrl(id: string, registryQuery = "") {
  const query = new URLSearchParams(registryQuery);
  return `/properties/${id}${query.size ? `?${new URLSearchParams({ registry: query.toString() })}` : ""}`;
}
