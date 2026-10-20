"use client";
import { useState, type FormEvent } from "react";
import { command, date, upload } from "@/lib/api";
import type { PropertyDetail } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useDossierFormDraft } from "@/lib/use-dossier-form-draft";
import { DossierDraftNotice } from "@/components/dossier-draft-notice";
import { useLocale } from "@/lib/locale";

export const mechanismLabels: Record<string, string> = {
  KZHK_GUARANTEE: "Гарантия КЖК",
  BANK_WITH_MIO_PERMIT: "Банковский механизм + разрешение МИО",
  FRAME_WITH_MIO_PERMIT: "Каркас + разрешение МИО",
};
const statusLabels: Record<string, string> = {
  PENDING: "На проверке",
  VERIFIED_VALID: "Документ подтверждён",
  REJECTED: "Документ отклонён",
  VERIFIED_ABSENT: "Отсутствие установлено",
};
type Basis = PropertyDetail["legal_bases"][number];
function localNow() {
  return new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 16);
}

export function LegalBasisCreate({
  detail,
  onSaved,
  userId,
}: {
  userId: string;
  detail: PropertyDetail;
  onSaved: () => void;
}) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const draft = useDossierFormDraft(
    userId,
    `${detail.property.id}:basis-create`,
    () => {},
  );
  const keys = draft.remember("keys", () => ({
    current: {
      upload: crypto.randomUUID(),
      create: crypto.randomUUID(),
    },
  }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if ((form.get("file") as File).size > 10_485_760) {
      setError(
        t(
          "Файл должен быть не больше 10 МБ",
          "Файл көлемі 10 МБ-тан аспауы керек",
        ),
      );
      return;
    }
    const source = new FormData();
    for (const name of ["file", "source_label", "source_url", "methodology"])
      source.set(name, form.get(name)!);
    source.set("event_at", `${form.get("event_at")}:00+05:00`);
    source.set("property_id", detail.property.id);
    source.set("is_demo", String(detail.property.is_demo));
    source.set("purpose", "LEGAL_BASIS");
    draft.checkpoint();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const asset = await upload<{ id: string }>(
        "/assets/upload",
        source,
        keys.current.upload,
      );
      const body = {
        mechanism: form.get("mechanism"),
        document_number: form.get("document_number"),
        document_date: form.get("document_date"),
        issuer: form.get("issuer"),
        asset_id: asset.id,
        scope_description: form.get("scope_description"),
        is_demo: detail.property.is_demo,
        applies_from: `${form.get("applies_from")}:00+05:00`,
        applies_until: form.get("applies_until")
          ? `${form.get("applies_until")}:00+05:00`
          : null,
      };
      await command(
        `/properties/${detail.property.id}/legal-bases`,
        body,
        keys.current.create,
      );
      draft.saved();
      setMessage(
        t(
          "Основание сохранено со статусом «На проверке». Риск не изменился.",
          "Негіз «Тексерілуде» мәртебесімен сақталды. Тәуекел өзгерген жоқ.",
        ),
      );
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel padded legal-review" {...draft.containerProps}>
      <h2>{t("Добавить правовое основание", "Құқықтық негіз қосу")}</h2>
      <DossierDraftNotice draft={draft} />
      <p>
        {t(
          "Документ относится только к этому объекту/очереди. Пустой список документов и отклонённый документ не доказывают отсутствие основания и не начисляют R1. Подлинность и применимость проверяет аналитик.",
          "Құжат тек осы нысанға/кезекке қатысты. Құжаттар тізімінің бос болуы немесе құжаттың қабылданбауы негіздің жоқтығын дәлелдемейді және R1 қоспайды. Түпнұсқалық пен қолданылуын талдаушы тексереді.",
        )}
      </p>
      <details>
        <summary>
          {t(
            "Ввести реквизиты и загрузить документ",
            "Деректемелерді енгізіп, құжатты жүктеу",
          )}
        </summary>
        <form
          className="review-form"
          onSubmit={submit}
          onChange={() => {
            keys.current = {
              upload: crypto.randomUUID(),
              create: crypto.randomUUID(),
            };
          }}
        >
          <label htmlFor="basis-mechanism">
            {t("Механизм основания", "Негіз механизмі")}
          </label>
          <select id="basis-mechanism" name="mechanism">
            {Object.entries(mechanismLabels).map(([k, v]) => (
              <option value={k} key={k}>
                {t(v)}
              </option>
            ))}
          </select>
          <label htmlFor="basis-file">
            {t(
              "Документ основания · TXT / PNG / JPEG / PDF",
              "Негіз құжаты · TXT / PNG / JPEG / PDF",
            )}
          </label>
          <input
            id="basis-file"
            name="file"
            type="file"
            accept="text/plain,.txt,image/png,image/jpeg,application/pdf,.pdf"
            required
          />
          <p className="muted">
            {t(
              "PDF: обычный документ без пароля и интерактивных элементов.",
              "PDF: құпиясөзсіз және интерактивті элементтерсіз кәдімгі құжат.",
            )}
          </p>
          <label htmlFor="basis-source">
            {t("Источник документа основания", "Негіз құжатының дереккөзі")}
          </label>
          <input
            id="basis-source"
            name="source_label"
            required
            maxLength={300}
          />
          <label htmlFor="basis-url">
            {t(
              "URL документа · необязательно",
              "Құжат URL мекенжайы · міндетті емес",
            )}
          </label>
          <input id="basis-url" name="source_url" type="url" maxLength={2048} />
          <label htmlFor="basis-number">
            {t("Номер документа", "Құжат нөмірі")}
          </label>
          <input
            id="basis-number"
            name="document_number"
            required
            maxLength={300}
          />
          <label htmlFor="basis-date">
            {t("Дата документа", "Құжат күні")}
          </label>
          <input id="basis-date" name="document_date" type="date" required />
          <label htmlFor="basis-event">
            {t(
              "Дата сведений источника · +05:00",
              "Дереккөз мәліметтерінің күні · +05:00",
            )}
          </label>
          <input
            id="basis-event"
            name="event_at"
            type="datetime-local"
            required
          />
          <label htmlFor="basis-issuer">
            {t("Кем выдан документ", "Құжатты берген орган")}
          </label>
          <input id="basis-issuer" name="issuer" required maxLength={300} />
          <label htmlFor="basis-scope">
            {t(
              "Область: очередь / корпус / адрес",
              "Қамту аясы: кезек / ғимарат / мекенжай",
            )}
          </label>
          <textarea
            id="basis-scope"
            name="scope_description"
            required
            maxLength={2000}
          />
          <label htmlFor="basis-from">
            {t("Применим с · +05:00", "Қолданыла бастайтын уақыт · +05:00")}
          </label>
          <input
            id="basis-from"
            name="applies_from"
            type="datetime-local"
            required
          />
          <label htmlFor="basis-until">
            {t(
              "Применим по · +05:00 · необязательно",
              "Қолданылу мерзімінің соңы · +05:00 · міндетті емес",
            )}
          </label>
          <input id="basis-until" name="applies_until" type="datetime-local" />
          <label htmlFor="basis-method">
            {t(
              "Что проверено в источнике основания",
              "Негіз дереккөзінде не тексерілді",
            )}
          </label>
          <textarea
            id="basis-method"
            name="methodology"
            required
            maxLength={2000}
          />
          <Button disabled={busy}>
            {busy
              ? t("Сохранение…")
              : t(
                  "Сохранить основание на проверку",
                  "Негізді тексеруге сақтау",
                )}
          </Button>
        </form>
      </details>
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

export function LegalBasisDecision({
  basis,
  userId,
  onSaved,
  writable,
  showControls = true,
}: {
  basis: Basis;
  userId: string;
  onSaved: () => void;
  writable: boolean;
  showControls?: boolean;
}) {
  const { t } = useLocale();
  const [reason, setReason] = useState(""),
    [asOf, setAsOf] = useState(localNow),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const draft = useDossierFormDraft<HTMLDivElement>(
    userId,
    `basis:${basis.id}`,
    (fields) => {
      setReason(fields[`basis-review-reason-${basis.id}`] || "");
      setAsOf(fields[`basis-review-date-${basis.id}`] || localNow());
    },
  );
  const key = draft.remember("key", () => ({
    current: null as { payload: string; key: string } | null,
  }));
  async function review(status: string) {
    const body = {
      expected_revision: basis.revision,
      status,
      as_of: `${asOf}:00+05:00`,
      evidence_ids: basis.evidence_ids,
      reason,
    };
    const payload = JSON.stringify(body);
    if (key.current?.payload !== payload)
      key.current = { payload, key: crypto.randomUUID() };
    draft.checkpoint();
    setBusy(true);
    setError("");
    try {
      await command(`/legal-bases/${basis.id}/review`, body, key.current.key);
      draft.saved();
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="document-review" {...draft.containerProps}>
      <p>
        <strong>
          {mechanismLabels[basis.mechanism]
            ? t(mechanismLabels[basis.mechanism])
            : basis.mechanism}
        </strong>{" "}
        ·{" "}
        {statusLabels[basis.verification_status]
          ? t(statusLabels[basis.verification_status])
          : basis.verification_status}{" "}
        · {t("версия", "нұсқа")} {basis.revision}
      </p>
      <p>
        {t("Период: ", "Мерзім: ")}
        {date(basis.applies_from)} —{" "}
        {basis.applies_until
          ? date(basis.applies_until)
          : t("конец не указан", "соңы көрсетілмеген")}
        . {t("Решение на дату: ", "Шешім қабылданған күн: ")}
        {date(basis.verification_as_of)}.
      </p>
      <p>
        {t("Проверивший: ", "Тексеруші: ")}
        {basis.reviewed_by || t("Не зафиксирован", "Тіркелмеген")}
        {basis.reviewed_by_details?.display_name &&
          ` · ${basis.reviewed_by_details.display_name}`}
        {" · "}
        {t("Решение принято: ", "Шешім қабылданған күні: ")}
        {date(basis.reviewed_at)}
      </p>
      <p>
        {t(
          "Текущий статус ЖК учитывает период документа; подтверждение на прошлую дату само не доказывает применимость сегодня.",
          "ТК-ның ағымдағы мәртебесі құжат мерзімін ескереді; өткен күнге берілген растау оның бүгін қолданылатынын дәлелдемейді.",
        )}
      </p>
      {basis.evidence_ids.map((id) => (
        <a
          key={id}
          className="text-link"
          href={`/api/v1/evidence/${id}`}
          target="_blank"
          rel="noreferrer"
        >
          {t("Снимок доказательства", "Дәлелдің сақталған нұсқасы")}
        </a>
      ))}
      {writable && basis.evidence_ids.length > 0 && (
        <div className="review-form" hidden={!showControls}>
          <DossierDraftNotice draft={draft} />
          <label htmlFor={`basis-review-date-${basis.id}`}>
            {t(
              "Дата проверки применимости · +05:00",
              "Қолданылуын тексеру күні · +05:00",
            )}
          </label>
          <input
            id={`basis-review-date-${basis.id}`}
            type="datetime-local"
            required
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
          />
          <label htmlFor={`basis-review-reason-${basis.id}`}>
            {t("Обоснование проверки основания", "Негізді тексеру негіздемесі")}
          </label>
          <textarea
            id={`basis-review-reason-${basis.id}`}
            value={reason}
            maxLength={2000}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="review-actions">
            <Button
              disabled={busy || !asOf || !reason.trim()}
              onClick={() => void review("VERIFIED_VALID")}
            >
              {t("Подтвердить применимость", "Қолданылуын растау")}
            </Button>
            <Button
              disabled={busy || !asOf || !reason.trim()}
              variant="outline"
              onClick={() => void review("REJECTED")}
            >
              {t("Отклонить документ", "Құжатты қабылдамау")}
            </Button>
          </div>
        </div>
      )}
      {writable && !basis.evidence_ids.length && (
        <p className="muted">
          {t(
            "Учебная запись без нового снимка доказательства. Для новой проверки загрузите документ отдельно.",
            "Жаңа дәлел нұсқасы жоқ оқу жазбасы. Жаңа тексеру үшін құжатты бөлек жүктеңіз.",
          )}
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
