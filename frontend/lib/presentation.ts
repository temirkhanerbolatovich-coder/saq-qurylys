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

// Only an encoded registry query is carried; the return path stays local and fixed.
export function propertyDossierUrl(id: string, registryQuery = "") {
  const query = new URLSearchParams(registryQuery);
  return `/properties/${id}${query.size ? `?${new URLSearchParams({ registry: query.toString() })}` : ""}`;
}
