"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { api, command, date, upload } from "@/lib/api";
import { statusLabel } from "@/lib/status-labels";
import type {
  Advertisement,
  Extraction,
  Hypothesis,
  Job,
  Match,
  Page,
  Property,
  PropertyDetail,
  Value,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Auth,
  Demo,
  LoadState,
  Notice,
  PageTitle,
  useData,
  Zone,
} from "@/components/workspace";

export function FileUploadView() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const key = useRef(crypto.randomUUID());
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file") as File;
    if (file.size > 10_485_760) {
      setError("Файл должен быть не больше 10 МБ");
      return;
    }
    form.set("is_demo", form.get("is_demo") ? "true" : "false");
    const published = form.get("published_at")?.toString();
    if (published) form.set("published_at", `${published}:00+05:00`);
    setBusy(true);
    setError("");
    try {
      const ad = await upload<Advertisement>(
        "/advertisements/upload",
        form,
        key.current,
      );
      router.push(`/review?advertisement_id=${ad.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="СБОР МАТЕРИАЛОВ"
        title="Загрузить файл"
        description="PNG/JPEG до 10 МБ и 25 млн пикселей или UTF-8 TXT до 100000 символов. Оригинал сохраняется без изменений."
        action={false}
      />
      <section className="panel form-panel intake-advertisement-panel upload-advertisement-panel">
        <div className="form-tabs">
          <Link href="/advertisements/new">Текст</Link>
          <strong>Файл · PNG / JPEG / TXT</strong>
        </div>
        <form
          className="intake-advertisement-form upload-advertisement-form"
          onSubmit={submit}
          onChange={() => {
            key.current = crypto.randomUUID();
          }}
        >
          <div className="form-section-heading">
            <span className="section-index" aria-hidden="true">
              01
            </span>
            <div>
              <h2>Оригинал и происхождение</h2>
              <p>Укажите источник и выберите один исходный файл.</p>
            </div>
          </div>
          <div className="upload-primary-fields">
            <label htmlFor="image-source">Источник / происхождение</label>
            <input
              id="image-source"
              name="source_label"
              required
              maxLength={300}
              placeholder="Например: скриншот публичной страницы"
            />
            <label htmlFor="image-file">Оригинальный PNG / JPEG / TXT</label>
            <div className="upload-file-control">
              <input
                id="image-file"
                aria-describedby="image-file-help image-file-selection"
                aria-invalid={
                  selectedFile ? selectedFile.size > 10_485_760 : undefined
                }
                type="file"
                name="file"
                accept="image/png,image/jpeg,text/plain,.txt"
                onChange={(event) =>
                  setSelectedFile(event.currentTarget.files?.[0] || null)
                }
                required
              />
              <p
                id="image-file-selection"
                className="field-help file-selection"
              >
                {selectedFile
                  ? `${selectedFile.name} · ${(selectedFile.size / 1024).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} КБ${selectedFile.size > 10_485_760 ? " · превышен лимит 10 МБ" : ""}`
                  : "Файл пока не выбран."}
              </p>
            </div>
            <p id="image-file-help" className="field-help">
              PNG, JPEG или UTF-8 TXT, не больше 10 МБ. PDF для рекламного OCR
              не поддерживается.
            </p>
          </div>
          <div className="form-section-heading">
            <span className="section-index" aria-hidden="true">
              02
            </span>
            <div>
              <h2>Контекст публикации</h2>
              <p>
                Ссылка и дата необязательны. Неизвестную дату оставьте пустой.
              </p>
            </div>
          </div>
          <div className="upload-context-panel">
            <div className="form-columns">
              <div>
                <label htmlFor="image-url">
                  Ссылка на источник <small>необязательно</small>
                </label>
                <input
                  id="image-url"
                  name="source_url"
                  type="url"
                  maxLength={2048}
                  placeholder="https://…"
                />
              </div>
              <div>
                <label htmlFor="image-date">
                  Дата публикации <small>+05:00</small>
                </label>
                <input
                  id="image-date"
                  name="published_at"
                  type="datetime-local"
                />
              </div>
            </div>
            <label className="checkbox">
              <input type="checkbox" name="is_demo" defaultChecked />
              Демонстрационный материал (DEMO)
            </label>
          </div>
          {error && <Notice error={error} />}
          <div className="form-actions">
            <Button disabled={busy} aria-busy={busy}>
              {busy ? "Сохранение…" : "Сохранить файл"}
            </Button>
            <span>После сохранения откроется ручная проверка материала.</span>
          </div>
        </form>
      </section>
    </>
  );
}

export function ReviewView() {
  const params = useSearchParams();
  const queue = useData<Page<Advertisement>>("/advertisements?page_size=100");
  const [chosen, setChosen] = useState("");
  const id =
    chosen ||
    params.get("advertisement_id") ||
    queue.data?.items.find((a) => a.status === "READY_FOR_REVIEW")?.id ||
    queue.data?.items[0]?.id;
  return (
    <>
      <PageTitle
        eyebrow="РУЧНАЯ ПРОВЕРКА"
        title="Оригинал → гипотезы → решение"
        description="OCR и сходство названий помогают найти факты. Только аналитик подтверждает привязку, доказательство и фактор риска."
        action={false}
      />
      <section className="review-picker" aria-labelledby="review-picker-title">
        <p className="eyebrow">МАТЕРИАЛ ДЛЯ ПРОВЕРКИ</p>
        <label id="review-picker-title" htmlFor="review-ad">
          Публикация
        </label>
        <select
          id="review-ad"
          value={id || ""}
          onChange={(e) => setChosen(e.target.value)}
        >
          <option value="" disabled>
            Выберите материал
          </option>
          {queue.data?.items.map((ad) => (
            <option key={ad.id} value={ad.id}>
              {ad.is_demo ? "DEMO · " : ""}
              {ad.source_label} · {statusLabel(ad.status)}
            </option>
          ))}
        </select>
      </section>
      {queue.error && <Notice error={queue.error} />}
      {id ? (
        <ReviewMaterial key={id} id={id} onChange={queue.reload} />
      ) : (
        <p className="notice">Добавьте текст или изображение публикации.</p>
      )}
    </>
  );
}

function ReviewMaterial({
  id,
  onChange,
}: {
  id: string;
  onChange: () => void;
}) {
  const { user } = useContext(Auth);
  const writable = user?.role === "analyst";
  const adData = useData<Advertisement>(`/advertisements/${id}`);
  const extractions = useData<Extraction[]>(
    `/advertisements/${id}/extractions`,
  );
  const matches = useData<Match[]>(`/advertisements/${id}/matches`);
  const registry = useData<Page<Property>>("/properties?page_size=100");
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState("");
  const [selected, setSelected] = useState<Hypothesis | null>(null);
  const [propertyId, setPropertyId] = useState("");
  const [matchReason, setMatchReason] = useState("");
  const [transcription, setTranscription] = useState<string | null>(null);
  const [transcriptionReason, setTranscriptionReason] = useState("");
  const key = useRef<{ payload: string; value: string } | null>(null);
  const originalPanel = useRef<HTMLElement>(null);
  const ad = adData.data;
  const extraction =
    extractions.data?.find((e) => e.id === version) || extractions.data?.[0];
  const latest = extraction?.id === extractions.data?.[0]?.id;
  const image = ad?.assets.find((a) => a.kind === "IMAGE");
  const currentSelection = extraction?.hypotheses.find(
    (h) => h.id === selected?.id,
  );
  function showOriginal(hypothesis: Hypothesis) {
    setSelected(hypothesis);
    if (window.matchMedia("(max-width: 1000px)").matches) {
      requestAnimationFrame(() => {
        originalPanel.current?.focus({ preventScroll: true });
        originalPanel.current?.scrollIntoView({ block: "start" });
      });
    }
  }
  function reload() {
    adData.reload();
    extractions.reload();
    matches.reload();
    onChange();
    setSelected(null);
  }
  async function mutate<T>(
    path: string,
    body: unknown,
  ): Promise<T | undefined> {
    const payload = JSON.stringify({ path, body });
    if (key.current?.payload !== payload)
      key.current = { payload, value: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      const result = await command<T>(path, body, key.current.value);
      key.current = null;
      reload();
      return result;
    } catch (e) {
      setError((e as Error).message);
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!ad?.latest_job_id || ad.status !== "ANALYZING") return;
    let cancelled = false;
    const poll = async () => {
      try {
        const value = await api<Job>(`/analysis-jobs/${ad.latest_job_id}`);
        if (cancelled) return;
        setJob(value);
        if (!["QUEUED", "RUNNING"].includes(value.state)) {
          adData.reload();
          extractions.reload();
          matches.reload();
          onChange();
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // Reload callbacks only increment local versions; the polling lifetime follows the job.
  }, [ad?.latest_job_id, ad?.status]);
  if (!ad) return <LoadState error={adData.error} retry={adData.reload} />;
  const active = ad.status === "ANALYZING";
  const hasCurrentMatch =
    !!extraction &&
    !!latest &&
    !!ad.confirmed_property_id &&
    !!matches.data?.some(
      (match) =>
        match.property_id === ad.confirmed_property_id &&
        match.status === "CONFIRMED",
    );
  const reviewedCount =
    extraction?.hypotheses.filter((hypothesis) =>
      ["CONFIRMED", "CORRECTED", "REJECTED"].includes(hypothesis.review_status),
    ).length || 0;
  const reviewSteps = [
    {
      title: "Оригинал",
      href: `#review-original-${id}`,
      detail: "Сверьте сохранённый источник",
    },
    {
      title: "Гипотезы",
      href: `#review-hypotheses-${id}`,
      detail: extractions.error
        ? "Не удалось загрузить"
        : extraction
          ? `Проверено ${reviewedCount} из ${extraction.hypotheses.length}`
          : active
            ? "Анализ выполняется"
            : writable
              ? "Сначала запустите анализ"
              : "Ожидает анализа аналитиком",
    },
    {
      title: "Объект и очередь",
      href: extraction ? `#review-match-${id}` : null,
      detail: matches.error
        ? "Не удалось загрузить привязку"
        : hasCurrentMatch
          ? "Привязка подтверждена"
          : "Нужна отдельная привязка",
    },
    {
      title: "Фактор R2",
      href: hasCurrentMatch ? `#review-factor-${id}` : null,
      detail: hasCurrentMatch
        ? "Отдельное решение по доказательству"
        : "После анализа и привязки",
    },
  ];
  return (
    <div className="review-material">
      <nav className="review-steps" aria-label="Этапы проверки материала">
        <ol>
          {reviewSteps.map((step, index) => (
            <li key={step.title}>
              {step.href ? (
                <a href={step.href}>
                  <span className="step-number" aria-hidden="true">
                    0{index + 1}
                  </span>
                  <strong>{step.title}</strong>
                  <small>{step.detail}</small>
                </a>
              ) : (
                <span className="step-unavailable" aria-disabled="true">
                  <span className="step-number" aria-hidden="true">
                    0{index + 1}
                  </span>
                  <strong>{step.title}</strong>
                  <small>{step.detail}</small>
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <div className="review-material-top">
        <div className="review-material-heading">
          <p className="eyebrow">ТЕКУЩИЙ МАТЕРИАЛ</p>
          <h2>{ad.source_label}</h2>
          <p>
            <span className="review-material-status">{statusLabel(ad.status)}</span> · зафиксирован {date(ad.captured_at)}
          </p>
        </div>
        <div className="review-toolbar">
          <Demo value={ad.is_demo} />
          <Link className="text-link" href={`/advertisements/${id}`}>
            Карточка и SHA-256
          </Link>
          {writable && (
            <Button
              aria-busy={busy || active}
              disabled={busy || active}
              onClick={async () => {
                const value = await mutate<Job>(
                  `/advertisements/${id}/analyze`,
                  {
                    expected_advertisement_revision: ad.revision,
                  },
                );
                if (value) {
                  setVersion("");
                  setJob(value);
                }
              }}
            >
              {active
                ? "Обработка…"
                : extraction
                  ? "Повторить анализ"
                  : "Запустить анализ"}
            </Button>
          )}
        </div>
      </div>
      {error && <Notice error={error} />}
      {adData.error && <Notice error={adData.error} />}
      {active && (
        <p role="status" className="notice">
          {job?.stage || "Ожидает обработки"} · попытка {job?.attempt || 0}.
          Можно перейти на другую страницу — задание сохранено.
        </p>
      )}
      {job?.error && <Notice error={job.error.error.message} />}
      {extraction && !latest && (
        <p className="notice">
          Открыта архивная версия текста. Для новой проверки выберите последнюю
          версию; прежние сведения остаются в истории.
        </p>
      )}
      {ad.status === "FAILED" && !job?.error && (
        <p className="notice">
          Анализ завершился ошибкой. Запустите его повторно или проверьте
          worker.
        </p>
      )}
      <div className="review-grid">
        <section
          className="panel padded original-panel"
          id={`review-original-${id}`}
          ref={originalPanel}
          tabIndex={-1}
        >
          <h2>Оригинал</h2>
          {currentSelection && (
            <a
              className="text-link"
              href={`#hypothesis-${currentSelection.id}`}
            >
              К выбранной гипотезе
            </a>
          )}
          {image ? (
            <ImageOriginal
              id={image.id}
              box={currentSelection?.fragment.bbox}
            />
          ) : (
            <pre className="original-text">{ad.original_text}</pre>
          )}
          {image && (
            <a className="text-link" href={`/api/v1/assets/${image.id}`}>
              Скачать оригинал
            </a>
          )}
          {extraction && (
            <>
              <h3>
                {image
                  ? "Распознанный / проверяемый текст"
                  : "Фрагмент проверяемой версии"}
              </h3>
              <HighlightedText
                text={extraction.analysis_text}
                hypothesis={currentSelection}
              />
              {image &&
                extraction.original_ocr_text !== extraction.analysis_text && (
                  <details>
                    <summary>Исходный OCR без исправлений</summary>
                    <pre className="original-text">
                      {extraction.original_ocr_text}
                    </pre>
                  </details>
                )}
              {writable && latest && (
                <Button
                  variant="outline"
                  disabled={active || busy}
                  onClick={() => setTranscription(extraction.analysis_text)}
                >
                  Исправить расшифровку
                </Button>
              )}
              {transcription !== null && (
                <div className="review-form">
                  <label htmlFor="transcription">
                    Новая расшифровка по оригиналу
                  </label>
                  <textarea
                    id="transcription"
                    rows={7}
                    value={transcription}
                    maxLength={100000}
                    onChange={(e) => setTranscription(e.target.value)}
                  />
                  <label htmlFor="transcription-reason">
                    Причина исправления
                  </label>
                  <input
                    id="transcription-reason"
                    value={transcriptionReason}
                    onChange={(e) => setTranscriptionReason(e.target.value)}
                  />
                  <Button
                    disabled={
                      busy ||
                      !transcription.trim() ||
                      !transcriptionReason.trim()
                    }
                    onClick={async () => {
                      const result = await mutate<Extraction>(
                        `/extractions/${extraction.id}/transcription`,
                        {
                          expected_revision: extraction.revision,
                          text: transcription,
                          reason: transcriptionReason,
                        },
                      );
                      if (result) {
                        setTranscription(null);
                        setVersion("");
                      }
                    }}
                  >
                    Создать новую версию
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setTranscription(null)}
                  >
                    Отмена
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
        <section
          className="panel padded"
          id={`review-hypotheses-${id}`}
          tabIndex={-1}
        >
          <h2>Извлечённые гипотезы</h2>
          {extractions.error && <Notice error={extractions.error} />}
          {extraction ? (
            <>
              <label htmlFor="extraction-version">Версия текста</label>
              <select
                id="extraction-version"
                value={extraction.id}
                onChange={(e) => {
                  setVersion(e.target.value);
                  setSelected(null);
                  setTranscription(null);
                }}
              >
                {extractions.data?.map((e, i) => (
                  <option value={e.id} key={e.id}>
                    {i === 0 ? "Последняя · " : "Архив · "}
                    {date(e.created_at)} · {e.pipeline_version}
                  </option>
                ))}
              </select>
              {extraction.warnings.map((w) => (
                <p className="notice" key={w}>
                  {w}
                </p>
              ))}
              {!extraction.hypotheses.length && (
                <p>Гипотезы не найдены. Проверьте оригинал и расшифровку.</p>
              )}
              {extraction.hypotheses.map((h) => (
                <HypothesisCard
                  key={`${h.id}:${extraction.revision}`}
                  hypothesis={h}
                  writable={writable && latest}
                  busy={busy}
                  onSelect={() => showOriginal(h)}
                  onReview={(action, value, reason) =>
                    mutate(`/extractions/${extraction.id}/review`, {
                      expected_revision: extraction.revision,
                      hypothesis_id: h.id,
                      action,
                      reason,
                      ...(value ? { corrected_value: value } : {}),
                    })
                  }
                />
              ))}
            </>
          ) : (
            <p className="empty">
              После анализа здесь появятся гипотезы и ссылки на фрагменты
              оригинала.
            </p>
          )}
        </section>
      </div>
      {extraction && (
        <section
          className="panel padded"
          id={`review-match-${id}`}
          tabIndex={-1}
        >
          <h2>Привязка к конкретному ЖК / очереди</h2>
          <p className="muted">
            Сходство — подсказка, а не вероятность. Проверьте адрес, очередь и
            дату по оригиналу.
          </p>
          {ad.confirmed_property_id && (
            <p>
              Подтверждён объект:{" "}
              <Link
                className="text-link"
                href={`/properties/${ad.confirmed_property_id}`}
              >
                {registry.data?.items.find(
                  (p) => p.id === ad.confirmed_property_id,
                )?.name || ad.confirmed_property_id}
              </Link>
            </p>
          )}
          {matches.error && <Notice error={matches.error} />}
          <div className="candidate-list">
            {matches.data?.map((m) => (
              <div className="candidate" key={m.id}>
                <strong>
                  {registry.data?.items.find((p) => p.id === m.property_id)
                    ?.name || m.property_id}
                </strong>
                <span>
                  {m.similarity.toFixed(1)} / 100 · {statusLabel(m.status)}
                </span>
                <p>{m.reasons.join(" ")}</p>
                {writable && (
                  <div className="review-actions">
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => setPropertyId(m.property_id)}
                    >
                      Выбрать
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy || !matchReason.trim()}
                      onClick={() =>
                        void mutate(`/advertisements/${id}/matches`, {
                          property_id: m.property_id,
                          candidate_id: m.id,
                          expected_advertisement_revision: ad.revision,
                          action: "REJECT",
                          reason: matchReason,
                        })
                      }
                    >
                      Отклонить кандидата
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {writable && (
            <div className="review-form">
              <label htmlFor="match-property">
                ЖК / очередь · можно выбрать вручную
              </label>
              <select
                id="match-property"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
              >
                <option value="">Выберите точный объект</option>
                {registry.data?.items
                  .filter((p) => p.is_demo === ad.is_demo)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.address}
                    </option>
                  ))}
              </select>
              <label htmlFor="match-reason">
                Обоснование выбора / отклонения
              </label>
              <input
                id="match-reason"
                maxLength={2000}
                value={matchReason}
                onChange={(e) => setMatchReason(e.target.value)}
              />
              <Button
                disabled={busy || active || !propertyId || !matchReason.trim()}
                onClick={() =>
                  void mutate(`/advertisements/${id}/matches`, {
                    property_id: propertyId,
                    expected_advertisement_revision: ad.revision,
                    action: "CONFIRM",
                    reason: matchReason,
                  })
                }
              >
                Подтвердить привязку
              </Button>
            </div>
          )}
        </section>
      )}
      {ad.confirmed_property_id &&
        extraction &&
        latest &&
        !matches.data?.some(
          (m) =>
            m.property_id === ad.confirmed_property_id &&
            m.status === "CONFIRMED",
        ) && (
          <p className="notice">
            Привязка относится к предыдущей версии текста. Для нового
            доказательства подтвердите её заново.
          </p>
        )}
      {hasCurrentMatch && extraction && (
        <PaymentRisk
          key={`${ad.confirmed_property_id}:${extraction.id}:${extraction.revision}`}
          ad={ad}
          extraction={extraction}
          writable={writable}
          onError={setError}
        />
      )}
    </div>
  );
}

const fieldLabels: Record<string, string> = {
  PROPERTY_NAME: "Название ЖК",
  PAYMENT_TERM: "Условие оплаты",
  AMOUNT: "Сумма",
  STAGE: "Стадия",
};
function HypothesisCard({
  hypothesis: h,
  writable,
  busy,
  onSelect,
  onReview,
}: {
  hypothesis: Hypothesis;
  writable: boolean;
  busy: boolean;
  onSelect: () => void;
  onReview: (
    action: string,
    value: Value | null,
    reason: string,
  ) => Promise<unknown>;
}) {
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState(false);
  const value = h.reviewed_value || h.value;
  const [text, setText] = useState(value.text || "");
  const [amount, setAmount] = useState(value.money?.amount || "");
  const [percent, setPercent] = useState(value.percent?.toString() || "");
  const [currency, setCurrency] = useState<
    NonNullable<Value["money"]>["currency"]
  >(value.money?.currency || "KZT");
  return (
    <article className="hypothesis" id={`hypothesis-${h.id}`} tabIndex={-1}>
      <div className="review-toolbar">
        <strong>{fieldLabels[h.field] || h.field}</strong>
        <span className="status">{statusLabel(h.review_status)}</span>
      </div>
      <p>{value.text}</p>
      {value.money && (
        <p>
          <b>
            {value.money.amount} {value.money.currency}
          </b>
        </p>
      )}
      {value.percent !== null && <p>{value.percent}%</p>}
      <button type="button" className="fragment-button" onClick={onSelect}>
        «{h.fragment.quote}» · показать в оригинале
      </button>
      {writable && (
        <div className="review-form">
          <label htmlFor={`reason-${h.id}`}>Обоснование проверки</label>
          <input
            id={`reason-${h.id}`}
            maxLength={2000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {editing && (
            <>
              <label htmlFor={`value-${h.id}`}>Исправленный текст</label>
              <textarea
                id={`value-${h.id}`}
                maxLength={2000}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <label htmlFor={`amount-${h.id}`}>Сумма</label>
              <input
                id={`amount-${h.id}`}
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <label htmlFor={`currency-${h.id}`}>Валюта</label>
              <select
                id={`currency-${h.id}`}
                value={currency}
                onChange={(e) => setCurrency(e.target.value as typeof currency)}
              >
                {["KZT", "USD", "EUR", "UNKNOWN"].map((c) => (
                  <option value={c} key={c}>
                    {c}
                  </option>
                ))}
              </select>
              <label htmlFor={`percent-${h.id}`}>Процент</label>
              <input
                id={`percent-${h.id}`}
                type="number"
                min="0"
                max="100"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
              />
            </>
          )}
          <div className="review-actions">
            <Button
              disabled={busy || !reason.trim()}
              onClick={() => void onReview("CONFIRM", null, reason)}
            >
              Подтвердить гипотезу
            </Button>
            <Button
              variant="outline"
              disabled={busy || !reason.trim()}
              onClick={() => void onReview("REJECT", null, reason)}
            >
              Отклонить
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setEditing(!editing)}
            >
              Исправить
            </Button>
            {editing && (
              <Button
                disabled={
                  busy ||
                  !reason.trim() ||
                  (!text.trim() && !amount && !percent)
                }
                onClick={() =>
                  void onReview(
                    "CORRECT",
                    {
                      text: text || null,
                      money: amount ? { amount, currency } : null,
                      percent: percent ? Number(percent) : null,
                    },
                    reason,
                  )
                }
              >
                Сохранить исправление
              </Button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function HighlightedText({
  text,
  hypothesis,
}: {
  text: string;
  hypothesis?: Hypothesis;
}) {
  // Python offsets count Unicode code points; Array.from preserves the same indexing in JS.
  const chars = Array.from(text),
    start = hypothesis?.fragment.start_offset,
    end = hypothesis?.fragment.end_offset;
  return (
    <pre className="original-text">
      {start === undefined || end === undefined ? (
        text
      ) : (
        <>
          {chars.slice(0, start).join("")}
          <mark>{chars.slice(start, end).join("")}</mark>
          {chars.slice(end).join("")}
        </>
      )}
    </pre>
  );
}

function ImageOriginal({
  id,
  box,
}: {
  id: string;
  box?: Hypothesis["fragment"]["bbox"];
}) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  return (
    <div className="image-original">
      {/* Protected, same-origin originals must retain their authenticated download URL. */}
      <img
        src={`/api/v1/assets/${id}?inline=true`}
        alt="Оригинал рекламного материала"
        onLoad={(e) =>
          setSize({
            width: e.currentTarget.naturalWidth,
            height: e.currentTarget.naturalHeight,
          })
        }
      />
      {box && size && (
        <svg
          viewBox={`0 0 ${size.width} ${size.height}`}
          aria-label="Выделенный фрагмент OCR"
        >
          <rect x={box.x} y={box.y} width={box.width} height={box.height} />
        </svg>
      )}
    </div>
  );
}

function PaymentRisk({
  ad,
  extraction,
  writable,
  onError,
}: {
  ad: Advertisement;
  extraction: Extraction;
  writable: boolean;
  onError: (s: string) => void;
}) {
  const property = useData<PropertyDetail>(
    `/properties/${ad.confirmed_property_id}`,
  );
  const [reason, setReason] = useState("");
  const [hypothesisId, setHypothesisId] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const retry = useRef<{ payload: string; key: string } | null>(null);
  const factor = property.data?.factors.find((f) => f.code === "R2");
  const propertyReady =
    property.data?.property.id === ad.confirmed_property_id && !property.error;
  const payment = extraction.hypotheses.filter(
    (h) =>
      h.field === "PAYMENT_TERM" &&
      ["CONFIRMED", "CORRECTED"].includes(h.review_status),
  );
  async function action(path: string, body: unknown) {
    const payload = JSON.stringify({ path, body });
    if (retry.current?.payload !== payload)
      retry.current = { payload, key: crypto.randomUUID() };
    const result = await command<Record<string, unknown>>(
      path,
      body,
      retry.current.key,
    );
    retry.current = null;
    return result;
  }
  async function run(callback: () => Promise<void>) {
    if (!propertyReady) {
      onError("Дождитесь загрузки текущего фактора R2 или повторите загрузку.");
      return;
    }
    setBusy(true);
    onError("");
    setMessage("");
    try {
      await callback();
      property.reload();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const evidenceIds = evidenceId ? [evidenceId] : factor?.evidence_ids || [];
  return (
    <section
      className="panel padded"
      id={`review-factor-${ad.id}`}
      tabIndex={-1}
    >
      <div className="review-toolbar">
        <h2>R2 · прямое предложение платежа</h2>
        {property.data && <Zone risk={property.data.property.risk} />}
      </div>
      <p>
        Проверка гипотезы и привязки не начисляет баллы. Сначала сохраните
        доказательство и фактор на проверке, затем примите отдельное решение о
        R2 (+25 при подтверждении).
      </p>
      {!property.data && !property.error && (
        <p role="status">Загружаем текущий фактор R2…</p>
      )}
      {property.error && (
        <div>
          <Notice
            error={`Не удалось загрузить текущий фактор R2: ${property.error}`}
          />
          <Button variant="outline" onClick={property.reload}>
            Повторить загрузку R2
          </Button>
        </div>
      )}
      {factor && (
        <p>
          Текущий статус R2: <b>{statusLabel(factor.status)}</b> · версия{" "}
          {factor.revision}
        </p>
      )}
      {writable && (
        <div className="review-form">
          <label htmlFor="risk-payment">Проверенное условие оплаты</label>
          <select
            id="risk-payment"
            value={hypothesisId}
            onChange={(e) => {
              setHypothesisId(e.target.value);
              setEvidenceId("");
            }}
          >
            <option value="">Выберите гипотезу</option>
            {payment.map((h) => (
              <option value={h.id} key={h.id}>
                {(h.reviewed_value || h.value).text}
              </option>
            ))}
          </select>
          <label htmlFor="risk-reason">Обоснование решения по R2</label>
          <input
            id="risk-reason"
            value={reason}
            maxLength={2000}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="review-actions">
            <Button
              variant="outline"
              disabled={
                busy || !propertyReady || !reason.trim() || !hypothesisId
              }
              onClick={() =>
                void run(async () => {
                  const h = payment.find((h) => h.id === hypothesisId)!;
                  const evidence = await action("/evidence", {
                    property_id: ad.confirmed_property_id,
                    kind: "ADVERTISEMENT_FRAGMENT",
                    asset_id: h.fragment.asset_id,
                    advertisement_id: ad.id,
                    extraction_id: extraction.id,
                    hypothesis_id: h.id,
                    fragment: h.fragment,
                    description: reason,
                    source_label: ad.source_label,
                    event_at: ad.published_at || ad.captured_at,
                    is_demo: ad.is_demo,
                  });
                  const id = evidence.id as string;
                  setEvidenceId(id);
                  if (!factor)
                    await action(
                      `/properties/${ad.confirmed_property_id}/risk-factors`,
                      {
                        code: "R2",
                        as_of: new Date().toISOString(),
                        evidence_ids: [id],
                        reason,
                      },
                    );
                  setMessage(
                    "Доказательство сохранено. Подтверждение R2 требует отдельного решения.",
                  );
                })
              }
            >
              Сохранить доказательство R2
            </Button>
            {factor && (
              <>
                <Button
                  disabled={
                    busy ||
                    !propertyReady ||
                    !reason.trim() ||
                    !evidenceIds.length
                  }
                  onClick={() =>
                    void run(async () => {
                      await action(`/risk-factors/${factor.id}/review`, {
                        expected_revision: factor.revision,
                        status: "CONFIRMED",
                        evidence_ids: evidenceIds,
                        reason,
                      });
                      setMessage("R2 подтверждён. Риск пересчитан сервером.");
                    })
                  }
                >
                  Подтвердить R2 · +25
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || !propertyReady || !reason.trim()}
                  onClick={() =>
                    void run(async () => {
                      await action(`/risk-factors/${factor.id}/review`, {
                        expected_revision: factor.revision,
                        status: "REJECTED",
                        evidence_ids: evidenceIds,
                        reason,
                      });
                      setMessage("R2 отклонён. Баллы сняты.");
                    })
                  }
                >
                  Отклонить R2
                </Button>
              </>
            )}
          </div>
        </div>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {ad.confirmed_property_id && (
        <PropertyAudit
          id={ad.confirmed_property_id}
          revision={property.data?.property.risk.as_of}
        />
      )}
    </section>
  );
}

function PropertyAudit({ id, revision }: { id: string; revision?: string }) {
  const events = useData<
    Page<{
      id: string;
      action: string;
      occurred_at: string;
      reason: string | null;
      details: unknown;
    }>
  >(`/properties/${id}/audit?refresh=${encodeURIComponent(revision || "")}`);
  return (
    <details>
      <summary>Журнал решений по объекту</summary>
      {events.error && <Notice error={events.error} />}
      <ol className="audit-list">
        {events.data?.items.map((e) => (
          <li key={e.id}>
            <b>{e.action}</b> · {date(e.occurred_at)}
            <p>{e.reason}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}
