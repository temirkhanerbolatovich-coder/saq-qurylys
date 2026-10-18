import type { Asset, Property } from "./types";

/** Prefer the UTF-8 download name; never accept paths, controls or a non-PDF extension. */
export function pdfDownloadFilename(
  disposition: string | null,
  fallback: string,
) {
  function safe(value: string | undefined) {
    if (!value) return null;
    const name = value.trim().normalize("NFC");
    if (
      !/\.pdf$/i.test(name) ||
      name.startsWith(".") ||
      /[/\\:*?"<>|]/.test(name) ||
      [...name].some((character) => {
        const code = character.codePointAt(0)!;
        return (
          code < 32 ||
          code === 127 ||
          (code >= 0x202a && code <= 0x202e) ||
          (code >= 0x2066 && code <= 0x2069)
        );
      }) ||
      new TextEncoder().encode(name).length > 240
    )
      return null;
    return name;
  }
  const header = disposition || "";
  const encoded = header.match(
    /(?:^|;)\s*filename\*\s*=\s*UTF-8'[^']*'([^;]*)/i,
  )?.[1];
  if (encoded) {
    try {
      const preferred = safe(decodeURIComponent(encoded.trim()));
      if (preferred) return preferred;
    } catch {
      /* A damaged extended name may still have a valid ASCII fallback. */
    }
  }
  const plain = header.match(
    /(?:^|;)\s*filename\s*=\s*(?:"([^"]*)"|([^;\s]+))/i,
  );
  return safe(plain?.[1] || plain?.[2]) || safe(fallback) || "saq-document.pdf";
}

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
