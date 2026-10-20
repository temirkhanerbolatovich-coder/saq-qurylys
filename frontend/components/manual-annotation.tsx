"use client";

import { useState, type FormEvent } from "react";
import { command } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import type { Extraction } from "@/lib/types";
import {
  reviewCommandFingerprint,
  useReviewDraft,
} from "@/lib/use-review-draft";
import { Button } from "@/components/ui/button";

/** A proposal stores exact source offsets; accepting it remains a separate command. */
export function ManualAnnotation({
  advertisementId,
  sourceLabel,
  extraction,
  userId,
  writable,
  disabled = false,
  onChange,
}: {
  advertisementId: string;
  sourceLabel: string;
  extraction: Extraction;
  userId: string;
  writable: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const draft = useReviewDraft(
    userId,
    `manual-annotation:${advertisementId}:${extraction.id}`,
    { start: "", end: "", reason: "", commandFingerprint: "", commandKey: "" },
    ["commandFingerprint", "commandKey"],
  );
  const points = Array.from(extraction.analysis_text);
  const { start, end, reason } = draft.values;
  const first = Number(start);
  const last = Number(end);
  const validRange =
    start !== "" &&
    end !== "" &&
    Number.isInteger(first) &&
    Number.isInteger(last) &&
    first >= 0 &&
    last > first &&
    last <= points.length &&
    last - first <= 2000;
  const quote = validRange ? points.slice(first, last).join("") : "";
  const fieldId = `manual-annotation-${extraction.id}`;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!writable || disabled || busy || !validRange || !reason.trim()) return;
    setBusy(true);
    setError("");
    setMessage("");
    const path = `/extractions/${extraction.id}/manual-annotations`;
    const body = {
      expected_revision: extraction.revision,
      start_offset: first,
      end_offset: last,
      quote,
      reason,
      field: "PAYMENT_TERM",
    };
    try {
      const fingerprint = await reviewCommandFingerprint(path, body);
      const key =
        draft.values.commandFingerprint === fingerprint &&
        draft.values.commandKey
          ? draft.values.commandKey
          : crypto.randomUUID();
      draft.update({ commandFingerprint: fingerprint, commandKey: key });
      await command<Extraction>(path, body, key);
      draft.update({
        start: "",
        end: "",
        reason: "",
        commandFingerprint: "",
        commandKey: "",
      });
      draft.saved();
      setMessage(
        t(
          "Предложение сохранено. Требуется отдельная проверка другим аналитиком; R2 и риск не изменены.",
          "Ұсыныс сақталды. Оны басқа талдаушы бөлек тексеруі керек; R2 мен тәуекел өзгерген жоқ.",
        ),
      );
      onChange();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!writable) return null;
  return (
    <details className="review-draft-help" data-testid="manual-annotation">
      <summary>
        {t("Предложить пропущенный фрагмент", "Өткізіп алған үзіндіні ұсыну")}
      </summary>
      <form className="review-form" onSubmit={(event) => void submit(event)}>
        <p>
          {t("Источник: ", "Дереккөз: ")}
          {sourceLabel}
          {" · "}
          {t("Версия текста: ", "Мәтін нұсқасы: ")}
          {extraction.id}
          {" · "}
          {t("Ревизия: ", "Ревизия: ")}
          {extraction.revision}
        </p>
        <p id={`${fieldId}-help`}>
          {t(
            "Выделите точную цитату в неизменяемом тексте или укажите границы в символах Unicode (с нуля, конец не включается; до 2000 символов). Пересказ не допускается. Предложение не создаёт доказательство и не подтверждает R2.",
            "Өзгермейтін мәтіннен дәл дәйексөзді белгілеңіз немесе Unicode таңбаларымен шекараларын көрсетіңіз (нөлден бастап, соңғы шекара кірмейді; 2000 таңбаға дейін). Мазмұндап жазуға болмайды. Ұсыныс дәлел жасамайды және R2-ні растамайды.",
          )}
        </p>
        {draft.restored && (
          <p role="status">
            {t(
              "Восстановлен черновик предложения; он ещё не сохранён.",
              "Ұсыныс жобасы қалпына келтірілді; ол әлі сақталмаған.",
            )}
          </p>
        )}
        {draft.storageError && <p role="alert">{draft.storageError}</p>}
        <fieldset className="review-form" disabled={disabled || busy}>
          <legend>
            {t("Точный фрагмент и обоснование", "Дәл үзінді мен негіздеме")}
          </legend>
          <label htmlFor={`${fieldId}-source`}>
            {t(
              "Текст для точного выделения",
              "Дәл үзіндіні белгілеуге арналған мәтін",
            )}
          </label>
          <textarea
            id={`${fieldId}-source`}
            rows={8}
            readOnly
            value={extraction.analysis_text}
            aria-describedby={`${fieldId}-help`}
            onSelect={(event) => {
              const source = event.currentTarget;
              if (source.selectionEnd <= source.selectionStart) return;
              draft.update({
                start: String(
                  Array.from(source.value.slice(0, source.selectionStart))
                    .length,
                ),
                end: String(
                  Array.from(source.value.slice(0, source.selectionEnd)).length,
                ),
              });
              setMessage("");
            }}
          />
          <label htmlFor={`${fieldId}-start`}>
            {t("Начало фрагмента (Unicode)", "Үзінді басы (Unicode)")}
          </label>
          <input
            id={`${fieldId}-start`}
            type="number"
            min={0}
            max={points.length}
            step={1}
            value={start}
            onChange={(event) => draft.update({ start: event.target.value })}
          />
          <label htmlFor={`${fieldId}-end`}>
            {t(
              "Конец фрагмента (не включается)",
              "Үзінді соңы (шекара кірмейді)",
            )}
          </label>
          <input
            id={`${fieldId}-end`}
            type="number"
            min={0}
            max={points.length}
            step={1}
            value={end}
            onChange={(event) => draft.update({ end: event.target.value })}
          />
          <p>{t("Точная цитата: ", "Дәл дәйексөз: ")}</p>
          <blockquote data-testid="manual-annotation-quote">
            {quote || t("Фрагмент не выбран", "Үзінді таңдалмаған")}
          </blockquote>
          {(start || end) && !validRange && (
            <p role="alert">
              {t(
                "Укажите допустимый непустой фрагмент до 2000 символов.",
                "2000 таңбадан аспайтын жарамды бос емес үзіндіні көрсетіңіз.",
              )}
            </p>
          )}
          <label htmlFor={`${fieldId}-reason`}>
            {t(
              "Обоснование ручного предложения",
              "Қолмен берілген ұсыныстың негіздемесі",
            )}
          </label>
          <textarea
            id={`${fieldId}-reason`}
            maxLength={2000}
            value={reason}
            onChange={(event) => draft.update({ reason: event.target.value })}
          />
          <Button
            type="submit"
            disabled={!validRange || !reason.trim()}
            aria-busy={busy}
          >
            {t(
              "Сохранить предложение для независимой проверки",
              "Ұсынысты тәуелсіз тексеруге сақтау",
            )}
          </Button>
        </fieldset>
        {error && (
          <div role="alert">
            <p>{error}</p>
            <p>
              {t(
                "Границы и обоснование сохранены. При конфликте обновите версию, затем повторите явное сохранение.",
                "Шекаралар мен негіздеме сақталды. Қайшылық болса, нұсқаны жаңартып, сақтауды қайта орындаңыз.",
              )}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onChange}
            >
              {t(
                "Обновить версию без потери черновика",
                "Жобаны жоғалтпай нұсқаны жаңарту",
              )}
            </Button>
          </div>
        )}
        {message && <p role="status">{message}</p>}
      </form>
    </details>
  );
}
