"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Download, FileText, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailDrawer } from "@/components/ui/detail-drawer";
import { pdfReadMessage, readPdf, savePdf } from "@/lib/pdf-read";
import "./report-options.css";

const sections = [
  "documents",
  "risk",
  "publications",
  "evidence",
  "history",
  "signals",
  "sources",
] as const;
type ReportSection = (typeof sections)[number];
type Language = "ru" | "kk";
const captions = {
  ru: {
    trigger: "Скачать отчёт",
    title: "Отчёт по объекту",
    close: "Закрыть отчёт",
    description:
      "Выберите разделы. Сводка, неизвестные сведения и ограничения включаются всегда. Отчёт отражает текущее досье; исторические PDF сигналов скачиваются отдельно.",
    language: "Язык отчёта",
    selected: "Разделы отчёта",
    summary: "Сводка и ограничения · обязательно",
    documents: "Документы основания",
    risk: "Факторы риска и решения",
    publications: "Подтверждённо привязанные публикации",
    evidence: "Сохранённые доказательства",
    history: "История решений",
    signals: "Исторические версии сигналов",
    sources: "Источники и происхождение",
    scope:
      "До 100 записей в разделе. Неполная выборка будет указана в PDF. Файловые наблюдения не подтверждают привязку или правовой статус.",
    generate: "Сформировать и скачать PDF",
    busy: "Готовим PDF…",
    cancel: "Отменить подготовку",
    ready: "PDF скачан. Сведения и решения не изменены.",
  },
  kk: {
    trigger: "Есепті жүктеу",
    title: "Нысан бойынша есеп",
    close: "Есепті жабу",
    description:
      "Бөлімдерді таңдаңыз. Қысқаша мәлімет, белгісіз деректер мен шектеулер әрқашан қосылады. Есеп ағымдағы досьені көрсетеді; тарихи сигналдардың PDF файлдары бөлек жүктеледі.",
    language: "Есеп тілі",
    selected: "Есеп бөлімдері",
    summary: "Қысқаша мәлімет пен шектеулер · міндетті",
    documents: "Құқықтық негіз құжаттары",
    risk: "Тәуекел факторлары және шешімдер",
    publications: "Байланысы расталған жарияланымдар",
    evidence: "Сақталған дәлелдер",
    history: "Шешімдер тарихы",
    signals: "Сигналдардың тарихи нұсқалары",
    sources: "Дереккөздер және шығу тегі",
    scope:
      "Әр бөлімде 100 жазбаға дейін. Толық емес іріктеу PDF ішінде көрсетіледі. Файлдағы бақылау байланысты немесе құқықтық мәртебені растамайды.",
    generate: "PDF жасау және жүктеу",
    busy: "PDF дайындалып жатыр…",
    cancel: "Дайындауды тоқтату",
    ready: "PDF жүктелді. Мәліметтер мен шешімдер өзгерген жоқ.",
  },
};

/** Read-only report options. Opening, selecting and cancelling never submit business commands. */
export function ReportOptions({
  propertyId,
  propertyName,
  language = "ru",
  className,
}: {
  propertyId: string;
  propertyName: string;
  language?: Language;
  className?: string;
}) {
  const copy = captions[language];
  const languageId = useId();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ReportSection[]>([...sections]);
  const [reportLanguage, setReportLanguage] = useState<Language>(language);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), [propertyId]);
  function close() {
    pending.current?.abort();
    pending.current = null;
    setBusy(false);
    setOpen(false);
  }
  async function download(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const query = new URLSearchParams({
        sections: ["summary", ...selected].join(","),
        language: reportLanguage,
      });
      const { blob, filename } = await readPdf(
        `/api/v1/properties/${encodeURIComponent(propertyId)}/report.pdf?${query}`,
        controller.signal,
        `saq-dossier-report-${propertyId}.pdf`,
      );
      if (pending.current !== controller || controller.signal.aborted) return;
      savePdf(blob, filename);
      setMessage(copy.ready);
    } catch (cause) {
      if (pending.current === controller)
        setError(pdfReadMessage(cause, language));
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={className}
        onClick={() => {
          setReportLanguage(language);
          setError("");
          setMessage("");
          setOpen(true);
        }}
      >
        <FileText size={16} strokeWidth={1.75} aria-hidden="true" />{" "}
        {copy.trigger}
      </Button>
      <DetailDrawer
        open={open}
        onClose={close}
        title={copy.title}
        description={copy.description}
        closeLabel={copy.close}
      >
        <form
          className="report-options"
          onSubmit={(event) => void download(event)}
        >
          <p className="report-options-object">{propertyName}</p>
          <fieldset disabled={busy} className="report-options-fields">
            <legend>{copy.selected}</legend>
            <label className="report-options-choice">
              <input type="checkbox" checked disabled /> {copy.summary}
            </label>
            {sections.map((section) => (
              <label className="report-options-choice" key={section}>
                <input
                  type="checkbox"
                  checked={selected.includes(section)}
                  onChange={(event) =>
                    setSelected((values) =>
                      event.target.checked
                        ? sections.filter(
                            (value) =>
                              value === section || values.includes(value),
                          )
                        : values.filter((value) => value !== section),
                    )
                  }
                />{" "}
                {copy[section]}
              </label>
            ))}
            <label htmlFor={languageId}>{copy.language}</label>
            <select
              id={languageId}
              value={reportLanguage}
              onChange={(event) =>
                setReportLanguage(event.target.value as Language)
              }
            >
              <option value="ru">Русский</option>
              <option value="kk">Қазақша</option>
            </select>
          </fieldset>
          <p className="field-help">{copy.scope}</p>
          <div className="report-options-actions">
            <Button type="submit" disabled={busy} aria-busy={busy}>
              {busy ? (
                <LoaderCircle
                  className="report-spinner"
                  size={16}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              ) : (
                <Download size={16} strokeWidth={1.75} aria-hidden="true" />
              )}{" "}
              {busy ? copy.busy : copy.generate}
            </Button>
            {busy && (
              <Button
                type="button"
                variant="outline"
                onClick={() => pending.current?.abort()}
              >
                {copy.cancel}
              </Button>
            )}
          </div>
          {busy && <p role="status">{copy.busy}</p>}
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
        </form>
      </DetailDrawer>
    </>
  );
}
