"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** Read-only export: downloads real PDF bytes; never confirms or saves a business record. */
export function PdfDownload({
  kind,
  id,
  label = "Скачать PDF",
  query = "",
}: {
  kind: string;
  id: string;
  label?: string;
  query?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  async function download() {
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(
        `/api/v1/exports/${kind}/${encodeURIComponent(id)}/pdf${query ? `?${query}` : ""}`,
        { cache: "no-store", signal: controller.signal },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error?.message ||
            "Не удалось подготовить PDF. Повторите скачивание.",
        );
      }
      const blob = await response.blob();
      if (
        !response.headers.get("content-type")?.includes("application/pdf") ||
        new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer()) !==
          "%PDF-"
      )
        throw new Error("Сервер не вернул PDF. Повторите скачивание.");
      const filename =
        response.headers
          .get("content-disposition")
          ?.match(/filename="?([^";]+)"?/i)?.[1] || `saq-${kind}-${id}.pdf`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      if (controller.signal.aborted)
        setError("Подготовка PDF прервана. Можно повторить скачивание.");
      else setError((cause as Error).message);
    } finally {
      clearTimeout(timeout);
      setBusy(false);
      pending.current = null;
    }
  }
  return (
    <span className="pdf-download">
      <Button variant="outline" disabled={busy} onClick={() => void download()}>
        {busy ? "Готовим PDF…" : label}
      </Button>
      {busy && <span role="status">Подготовка файла</span>}
      {error && <span role="alert">{error}</span>}
    </span>
  );
}
