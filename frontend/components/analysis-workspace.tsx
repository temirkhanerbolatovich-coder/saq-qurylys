"use client";
import { useLocale } from "@/lib/locale";

import Link from "next/link";
import { MaterialSearch } from "@/components/material-search";
import { ManualAnnotation } from "@/components/manual-annotation";
import { useSearchParams, useRouter } from "next/navigation";
import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { api, command, date, upload } from "@/lib/api";
import { statusLabel } from "@/lib/status-labels";
import {
  reviewCommandFingerprint,
  useReviewDraft,
} from "@/lib/use-review-draft";
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
import { Pagination } from "@/components/ui/pagination";
import { PropertyHistory } from "@/components/property-history";
import {
  RemainingReviewQueue,
  ReviewQueuePanel,
} from "@/components/review-queue";
import { PdfDownload } from "@/components/pdf-download";
import { PropertyPicker } from "@/components/property-picker";
import {
  Auth,
  Demo,
  LoadState,
  Notice,
  PageTitle,
  useData,
  useInterfaceMode,
  Zone,
} from "@/components/workspace";

export function FileUploadView() {
  const { t } = useLocale();
  const { detailed } = useInterfaceMode();
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
        eyebrow={t("СБОР МАТЕРИАЛОВ")}
        title={t("Загрузить файл")}
        description={t(
          "PNG/JPEG до 10 МБ и 25 млн пикселей или UTF-8 TXT до 100000 символов. Оригинал сохраняется без изменений.",
        )}
        action={false}
      />
      <section className="panel form-panel intake-advertisement-panel upload-advertisement-panel">
        <div className="form-tabs">
          <Link href="/advertisements/new">{t("Текст")}</Link>
          <strong>PNG / JPEG / TXT</strong>
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
              <h2>{t("Оригинал и происхождение")}</h2>
              <p>Укажите источник и выберите один исходный файл.</p>
            </div>
          </div>
          <div className="upload-primary-fields">
            <label htmlFor="image-source">
              {t("Источник / происхождение")}
            </label>
            <input
              id="image-source"
              name="source_label"
              required
              maxLength={300}
            />
            <label htmlFor="image-file">
              {t("Оригинальный PNG / JPEG / TXT")}
            </label>
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
              <p id="image-file-help" className="field-help">
                PNG, JPEG или UTF-8 TXT, не больше 10 МБ. PDF для рекламного OCR
                не поддерживается.
              </p>
              <p
                id="image-file-selection"
                className="field-help file-selection"
              >
                {selectedFile
                  ? `${selectedFile.name} · ${(selectedFile.size / 1024).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} КБ${selectedFile.size > 10_485_760 ? " · превышен лимит 10 МБ" : ""}`
                  : "Файл пока не выбран."}
              </p>
            </div>
          </div>
          <details
            className="optional-context upload-context-panel"
            open={detailed || undefined}
          >
            <summary>{t("Ссылка и дата публикации · необязательно")}</summary>
            <div className="form-section-heading">
              <span className="section-index" aria-hidden="true">
                02
              </span>
              <div>
                <h2>{t("Контекст публикации")}</h2>
                <p>
                  Ссылка и дата необязательны. Неизвестную дату оставьте пустой.
                </p>
              </div>
            </div>
            <div className="form-columns">
              <div>
                <label htmlFor="image-url">
                  Ссылка на источник · необязательно
                </label>
                <input
                  id="image-url"
                  name="source_url"
                  type="url"
                  maxLength={2048}
                />
              </div>
              <div>
                <label htmlFor="image-date">
                  Дата публикации · +05:00 · необязательно
                </label>
                <input
                  id="image-date"
                  name="published_at"
                  type="datetime-local"
                />
              </div>
            </div>
          </details>
          <label className="checkbox">
            <input type="checkbox" name="is_demo" defaultChecked />
            {t("Демонстрационный материал (DEMO)")}
          </label>
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
  const { t } = useLocale();
  const params = useSearchParams();
  // Keep bookmarked processing filters/materials compatible; a fresh visit starts with work to do.
  const actionQueue = params.get("queue") === "actions" || params.size === 0;
  function queueUrl(actions: boolean) {
    const next = new URLSearchParams(params);
    for (const name of ["page", "action", "review_section"]) next.delete(name);
    if (actions) {
      next.set("queue", "actions");
      next.delete("status");
    } else next.set("queue", "processing");
    return `/review?${next}`;
  }
  return (
    <>
      <PageTitle
        eyebrow={t("РУЧНАЯ ПРОВЕРКА")}
        title={t("Оригинал → гипотезы → решение")}
        description={t(
          "OCR и сходство названий помогают найти факты. Только аналитик подтверждает привязку, доказательство и фактор риска.",
        )}
        action={false}
      />
      <nav className="review-actions" aria-label={t("Виды очереди проверки")}>
        <Button asChild variant={actionQueue ? "default" : "outline"}>
          <Link
            href={queueUrl(true)}
            aria-current={actionQueue ? "page" : undefined}
          >
            {t("Нерешённые действия")}
          </Link>
        </Button>
        <Button asChild variant={actionQueue ? "outline" : "default"}>
          <Link
            href={queueUrl(false)}
            aria-current={!actionQueue ? "page" : undefined}
          >
            {t("Состояния обработки")}
          </Link>
        </Button>
      </nav>
      {actionQueue ? (
        <RemainingReviewQueue
          renderMaterial={(id, onChange) => (
            <ReviewMaterial key={id} id={id} onChange={onChange} />
          )}
        />
      ) : (
        <ProcessingReviewQueue />
      )}
    </>
  );
}

function ProcessingReviewQueue() {
  const { t } = useLocale();
  const params = useSearchParams();
  const router = useRouter();
  const statuses = [
    "NEW",
    "ANALYZING",
    "READY_FOR_REVIEW",
    "REVIEWED",
    "FAILED",
  ];
  const status = statuses.includes(params.get("status") || "")
    ? params.get("status")!
    : "";
  const requestedPage = Number(params.get("page") || 1);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const pageSize = [10, 20, 50].includes(Number(params.get("page_size")))
    ? Number(params.get("page_size"))
    : 20;
  const query = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (status) query.set("status", status);
  for (const name of ["q", "is_demo", "property_id", "from", "to"]) {
    const value = params.get(name);
    if (value) query.set(name, value);
  }
  const queuePath = `/advertisements?${query}`;
  const queue = useData<Page<Advertisement>>(queuePath);
  const data =
    queue.resolvedPath === queuePath && !queue.error ? queue.data : null;
  const queueError = queue.resolvedPath === queuePath ? queue.error : "";
  const id = params.get("advertisement_id") || "";
  const selectedInQueue = data?.items.some((ad) => ad.id === id);
  function navigate(name: string, value: string) {
    const next = new URLSearchParams(params);
    next.set("queue", "processing");
    if (value) next.set(name, value);
    else next.delete(name);
    if (["q", "is_demo", "status", "page_size"].includes(name))
      next.delete("page");
    if (name === "advertisement_id") next.delete("history_page");
    router.push(`/review?${next}`, { scroll: false });
  }
  return (
    <>
      <ReviewQueuePanel label={t("Очередь проверки")} selectedId={id}>
        <div className="review-toolbar">
          <h2>{t("Очередь проверки")}</h2>
          <span>
            {data
              ? `${data.total} материалов`
              : queueError
                ? "Очередь недоступна"
                : "Загрузка очереди…"}
          </span>
        </div>
        <div className="review-queue-filters">
          <MaterialSearch
            query={params.get("q") || ""}
            onSearch={(value) => navigate("q", value)}
          />
          <div>
            <label htmlFor="processing-demo">{t("Режим материалов")}</label>
            <select
              id="processing-demo"
              value={params.get("is_demo") || ""}
              onChange={(event) => navigate("is_demo", event.target.value)}
            >
              <option value="">{t("DEMO и реальные")}</option>
              <option value="true">{t("Только DEMO")}</option>
              <option value="false">{t("Только реальные")}</option>
            </select>
          </div>
          <div>
            <label htmlFor="review-status">{t("Состояние материала")}</label>
            <select
              id="review-status"
              value={status}
              onChange={(event) => navigate("status", event.target.value)}
            >
              <option value="">{t("Все состояния")}</option>
              {statuses.map((value) => (
                <option value={value} key={value}>
                  {statusLabel(value)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="review-page-size">
              {t("Материалов на странице")}
            </label>
            <select
              id="review-page-size"
              value={pageSize}
              onChange={(event) => navigate("page_size", event.target.value)}
            >
              {[10, 20, 50].map((value) => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
        {!data ? (
          <LoadState error={queueError} retry={queue.reload} />
        ) : (
          <>
            <details
              key={id || "queue"}
              className="review-queue-materials"
              open
            >
              <summary>
                {id
                  ? "Выбрать другой материал"
                  : "Выберите материал для проверки"}{" "}
                · на странице {data.items.length}
              </summary>
              <ul className="review-queue-list">
                {data.items.map((ad) => (
                  <li key={ad.id}>
                    <button
                      type="button"
                      className="review-queue-item"
                      data-advertisement-id={ad.id}
                      aria-current={id === ad.id ? "true" : undefined}
                      onClick={() => navigate("advertisement_id", ad.id)}
                    >
                      <strong>{ad.source_label}</strong>
                      <span>
                        {ad.is_demo ? "DEMO · " : ""}
                        {statusLabel(ad.status)}
                      </span>
                      <span className="review-queue-excerpt">
                        {ad.original_text
                          ? `${ad.original_text.slice(0, 140)}${ad.original_text.length > 140 ? "…" : ""}`
                          : ad.assets.some((asset) => asset.kind === "IMAGE")
                            ? "Изображение · оригинал доступен после выбора"
                            : "Файл · оригинал доступен после выбора"}
                      </span>
                      <small>
                        {t("Зафиксировано: ")}
                        {date(ad.captured_at)}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
              {!data.items.length && (
                <p className="empty">
                  {data.total
                    ? "На этой странице материалов нет. Вернитесь на предыдущую страницу."
                    : "Материалов по запросу и фильтрам нет. Измените или сбросьте поиск и фильтры."}
                </p>
              )}
            </details>
            <Pagination
              label={t("Страницы очереди проверки")}
              page={data.page}
              pageSize={data.page_size}
              total={data.total}
              onPageChange={(value) => navigate("page", String(value))}
            />
            {id && !selectedInQueue && (
              <p className="field-help">
                Выбранный материал открыт по прямой ссылке и находится вне
                текущей страницы или фильтра очереди.
              </p>
            )}
          </>
        )}
        <p className="field-help">
          Оригиналы идут в серверном порядке поступления. Выбор материала,
          фильтр и переход страницы не запускают анализ или подтверждение.
        </p>
      </ReviewQueuePanel>
      {id ? (
        <ReviewMaterial key={id} id={id} onChange={queue.reload} />
      ) : data ? (
        <p className="notice">
          Выберите материал из очереди. Для новой публикации добавьте текст или
          изображение в разделе «Реклама».
        </p>
      ) : null}
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
  const { t } = useLocale();
  const params = useSearchParams();
  const router = useRouter();
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
  const draft = useReviewDraft(
    user?.id || "",
    `material:${id}`,
    {
      version: "",
      propertyId: "",
      matchReason: "",
      transcription: null as string | null,
      transcriptionReason: "",
      transcriptionEditing: false as boolean,
      transcriptionExtractionId: "",
      commandFingerprint: "",
      commandKey: "",
    },
    [
      "version",
      "transcriptionEditing",
      "transcriptionExtractionId",
      "commandFingerprint",
      "commandKey",
    ],
  );
  const { version, propertyId, matchReason, transcriptionReason } =
    draft.values;
  const requestedVersion =
    params.get("queue") === "actions"
      ? params.get("review_extraction_id")
      : null;
  const setVersion = (value: string) => {
    draft.update({ version: value });
    if (params.get("queue") === "actions") {
      const next = new URLSearchParams(params);
      next.set("review_extraction_id", value);
      next.delete("review_section");
      router.replace(`/review?${next}`, { scroll: false });
    }
  };
  const setPropertyId = (value: string) => draft.update({ propertyId: value });
  const setMatchReason = (value: string) =>
    draft.update({ matchReason: value });
  const setTranscriptionReason = (value: string) =>
    draft.update({ transcriptionReason: value });
  const [selected, setSelected] = useState<Hypothesis | null>(null);
  const originalPanel = useRef<HTMLElement>(null);
  const ad = adData.data;
  const extraction =
    extractions.data?.find((e) => e.id === (requestedVersion || version)) ||
    extractions.data?.[0];
  const transcription =
    draft.values.transcriptionEditing &&
    draft.values.transcriptionExtractionId === extraction?.id
      ? (draft.values.transcription ?? extraction.analysis_text)
      : null;
  const transcriptionFields = [
    "transcription",
    "transcriptionReason",
    "transcriptionEditing",
    "transcriptionExtractionId",
  ] as const;
  function clearTranscriptionDraft() {
    draft.update({
      transcription: null,
      transcriptionReason: "",
      transcriptionEditing: false,
      transcriptionExtractionId: "",
    });
    draft.saved([...transcriptionFields]);
  }
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
    setBusy(true);
    setError("");
    try {
      const fingerprint = await reviewCommandFingerprint(path, body);
      const key =
        draft.values.commandFingerprint === fingerprint &&
        draft.values.commandKey
          ? draft.values.commandKey
          : crypto.randomUUID();
      draft.update({ commandFingerprint: fingerprint, commandKey: key });
      const result = await command<T>(path, body, key);
      draft.update({ commandFingerprint: "", commandKey: "" });
      draft.saved(["commandFingerprint", "commandKey"]);
      if (path.endsWith("/matches")) draft.saved(["propertyId", "matchReason"]);
      if (path.endsWith("/transcription"))
        draft.saved([...transcriptionFields]);
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
        : !extractions.data
          ? "Загружаем гипотезы…"
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
    <>
      <details className="review-draft-help">
        <summary>{t("О черновике проверки")}</summary>
        <p className="field-help">
          Черновик хранится в текущей вкладке 12 часов после изменения.
          Восстановление не отправляет решения. Выход удаляет черновики.
        </p>
      </details>
      {draft.restored && (
        <p role="status" className="notice">
          Восстановлен локальный черновик этого материала. Сверьте актуальные
          версии перед отдельным сохранением решения.
        </p>
      )}
      {draft.storageError && <Notice error={draft.storageError} />}
      <nav className="review-steps" aria-label={t("Этапы проверки материала")}>
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
          <p className="eyebrow">{t("ТЕКУЩИЙ МАТЕРИАЛ")}</p>
          <h2>{ad.source_label}</h2>
          <p>
            <span className="review-material-status">
              {statusLabel(ad.status)}
            </span>
            {" · "}зафиксирован {date(ad.captured_at)}
          </p>
        </div>
        <div className="review-toolbar">
          <Demo value={ad.is_demo} />
          <Link className="text-link" href={`/advertisements/${id}`}>
            {t("Карточка и SHA-256")}
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
      {error && (
        <Button variant="outline" onClick={reload}>
          {t("Обновить данные материала")}
        </Button>
      )}
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
          <h2>{t("Оригинал")}</h2>
          {draft.values.transcriptionEditing &&
            extraction &&
            draft.values.transcriptionExtractionId !== extraction.id && (
              <div className="notice">
                <p>
                  Черновик расшифровки относится к другой версии текста.
                  Выберите ту версию для просмотра или отмените локальный
                  черновик перед новой правкой.
                </p>
                <Button variant="outline" onClick={clearTranscriptionDraft}>
                  {t("Отменить черновик расшифровки")}
                </Button>
              </div>
            )}
          {ad.source_url === "https://www.angroups.kz/payment" &&
            ad.assets.some((asset) => asset.kind === "HTML") && (
              <p className="notice">
                {t(
                  "Текст извлечён из мобильных карточек условий оплаты. Настольная версия может отличаться — сверяйте HTML-оригинал. Дата публикации, ЖК и очередь не установлены.",
                  "Мәтін төлем шарттарының мобильді карточкаларынан алынған. Компьютер нұсқасы өзгеше болуы мүмкін — HTML түпнұсқасымен салыстырыңыз. Жарияланған күні, ТК мен кезек анықталмаған.",
                )}
              </p>
            )}
          <dl className="review-provenance">
            <div>
              <dt>{t("Источник")}</dt>
              <dd>{ad.source_label}</dd>
            </div>
            <div>
              <dt>{t("URL источника")}</dt>
              <dd>
                {ad.source_url && /^https?:\/\//i.test(ad.source_url) ? (
                  <a
                    className="text-link"
                    href={ad.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {ad.source_url}
                  </a>
                ) : (
                  ad.source_url || "Не указан"
                )}
              </dd>
            </div>
            <div>
              <dt>{t("Опубликовано", "Жарияланған")}</dt>
              <dd>
                {ad.published_at
                  ? date(ad.published_at)
                  : t(
                      "Дата публикации неизвестна",
                      "Жарияланған күні белгісіз",
                    )}
              </dd>
            </div>
            <div>
              <dt>{t("Зафиксировано", "Тіркелген")}</dt>
              <dd>{date(ad.captured_at)}</dd>
            </div>
          </dl>
          {!ad.published_at && (
            <p>
              {t(
                "Дата фиксации не подтверждает дату публикации.",
                "Тіркелген күні жарияланған күнін растамайды.",
              )}
            </p>
          )}
          {currentSelection && (
            <a
              className="text-link"
              href={`#hypothesis-${currentSelection.id}`}
            >
              {t("К выбранной гипотезе")}
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
            <PdfDownload
              kind="assets"
              id={image.id}
              label={t("PDF-копия изображения")}
            />
          )}
          {image && (
            <a className="text-link" href={`/api/v1/assets/${image.id}`}>
              {t("Скачать оригинал")}
            </a>
          )}
          {extraction && (
            <>
              <PdfDownload
                kind="extractions"
                id={extraction.id}
                label={t("Результаты анализа в PDF")}
              />
              <PdfDownload
                kind="advertisements"
                id={ad.id}
                label={t("PDF-копия публикации")}
              />
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
                    <summary>{t("Исходный OCR без исправлений")}</summary>
                    <pre className="original-text">
                      {extraction.original_ocr_text}
                    </pre>
                  </details>
                )}
              {writable && latest && (
                <Button
                  variant="outline"
                  disabled={
                    active ||
                    busy ||
                    (draft.values.transcriptionEditing &&
                      draft.values.transcriptionExtractionId !== extraction.id)
                  }
                  onClick={() =>
                    draft.update({
                      transcriptionEditing: true,
                      transcriptionExtractionId: extraction.id,
                      transcription: null,
                    })
                  }
                >
                  {t("Исправить расшифровку")}
                </Button>
              )}
              {transcription !== null && (
                <div className="review-form">
                  <label htmlFor="transcription">
                    {t("Новая расшифровка по оригиналу")}
                  </label>
                  <textarea
                    id="transcription"
                    rows={7}
                    value={transcription}
                    maxLength={100000}
                    onChange={(e) =>
                      draft.update({ transcription: e.target.value })
                    }
                  />
                  <label htmlFor="transcription-reason">
                    {t("Причина исправления")}
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
                        clearTranscriptionDraft();
                        setVersion("");
                      }
                    }}
                  >
                    {t("Создать новую версию")}
                  </Button>
                  <Button variant="outline" onClick={clearTranscriptionDraft}>
                    {t("Отмена")}
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
          <h2>{t("Извлечённые гипотезы")}</h2>
          {extractions.error && <Notice error={extractions.error} />}
          {!extractions.data && !extractions.error ? (
            <LoadState error="" retry={extractions.reload} />
          ) : extraction ? (
            <>
              <label htmlFor="extraction-version">{t("Версия текста")}</label>
              <select
                id="extraction-version"
                value={extraction.id}
                onChange={(e) => {
                  setVersion(e.target.value);
                  setSelected(null);
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
              <ManualAnnotation
                key={extraction.id}
                advertisementId={ad.id}
                sourceLabel={ad.source_label}
                extraction={extraction}
                userId={user?.id || ""}
                writable={writable && latest}
                disabled={active || busy}
                onChange={reload}
              />
              {!extraction.hypotheses.length && (
                <p>Гипотезы не найдены. Проверьте оригинал и расшифровку.</p>
              )}
              {extraction.hypotheses.map((h) => (
                <HypothesisCard
                  key={`${h.id}:${extraction.revision}`}
                  hypothesis={h}
                  writable={writable && latest}
                  busy={busy}
                  draftScope={`hypothesis:${id}:${extraction.id}:${h.id}`}
                  onSelect={() => showOriginal(h)}
                  onReview={async (action, value, reason) =>
                    (await mutate(`/extractions/${extraction.id}/review`, {
                      expected_revision: extraction.revision,
                      hypothesis_id: h.id,
                      action,
                      reason,
                      ...(value ? { corrected_value: value } : {}),
                    })) !== undefined
                  }
                />
              ))}
            </>
          ) : extractions.error ? (
            <Button variant="outline" onClick={extractions.reload}>
              {t("Повторить загрузку гипотез")}
            </Button>
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
          <h2>{t("Привязка к конкретному ЖК / очереди")}</h2>
          <p className="muted">
            Сходство — подсказка, а не вероятность. Проверьте адрес, очередь и
            дату по оригиналу.
          </p>
          {ad.confirmed_property_id && (
            <p>
              {t("Подтверждён объект:")}{" "}
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
                      {t("Выбрать")}
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
                      {t("Отклонить кандидата")}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {writable && (
            <div className="review-form">
              <PropertyPicker
                value={propertyId}
                onChange={setPropertyId}
                isDemo={ad.is_demo}
              />
              <label htmlFor="match-reason">
                {t("Обоснование выбора / отклонения")}
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
                {t("Подтвердить привязку")}
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
          onChange={onChange}
        />
      )}
    </>
  );
}

const fieldLabels: Record<string, string> = {
  PROPERTY_NAME: "Название ЖК",
  PAYMENT_TERM: "Условие оплаты",
  AMOUNT: "Сумма",
  STAGE: "Стадия",
};
const stageValueLabels: Record<string, string> = {
  UNKNOWN: "Стадия не установлена",
  PLANNED: "Планируется строительство",
  UNDER_CONSTRUCTION: "Строится",
  COMPLETED: "Строительство завершено",
};
function HypothesisCard({
  hypothesis: h,
  writable,
  busy,
  draftScope,
  onSelect,
  onReview,
}: {
  hypothesis: Hypothesis;
  writable: boolean;
  busy: boolean;
  draftScope: string;
  onSelect: () => void;
  onReview: (
    action: string,
    value: Value | null,
    reason: string,
  ) => Promise<boolean>;
}) {
  const { t } = useLocale();
  const { user } = useContext(Auth);
  const value = h.reviewed_value || h.value;
  const manual = h.origin === "MANUAL";
  const ownProposal = manual && h.proposed_by?.id === user?.id;
  const independentReviewer = !manual || (!!h.proposed_by?.id && !ownProposal);
  const draft = useReviewDraft(
    user?.id || "",
    draftScope,
    {
      reason: "",
      editing: false as boolean,
      text: value.text || "",
      amount: value.money?.amount || "",
      percent: value.percent?.toString() || "",
      currency: value.money?.currency || "KZT",
    },
    ["editing"],
  );
  const { reason, editing, text, amount, percent, currency } = draft.values;
  async function review(action: string, corrected: Value | null = null) {
    if (await onReview(action, corrected, reason)) draft.saved();
  }
  return (
    <article
      className={`hypothesis hypothesis-${h.review_status.toLowerCase()}`}
      id={`hypothesis-${h.id}`}
      tabIndex={-1}
    >
      <div className="review-toolbar">
        <strong>{fieldLabels[h.field] || h.field}</strong>
        <span className="status">{statusLabel(h.review_status)}</span>
      </div>
      {manual && (
        <div className="field-help">
          <p>
            {t("Ручное предложение: ", "Қолмен берілген ұсыныс: ")}
            {h.review_status === "PENDING"
              ? t("ожидает независимой проверки", "тәуелсіз тексеруді күтуде")
              : h.review_status === "CONFIRMED"
                ? t(
                    "принято независимым аналитиком",
                    "тәуелсіз талдаушы қабылдаған",
                  )
                : t("отклонено", "қабылданбаған")}
          </p>
          <p>
            {t("Предложил: ", "Ұсынған: ")}
            {h.proposed_by?.display_name || t("Не указан", "Көрсетілмеген")}
            {" · "}
            {h.proposed_at
              ? date(h.proposed_at)
              : t("Дата не указана", "Күні көрсетілмеген")}
          </p>
          <p>
            {t("Обоснование предложения: ", "Ұсыныс негіздемесі: ")}
            {h.proposal_reason || t("Не указано", "Көрсетілмеген")}
          </p>
          {h.reviewed_by && (
            <p>
              {t("Проверил: ", "Тексерген: ")}
              {h.reviewed_by.display_name}
              {" · "}
              {h.reviewed_at
                ? date(h.reviewed_at)
                : t("Дата не указана", "Күні көрсетілмеген")}
            </p>
          )}
          {h.review_reason && (
            <p>
              {t("Обоснование решения: ", "Шешім негіздемесі: ")}
              {h.review_reason}
            </p>
          )}
          <p>
            {t(
              "Предложение и его проверка не подтверждают R2. Доказательство, привязка к объекту и решение по риску сохраняются отдельно.",
              "Ұсыныс пен оны тексеру R2-ні растамайды. Дәлел, нысанмен байланыс және тәуекел шешімі бөлек сақталады.",
            )}
          </p>
          {!independentReviewer && (
            <p>
              {ownProposal
                ? t(
                    "Собственное предложение проверять нельзя. Требуется другой уполномоченный аналитик.",
                    "Өз ұсынысыңызды тексеруге болмайды. Басқа уәкілетті талдаушы қажет.",
                  )
                : t(
                    "Автор предложения не указан; независимая проверка недоступна.",
                    "Ұсыныс авторы көрсетілмеген; тәуелсіз тексеру қолжетімсіз.",
                  )}
            </p>
          )}
          <p>
            {t(
              "Для изменения цитаты создайте новое предложение.",
              "Дәйексөзді өзгерту үшін жаңа ұсыныс жасаңыз.",
            )}
          </p>
        </div>
      )}
      <p>
        {h.field === "STAGE" && value.text
          ? stageValueLabels[value.text] || value.text
          : value.text}
      </p>
      {h.field === "STAGE" && value.text && (
        <details className="field-help">
          <summary>{t("Сохранённое значение стадии")}</summary>
          <code>{value.text}</code>
        </details>
      )}
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
          {draft.restored && (
            <p className="field-help" role="status">
              Восстановлен черновик проверки гипотезы. Решение ещё не сохранено.
            </p>
          )}
          {draft.storageError && <Notice error={draft.storageError} />}
          <label htmlFor={`reason-${h.id}`}>{t("Обоснование проверки")}</label>
          <input
            id={`reason-${h.id}`}
            maxLength={2000}
            value={reason}
            onChange={(e) => draft.update({ reason: e.target.value })}
          />
          {editing && !manual && (
            <>
              <label htmlFor={`value-${h.id}`}>{t("Исправленный текст")}</label>
              <textarea
                id={`value-${h.id}`}
                maxLength={2000}
                value={text}
                onChange={(e) => draft.update({ text: e.target.value })}
              />
              <label htmlFor={`amount-${h.id}`}>{t("Сумма")}</label>
              <input
                id={`amount-${h.id}`}
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => draft.update({ amount: e.target.value })}
              />
              <label htmlFor={`currency-${h.id}`}>{t("Валюта")}</label>
              <select
                id={`currency-${h.id}`}
                value={currency}
                onChange={(e) =>
                  draft.update({
                    currency: e.target.value as NonNullable<
                      Value["money"]
                    >["currency"],
                  })
                }
              >
                {["KZT", "USD", "EUR", "UNKNOWN"].map((c) => (
                  <option value={c} key={c}>
                    {c}
                  </option>
                ))}
              </select>
              <label htmlFor={`percent-${h.id}`}>{t("Процент")}</label>
              <input
                id={`percent-${h.id}`}
                type="number"
                min="0"
                max="100"
                value={percent}
                onChange={(e) => draft.update({ percent: e.target.value })}
              />
            </>
          )}
          <div className="review-actions">
            <Button
              disabled={busy || !reason.trim() || !independentReviewer}
              onClick={() => void review("CONFIRM")}
            >
              {t("Подтвердить гипотезу")}
            </Button>
            <Button
              variant="outline"
              disabled={busy || !reason.trim() || !independentReviewer}
              onClick={() => void review("REJECT")}
            >
              {t("Отклонить")}
            </Button>
            {!manual && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => draft.update({ editing: !editing })}
              >
                {t("Исправить")}
              </Button>
            )}
            {editing && !manual && (
              <Button
                disabled={
                  busy ||
                  !reason.trim() ||
                  (!text.trim() && !amount && !percent)
                }
                onClick={() =>
                  void review("CORRECT", {
                    text: text || null,
                    money: amount
                      ? {
                          amount,
                          currency: currency as NonNullable<
                            Value["money"]
                          >["currency"],
                        }
                      : null,
                    percent: percent ? Number(percent) : null,
                  })
                }
              >
                {t("Сохранить исправление")}
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
  const { t } = useLocale();
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
          aria-label={t("Выделенный фрагмент OCR")}
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
  onChange,
}: {
  ad: Advertisement;
  extraction: Extraction;
  writable: boolean;
  onError: (s: string) => void;
  onChange: () => void;
}) {
  const { t } = useLocale();
  const { user } = useContext(Auth);
  const property = useData<PropertyDetail>(
    `/properties/${ad.confirmed_property_id}`,
  );
  const draft = useReviewDraft(
    user?.id || "",
    `payment:${ad.id}:${extraction.id}:${ad.confirmed_property_id}`,
    {
      reason: "",
      hypothesisId: "",
      evidenceId: "",
      pendingEvidenceId: "",
      factorAsOf: "",
      commandFingerprint: "",
      commandKey: "",
    },
    [
      "evidenceId",
      "pendingEvidenceId",
      "factorAsOf",
      "commandFingerprint",
      "commandKey",
    ],
  );
  const { reason, hypothesisId, evidenceId } = draft.values;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const factor = property.data?.factors.find((f) => f.code === "R2");
  const propertyReady =
    property.data?.property.id === ad.confirmed_property_id && !property.error;
  const payment = extraction.hypotheses.filter(
    (h) =>
      h.field === "PAYMENT_TERM" &&
      ["CONFIRMED", "CORRECTED"].includes(h.review_status),
  );
  async function action(path: string, body: unknown) {
    const fingerprint = await reviewCommandFingerprint(path, body);
    const key =
      draft.values.commandFingerprint === fingerprint && draft.values.commandKey
        ? draft.values.commandKey
        : crypto.randomUUID();
    draft.update({ commandFingerprint: fingerprint, commandKey: key });
    const result = await command<Record<string, unknown>>(path, body, key);
    draft.update({ commandFingerprint: "", commandKey: "" });
    draft.saved(["commandFingerprint", "commandKey"]);
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
      onChange();
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
          {draft.restored && (
            <p className="field-help" role="status">
              Восстановлен черновик R2. Сверьте текущий фактор перед отдельным
              решением.
            </p>
          )}
          {draft.storageError && <Notice error={draft.storageError} />}
          <label htmlFor="risk-payment">
            {t("Проверенное условие оплаты")}
          </label>
          <select
            id="risk-payment"
            value={hypothesisId}
            onChange={(e) => {
              draft.update({ hypothesisId: e.target.value, evidenceId: "" });
            }}
          >
            <option value="">{t("Выберите гипотезу")}</option>
            {payment.map((h) => (
              <option value={h.id} key={h.id}>
                {(h.reviewed_value || h.value).text}
              </option>
            ))}
          </select>
          <label htmlFor="risk-reason">{t("Обоснование решения по R2")}</label>
          <input
            id="risk-reason"
            value={reason}
            maxLength={2000}
            onChange={(e) => draft.update({ reason: e.target.value })}
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
                  const evidence = draft.values.pendingEvidenceId
                    ? { id: draft.values.pendingEvidenceId }
                    : await action("/evidence", {
                        property_id: ad.confirmed_property_id,
                        kind: "ADVERTISEMENT_FRAGMENT",
                        asset_id: h.fragment.asset_id,
                        advertisement_id: ad.id,
                        extraction_id: extraction.id,
                        hypothesis_id: h.id,
                        fragment: h.fragment,
                        description: reason,
                        source_label: ad.source_label,
                        event_at: ad.published_at,
                        is_demo: ad.is_demo,
                      });
                  const id = evidence.id as string;
                  const asOf =
                    draft.values.factorAsOf || new Date().toISOString();
                  draft.update({
                    evidenceId: id,
                    pendingEvidenceId: id,
                    factorAsOf: asOf,
                  });
                  if (!factor)
                    await action(
                      `/properties/${ad.confirmed_property_id}/risk-factors`,
                      {
                        code: "R2",
                        as_of: asOf,
                        evidence_ids: [id],
                        reason,
                      },
                    );
                  setMessage(
                    "Доказательство сохранено. Подтверждение R2 требует отдельного решения.",
                  );
                  draft.update({ pendingEvidenceId: "", factorAsOf: "" });
                  draft.saved([
                    "reason",
                    "hypothesisId",
                    "evidenceId",
                    "pendingEvidenceId",
                    "factorAsOf",
                  ]);
                })
              }
            >
              {t("Сохранить доказательство R2")}
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
                      draft.saved(["reason", "hypothesisId", "evidenceId"]);
                    })
                  }
                >
                  {t("Подтвердить R2 · +25")}
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
                      draft.saved(["reason", "hypothesisId", "evidenceId"]);
                    })
                  }
                >
                  {t("Отклонить R2")}
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
        <PropertyHistory
          key={ad.confirmed_property_id}
          id={ad.confirmed_property_id}
          revision={property.data?.property.risk.as_of}
          compact
        />
      )}
    </section>
  );
}
