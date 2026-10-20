import { pdfDownloadFilename } from "./presentation";

// Renderer <=60s, exact PDF proxy <=75s, plus a bounded delivery allowance.
export const PDF_CLIENT_TIMEOUT_MS = 90_000;
type PdfReadFailure = "CANCELLED" | "TIMEOUT" | "INVALID" | "FAILED";

export class PdfReadError extends Error {
  constructor(
    public kind: PdfReadFailure,
    message = "",
  ) {
    super(message);
  }
}

/** A single cancellable GET; retries are always an explicit caller action. */
export async function readPdf(
  path: string,
  signal: AbortSignal,
  fallbackFilename: string,
) {
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) cancel();
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, PDF_CLIENT_TIMEOUT_MS);
  try {
    const response = await fetch(path, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new PdfReadError("FAILED", body?.error?.message || "");
    }
    const blob = await response.blob();
    if (
      response.headers
        .get("content-type")
        ?.split(";", 1)[0]
        .trim()
        .toLowerCase() !== "application/pdf" ||
      blob.size < 5 ||
      new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer()) !== "%PDF-"
    )
      throw new PdfReadError("INVALID");
    if (controller.signal.aborted)
      throw new PdfReadError(timedOut ? "TIMEOUT" : "CANCELLED");
    return {
      blob,
      filename: pdfDownloadFilename(
        response.headers.get("content-disposition"),
        fallbackFilename,
      ),
    };
  } catch (cause) {
    if (controller.signal.aborted)
      throw new PdfReadError(timedOut ? "TIMEOUT" : "CANCELLED");
    if (cause instanceof PdfReadError) throw cause;
    throw new PdfReadError("FAILED");
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", cancel);
  }
}

export function pdfReadMessage(cause: unknown, locale: "ru" | "kk") {
  const kind = cause instanceof PdfReadError ? cause.kind : "FAILED";
  const messages = {
    CANCELLED: [
      "Подготовка PDF отменена. Можно повторить скачивание.",
      "PDF дайындау тоқтатылды. Қайта жүктеуге болады.",
    ],
    TIMEOUT: [
      "Время ожидания PDF истекло. Повторите скачивание.",
      "PDF күту уақыты аяқталды. Қайта жүктеп көріңіз.",
    ],
    INVALID: [
      "Сервер не вернул PDF. Повторите скачивание.",
      "Сервер PDF қайтармады. Қайта жүктеп көріңіз.",
    ],
    FAILED: [
      "Не удалось подготовить PDF. Повторите скачивание.",
      "PDF дайындау мүмкін болмады. Қайта жүктеп көріңіз.",
    ],
  };
  if (
    kind === "FAILED" &&
    locale === "ru" &&
    cause instanceof PdfReadError &&
    cause.message
  )
    return cause.message;
  return messages[kind][locale === "kk" ? 1 : 0];
}

export function savePdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
