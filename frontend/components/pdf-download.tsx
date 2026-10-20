"use client";
import { useLocale } from "@/lib/locale";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { pdfReadMessage, readPdf, savePdf } from "@/lib/pdf-read";

/** Read-only export: downloads real PDF bytes; never confirms or saves a business record. */
export function PdfDownload({
  kind,
  id,
  label = "Скачать PDF",
  query = "",
  description,
}: {
  kind: string;
  id: string;
  label?: string;
  query?: string;
  description?: string;
}) {
  const { t, locale } = useLocale();
  const descriptionId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      pending.current?.abort();
      pending.current = null;
      setBusy(false);
      setError("");
    },
    [kind, id, query],
  );
  async function download() {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    try {
      const { blob, filename } = await readPdf(
        `/api/v1/exports/${kind}/${encodeURIComponent(id)}/pdf${query ? `?${query}` : ""}`,
        controller.signal,
        `saq-${kind}-${id}.pdf`,
      );
      if (pending.current === controller && !controller.signal.aborted)
        savePdf(blob, filename);
    } catch (cause) {
      if (pending.current === controller)
        setError(pdfReadMessage(cause, locale));
    } finally {
      if (pending.current === controller) {
        setBusy(false);
        pending.current = null;
      }
    }
  }
  return (
    <span className="pdf-download">
      <Button
        type="button"
        variant="outline"
        aria-busy={busy}
        disabled={busy}
        aria-describedby={description ? descriptionId : undefined}
        onClick={() => void download()}
      >
        {busy ? t("Готовим PDF…") : t(label)}
      </Button>
      {description && (
        <span id={descriptionId} className="field-help">
          {description}
        </span>
      )}
      {busy && <span role="status">{t("Подготовка файла")}</span>}
      {busy && (
        <Button
          type="button"
          variant="outline"
          onClick={() => pending.current?.abort()}
        >
          {t("Отменить подготовку", "Дайындауды тоқтату")}
        </Button>
      )}
      {error && <span role="alert">{error}</span>}
    </span>
  );
}
