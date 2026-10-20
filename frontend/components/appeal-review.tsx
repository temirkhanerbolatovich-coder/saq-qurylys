"use client";
import { useState, type FormEvent } from "react";
import { command, upload } from "@/lib/api";
import type { PropertyDetail } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useDossierFormDraft } from "@/lib/use-dossier-form-draft";
import { DossierDraftNotice } from "@/components/dossier-draft-notice";

import { statusLabel } from "@/lib/status-labels";

export function AppealReview({
  detail,
  onSaved,
  userId,
}: {
  userId: string;
  detail: PropertyDetail;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [savedFactorRevision, setSavedFactorRevision] = useState<number | null>(
    null,
  );
  const draft = useDossierFormDraft(
    userId,
    `${detail.property.id}:R4`,
    (fields, missingFiles) => {
      setReason(fields["appeal-reason"] || "");
      setNeedsCapture(fields.$formChanged === "true" || missingFiles);
    },
    ["appeal-reason"],
  );
  const selection = draft.remember("selection", () => ({
    evidenceId: "",
    needsCapture: false,
  }));
  const [evidenceId, updateEvidenceId] = useState(selection.evidenceId);
  const [needsCapture, updateNeedsCapture] = useState(selection.needsCapture);
  function setEvidenceId(value: string) {
    selection.evidenceId = value;
    updateEvidenceId(value);
  }
  function setNeedsCapture(value: boolean) {
    selection.needsCapture = value;
    updateNeedsCapture(value);
  }
  const keys = draft.remember("keys", () => ({
    current: new Map<string, string>(),
  }));
  const fileKey = draft.remember("fileKey", () => ({
    current: crypto.randomUUID(),
  }));
  const factor = detail.factors.find((f) => f.code === "R4");
  const refreshingFactor = Boolean(
    factor &&
    savedFactorRevision !== null &&
    factor.revision < savedFactorRevision,
  );
  function key(payload: string) {
    if (!keys.current.has(payload))
      keys.current.set(payload, crypto.randomUUID());
    return keys.current.get(payload)!;
  }
  async function run(task: () => Promise<void>) {
    draft.checkpoint();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
      if (!selection.needsCapture) draft.saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      onSaved();
      setBusy(false);
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file") as File;
    if (file.size > 10_485_760) {
      setError("Файл должен быть не больше 10 МБ");
      return;
    }
    form.set("property_id", detail.property.id);
    form.set("is_demo", String(detail.property.is_demo));
    form.set("event_at", `${form.get("event_at")}:00+05:00`);
    await run(async () => {
      const asset = await upload<{ id: string }>(
        "/assets/upload",
        form,
        fileKey.current,
      );
      const body = {
        property_id: detail.property.id,
        asset_id: asset.id,
        kind: "COLLECTIVE_APPEAL",
        description: reason,
        source_label: form.get("source_label"),
        event_at: form.get("event_at"),
        is_demo: detail.property.is_demo,
      };
      const evidence = await command<{ id: string }>(
        "/evidence",
        body,
        key(JSON.stringify(body)),
      );
      setEvidenceId(evidence.id);
      if (!factor) {
        const body = {
          code: "R4",
          as_of: new Date().toISOString(),
          evidence_ids: [evidence.id],
          reason,
        };
        await command(
          `/properties/${detail.property.id}/risk-factors`,
          body,
          key(JSON.stringify(body)),
        );
      }
      setNeedsCapture(false);
      setMessage(
        "Документ и доказательство сохранены. R4 подтверждается отдельным решением.",
      );
    });
  }
  const ids = evidenceId ? [evidenceId] : factor?.evidence_ids || [];
  async function review(status: string) {
    if (!factor || refreshingFactor) return;
    await run(async () => {
      const body = {
        expected_revision: factor.revision,
        status,
        evidence_ids: ids,
        reason,
      };
      const reviewed = await command<{ factor: { revision: number } }>(
        `/risk-factors/${factor.id}/review`,
        body,
        key(JSON.stringify(body)),
      );
      // The parent reload is asynchronous; another decision needs its fresh revision.
      setSavedFactorRevision(reviewed.factor.revision);
      setMessage(
        status === "CONFIRMED"
          ? "R4 подтверждён: +15 баллов."
          : "R4 отклонён: 0 баллов.",
      );
    });
  }
  return (
    <section className="panel padded legal-review" {...draft.containerProps}>
      <h2>R4 · коллективное обращение</h2>
      <DossierDraftNotice draft={draft} />
      <p>
        Загрузите отдельный документ. Укажите дату, источник и основание
        проверки коллективности. Это сведения аналитика; система не проверяет
        подлинность подписей и не начисляет баллы при загрузке.
      </p>
      {factor && (
        <p>
          Текущий статус R4: <b>{statusLabel(factor.status)}</b>
        </p>
      )}
      {refreshingFactor && (
        <div>
          <p role="status">
            Обновляем сохранённое решение R4. Следующее решение станет доступно
            после загрузки актуальной версии.
          </p>
          <Button type="button" variant="outline" onClick={onSaved}>
            Обновить сохранённое решение R4
          </Button>
        </div>
      )}
      <form
        onSubmit={save}
        className="review-form"
        onChange={(event) => {
          fileKey.current = crypto.randomUUID();
          if ((event.target as HTMLElement).id !== "appeal-reason") {
            setEvidenceId("");
            setNeedsCapture(true);
          }
        }}
      >
        <label htmlFor="appeal-source">Источник обращения</label>
        <input
          id="appeal-source"
          name="source_label"
          required
          maxLength={300}
        />
        <label htmlFor="appeal-file">
          Документ обращения · TXT / PNG / JPEG / PDF
        </label>
        <input
          id="appeal-file"
          name="file"
          type="file"
          accept="text/plain,.txt,image/png,image/jpeg,application/pdf,.pdf"
          required
        />
        <p className="muted">
          PDF: обычный документ без пароля и интерактивных элементов.
        </p>
        <label htmlFor="appeal-date">Дата обращения · +05:00</label>
        <input
          id="appeal-date"
          name="event_at"
          type="datetime-local"
          required
        />
        <label htmlFor="appeal-count">Количество заявителей</label>
        <input
          id="appeal-count"
          name="signatory_count"
          type="number"
          min="2"
          max="100000"
          required
        />
        <label htmlFor="appeal-method">Основание проверки коллективности</label>
        <textarea
          id="appeal-method"
          name="methodology"
          maxLength={2000}
          required
        />
        <label htmlFor="appeal-url">URL источника · необязательно</label>
        <input id="appeal-url" name="source_url" type="url" maxLength={2048} />
        <label htmlFor="appeal-reason">Обоснование решения R4</label>
        <textarea
          id="appeal-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={2000}
          required
        />
        <Button disabled={busy || refreshingFactor || !reason.trim()}>
          Сохранить документ обращения
        </Button>
      </form>
      {needsCapture && factor && (
        <p className="muted">
          Сохраните изменённый документ перед подтверждением R4. Отклонение
          относится к текущему сохранённому фактору.
        </p>
      )}
      {factor && (
        <div className="review-actions">
          <Button
            disabled={
              busy ||
              refreshingFactor ||
              !reason.trim() ||
              !ids.length ||
              needsCapture
            }
            onClick={() => void review("CONFIRMED")}
          >
            Подтвердить R4 · +15
          </Button>
          <Button
            variant="outline"
            disabled={busy || refreshingFactor || !reason.trim()}
            onClick={() => void review("REJECTED")}
          >
            Отклонить R4
          </Button>
        </div>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
