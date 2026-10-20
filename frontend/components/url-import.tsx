"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { api, command } from "@/lib/api";
import type { Job } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Auth, Notice, PageTitle } from "@/components/workspace";
import { useLocale } from "@/lib/locale";

type ImportJob = Job & {
  kind: "IMPORT_URL";
  advertisement_id: string | null;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const terminal = (job: ImportJob) =>
  ["SUCCEEDED", "FAILED", "BLOCKED"].includes(job.state);

export function UrlImportView() {
  const { t } = useLocale();
  const { user } = useContext(Auth);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selectedJob = params.get("job");
  const invalidJob =
    selectedJob !== null &&
    (params.getAll("job").length !== 1 || !uuid.test(selectedJob));
  const jobId = !invalidJob ? selectedJob?.toLowerCase() : null;
  const [url, setUrl] = useState("");
  const [refresh, setRefresh] = useState(0);
  const requestKey = `${jobId}:${refresh}`;
  const [resolved, setResolved] = useState<{
    requestKey: string;
    job: ImportJob | null;
    error: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const key = useRef(crypto.randomUUID());
  const requestGeneration = useRef(0);
  const result = useRef<HTMLElement>(null);
  const query = params.toString();
  useEffect(
    () => () => {
      requestGeneration.current++;
    },
    [pathname, query],
  );
  const current = resolved?.requestKey === requestKey ? resolved : null;
  const job = current?.job;
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const next = await api<ImportJob>(`/analysis-jobs/${jobId}`);
        if (cancelled) return;
        if (next.kind !== "IMPORT_URL" || next.id !== jobId)
          throw new Error("Это задание не относится к выбранному импорту.");
        setResolved({ requestKey, job: next, error: "" });
        if (terminal(next)) return;
      } catch (cause) {
        if (cancelled) return;
        setResolved({
          requestKey,
          job: null,
          error: (cause as Error).message,
        });
        return;
      }
      timer = setTimeout(poll, 1500);
    }
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [jobId, requestKey]);
  const finished = job ? terminal(job) : false;
  useEffect(() => {
    if (finished) {
      key.current = crypto.randomUUID();
      result.current?.focus();
    }
  }, [finished, jobId]);
  function selectJob(id: string | null) {
    const next = new URLSearchParams(params.toString());
    if (id) next.set("job", id);
    else next.delete("job");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, {
      scroll: false,
    });
  }
  async function start(event?: FormEvent) {
    event?.preventDefault();
    if (user?.role !== "analyst" || !url.trim()) return;
    const selection = params.toString();
    const generation = ++requestGeneration.current;
    function isCurrentSelection() {
      return (
        requestGeneration.current === generation &&
        window.location.pathname === pathname &&
        new URLSearchParams(window.location.search).toString() === selection
      );
    }
    setBusy(true);
    setError("");
    try {
      const next = await command<ImportJob>(
        "/advertisements/import-url",
        { url: url.trim(), is_demo: false },
        key.current,
      );
      // A response from the previous selection must not replace a newer link.
      if (!isCurrentSelection()) return;
      setResolved({
        requestKey: `${next.id}:${refresh}`,
        job: next,
        error: "",
      });
      selectJob(next.id);
    } catch (cause) {
      if (!isCurrentSelection()) return;
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const running = busy || Boolean(jobId && (!job || !finished));
  return (
    <>
      <Link className="back" href="/advertisements/new">
        К добавлению публикации
      </Link>
      <PageTitle
        eyebrow="ОТКРЫТЫЙ ИСТОЧНИК"
        title="Импорт по ссылке"
        action={false}
        description="Сохраните оригинал открытой публикации. Анализ и подтверждение выполняются отдельно."
      />
      <section className="panel padded form-panel">
        <h2>{t("Поддерживаемые страницы", "Қолдау көрсетілетін беттер")}</h2>
        <p>
          <a
            href="https://www.angroups.kz/payment"
            target="_blank"
            rel="noreferrer"
          >
            AN GROUPS · /payment
          </a>{" "}
          —{" "}
          {t(
            "условия оплаты. Сохраняются текст мобильных карточек и полный HTML; текст настольной версии может отличаться. Дата публикации и конкретный ЖК не установлены.",
            "төлем шарттары. Мобильді карточкалар мәтіні мен толық HTML сақталады; компьютер нұсқасының мәтіні өзгеше болуы мүмкін. Жарияланған күні мен нақты ТК анықталмаған.",
          )}
        </p>
        <p>
          Primeminister.kz · /ru/news/, /news/ —{" "}
          {t("информационные статьи", "ақпараттық мақалалар")}.{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            Лицензия CC BY 4.0
          </a>
          {t(" (только Primeminister.kz).", " (тек Primeminister.kz).")}{" "}
          {t(
            "Импорт запускается кнопкой. Привязка объекта, анализ и решения выполняются отдельно.",
            "Импорт батырмамен іске қосылады. Нысанға байланыстыру, талдау мен шешімдер бөлек орындалады.",
          )}
        </p>
        {user?.role === "analyst" ? (
          <form onSubmit={start}>
            <label htmlFor="import-url">Ссылка на публикацию</label>
            <input
              id="import-url"
              type="url"
              required
              maxLength={2048}
              value={url}
              disabled={running}
              aria-describedby="import-url-help"
              onChange={(event) => {
                setUrl(event.target.value);
                key.current = crypto.randomUUID();
              }}
            />
            <p id="import-url-help" className="muted">
              Повторная загрузка неизменённого текста откроет существующий
              материал. Неизвестная дата останется неизвестной.
            </p>
            <Button
              type="submit"
              disabled={running || invalidJob}
              aria-busy={busy || Boolean(job && !finished)}
            >
              {busy || (job && !finished)
                ? "Импорт выполняется…"
                : "Сохранить публикацию"}
            </Button>
          </form>
        ) : (
          <p className="notice">
            Импорт доступен аналитику. Сохранённые публикации доступны для
            просмотра.
          </p>
        )}
        {error && <Notice error={error} />}
        {invalidJob && (
          <Notice error="В ссылке указан некорректный идентификатор задания. Начните новый импорт." />
        )}
        {selectedJob !== null && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              key.current = crypto.randomUUID();
              setError("");
              selectJob(null);
            }}
          >
            Новый импорт
          </Button>
        )}
      </section>
      {jobId && (
        <section
          className="panel padded"
          ref={result}
          tabIndex={-1}
          aria-labelledby="import-result-title"
        >
          <h2 id="import-result-title">Результат импорта</h2>
          {!current && <p role="status">Восстанавливаем состояние импорта…</p>}
          {current?.error && (
            <>
              <Notice error={current.error} />
              <Button onClick={() => setRefresh((value) => value + 1)}>
                Проверить состояние снова
              </Button>
            </>
          )}
          {job && <p role="status">{job.stage}</p>}
          {job?.error && <Notice error={job.error.error.message} />}
          {job?.state === "SUCCEEDED" && job.advertisement_id && (
            <Button asChild>
              <Link href={`/advertisements/${job.advertisement_id}`}>
                Открыть сохранённую публикацию
              </Link>
            </Button>
          )}
          {(job?.state === "FAILED" || job?.state === "BLOCKED") && (
            <>
              {user?.role === "analyst" && !url.trim() && (
                <p>Чтобы повторить импорт, укажите ссылку на публикацию.</p>
              )}
              <div className="action-row">
                {user?.role === "analyst" && (
                  <Button
                    disabled={busy || !url.trim()}
                    onClick={() => void start()}
                  >
                    Повторить импорт
                  </Button>
                )}
                <Link href="/advertisements/new">Добавить текст вручную</Link>
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
