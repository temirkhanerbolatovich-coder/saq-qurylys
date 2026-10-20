"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, api, command, date, upload } from "@/lib/api";
import type {
  Advertisement,
  Extraction,
  Page,
  PropertyDetail,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useDossierFormDraft } from "@/lib/use-dossier-form-draft";
import { DossierDraftNotice } from "@/components/dossier-draft-notice";

type Code = "R3" | "R5" | "R6";
type Saved = { id: string };
type RetryCache = {
  keys: Map<string, string>;
  results: Map<string, unknown>;
  dates: Map<string, string>;
};
const definitions = {
  R3: {
    title: "R3 · реклама до ввода",
    weight: 10,
    save: "Сохранить материалы R3",
    explanation:
      "Нужны публикация с известной датой, проверенной привязкой к этой очереди и отдельный документ о стадии строительства на тот же день. Подтверждение OCR само не подтверждает R3.",
  },
  R5: {
    title: "R5 · сравнение готовности",
    weight: 10,
    save: "Сохранить сравнение R5",
    explanation:
      "Сопоставьте заявленную и проверенную готовность одной области на одну дату, по одной методике. Нужны два разных оригинала; разница должна быть не меньше 20 процентных пунктов.",
  },
  R6: {
    title: "R6 · документированная просрочка",
    weight: 5,
    save: "Сохранить документ R6",
    explanation:
      "Укажите плановый срок и документированное состояние после него. В методике объясните существенность отклонения. Система проверяет даты, а оценку документа и существенности выполняет аналитик.",
  },
};
const statuses: Record<string, string> = {
  PENDING: "На проверке · 0 баллов",
  CONFIRMED: "Подтверждён",
  REJECTED: "Отклонён · 0 баллов",
};

function aware(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value)
    throw new Error("Укажите дату источника");
  return `${value}:00+05:00`;
}

function SourceFields({ prefix, title }: { prefix: string; title: string }) {
  return (
    <fieldset className="review-form m-0">
      <legend>{title}</legend>
      <label htmlFor={`${prefix}-file`}>{title} · TXT / PNG / JPEG / PDF</label>
      <input
        id={`${prefix}-file`}
        name={`${prefix}-file`}
        type="file"
        accept="text/plain,.txt,image/png,image/jpeg,application/pdf,.pdf"
        required
      />
      <p className="muted">
        PDF: обычный документ без пароля и интерактивных элементов.
      </p>
      <label htmlFor={`${prefix}-source`}>Источник · {title}</label>
      <input
        id={`${prefix}-source`}
        name={`${prefix}-source`}
        maxLength={300}
        required
      />
      <label htmlFor={`${prefix}-url`}>URL · {title} · необязательно</label>
      <input
        id={`${prefix}-url`}
        name={`${prefix}-url`}
        type="url"
        maxLength={2048}
      />
    </fieldset>
  );
}

/** Separate document capture and risk decisions preserve the human review boundary. */
export function ConstructionReview({
  detail,
  onSaved,
  userId,
}: {
  userId: string;
  detail: PropertyDetail;
  onSaved: () => void;
}) {
  return (
    <section className="panel padded legal-review">
      <h2>Строительство: документы и сравнение</h2>
      <p>
        Загрузка сохраняет материалы. Баллы добавляются только отдельным
        подтверждением фактора. Оценка на текущее время; даты источников
        сохранены отдельно.
      </p>
      {(["R3", "R5", "R6"] as const).map((code) => (
        <ConstructionFactor
          key={`${detail.property.id}:${code}`}
          code={code}
          detail={detail}
          onSaved={onSaved}
          userId={userId}
        />
      ))}
    </section>
  );
}

function ConstructionFactor({
  code,
  detail,
  onSaved,
  userId,
}: {
  userId: string;
  code: Code;
  detail: PropertyDetail;
  onSaved: () => void;
}) {
  const definition = definitions[code];
  const factor = detail.factors.find((row) => row.code === code);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [adError, setAdError] = useState("");
  const [delayStatus, setDelayStatus] = useState("NOT_COMPLETED");
  const draft = useDossierFormDraft<HTMLDetailsElement>(
    userId,
    `${detail.property.id}:${code}`,
    (fields, missingFiles) => {
      setReason(fields[`${code}-reason`] || "");
      setDelayStatus(
        fields["r6-status"] === "COMPLETED_LATE"
          ? "COMPLETED_LATE"
          : "NOT_COMPLETED",
      );
      setDraftChanged(fields.$formChanged === "true" || missingFiles);
    },
  );
  const selection = draft.remember("selection", () => ({
    evidenceIds: [] as string[],
    draftChanged: false,
  }));
  const [evidenceIds, updateEvidenceIds] = useState(selection.evidenceIds);
  const [draftChanged, updateDraftChanged] = useState(selection.draftChanged);
  function setEvidenceIds(value: string[]) {
    selection.evidenceIds = value;
    updateEvidenceIds(value);
  }
  function setDraftChanged(value: boolean) {
    selection.draftChanged = value;
    updateDraftChanged(value);
  }
  const cache = draft.remember("cache", () => ({
    current: {
      keys: new Map(),
      results: new Map(),
      dates: new Map(),
    } as RetryCache,
  }));
  const ids = evidenceIds.length ? evidenceIds : factor?.evidence_ids || [];

  useEffect(() => {
    if (code !== "R3") return;
    let cancelled = false;
    api<Page<Advertisement>>(
      `/advertisements?property_id=${detail.property.id}&page_size=100`,
    )
      .then((result) => {
        if (!cancelled) setAds(result.items);
      })
      .catch((failure: Error) => {
        if (!cancelled) setAdError(failure.message);
      });
    return () => {
      cancelled = true;
    };
  }, [code, detail.property.id, detail.advertisement_ids.length]);

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
  function assessmentDate(signature: string) {
    if (!cache.current.dates.has(signature))
      cache.current.dates.set(signature, new Date().toISOString());
    return cache.current.dates.get(signature)!;
  }
  async function saveCommand<T>(path: string, body: unknown) {
    return once<T>(`${path}:${JSON.stringify(body)}`, (key) =>
      command<T>(path, body, key),
    );
  }
  async function run(task: () => Promise<void>) {
    draft.checkpoint();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
      if (!selection.draftChanged) draft.saved();
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

  async function documentEvidence(
    form: FormData,
    prefix: string,
    purpose: string,
    values: Record<string, string>,
    eventAt: string,
    methodology: string,
  ) {
    const file = form.get(`${prefix}-file`);
    if (!(file instanceof File) || !file.size)
      throw new Error("Выберите непустой документ TXT, PNG или JPEG");
    if (file.size > 10_485_760)
      throw new Error("Файл должен быть не больше 10 МБ");
    const source = String(form.get(`${prefix}-source`) || "").trim();
    if (!source || !methodology.trim())
      throw new Error("Укажите источник и методику проверки");
    const hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
      ),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    const fields = {
      property_id: detail.property.id,
      is_demo: String(detail.property.is_demo),
      source_label: source,
      source_url: String(form.get(`${prefix}-url`) || ""),
      event_at: eventAt,
      methodology: methodology.trim(),
      purpose,
      ...values,
    };
    const body = new FormData();
    for (const [name, value] of Object.entries(fields)) body.set(name, value);
    body.set("file", file);
    // Successful stages are reused after a later failure; the key also protects a lost response.
    const asset = await once<Saved>(
      `upload:${hash}:${file.type}:${JSON.stringify(fields)}`,
      (key) => upload<Saved>("/assets/upload", body, key),
    );
    return saveCommand<Saved>("/evidence", {
      property_id: detail.property.id,
      asset_id: asset.id,
      kind: purpose,
      description: reason.trim(),
      source_label: source,
      event_at: eventAt,
      is_demo: detail.property.is_demo,
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      if (!reason.trim()) throw new Error("Укажите обоснование решения");
      const eventAt = aware(form.get("event_at"));
      const methodology = String(form.get("methodology") || "").trim();
      let savedIds: string[];
      if (code === "R3") {
        const adId = String(form.get("advertisement_id") || "");
        if (!adId)
          throw new Error("Выберите связанную публикацию с известной датой");
        const [ad, extractions] = await Promise.all([
          api<Advertisement>(`/advertisements/${adId}`),
          api<Extraction[]>(`/advertisements/${adId}/extractions`),
        ]);
        const extraction = extractions[0];
        if (!ad.published_at || !extraction)
          throw new Error(
            "Публикации нужны известная дата и завершённый анализ",
          );
        const publicationDay = new Date(
          new Date(ad.published_at).getTime() + 5 * 3600_000,
        )
          .toISOString()
          .slice(0, 10);
        if (eventAt.slice(0, 10) !== publicationDay)
          throw new Error(
            "Дата документа о стадии должна совпадать с днём публикации в +05:00",
          );
        const assetId =
          extraction.hypotheses[0]?.fragment.asset_id ||
          ad.assets.find((asset) => ["TEXT", "IMAGE"].includes(asset.kind))?.id;
        if (!assetId)
          throw new Error("У публикации нет сохранённого оригинала");
        const stage = await documentEvidence(
          form,
          "stage",
          "CONSTRUCTION_STAGE",
          { construction_stage: String(form.get("construction_stage")) },
          eventAt,
          methodology,
        );
        const publication = await saveCommand<Saved>("/evidence", {
          property_id: detail.property.id,
          kind: "ADVERTISEMENT_PUBLICATION",
          advertisement_id: ad.id,
          extraction_id: extraction.id,
          asset_id: assetId,
          description: reason.trim(),
          source_label: ad.source_label,
          event_at: ad.published_at,
          is_demo: detail.property.is_demo,
        });
        savedIds = [stage.id, publication.id];
      } else if (code === "R5") {
        const declared = Number(form.get("declared-percent"));
        const verified = Number(form.get("verified-percent"));
        if (
          ![declared, verified].every(
            (value) => Number.isFinite(value) && value >= 0 && value <= 100,
          )
        )
          throw new Error("Готовность должна быть от 0 до 100%");
        // Inputs use hundredths of a percent; compare integers to keep 80.1 − 60.1 at exactly 20.
        if (
          Math.abs(Math.round(declared * 100) - Math.round(verified * 100)) <
          2000
        )
          throw new Error(
            "Для R5 нужна разница не меньше 20 процентных пунктов",
          );
        const comparisonKey = String(form.get("comparison_key") || "").trim();
        const declaredEvidence = await documentEvidence(
          form,
          "declared",
          "PROGRESS_MEASUREMENT",
          {
            measurement_percent: String(declared),
            measurement_role: "DECLARED",
            comparison_key: comparisonKey,
          },
          eventAt,
          methodology,
        );
        const verifiedEvidence = await documentEvidence(
          form,
          "verified",
          "PROGRESS_MEASUREMENT",
          {
            measurement_percent: String(verified),
            measurement_role: "VERIFIED",
            comparison_key: comparisonKey,
          },
          eventAt,
          methodology,
        );
        savedIds = [declaredEvidence.id, verifiedEvidence.id];
      } else {
        const values: Record<string, string> = {
          planned_completion_at: aware(form.get("planned_completion_at")),
          delay_status: delayStatus,
        };
        if (delayStatus === "COMPLETED_LATE")
          values.actual_completion_at = aware(form.get("actual_completion_at"));
        const evidence = await documentEvidence(
          form,
          "delay",
          "DELAY_DOCUMENT",
          values,
          eventAt,
          methodology,
        );
        savedIds = [evidence.id];
      }
      setEvidenceIds(savedIds);
      if (!factor) {
        const signature = JSON.stringify({
          code,
          savedIds,
          reason: reason.trim(),
        });
        await saveCommand(`/properties/${detail.property.id}/risk-factors`, {
          code,
          as_of: assessmentDate(signature),
          evidence_ids: savedIds,
          reason: reason.trim(),
        });
      }
      setDraftChanged(false);
      setMessage(
        `Материалы ${code} сохранены. Подтвердите фактор отдельным решением.`,
      );
    });
  }

  async function review(status: "CONFIRMED" | "REJECTED") {
    if (!factor) return;
    await run(async () => {
      const signature = JSON.stringify({
        id: factor.id,
        revision: factor.revision,
        status,
        ids,
        reason: reason.trim(),
      });
      await saveCommand(`/risk-factors/${factor.id}/review`, {
        expected_revision: factor.revision,
        status,
        evidence_ids: ids,
        reason: reason.trim(),
        as_of: assessmentDate(signature),
      });
      setMessage(
        status === "CONFIRMED"
          ? `${code} подтверждён: +${definition.weight} баллов.`
          : `${code} отклонён: 0 баллов.`,
      );
    });
  }

  return (
    <details
      className="document"
      data-testid={`construction-${code}`}
      id={`dossier-editor-${code}`}
      tabIndex={-1}
      {...draft.containerProps}
    >
      <summary>{definition.title}</summary>
      <DossierDraftNotice draft={draft} />
      <p>{definition.explanation}</p>
      {factor && (
        <p>
          Текущий статус {code}:{" "}
          <b>{statuses[factor.status] || factor.status}</b>
        </p>
      )}
      <form
        id={`${code}-capture`}
        className="review-form"
        onSubmit={save}
        onChange={() => {
          setDraftChanged(true);
          setEvidenceIds([]);
          setMessage("");
        }}
      >
        <fieldset className="review-form m-0" disabled={busy}>
          {code === "R3" && (
            <>
              <label htmlFor="r3-ad">Публикация для R3</label>
              <select
                id="r3-ad"
                name="advertisement_id"
                required
                defaultValue=""
              >
                <option value="">Выберите публикацию</option>
                {ads.map((ad) => (
                  <option key={ad.id} value={ad.id} disabled={!ad.published_at}>
                    {ad.source_label} ·{" "}
                    {ad.published_at
                      ? date(ad.published_at)
                      : "Дата неизвестна"}
                  </option>
                ))}
              </select>
              {adError && (
                <p className="notice error" role="alert">
                  Не удалось загрузить публикации: {adError}
                </p>
              )}
              {!ads.length && !adError && (
                <p>
                  Подтвердите привязку публикации к этой очереди на экране
                  «Проверка». Для R3 нужна известная дата публикации.
                </p>
              )}
              <SourceFields prefix="stage" title="Документ о стадии" />
              <label htmlFor="r3-stage">Стадия по документу</label>
              <select id="r3-stage" name="construction_stage">
                <option value="UNDER_CONSTRUCTION">
                  Строительство не завершено
                </option>
                <option value="COMPLETED">
                  Строительство завершено · не подтверждает R3
                </option>
              </select>
            </>
          )}
          {code === "R5" && (
            <>
              <label htmlFor="r5-comparison">
                Область сравнения: очередь / корпус / метод
              </label>
              <input
                id="r5-comparison"
                name="comparison_key"
                maxLength={300}
                required
              />
              <SourceFields prefix="declared" title="Заявленная готовность" />
              <label htmlFor="r5-declared">Заявленная готовность · %</label>
              <input
                id="r5-declared"
                name="declared-percent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                required
              />
              <SourceFields prefix="verified" title="Проверенная готовность" />
              <label htmlFor="r5-verified">Проверенная готовность · %</label>
              <input
                id="r5-verified"
                name="verified-percent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                required
              />
            </>
          )}
          {code === "R6" && (
            <>
              <SourceFields prefix="delay" title="Документ о сроках" />
              <label htmlFor="r6-planned">
                Плановый срок завершения · +05:00
              </label>
              <input
                id="r6-planned"
                name="planned_completion_at"
                type="datetime-local"
                required
              />
              <label htmlFor="r6-status">Состояние после планового срока</label>
              <select
                id="r6-status"
                name="delay_status"
                value={delayStatus}
                onChange={(event) => setDelayStatus(event.target.value)}
              >
                <option value="NOT_COMPLETED">
                  Не завершено на дату источника
                </option>
                <option value="COMPLETED_LATE">Завершено с опозданием</option>
              </select>
              {delayStatus === "COMPLETED_LATE" && (
                <>
                  <label htmlFor="r6-actual">
                    Фактическое завершение · +05:00
                  </label>
                  <input
                    id="r6-actual"
                    name="actual_completion_at"
                    type="datetime-local"
                    required
                  />
                </>
              )}
            </>
          )}
          <label htmlFor={`${code}-event`}>
            {code === "R5"
              ? "Общая дата сопоставимых измерений"
              : "Дата состояния по источнику"}{" "}
            · {code} · +05:00
          </label>
          <input
            id={`${code}-event`}
            name="event_at"
            type="datetime-local"
            required
          />
          <label htmlFor={`${code}-method`}>
            {code === "R6"
              ? "Методика и обоснование существенности отклонения"
              : "Методика проверки источников"}{" "}
            · {code}
          </label>
          <textarea
            id={`${code}-method`}
            name="methodology"
            maxLength={2000}
            required
          />
        </fieldset>
      </form>
      <label htmlFor={`${code}-reason`}>Обоснование решения {code}</label>
      <textarea
        id={`${code}-reason`}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={2000}
        disabled={busy}
        required
      />
      <Button form={`${code}-capture`} disabled={busy || !reason.trim()}>
        {definition.save}
      </Button>
      {factor && (
        <div className="review-actions">
          <Button
            disabled={
              busy ||
              !reason.trim() ||
              !ids.length ||
              (draftChanged && !evidenceIds.length)
            }
            onClick={() => void review("CONFIRMED")}
          >
            Подтвердить {code} · +{definition.weight}
          </Button>
          <Button
            variant="outline"
            disabled={busy || !reason.trim()}
            onClick={() => void review("REJECTED")}
          >
            Отклонить {code}
          </Button>
        </div>
      )}
      {draftChanged && factor && (
        <p className="muted">
          Сохраните изменённые материалы перед подтверждением. Отклонение
          относится к текущему сохранённому фактору.
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
    </details>
  );
}
