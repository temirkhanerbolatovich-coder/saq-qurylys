"use client";
import { useRef, useState, type FormEvent } from "react";
import { ApiError, command, date, upload } from "@/lib/api";
import type { PropertyDetail } from "@/lib/types";
import { Button } from "@/components/ui/button";

const mechanisms = [
  { value: "KZHK_GUARANTEE", label: "Гарантия КЖК" },
  {
    value: "BANK_WITH_MIO_PERMIT",
    label: "Банковский механизм + разрешение МИО",
  },
  { value: "FRAME_WITH_MIO_PERMIT", label: "Каркас + разрешение МИО" },
] as const;
const results = {
  UNKNOWN: "Не проверено",
  NOT_FOUND: "Не найдено в доступной выборке",
  UNAVAILABLE: "Источник недоступен",
  DOCUMENTED_ABSENT: "Отсутствие документально установлено",
};
type Result = keyof typeof results;
type Check = { mechanism: string; result: Result; reason: string };
type SavedCheck = { evidenceId: string; asOf: string; complete: boolean };

function aware(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value)
    throw new Error("Укажите обе даты проверки");
  const timestamp = value.length === 16 ? `${value}:00` : value;
  return `${timestamp}+05:00`;
}

/** An absence finding is dated evidence, distinct from a current legal status. */
export function LegalAbsenceReview({
  detail,
  onSaved,
}: {
  detail: PropertyDetail;
  onSaved: () => void;
}) {
  const factor = detail.factors.find((row) => row.code === "R1");
  const [checks, setChecks] = useState<Check[]>(
    mechanisms.map(({ value }) => ({
      mechanism: value,
      result: "UNKNOWN",
      reason: "",
    })),
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState<SavedCheck | null>(null);
  const [draftChanged, setDraftChanged] = useState(false);
  const cache = useRef({
    keys: new Map<string, string>(),
    results: new Map<string, unknown>(),
  });
  const completeCount = checks.filter(
    (check) => check.result === "DOCUMENTED_ABSENT",
  ).length;
  const evidenceIds = saved ? [saved.evidenceId] : factor?.evidence_ids || [];
  const confirmationDate = saved?.asOf || factor?.as_of;
  const canConfirm =
    !!factor &&
    !!confirmationDate &&
    !!evidenceIds.length &&
    (saved ? saved.complete : !draftChanged);

  async function once<T>(
    signature: string,
    action: (key: string) => Promise<T>,
  ) {
    if (cache.current.results.has(signature))
      return cache.current.results.get(signature) as T;
    if (!cache.current.keys.has(signature))
      cache.current.keys.set(signature, crypto.randomUUID());
    const result = await action(cache.current.keys.get(signature)!);
    cache.current.results.set(signature, result);
    return result;
  }
  async function saveCommand<T>(path: string, body: unknown) {
    return once<T>(`${path}:${JSON.stringify(body)}`, (key) =>
      command<T>(path, body, key),
    );
  }
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? `HTTP ${failure.status}: ${failure.message}`
          : (failure as Error).message,
      );
    } finally {
      onSaved();
      setBusy(false);
    }
  }
  function updateCheck(
    index: number,
    update: Partial<Pick<Check, "result" | "reason">>,
  ) {
    setChecks((current) =>
      current.map((check, position) =>
        position === index ? { ...check, ...update } : check,
      ),
    );
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      if (!reason.trim()) throw new Error("Укажите обоснование решения R1");
      const file = form.get("file");
      if (!(file instanceof File) || !file.size)
        throw new Error("Выберите непустой документ TXT, PNG, JPEG или PDF");
      if (file.size > 10_485_760)
        throw new Error("Файл должен быть не больше 10 МБ");
      const source = String(form.get("source_label") || "").trim();
      const scope = String(form.get("scope_description") || "").trim();
      const methodology = String(form.get("methodology") || "").trim();
      if (
        !source ||
        !scope ||
        !methodology ||
        checks.some((check) => !check.reason.trim())
      )
        throw new Error(
          "Укажите источник, точную область, методику и обоснование каждого результата",
        );
      const asOf = aware(form.get("absence_as_of"));
      const eventAt = aware(form.get("event_at"));
      if (
        new Date(asOf).getTime() > new Date(eventAt).getTime() ||
        new Date(eventAt).getTime() > Date.now()
      )
        throw new Error(
          "Дата состояния должна быть не позже даты документа; дата документа не может быть в будущем",
        );
      const fields = {
        purpose: "LEGAL_ABSENCE_REVIEW",
        property_id: detail.property.id,
        is_demo: String(detail.property.is_demo),
        source_label: source,
        source_url: String(form.get("source_url") || ""),
        scope_description: scope,
        event_at: eventAt,
        absence_as_of: asOf,
        methodology,
        legal_checks: JSON.stringify(
          checks.map((check) => ({ ...check, reason: check.reason.trim() })),
        ),
      };
      const hash = Array.from(
        new Uint8Array(
          await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
        ),
        (byte) => byte.toString(16).padStart(2, "0"),
      ).join("");
      const sourceForm = new FormData();
      for (const [name, value] of Object.entries(fields))
        sourceForm.set(name, value);
      sourceForm.set("file", file);
      const asset = await once<{ id: string }>(
        `upload:${hash}:${file.type}:${JSON.stringify(fields)}`,
        (key) => upload("/assets/upload", sourceForm, key),
      );
      const evidence = await saveCommand<{ id: string }>("/evidence", {
        property_id: detail.property.id,
        asset_id: asset.id,
        kind: "LEGAL_ABSENCE_REVIEW",
        description: reason.trim(),
        source_label: source,
        event_at: eventAt,
        is_demo: detail.property.is_demo,
      });
      const complete = checks.every(
        (check) => check.result === "DOCUMENTED_ABSENT",
      );
      setSaved({ evidenceId: evidence.id, asOf, complete });
      if (complete && !factor) {
        await saveCommand(`/properties/${detail.property.id}/risk-factors`, {
          code: "R1",
          as_of: asOf,
          evidence_ids: [evidence.id],
          reason: reason.trim(),
        });
      }
      setDraftChanged(false);
      setMessage(
        complete
          ? "Проверка 3/3 сохранена на указанную дату. Подтвердите R1 отдельным решением."
          : "Неполная проверка сохранена как доказательство. Новый R1 не создан; отсутствие трёх оснований не установлено.",
      );
    });
  }
  async function review(status: "CONFIRMED" | "REJECTED") {
    if (!factor) return;
    await run(async () => {
      const asOf = status === "CONFIRMED" ? confirmationDate : factor.as_of;
      if (!asOf)
        throw new Error(
          "Не установлена дата текущего решения. Обновите карточку перед проверкой.",
        );
      await saveCommand(`/risk-factors/${factor.id}/review`, {
        expected_revision: factor.revision,
        status,
        evidence_ids:
          status === "CONFIRMED" ? evidenceIds : factor.evidence_ids,
        reason: reason.trim(),
        as_of: asOf,
      });
      setMessage(
        status === "CONFIRMED"
          ? "R1 подтверждён на указанную дату: +35 баллов. Это не бессрочный текущий статус."
          : "R1 отклонён: 0 баллов. История проверки сохранена.",
      );
    });
  }

  return (
    <section className="panel padded" data-testid="legal-absence-review">
      <h2>R1 · проверка отсутствия оснований</h2>
      <p>
        Пустой реестр, ошибка источника или отсутствие строки не доказывают
        отсутствие правового основания. Для R1 требуется документированный
        результат по каждому из трёх механизмов для конкретного объекта и даты.
        Историческая проверка не устанавливает текущий бессрочный статус.
      </p>
      <p>
        Для совместного подтверждения R1 и R2 нужна известная дата публикации,
        точно совпадающая с моментом проверки отсутствия. Время загрузки не
        заменяет дату публикации.
      </p>
      {factor && (
        <p>
          Текущий статус R1:{" "}
          <b>
            {factor.status === "CONFIRMED"
              ? "Подтверждён · +35"
              : factor.status === "PENDING"
                ? "На проверке · 0"
                : "Отклонён · 0"}
          </b>
          {factor.as_of && <> · дата оценки {date(factor.as_of)}</>}
        </p>
      )}
      {factor?.status === "CONFIRMED" &&
        detail.legal_bases.some(
          (basis) => basis.verification_status === "PENDING",
        ) && (
          <p className="notice">
            Есть непроверенные документы основания. Сверьте их область и период
            с датой R1 и явно пересмотрите решение при необходимости.
            Прикрепление документа само не отменяет прежнее подтверждение.
          </p>
        )}
      <details>
        <summary>Проверить три механизма на дату</summary>
        <form
          id="legal-absence-capture"
          className="review-form"
          onSubmit={save}
          onChange={() => {
            setDraftChanged(true);
            setSaved(null);
            setMessage("");
          }}
        >
          <fieldset className="review-form m-0" disabled={busy}>
            <label htmlFor="absence-file">
              Документ проверки отсутствия · TXT / PNG / JPEG / PDF
            </label>
            <input
              id="absence-file"
              name="file"
              type="file"
              accept="text/plain,.txt,image/png,image/jpeg,application/pdf,.pdf"
              required
            />
            <p className="muted">
              PDF: обычный документ без пароля и интерактивных элементов.
            </p>
            <label htmlFor="absence-source">Источник проверки отсутствия</label>
            <input
              id="absence-source"
              name="source_label"
              maxLength={300}
              required
            />
            <label htmlFor="absence-url">
              URL проверки отсутствия · необязательно
            </label>
            <input
              id="absence-url"
              name="source_url"
              type="url"
              maxLength={2048}
            />
            <label htmlFor="absence-scope">
              Точная область проверки: объект / очередь / корпус
            </label>
            <textarea
              id="absence-scope"
              name="scope_description"
              maxLength={2000}
              required
            />
            <label htmlFor="absence-as-of">
              Состояние оснований на дату · +05:00
            </label>
            <input
              id="absence-as-of"
              name="absence_as_of"
              type="datetime-local"
              step="0.001"
              required
            />
            <label htmlFor="absence-event">
              Дата сведений документа проверки · +05:00
            </label>
            <input
              id="absence-event"
              name="event_at"
              type="datetime-local"
              step="0.001"
              required
            />
            <label htmlFor="absence-method">
              Что и как проверено по трём механизмам
            </label>
            <textarea
              id="absence-method"
              name="methodology"
              maxLength={2000}
              required
            />
            {mechanisms.map((mechanism, index) => (
              <fieldset key={mechanism.value} className="review-form m-0">
                <legend>{mechanism.label}</legend>
                <label htmlFor={`absence-result-${mechanism.value}`}>
                  Результат · {mechanism.label}
                </label>
                <select
                  id={`absence-result-${mechanism.value}`}
                  value={checks[index].result}
                  onChange={(event) =>
                    updateCheck(index, { result: event.target.value as Result })
                  }
                >
                  {Object.entries(results).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <label htmlFor={`absence-check-reason-${mechanism.value}`}>
                  Обоснование результата · {mechanism.label}
                </label>
                <textarea
                  id={`absence-check-reason-${mechanism.value}`}
                  value={checks[index].reason}
                  onChange={(event) =>
                    updateCheck(index, { reason: event.target.value })
                  }
                  maxLength={2000}
                  required
                />
              </fieldset>
            ))}
            <p className="notice">
              Документально установлено отсутствие: {completeCount}/3.{" "}
              {completeCount === 3
                ? "Полнота позволяет передать R1 на отдельную проверку аналитика."
                : "Проверка неполна: R1 не создаётся. Сведения можно сохранить как доказательство."}
            </p>
          </fieldset>
        </form>
        <Button form="legal-absence-capture" disabled={busy || !reason.trim()}>
          Сохранить проверку отсутствия
        </Button>
      </details>
      <div className="decision-panel">
        <label htmlFor="absence-decision-reason">Обоснование решения R1</label>
        <p id="absence-decision-help" className="muted">
          Укажите обоснование, чтобы сохранить проверку или принять отдельное
          решение по R1. Без него кнопки недоступны.
        </p>
        <textarea
          id="absence-decision-reason"
          form="legal-absence-capture"
          aria-describedby="absence-decision-help"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={2000}
          disabled={busy}
          required
        />
        {factor && (
          <>
            <p className="muted">
              После обновления страницы решение относится к сохранённым
              доказательствам фактора. Новые материалы сначала сохраните через
              форму выше.
            </p>
            <div className="review-actions">
              <Button
                disabled={busy || !reason.trim() || !canConfirm}
                onClick={() => void review("CONFIRMED")}
              >
                Подтвердить R1 · +35
              </Button>
              <Button
                variant="danger"
                disabled={busy || !reason.trim() || !factor.as_of}
                onClick={() => void review("REJECTED")}
              >
                Отклонить R1
              </Button>
            </div>
          </>
        )}
      </div>
      {saved && (
        <p>
          Дата состояния сохранённой проверки: {date(saved.asOf)} · полнота{" "}
          {saved.complete ? "3/3" : "неполная"}.{" "}
          {saved.complete
            ? "Решение о R1 принимается отдельно."
            : "Подтверждение по этой проверке недоступно."}
        </p>
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
