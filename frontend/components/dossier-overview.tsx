"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  FileCheck2,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { type ReactNode } from "react";
import type { AuditEvent, PropertyDetail } from "@/lib/types";
import { useLocale } from "@/lib/locale";
import { date } from "@/lib/api";
import { LoadState } from "@/components/workspace";

function sourceLinks(event?: AuditEvent | null) {
  const raw = event?.details?.source_row;
  if (!raw || typeof raw !== "object") return [];
  const row = raw as Record<string, unknown>;
  return [
    ...new Set([
      row.official_source,
      row.location_source,
      row.other_source,
      row["Прямой URL"],
    ]),
  ]
    .filter(
      (value): value is string =>
        typeof value === "string" && /^https?:\/\//i.test(value),
    )
    .flatMap((url) => {
      try {
        return [{ url, label: new URL(url).hostname }];
      } catch {
        return [];
      }
    });
}

/** Shows saved provenance; never upgrades an imported observation to a verified fact. */
export function DossierOverview({
  detail,
  progress,
  onDocuments,
  provenance,
}: {
  detail: PropertyDetail;
  progress: ReactNode;
  onDocuments: () => void;
  provenance: {
    data: AuditEvent | null;
    error: string;
    loaded: boolean;
    reload: () => void;
  };
}) {
  const { t } = useLocale();
  const row = detail.property;
  const imported =
    provenance.data?.action === "SOURCE_PACKAGE_IMPORTED" &&
    provenance.data.entity_id === row.id
      ? provenance.data
      : null;
  const raw = imported?.details.source_row;
  const sourceRow =
    raw && typeof raw === "object" ? (raw as Record<string, string>) : null;
  const links = sourceLinks(imported);
  const legal = (
    {
      UNKNOWN: t("Не проверено", "Тексерілмеген"),
      PENDING: t("На проверке", "Тексерілуде"),
      VERIFIED_VALID: t("Основание подтверждено", "Негіз расталған"),
      VERIFIED_ABSENT: t("Отсутствие установлено", "Жоқ екені анықталған"),
      REJECTED: t("Отклонено", "Қабылданбаған"),
    } as Record<string, string>
  )[row.legal_verification_status];
  const stages: Record<string, string> = {
    UNKNOWN: t("Не проверена", "Тексерілмеген"),
    PLANNED: t("Планируется", "Жоспарлануда"),
    UNDER_CONSTRUCTION: t("Строится", "Салынуда"),
    COMPLETED: t("Завершён", "Аяқталған"),
  };
  const sourceFooter = (
    <footer className="fact-sources">
      <span>{t("Источники:", "Дереккөздер:")}</span>
      {links.map(({ url, label }) => (
        <a key={url} href={url} target="_blank" rel="noreferrer">
          {label}
          <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      ))}
      <Link href={`/properties/${row.id}?section=history`}>
        {t("История сведений", "Мәліметтер тарихы")}
      </Link>
      {!links.length && provenance.loaded && !provenance.error && (
        <span>
          {t(
            "Сохранённое досье · первичный источник не указан",
            "Сақталған досье · бастапқы дереккөз көрсетілмеген",
          )}
        </span>
      )}
      {(!provenance.loaded || provenance.error) && (
        <span>
          {provenance.error
            ? t(
                "Происхождение не удалось загрузить",
                "Шығу тегін жүктеу мүмкін болмады",
              )
            : t("Загрузка источников…", "Дереккөздер жүктелуде…")}
        </span>
      )}
    </footer>
  );
  return (
    <div className="dossier-card-grid">
      <section className="panel fact-card dossier-object-facts">
        <header>
          <h2>
            <FileCheck2 size={19} aria-hidden="true" />
            {t("Статус и основание", "Мәртебе және негіз")}
          </h2>
          <span
            className={`fact-status ${row.legal_verification_status === "VERIFIED_VALID" ? "verified" : "unknown"}`}
          >
            {legal}
          </span>
        </header>
        <dl className="fact-list">
          <div>
            <dt>{t("Правовой статус", "Құқықтық мәртебе")}</dt>
            <dd>{legal}</dd>
          </div>
          <div>
            <dt>{t("Стадия строительства", "Құрылыс кезеңі")}</dt>
            <dd>{stages[row.stage] || row.stage}</dd>
          </div>
          <div>
            <dt>{t("Готовность", "Дайындық")}</dt>
            <dd>
              {row.progress_percent === null
                ? t("Не проверена", "Тексерілмеген")
                : `${row.progress_percent}%${row.is_demo ? " · DEMO" : ""}`}
            </dd>
          </div>
          <div>
            <dt>{t("Последняя проверка", "Соңғы тексеру")}</dt>
            <dd>{date(row.last_reviewed_at)}</dd>
          </div>
          {row.legal_absence_as_of && (
            <div>
              <dt>
                {t(
                  "Отсутствие документировано на дату",
                  "Жоқ екені құжатталған күн",
                )}
              </dt>
              <dd>{date(row.legal_absence_as_of)} · R1</dd>
            </div>
          )}
        </dl>
        <button
          className="text-link fact-action"
          type="button"
          onClick={onDocuments}
        >
          {t("Основания и документы", "Негіздер мен құжаттар")}
          <ArrowUpRight size={15} aria-hidden="true" />
        </button>
        {sourceFooter}
      </section>
      {progress}
      <section className="panel fact-card">
        <header>
          <h2>
            <MapPin size={19} aria-hidden="true" />
            {t("Сведения об объекте", "Нысан туралы мәліметтер")}
          </h2>
        </header>
        <dl className="fact-list">
          <div>
            <dt>{t("Жилой комплекс", "Тұрғын үй кешені")}</dt>
            <dd>{row.name}</dd>
          </div>
          <div>
            <dt>{t("Город / регион", "Қала / өңір")}</dt>
            <dd>{row.city}</dd>
          </div>
          <div>
            <dt>{t("Адрес / ориентир", "Мекенжай / бағдар")}</dt>
            <dd>{row.address}</dd>
          </div>
          <div>
            <dt>{t("Уровень объекта", "Нысан деңгейі")}</dt>
            <dd>
              {row.level === "PROJECT"
                ? t("Проект / ЖК", "Жоба / ТК")
                : row.level === "PHASE"
                  ? t("Очередь", "Кезек")
                  : t("Корпус", "Ғимарат")}
            </dd>
          </div>
        </dl>
        {sourceRow?.notes && <p className="fact-note">{sourceRow.notes}</p>}
        {sourceFooter}
      </section>
      <section className="panel fact-card">
        <header>
          <h2>
            <Building2 size={19} aria-hidden="true" />
            {t("Участники проекта", "Жоба қатысушылары")}
          </h2>
        </header>
        <dl className="fact-list">
          <div>
            <dt>{t("Застройщик", "Құрылыс салушы")}</dt>
            <dd>{row.developer.name}</dd>
          </div>
          <div>
            <dt>{t("БИН", "БСН")}</dt>
            <dd>{row.developer.bin || t("Не указан", "Көрсетілмеген")}</dd>
          </div>
        </dl>
        <p className="fact-note">
          {t(
            "Название ЖК и юридическое лицо проверяются отдельно. Совпадение имени не подтверждает принадлежность проекта.",
            "ТК атауы мен заңды тұлға бөлек тексеріледі. Атаулардың сәйкестігі жоба тиесілілігін растамайды.",
          )}
        </p>
        {sourceFooter}
      </section>
      <section className="panel fact-card dossier-origin-card">
        <header>
          <h2>
            <ShieldCheck size={19} aria-hidden="true" />
            {t("Происхождение и актуальность", "Шығу тегі және өзектілігі")}
          </h2>
        </header>
        {provenance.error ? (
          <LoadState error={provenance.error} retry={provenance.reload} />
        ) : !provenance.loaded ? (
          <p role="status">
            {t("Загрузка источников…", "Дереккөздер жүктелуде…")}
          </p>
        ) : imported ? (
          <>
            <dl className="fact-list">
              <div>
                <dt>{t("Получено в SAQ", "SAQ жүйесіне алынған")}</dt>
                <dd>{date(imported.occurred_at)}</dd>
              </div>
              {sourceRow?.list_date && (
                <div>
                  <dt>{t("Дата перечня в файле", "Файлдағы тізім күні")}</dt>
                  <dd>{sourceRow.list_date}</dd>
                </div>
              )}
              <div>
                <dt>{t("Тип материала", "Материал түрі")}</dt>
                <dd>
                  {t(
                    "Наблюдение из пользовательского файла",
                    "Пайдаланушы файлындағы бақылау",
                  )}
                </dd>
              </div>
            </dl>
            <p className="fact-note">
              {t(
                "Данные сохранены с оговорками автора. Исходная интернет-страница и применимость документов требуют отдельной проверки.",
                "Мәліметтер автор ескертпелерімен сақталған. Бастапқы интернет-бет пен құжаттардың қолданылуы бөлек тексеруді қажет етеді.",
              )}
            </p>
            {typeof imported.details.advertisement_id === "string" && (
              <Link
                className="text-link fact-action"
                href={`/advertisements/${imported.details.advertisement_id}`}
              >
                {t("Открыть материал импорта", "Импорт материалын ашу")}
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            )}
          </>
        ) : (
          <p className="fact-note">
            {t(
              "Источники, даты и сохранённые решения доступны в истории и документах досье.",
              "Дереккөздер, күндер және сақталған шешімдер досье тарихы мен құжаттарында қолжетімді.",
            )}
          </p>
        )}
        {sourceFooter}
      </section>
    </div>
  );
}

export function DossierRiskStatistics({ detail }: { detail: PropertyDetail }) {
  const { t } = useLocale();
  const factorStatuses = ["R1", "R2", "R3", "R4", "R5", "R6"].map(
    (code) => detail.factors.find((factor) => factor.code === code)?.status,
  );
  const statuses = [
    {
      label: t("Подтверждены", "Расталған"),
      count: factorStatuses.filter((status) => status === "CONFIRMED").length,
      kind: "danger",
    },
    {
      label: t("Ожидают решения", "Шешімді күтуде"),
      count: factorStatuses.filter((status) => status === "PENDING").length,
      kind: "warning",
    },
    {
      label: t("Отклонены", "Қабылданбаған"),
      count: factorStatuses.filter((status) => status === "REJECTED").length,
      kind: "neutral",
    },
    {
      label: t("Не установлены", "Анықталмаған"),
      count: factorStatuses.filter(
        (status) =>
          !["CONFIRMED", "PENDING", "REJECTED"].includes(status || ""),
      ).length,
      kind: "unknown",
    },
  ];
  return (
    <details className="risk-statistics" open>
      <summary>{t("Статистика проверки", "Тексеру статистикасы")}</summary>
      <div className="risk-statistics-grid">
        {statuses.map((item) => (
          <div key={item.kind} className={`risk-stat ${item.kind}`}>
            <span>{item.label}</span>
            <strong>{item.count}</strong>
          </div>
        ))}
      </div>
      <p>
        {t(
          "Шесть независимых факторов R1–R6. Неизвестность не является благоприятным результатом; балл рассчитывает сервер только по подтверждённым факторам.",
          "R1–R6 — алты тәуелсіз фактор. Белгісіздік оң нәтиже болып саналмайды; баллды сервер тек расталған факторлар бойынша есептейді.",
        )}
      </p>
    </details>
  );
}
