"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { useLocale } from "@/lib/locale";
import { MaterialSearch } from "@/components/material-search";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ClipboardCheck,
  Database,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MapPin,
  ListFilter,
  Plus,
  Search,
  ShieldCheck,
  ShieldAlert,
  Siren,
  SlidersHorizontal,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { api, command, date, ApiError } from "@/lib/api";
import type {
  Advertisement,
  AdvertisementReviewPage,
  Dashboard,
  Evidence,
  Extraction,
  Page,
  Property,
  PropertyDetail,
  Signal,
  User,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { TableRegion } from "@/components/ui/table-region";
import { PropertyMap } from "@/components/property-map";
import {
  WorkspaceTabs,
  WorkspacePanel,
  useWorkspaceSection,
} from "@/components/ui/workspace-tabs";
import { PdfDownload } from "@/components/pdf-download";
import { ManualAnnotation } from "@/components/manual-annotation";
import { ObjectRecords } from "@/components/object-records";
import { PropertyHistory } from "@/components/property-history";
import { PropertyStructure } from "@/components/property-structure";
import { clearReviewDrafts, useReviewDraft } from "@/lib/use-review-draft";
import { clearDossierFormDrafts } from "@/lib/use-dossier-form-draft";
import {
  DossierOverview,
  DossierRiskStatistics,
} from "@/components/dossier-overview";
import { DossierRecords } from "@/components/dossier-records";
import { ReportOptions } from "@/components/report-options";
import { SourceSummary } from "@/components/source-summary";
import { statusLabel } from "@/lib/status-labels";
import { propertyNextAction } from "@/lib/property-priority";
import {
  clearRegistryContext,
  useRegistryContext,
} from "@/lib/use-registry-context";
import {
  factorLabels,
  assetPdfLabel,
  propertyDossierUrl,
  propertyRiskContext,
  zoneLabels,
} from "@/lib/presentation";
import { AppealReview } from "@/components/appeal-review";
import { ConstructionReview } from "@/components/construction-review";
import { LegalAbsenceReview } from "@/components/legal-absence-review";
import { CreateSignalButton } from "@/components/signals-workspace";
import {
  LegalBasisCreate,
  LegalBasisDecision,
  mechanismLabels,
} from "@/components/legal-basis-review";

export const Auth = createContext<{
  user: User | null;
  refresh: () => Promise<void>;
}>({ user: null, refresh: async () => {} });
const InterfaceMode = createContext<{
  detailed: boolean;
  setDetailed: (value: boolean) => void;
}>({
  detailed: false,
  setDetailed: () => {},
});

export function useInterfaceMode() {
  return useContext(InterfaceMode);
}
const legalLabels: Record<string, string> = {
  UNKNOWN: "Не проверено",
  PENDING: "На проверке",
  VERIFIED_VALID: "Основание подтверждено",
  VERIFIED_ABSENT: "Отсутствие установлено",
  REJECTED: "Отклонено",
};
const stageLabels: Record<string, string> = {
  UNKNOWN: "Не проверена",
  PLANNED: "Планируется",
  UNDER_CONSTRUCTION: "Строится",
  COMPLETED: "Завершён",
};
const nav = [
  { href: "/dashboard", label: "Обзор", kk: "Шолу", icon: LayoutDashboard },
  { href: "/properties", label: "Объекты", kk: "Нысандар", icon: Building2 },
  { href: "/advertisements", label: "Реклама", kk: "Жарнама", icon: Megaphone },
  { href: "/review", label: "Проверка", kk: "Тексеру", icon: ClipboardCheck },
  { href: "/signals", label: "Сигналы", kk: "Сигналдар", icon: ShieldAlert },
];

function GlobalSearch() {
  const { t } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const query = String(data.get("q") || "").trim();
    if (!query) return;
    setOpen(false);
    router.push(`/properties?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className={`global-search${open ? " is-open" : ""}`}>
      <button
        ref={toggle}
        type="button"
        className="global-search-toggle"
        aria-expanded={open}
        aria-controls="global-search-form"
        onClick={() => {
          setOpen(!open);
          if (!open) requestAnimationFrame(() => input.current?.focus());
        }}
      >
        <Search size={20} aria-hidden="true" /> {t("Поиск", "Іздеу")}
      </button>
      <form
        id="global-search-form"
        className="topbar-search"
        role="search"
        aria-label={t("Поиск объекта", "Нысанды іздеу")}
        onSubmit={submit}
        onKeyDown={(event) => {
          if (event.key === "Escape" && toggle.current?.offsetParent) {
            event.preventDefault();
            setOpen(false);
            toggle.current?.focus();
          }
        }}
      >
        <Search size={16} aria-hidden="true" />
        <label className="sr-only" htmlFor="global-property-search">
          {t("Найти объект или адрес", "Нысанды немесе мекенжайды табу")}
        </label>
        <input
          ref={input}
          id="global-property-search"
          name="q"
          type="search"
          placeholder={t(
            "Найти объект или адрес",
            "Нысанды немесе мекенжайды табу",
          )}
          autoComplete="off"
          maxLength={300}
        />
        <button type="submit" aria-label={t("Найти объект", "Нысанды табу")}>
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

function WorkspaceContext({ pathname }: { pathname: string }) {
  const { t } = useLocale();
  let parent: { href: string; label: string } | null = null;
  let title = "";
  if (pathname.startsWith("/properties/")) {
    parent = { href: "/properties", label: t("Объекты", "Нысандар") };
    title = t("Досье объекта", "Нысан дерекнамасы");
  } else if (pathname.startsWith("/advertisements/")) {
    parent = { href: "/advertisements", label: t("Реклама", "Жарнама") };
    title =
      (
        {
          "/advertisements/new": t("Добавить текст", "Мәтін қосу"),
          "/advertisements/upload": t("Загрузить файл", "Файл жүктеу"),
          "/advertisements/import-url": t(
            "Импорт по ссылке",
            "Сілтеме арқылы импорттау",
          ),
        } as Record<string, string>
      )[pathname] || t("Оригинал публикации", "Жарияланым түпнұсқасы");
  } else if (pathname.startsWith("/monitoring")) {
    parent = { href: "/review", label: t("Проверка", "Тексеру") };
    title = t("Сверка находок", "Табылған деректерді салыстыру");
  } else if (pathname.startsWith("/comparison")) {
    parent = { href: "/review?queue=actions", label: t("Проверка", "Тексеру") };
    title = t("Сравнение публикаций", "Жарияланымдарды салыстыру");
  }
  return parent ? (
    <nav
      className="breadcrumbs"
      aria-label={t("Путь к странице", "Бетке өту жолы")}
    >
      <Link href={parent.href}>{parent.label}</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{title}</span>
    </nav>
  ) : (
    <span>
      {pathname === "/sources"
        ? t("Источники данных", "Дереккөздер")
        : t("Рабочее место аналитика", "Талдаушының жұмыс орны")}
    </span>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const { locale, setLocale, t } = useLocale();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [detailed, setDetailedState] = useState(false);
  useEffect(() => {
    try {
      setDetailedState(
        localStorage.getItem("saq-detailed-interface") === "true",
      );
    } catch {
      // Storage may be unavailable; the current view remains usable.
    }
  }, []);
  function setDetailed(value: boolean) {
    setDetailedState(value);
    try {
      localStorage.setItem("saq-detailed-interface", String(value));
    } catch {
      // A display preference must never block access to the application.
    }
  }
  const pathname = usePathname();
  const checking =
    pathname.startsWith("/review") ||
    pathname.startsWith("/monitoring") ||
    pathname.startsWith("/comparison");
  const router = useRouter();
  async function refresh() {
    try {
      setUser(await api<User>("/auth/me"));
      setError("");
    } catch (e) {
      setUser(null);
      if (e instanceof ApiError && e.status === 401) {
        clearReviewDrafts();
        clearDossierFormDrafts();
        clearRegistryContext();
      }
      if (!(e instanceof ApiError && e.status === 401))
        setError((e as Error).message);
    } finally {
      setReady(true);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    if (ready && !user && !error && pathname !== "/login")
      router.replace("/login");
  }, [ready, user, error, pathname, router]);
  if (pathname === "/login")
    return <Auth.Provider value={{ user, refresh }}>{children}</Auth.Provider>;
  if (!ready)
    return (
      <main className="boot">
        {t("Подключение к рабочему месту…", "Жұмыс орнына қосылу…")}
      </main>
    );
  if (error)
    return (
      <main className="boot">
        <Notice error={error} />
        <Button onClick={refresh}>{t("Повторить", "Қайталау")}</Button>
      </main>
    );
  if (!user)
    return (
      <main className="boot">{t("Необходим вход…", "Жүйеге кіру қажет…")}</main>
    );
  return (
    <InterfaceMode.Provider value={{ detailed, setDetailed }}>
      <Auth.Provider value={{ user, refresh }}>
        <div
          className={`workspace analyst-workspace shell-redesign ${detailed ? "detailed-view" : "simple-view"}`}
        >
          <a className="skip-link" href="#main-content">
            {t("Перейти к содержимому", "Мазмұнға өту")}
          </a>
          <header className="topbar">
            <Link href="/dashboard" className="brand" aria-label="SAQ QURYLYS">
              <BrandLogo />
            </Link>
            <GlobalSearch />
            <div className="shell-account">
              <label className="shell-locale">
                <span className="sr-only">
                  {t("Язык интерфейса", "Интерфейс тілі")}
                </span>
                <select
                  value={locale}
                  onChange={(event) =>
                    setLocale(event.target.value === "kk" ? "kk" : "ru")
                  }
                >
                  <option value="ru">RU</option>
                  <option value="kk">KZ</option>
                </select>
              </label>
              <div className="user">
                <span className="avatar" aria-hidden="true">
                  {user.display_name.slice(0, 1)}
                </span>
                <div>
                  <strong>{user.display_name}</strong>
                  <small>
                    {user.role === "analyst"
                      ? t("Аналитик", "Талдаушы")
                      : t("Просмотр", "Көру")}
                  </small>
                </div>
                <button
                  type="button"
                  aria-label={t("Выйти", "Шығу")}
                  disabled={loggingOut}
                  aria-busy={loggingOut}
                  onClick={async () => {
                    setLoggingOut(true);
                    setLogoutError("");
                    try {
                      await command("/auth/logout");
                      clearReviewDrafts();
                      clearDossierFormDrafts();
                      clearRegistryContext();
                      await refresh();
                      router.replace("/login");
                    } catch (failure) {
                      setLogoutError((failure as Error).message);
                    } finally {
                      setLoggingOut(false);
                    }
                  }}
                >
                  <LogOut size={20} aria-hidden="true" />
                </button>
              </div>
            </div>
            {logoutError && (
              <div className="shell-account-error">
                <Notice error={logoutError} />
              </div>
            )}
          </header>
          <aside className="sidebar">
            <nav aria-label={t("Основная навигация", "Негізгі навигация")}>
              {nav.map(({ href, label, kk, icon: Icon }) => {
                const active =
                  pathname.startsWith(href) || (href === "/review" && checking);
                return (
                  <Link
                    key={href}
                    href={href === "/review" ? "/review?queue=actions" : href}
                    className={active ? "active" : ""}
                    title={t(label, kk)}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                    <span>{t(label, kk)}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="sidebar-tools">
              <Link
                href="/sources"
                className={
                  pathname === "/sources" ? "source-nav active" : "source-nav"
                }
                aria-current={pathname === "/sources" ? "page" : undefined}
                title={t("Источники данных", "Дереккөздер")}
              >
                <Database size={20} strokeWidth={1.75} aria-hidden="true" />
                <span>{t("Источники", "Дереккөз")}</span>
              </Link>
              <button
                className="interface-toggle"
                type="button"
                aria-pressed={detailed}
                onClick={() => setDetailed(!detailed)}
                title={
                  detailed
                    ? t("Краткий вид", "Қысқаша көрініс")
                    : t("Подробный вид", "Толық көрініс")
                }
              >
                <SlidersHorizontal
                  size={20}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span>
                  {detailed
                    ? t("Краткий вид", "Қысқаша көрініс")
                    : t("Подробный вид", "Толық көрініс")}
                </span>
              </button>
            </div>
          </aside>
          <div className="main-column">
            <div className="shell-context-row">
              <div className="topbar-context">
                <WorkspaceContext pathname={pathname} />
              </div>
            </div>
            {checking && (
              <nav
                className="checking-nav"
                aria-label={t("Проверки", "Тексерулер")}
              >
                <Link
                  href="/review?queue=actions"
                  aria-current={pathname === "/review" ? "page" : undefined}
                >
                  {t("Материалы", "Материалдар")}
                </Link>
                <Link
                  href="/comparison"
                  aria-current={
                    pathname.startsWith("/comparison") ? "page" : undefined
                  }
                >
                  {t("Сравнение публикаций", "Жарияланымдарды салыстыру")}
                </Link>
                <Link
                  href="/monitoring"
                  aria-current={
                    pathname.startsWith("/monitoring") ? "page" : undefined
                  }
                >
                  {t("Сверка", "Салыстыру")}
                </Link>
              </nav>
            )}
            <main className="content" id="main-content" tabIndex={-1}>
              {children}
            </main>
            <footer>
              SAQ QURYLYS ·{" "}
              {t(
                "Прототип · Сигнал не устанавливает факт правонарушения",
                "Прототип · Сигнал құқық бұзушылық фактісін анықтамайды",
              )}
              <span className="shell-context-note">
                {t("DEMO отмечено отдельно", "DEMO бөлек белгіленген")}
              </span>
            </footer>
          </div>
        </div>
      </Auth.Provider>
    </InterfaceMode.Provider>
  );
}

export function Notice({ error }: { error: string }) {
  return (
    <p role="alert" className="notice error">
      {error}
    </p>
  );
}
export function Demo({ value = true }: { value?: boolean }) {
  return value ? <span className="demo-badge">DEMO</span> : null;
}
export function Zone({ risk }: { risk: Property["risk"] }) {
  const { t } = useLocale();
  return (
    <span className={`zone ${risk.zone.toLowerCase()}`}>
      <span className="zone-dot" aria-hidden="true" />
      <strong>{risk.score}</strong> {t(zoneLabels[risk.zone])}
    </span>
  );
}

function PropertyRisk({ row }: { row: Property }) {
  const { t } = useLocale();
  const context = propertyRiskContext(row);
  return (
    <span className="property-risk">
      <Zone risk={row.risk} />
      {context && <span className="property-risk-context">{t(context)}</span>}
    </span>
  );
}

export function RiskSummary({ risk }: { risk: Property["risk"] }) {
  const { t } = useLocale();
  const { detailed } = useInterfaceMode();
  return (
    <section
      className={`risk-summary ${risk.zone.toLowerCase()}`}
      aria-label={t("Рассчитанный приоритет проверки")}
    >
      <div className="risk-summary-score">
        <span className="risk-number">
          {risk.score}
          <small> / 100</small>
        </span>
        <span className={`zone ${risk.zone.toLowerCase()}`}>
          {t(zoneLabels[risk.zone])} {t("зона")}
        </span>
      </div>
      <div>
        <h2>{t("Приоритет проверки")}</h2>
        <p>
          {t("Подтверждённые факторы:")}{" "}
          <strong>{risk.confirmed_codes.join(" · ") || t("нет")}</strong>
        </p>
        <p className="field-help">
          {t(
            "Балл рассчитан сервером. Красная зона не устанавливает нарушение; зелёная не гарантирует безопасность.",
          )}
        </p>
      </div>
      <div className="risk-summary-meta" hidden={!detailed}>
        <span>
          {t("Ревизия ")}
          {risk.revision} · {risk.rules_version}
        </span>
        <span>
          {t("Оценка на ")}
          {date(risk.as_of)}
        </span>
      </div>
    </section>
  );
}

export function useData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);
  const [successfulPath, setSuccessfulPath] = useState<string | null>(null);
  const [readAt, setReadAt] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal })
      .then((value) => {
        setData(value);
        setError("");
        setResolvedPath(path);
        setSuccessfulPath(path);
        setReadAt(new Date().toISOString());
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e.message);
          setResolvedPath(path);
        }
      });
    return () => controller.abort();
  }, [path, version]);
  return {
    data,
    error,
    resolvedPath,
    successfulPath,
    readAt,
    reload: () => setVersion((value) => value + 1),
  };
}

export function LoadState({
  error,
  retry,
}: {
  error: string;
  retry: () => void;
}) {
  const { t } = useLocale();
  return error ? (
    <>
      <Notice error={error} />
      <Button type="button" variant="outline" onClick={retry}>
        {t("Повторить загрузку")}
      </Button>
    </>
  ) : (
    <p className="loading" role="status">
      {t("Загрузка данных…")}
    </p>
  );
}

export function PageTitle({
  eyebrow,
  title,
  description,
  action = true,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: boolean;
}) {
  const { t } = useLocale();
  const { user } = useContext(Auth);
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p className="subtitle">{description}</p>
      </div>
      {action && user?.role === "analyst" && (
        <Button asChild>
          <Link href="/advertisements/new">
            <Plus size={16} />
            {t("Добавить публикацию")}
          </Link>
        </Button>
      )}
    </div>
  );
}

function PropertyTable({
  rows,
  registryQuery = "",
  selectedId,
}: {
  rows: Property[];
  registryQuery?: string;
  selectedId?: string | null;
}) {
  const { t } = useLocale();
  if (!rows.length)
    return (
      <div className="empty">
        {t("Объекты по выбранным фильтрам не найдены.")}
      </div>
    );
  return (
    <TableRegion
      label={t("Реестр объектов — таблица с горизонтальной прокруткой")}
    >
      <table>
        <thead>
          <tr>
            <th scope="col">{t("Объект / очередь")}</th>
            <th scope="col">{t("Правовое основание")}</th>
            <th scope="col">{t("Приоритет проверки")}</th>
            <th scope="col">{t("Подтверждённые причины")}</th>
            <th scope="col">{t("Последняя проверка")}</th>
            <th scope="col">
              <span className="sr-only">{t("Открыть")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={row.id === selectedId ? "is-map-selected" : undefined}
            >
              <td>
                <Link
                  className="object-name"
                  href={propertyDossierUrl(row.id, registryQuery)}
                >
                  {row.name}
                </Link>
                <small>
                  {row.city} · {row.address} <Demo value={row.is_demo} />
                </small>
                <small>{row.developer.name}</small>
                {row.id === selectedId && (
                  <small className="selected-row-label">
                    {t("Выбран на карте")}
                  </small>
                )}
              </td>
              <td>
                <span
                  className={`legal ${row.legal_verification_status.toLowerCase()}`}
                >
                  {t(legalLabels[row.legal_verification_status])}
                </span>
              </td>
              <td>
                <PropertyRisk row={row} />
              </td>
              <td>
                <span className="factor-codes">
                  {row.risk.confirmed_codes.length
                    ? row.risk.confirmed_codes.map((code) => (
                        <span key={code}>
                          <b>{code}</b> · {t(factorLabels[code]) || code}
                        </span>
                      ))
                    : t("Нет подтверждённых")}
                </span>
              </td>
              <td className="date-cell">{date(row.last_reviewed_at)}</td>
              <td>
                <Link
                  aria-label={`${t("Открыть")} ${row.name}`}
                  href={propertyDossierUrl(row.id, registryQuery)}
                >
                  <ArrowRight size={18} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableRegion>
  );
}

function PropertyCards({
  rows,
  registryQuery = "",
}: {
  rows: Property[];
  registryQuery?: string;
}) {
  const { t } = useLocale();
  return (
    <div className="property-cards">
      {rows.map((row) => (
        <article className="property-card" key={row.id}>
          <div className="property-card-top">
            <Demo value={row.is_demo} />
          </div>
          <div className="property-card-name">
            <p>{row.city}</p>
            <h2>
              <Link href={propertyDossierUrl(row.id, registryQuery)}>
                {row.name}
              </Link>
            </h2>
            <p>{row.address}</p>
            <p>{row.developer.name}</p>
          </div>
          <div className="property-card-state">
            <PropertyRisk row={row} />
            {!propertyRiskContext(row) && (
              <span>{t(legalLabels[row.legal_verification_status])}</span>
            )}
          </div>
          <p className="property-card-reason">
            <strong>{t(propertyNextAction(row).label)}. </strong>
            {row.risk.confirmed_codes.length
              ? row.risk.confirmed_codes
                  .map((code) => `${code} · ${t(factorLabels[code]) || code}`)
                  .join(" · ")
              : t(
                  "Подтверждённых факторов нет. Полнота данных требует проверки.",
                )}
          </p>
          <div className="property-card-footer">
            <span>
              {t("Проверено: ")}
              {date(row.last_reviewed_at)}
            </span>
            <Link
              href={propertyDossierUrl(row.id, registryQuery)}
              aria-label={`${t("Открыть")} ${row.name}`}
            >
              <ArrowRight size={20} aria-hidden="true" />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function DashboardHeading() {
  const { t } = useLocale();
  const { user } = useContext(Auth);
  return (
    <div className="dashboard-heading">
      <PageTitle
        eyebrow={t("РАБОЧЕЕ ПРОСТРАНСТВО")}
        title={t("Рабочий обзор")}
        description={t(
          "Продолжите проверку материалов, разберите ошибки или откройте сохранённые сигналы.",
        )}
        action={false}
      />
      <div className="overview-links">
        {user?.role === "analyst" && (
          <Button asChild>
            <Link href="/advertisements/new">
              <Plus size={16} aria-hidden="true" /> {t("Добавить публикацию")}
            </Link>
          </Button>
        )}
        <Link className="text-link" href="/properties">
          {t("Найти объект ")}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
        {user?.role === "viewer" && (
          <Link className="text-link" href="/advertisements">
            {t("Открыть публикации")}
          </Link>
        )}
      </div>
    </div>
  );
}

function DashboardQueues({
  summary,
}: {
  summary: ReturnType<typeof useData<Dashboard>>;
}) {
  const { t } = useLocale();
  const unresolved = useData<AdvertisementReviewPage>(
    "/advertisements/review-queue?page_size=1",
  );
  const failed = useData<Page<Advertisement>>(
    "/advertisements?status=FAILED&page_size=1",
  );
  const queues = [
    {
      title: t("Новые публикации"),
      count: summary.data?.new_advertisements,
      resource: summary,
      note: t(
        "Сохранены и ожидают анализа. Подтверждения выполняются отдельно.",
      ),
      href: "/advertisements?status=NEW",
      action: t("Открыть новые материалы"),
    },
    {
      title: t("Материалы с нерешёнными действиями"),
      count: unresolved.data?.total,
      resource: unresolved,
      note: t(
        "Точное число материалов, где осталось проверить гипотезы, привязку, доказательство оплаты или R2. Один материал учитывается один раз.",
      ),
      href: "/review?queue=actions",
      action: t("Открыть очередь решений"),
    },
    {
      title: t("Ошибки обработки"),
      count: failed.data?.total,
      resource: failed,
      note: t(
        "Проверьте оригинал и причину ошибки перед явным повтором анализа.",
      ),
      href: "/review?status=FAILED",
      action: t("Открыть ошибки"),
    },
    {
      title: t("Сигналы без решения"),
      count: summary.data?.pending_signals,
      resource: summary,
      note: t("Сохранённые снимки ожидают отдельного решения аналитика."),
      href: "/signals?state=DRAFT&is_stale=false",
      action: t("Рассмотреть сигналы"),
    },
  ];
  return (
    <div
      className="action-queues"
      role="group"
      aria-label={t("Следующие действия")}
    >
      {queues.map((queue, index) => (
        <section className="panel action-queue" key={queue.href}>
          <Link
            className="queue-stat"
            href={queue.href}
            aria-label={queue.action}
            aria-describedby={`dashboard-queue-count-${index}`}
          >
            <div className="queue-stat-heading">
              <h2>{queue.title}</h2>
              <ArrowRight size={16} aria-hidden="true" />
            </div>
            <strong
              className="rail-number"
              id={`dashboard-queue-count-${index}`}
            >
              {queue.resource.error ? "—" : (queue.count ?? "—")}
            </strong>
          </Link>
          <details className="queue-explanation">
            <summary>{t("Что учитывается")}</summary>
            <p className="muted">{queue.note}</p>
          </details>
          {queue.resource.error ? (
            <LoadState
              error={queue.resource.error}
              retry={queue.resource.reload}
            />
          ) : queue.count === undefined ? (
            <p className="loading" role="status">
              {t("Загрузка количества…")}
            </p>
          ) : null}
        </section>
      ))}
    </div>
  );
}

function DashboardPriority({
  registry,
  rows,
  limit,
}: {
  registry: ReturnType<typeof useData<Page<Property>>>;
  rows: Property[];
  limit: number;
}) {
  const { t } = useLocale();
  return (
    <div className="dashboard-workspace">
      <section className="panel priority-panel">
        <div className="panel-heading">
          <div>
            <h2>{t("С чего начать проверку")}</h2>
            <p>
              {t(
                "Сначала решение по основанию, затем недостающие сведения. Внутри группы — отсутствие даты, более давняя проверка, затем балл. Сроки задач не установлены.",
              )}
            </p>
          </div>
          <Link className="text-link" href="/properties">
            {t("Весь реестр ")}
            <ArrowRight size={15} />
          </Link>
        </div>
        {registry.data && !registry.error ? (
          <>
            <ol className="priority-list">
              {rows.slice(0, limit).map((row) => (
                <li key={row.id}>
                  <div className="priority-object">
                    <Link
                      href={`/properties/${row.id}`}
                      className="object-name"
                    >
                      {row.name}
                    </Link>
                    <small>
                      {row.city} · {row.address} <Demo value={row.is_demo} />
                    </small>
                    <p>
                      {row.risk.confirmed_codes.length
                        ? row.risk.confirmed_codes
                            .map(
                              (code) =>
                                `${code} · ${t(factorLabels[code]) || code}`,
                            )
                            .join("; ")
                        : t(
                            "Подтверждённых факторов нет. Проверьте полноту материалов.",
                          )}
                    </p>
                  </div>
                  <div className="priority-action">
                    <PropertyRisk row={row} />
                    <p className="field-help">
                      {t(propertyNextAction(row).label)}
                    </p>
                    <Link className="text-link" href={`/properties/${row.id}`}>
                      {t("Открыть досье ")}
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </li>
              ))}
            </ol>
            {!rows.length && (
              <p className="empty">{t("В реестре пока нет объектов.")}</p>
            )}
            <p className="queue-scope">
              {t("Показано ")}
              {Math.min(rows.length, limit)} {t("из ")}
              {registry.data.total}{" "}
              {t(
                "объектов. Порядок рассчитан по всему доступному реестру: необходимое действие и давность проверки; балл используется при равенстве.",
              )}
            </p>
          </>
        ) : (
          <LoadState error={registry.error} retry={registry.reload} />
        )}
      </section>
      <aside className="dashboard-rail" aria-label={t("Продолжить работу")}>
        <nav
          className="workflow-links"
          aria-label={t("Основные рабочие сценарии")}
        >
          <Link href="/review?queue=actions">
            <span>
              {t("Проверить факты ")}
              <ArrowRight size={15} aria-hidden="true" />
            </span>
            <small>{t("Оригинал, гипотезы и точная очередь")}</small>
          </Link>
          <Link href="/signals">
            <span>
              {t("Сигналы и PDF ")}
              <ArrowRight size={15} aria-hidden="true" />
            </span>
            <small>{t("Сохранённые версии и решения")}</small>
          </Link>
          <Link href="/properties?view=map" aria-label={t("Открыть карту")}>
            <span>
              {t("Открыть карту ")}
              <MapPin size={15} aria-hidden="true" />
            </span>
            <small>{t("Расположение объектов реестра")}</small>
          </Link>
        </nav>
        <p className="rail-note">
          <ShieldCheck size={18} aria-hidden="true" />
          {t(
            "Гипотеза помогает найти факт. Окончательное решение принимает аналитик.",
          )}
        </p>
      </aside>
    </div>
  );
}

function DashboardPublicationOverview() {
  const { t } = useLocale();
  const publications = useData<Page<Advertisement>>(
    "/advertisements?page_size=100",
  );
  const data = publications.error ? null : publications.data;
  const rows = data?.items || [];
  const statusRows = [
    { status: "NEW", tone: "neutral" },
    { status: "ANALYZING", tone: "blue" },
    { status: "READY_FOR_REVIEW", tone: "yellow" },
    { status: "REVIEWED", tone: "green" },
    { status: "FAILED", tone: "red" },
  ].map(({ status, tone }) => ({
    label: t(statusLabel(status)),
    value: rows.filter((ad) => ad.status === status).length,
    tone,
  }));
  const sources = { image: 0, site: 0, text: 0, demo: 0 };
  for (const ad of rows) {
    if (ad.is_demo) sources.demo += 1;
    else if (ad.assets.some((asset) => asset.kind === "IMAGE"))
      sources.image += 1;
    else if (ad.source_url || ad.assets.some((asset) => asset.kind === "HTML"))
      sources.site += 1;
    else sources.text += 1;
  }
  const sourceRows = [
    { label: t("Сайты и ссылки"), value: sources.site, tone: "blue" },
    { label: t("Текстовые материалы"), value: sources.text, tone: "green" },
    { label: t("Изображения"), value: sources.image, tone: "yellow" },
    { label: t("DEMO-материалы"), value: sources.demo, tone: "neutral" },
  ];
  return (
    <div className="dashboard-publication-overview">
      {[
        {
          title: t("Статус публикаций"),
          eyebrow: t("СОСТОЯНИЕ ОБРАБОТКИ"),
          className: "publication-status-card",
          items: statusRows,
          help: t(
            "Готовность обработки не означает завершения решений аналитика. Точные оставшиеся действия — в очереди проверки.",
          ),
        },
        {
          title: t("Материалы по источникам"),
          eyebrow: t("ИСТОЧНИКИ"),
          className: "source-distribution-card",
          items: sourceRows,
          help: t(
            "Каждый материал учтён один раз: DEMO, затем изображение, сайт или текст. Тип источника не подтверждает его достоверность.",
          ),
        },
      ].map((section) => (
        <section
          key={section.title}
          className={`panel analytics-card ${section.className}`}
          aria-label={section.title}
        >
          <div className="analytics-heading">
            <div>
              <p className="eyebrow">{section.eyebrow}</p>
              <h2>{section.title}</h2>
            </div>
            <Link className="text-link" href="/advertisements">
              {t("Открыть ")}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          {data ? (
            <>
              <p className="analytics-caption">
                {t("Показано ")}
                {rows.length} {t("из ")}
                {data.total} {t("публикаций.")}
                {data.total > rows.length
                  ? t(
                      " Распределение только по первым 100 материалам, не по всему реестру.",
                    )
                  : t(" Распределение по сохранённым материалам.")}
              </p>
              {rows.length ? (
                <div className="analytics-bars">
                  {section.items.map((row) => (
                    <div className="analytics-bar-row" key={row.label}>
                      <div>
                        <span>{row.label}</span>
                        <strong>{row.value}</strong>
                      </div>
                      <div className="analytics-bar-track" aria-hidden="true">
                        <span
                          className={row.tone}
                          style={{
                            width: `${(row.value / rows.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty">{t("Сохранённых публикаций пока нет.")}</p>
              )}
              <p className="field-help">{section.help}</p>
            </>
          ) : (
            <LoadState error={publications.error} retry={publications.reload} />
          )}
        </section>
      ))}
    </div>
  );
}

export function DashboardView() {
  const { t } = useLocale();
  const { detailed } = useInterfaceMode();
  const summary = useData<Dashboard>("/dashboard/summary");
  const registry = useData<Page<Property>>(
    "/properties?order=work_priority&page_size=5",
  );
  const signals = useData<Page<Signal>>("/signals?page_size=1");
  const riskTotal = summary.data?.property_count || 0;
  const reviewedLegal = summary.data
    ? Math.max(0, riskTotal - summary.data.unknown_legal_bases)
    : 0;
  const riskRows = summary.data
    ? [
        {
          label: t("Красная зона"),
          value: summary.data.zones.RED,
          tone: "red",
        },
        {
          label: t("Жёлтая зона"),
          value: summary.data.zones.YELLOW,
          tone: "yellow",
        },
        {
          label: t("Зелёная зона"),
          value: summary.data.zones.GREEN,
          tone: "green",
        },
      ]
    : [];
  const priorityRows = registry.error ? [] : registry.data?.items || [];
  if (!detailed)
    return (
      <>
        <DashboardHeading />
        <DashboardQueues summary={summary} />
        <DashboardPriority registry={registry} rows={priorityRows} limit={3} />
        <DashboardPublicationOverview />
      </>
    );
  return (
    <>
      <DashboardHeading />
      <DashboardQueues summary={summary} />
      <DashboardPriority registry={registry} rows={priorityRows} limit={5} />
      <div className="context-line">
        <span className="live-dot" /> {t("Сведения реестра ")}
        <span>·</span>{" "}
        {summary.data
          ? `${t("Обновлено")} ${date(summary.data.calculated_at)}`
          : t("Подключение…")}
      </div>
      {summary.error && <Notice error={summary.error} />}
      <section className="metrics" aria-label={t("Ключевые показатели")}>
        {[
          [
            t("Объектов в реестре"),
            summary.data?.property_count,
            t("ЖК, очереди и корпуса"),
            "neutral",
            "/properties",
          ],
          [
            t("Приоритетная проверка"),
            summary.data?.zones.RED,
            t("Красная зона · подтверждены R1 + R2"),
            "red",
            "/properties?zone=RED",
          ],
          [
            t("Сигналов"),
            signals.error ? undefined : signals.data?.total,
            t("Сохранённые версии и решения"),
            "green",
            "/signals",
          ],
          [
            t("Основание не проверено"),
            summary.data?.unknown_legal_bases,
            t("Неизвестность не даёт R1"),
            "neutral",
            "/properties",
          ],
        ].map(([label, count, note, style, href]) => (
          <Link className={`metric ${style}`} href={String(href)} key={label}>
            <p>{label}</p>
            <strong>{count ?? "—"}</strong>
            <small>{note}</small>
            <span className="metric-action" aria-hidden="true">
              {t("Открыть ")}
              <ArrowRight size={14} />
            </span>
          </Link>
        ))}
      </section>
      <div className="dashboard-analytics">
        <section className="panel analytics-card risk-distribution">
          <div className="analytics-heading">
            <div>
              <p className="eyebrow">{t("СТРУКТУРА РЕЕСТРА")}</p>
              <h2>{t("Распределение по приоритету")}</h2>
            </div>
            <Link className="text-link" href="/properties">
              {t("Реестр ")}
              <ArrowRight size={14} />
            </Link>
          </div>
          {summary.data ? (
            <div className="risk-bars">
              {riskRows.map((row) => (
                <div className="risk-bar-row" key={row.label}>
                  <div>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                  <div className="risk-bar-track" aria-hidden="true">
                    <span
                      className={row.tone}
                      style={{
                        width: `${riskTotal ? (row.value / riskTotal) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <LoadState error={summary.error} retry={summary.reload} />
          )}
        </section>
        <section className="panel analytics-card verification-card">
          <div className="analytics-heading">
            <div>
              <p className="eyebrow">{t("СТАТУСЫ ОСНОВАНИЯ")}</p>
              <h2>{t("Решения по основаниям")}</h2>
            </div>
          </div>
          {summary.data ? (
            <div className="verification-summary">
              <div
                className="verification-ring"
                style={{
                  background: `conic-gradient(var(--color-accent) ${
                    riskTotal ? (reviewedLegal / riskTotal) * 100 : 0
                  }%, var(--color-surface-subtle) 0)`,
                }}
                aria-hidden="true"
              >
                <span>
                  <strong>{reviewedLegal}</strong>
                  <small>
                    {t("из ")}
                    {riskTotal}
                  </small>
                </span>
              </div>
              <dl className="verification-legend">
                <div>
                  <dt>{t("Решение зафиксировано")}</dt>
                  <dd>{reviewedLegal}</dd>
                </div>
                <div>
                  <dt>{t("Не проверено или на проверке")}</dt>
                  <dd>{summary.data.unknown_legal_bases}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <LoadState error={summary.error} retry={summary.reload} />
          )}
          <p className="field-help">
            {t(
              "Решение включает подтверждение, установленное отсутствие или отклонение. Это не число действующих правовых оснований.",
            )}
          </p>
        </section>
        <section className="panel analytics-card history-card">
          <div className="analytics-heading">
            <div>
              <p className="eyebrow">{t("ДИНАМИКА")}</p>
              <h2>{t("Сигналы во времени")}</h2>
            </div>
          </div>
          <div className="insufficient-data">
            <Siren size={24} aria-hidden="true" />
            <strong>{t("Недостаточно данных")}</strong>
            <p>
              {t(
                "Для сопоставимого временного ряда пока недостаточно данных. Сохранённые версии и решения доступны в разделе «Сигналы».",
              )}
            </p>
            {signals.error ? (
              <LoadState error={signals.error} retry={signals.reload} />
            ) : signals.data ? (
              <span>
                {t("Всего сигналов: ")}
                {signals.data.total}
              </span>
            ) : (
              <p role="status">{t("Загрузка количества сигналов…")}</p>
            )}
          </div>
        </section>
      </div>
      <DashboardPublicationOverview />
      <SourceSummary />
    </>
  );
}

export function PropertiesView() {
  const { t } = useLocale();
  const params = useSearchParams();
  const textSource = JSON.stringify([
    params.get("q") || "",
    params.get("city") || "",
  ]);
  const [text, setText] = useState({
    source: textSource,
    q: params.get("q") || "",
    city: params.get("city") || "",
  });
  // Adjust drafts only when URL text changes (reload/Back/reset), not on every render.
  if (text.source !== textSource)
    setText({
      source: textSource,
      q: params.get("q") || "",
      city: params.get("city") || "",
    });
  const paramsText = params.toString();
  useEffect(() => {
    const next = new URLSearchParams(paramsText);
    if (
      text.source !== textSource ||
      (text.q === (next.get("q") || "") &&
        text.city === (next.get("city") || ""))
    )
      return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(window.location.search);
      // Back/Forward owns newer URL text; an older draft must not overwrite it.
      if (
        JSON.stringify([next.get("q") || "", next.get("city") || ""]) !==
        textSource
      )
        return;
      for (const key of ["q", "city"] as const) {
        if (text[key]) next.set(key, text[key]);
        else next.delete(key);
      }
      next.delete("page");
      window.history.replaceState(null, "", `/properties?${next}`);
    }, 350);
    return () => clearTimeout(timer);
  }, [text, textSource, paramsText]);
  const apiParams = new URLSearchParams(params);
  apiParams.delete("view");
  const query = apiParams.toString();
  const showMap = params.get("view") === "map";
  const searchInput = useRef<HTMLInputElement>(null);
  const hasFilters = ["q", "city", "zone", "legal_status"].some((name) =>
    params.get(name),
  );
  function clearFilters() {
    setText({ source: textSource, q: "", city: "" });
    const next = new URLSearchParams(window.location.search);
    for (const name of ["q", "city", "zone", "legal_status", "page"])
      next.delete(name);
    window.history.replaceState(null, "", `/properties?${next}`);
    requestAnimationFrame(() => searchInput.current?.focus());
  }
  function filter(name: string, value: string) {
    // Query-only client filters commit synchronously, so rapid controls merge.
    const next = new URLSearchParams(window.location.search);
    for (const key of ["q", "city"] as const) {
      if (text[key]) next.set(key, text[key]);
      else next.delete(key);
    }
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== "page" && name !== "view") next.delete("page");
    window.history.replaceState(null, "", `/properties?${next}`);
  }
  return (
    <>
      <PageTitle
        eyebrow={t("РЕЕСТР СТРОИТЕЛЬСТВА")}
        title={showMap ? t("Карта объектов") : t("Объекты")}
        description={
          showMap
            ? t(
                "Найдите объект, сравните приоритет проверки и откройте его досье.",
              )
            : t(
                "Каждая очередь и корпус проверяются по своим документам и датам.",
              )
        }
        action={!showMap}
      />
      <section className="panel registry-panel">
        <div className="filters">
          <div className="search">
            <Search size={17} aria-hidden="true" />
            <label className="sr-only" htmlFor="search">
              {t("Поиск ЖК или адреса, застройщика или БИН")}
            </label>
            <input
              id="search"
              ref={searchInput}
              type="search"
              maxLength={300}
              placeholder={t("ЖК, адрес, застройщик или БИН")}
              value={text.q}
              onChange={(event) => setText({ ...text, q: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") filter("q", text.q);
              }}
            />
          </div>
          <label>
            {t("Город · точное название")}
            <input
              aria-label={t("Фильтр по городу")}
              maxLength={300}
              value={text.city}
              onChange={(event) =>
                setText({ ...text, city: event.target.value })
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") filter("city", text.city);
              }}
            />
          </label>
          <label>
            {t("Зона")}
            <select
              aria-label={t("Фильтр по зоне")}
              value={params.get("zone") || ""}
              onChange={(e) => filter("zone", e.target.value)}
            >
              <option value="">{t("Все зоны")}</option>
              <option value="RED">{t("Красная")}</option>
              <option value="YELLOW">{t("Жёлтая")}</option>
              <option value="GREEN">{t("Зелёная")}</option>
            </select>
          </label>
          <label>
            {t("Основание")}
            <select
              aria-label={t("Фильтр по основанию")}
              value={params.get("legal_status") || ""}
              onChange={(e) => filter("legal_status", e.target.value)}
            >
              <option value="">{t("Все статусы")}</option>
              {Object.entries(legalLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {t(label)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          className="registry-views"
          role="group"
          aria-label={t("Вид реестра")}
        >
          <Button
            variant="outline"
            aria-pressed={!showMap}
            onClick={() => filter("view", "")}
          >
            {t("Список")}
          </Button>
          <Button
            variant="outline"
            aria-pressed={showMap}
            onClick={() => filter("view", "map")}
          >
            {t("Карта и список")}
          </Button>
          {hasFilters && (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              {t("Сбросить фильтры")}
            </Button>
          )}
        </div>
        {hasFilters && (
          <div className="active-filters" aria-label={t("Активные фильтры")}>
            <ListFilter size={16} aria-hidden="true" />
            {params.get("q") && (
              <span>
                {t("Поиск: ")}
                {params.get("q")}
              </span>
            )}
            {params.get("city") && (
              <span>
                {t("Город: ")}
                {params.get("city")}
              </span>
            )}
            {params.get("zone") && (
              <span>
                {t("Зона:")}{" "}
                {t(zoneLabels[params.get("zone") as keyof typeof zoneLabels]) ||
                  params.get("zone")}
              </span>
            )}
            {params.get("legal_status") && (
              <span>
                {t("Основание:")}{" "}
                {t(legalLabels[params.get("legal_status")!]) ||
                  params.get("legal_status")}
              </span>
            )}
          </div>
        )}
        {/* A changed filter must never display the previous request's markers. */}
        <PropertyResults
          key={query}
          query={query}
          registryQuery={params.toString()}
          showMap={showMap}
          onPage={(page) => filter("page", String(page))}
        />
      </section>
    </>
  );
}

function PropertyResults({
  query,
  registryQuery,
  showMap,
  onPage,
}: {
  query: string;
  registryQuery: string;
  showMap: boolean;
  onPage: (page: number) => void;
}) {
  const { t } = useLocale();
  const { detailed } = useInterfaceMode();
  const registry = useData<Page<Property>>(`/properties?${query}`);
  const { user } = useContext(Auth);
  const { selectedId, setSelectedId, remember } = useRegistryContext(
    user?.id || "",
    registryQuery,
    !!registry.data,
  );
  if (!registry.data)
    return <LoadState error={registry.error} retry={registry.reload} />;
  const data = registry.data;
  const pages = Math.max(1, Math.ceil(data.total / data.page_size));
  return (
    <div onClickCapture={remember}>
      <div className="list-caption" role="status" aria-live="polite">
        {t("Найдено объектов: ")}
        {data.total}
        <span>
          {t("На странице: ")}
          {data.items.length}
        </span>
      </div>
      {showMap && (
        <PropertyMap
          rows={data.items}
          registryQuery={registryQuery}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      )}
      {showMap && (
        <div className="registry-list-heading">
          <div>
            <p className="eyebrow">{t("СПИСОК")}</p>
            <h2>{t("Все объекты текущей страницы")}</h2>
          </div>
          <p>
            {t(
              "Объекты без координат остаются здесь. Таблица содержит статусы, подтверждённые факторы и дату проверки.",
            )}
          </p>
        </div>
      )}
      <div id="property-list" tabIndex={-1} aria-label={t("Список объектов")}>
        <div className={detailed ? undefined : "registry-desktop-table"}>
          <PropertyTable
            rows={data.items}
            registryQuery={registryQuery}
            selectedId={selectedId}
          />
        </div>
        {!detailed && (
          <div className="registry-phone-cards">
            {data.items.length ? (
              <PropertyCards rows={data.items} registryQuery={registryQuery} />
            ) : (
              <p className="empty">
                {t("Объекты по выбранным фильтрам не найдены.")}
              </p>
            )}
          </div>
        )}
      </div>
      {(pages > 1 || data.page > 1) && (
        <Pagination
          label={t("Страницы реестра")}
          page={data.page}
          pageSize={data.page_size}
          total={data.total}
          onPageChange={onPage}
          previousLabel={t("Предыдущая")}
          nextLabel={t("Следующая")}
        />
      )}
      {registry.error && <Notice error={registry.error} />}
    </div>
  );
}

function EvidenceItem({ id }: { id: string }) {
  const { t } = useLocale();
  const item = useData<Evidence>(`/evidence/${id}`);
  return item.data ? (
    <div className="evidence">
      <Demo value={item.data.is_demo} />
      <strong>{item.data.source_label}</strong>
      <p>{item.data.description}</p>
      {item.data.event_at && (
        <p>
          {t("Дата источника: ")}
          {date(item.data.event_at)}
        </p>
      )}
      {item.data.signatory_count && (
        <p>
          {t("Заявителей: ")}
          {item.data.signatory_count}
        </p>
      )}
      {item.data.construction_stage && (
        <p>
          {t("Стадия: ")}
          {t(stageLabels[item.data.construction_stage])}
        </p>
      )}
      {item.data.measurement_percent != null && (
        <p>
          {item.data.measurement_role === "DECLARED"
            ? t("Заявленная")
            : t("Проверенная")}{" "}
          {t("готовность: ")}
          {item.data.measurement_percent}%
          <br />
          {t("Область сравнения: ")}
          {item.data.comparison_key}
        </p>
      )}
      {item.data.planned_completion_at && (
        <p>
          {t("Плановое завершение: ")}
          {date(item.data.planned_completion_at)}
          <br />
          {item.data.delay_status === "NOT_COMPLETED"
            ? t("Не завершено на дату источника")
            : `${t("Фактическое завершение:")} ${date(item.data.actual_completion_at || null)}`}
        </p>
      )}
      {item.data.methodology && (
        <p>
          {t("Методика: ")}
          {item.data.methodology}
        </p>
      )}
      {item.data.absence_as_of && (
        <p>
          {t("Дата проверки отсутствия: ")}
          {date(item.data.absence_as_of)}
          <br />
          {t("Охват: ")}
          {item.data.scope_description}
        </p>
      )}
      {item.data.legal_checks?.map((check) => (
        <p key={check.mechanism}>
          {t(mechanismLabels[check.mechanism])}:{" "}
          {check.result === "DOCUMENTED_ABSENT"
            ? t("Отсутствие документировано")
            : check.result === "NOT_FOUND"
              ? t("Не найдено в выборке — недостаточно для R1")
              : check.result === "UNAVAILABLE"
                ? t("Источник недоступен")
                : t("Не проверено")}
          <br />
          {check.reason}
        </p>
      ))}
      <a className="text-link" href={`/api/v1/assets/${item.data.asset_id}`}>
        {t("Скачать исходник ")}
        <ArrowRight size={14} />
      </a>
      <PdfDownload
        kind="assets"
        id={item.data.asset_id}
        label={t("Получить источник в PDF")}
        description={t(
          "Исходный PDF скачивается без изменений; для текста или изображения создаётся PDF-копия.",
        )}
      />
      <PdfDownload kind="evidence" id={id} label={t("PDF доказательства")} />
    </div>
  ) : (
    <LoadState error={item.error} retry={item.reload} />
  );
}

function DossierProgress({
  detail,
  writable,
  openTools,
  openFactor,
  importedAdvertisementId,
}: {
  detail: PropertyDetail;
  writable: boolean;
  openTools: () => void;
  openFactor: (code: string) => void;
  importedAdvertisementId?: string;
}) {
  const { t } = useLocale();
  const row = detail.property;
  const pendingFactors = detail.factors.filter(
    (factor) => factor.status === "PENDING",
  );
  const pendingDocuments = detail.legal_bases.filter(
    (basis) => basis.verification_status === "PENDING",
  );
  const confirmedDocuments = detail.legal_bases.filter(
    (basis) => basis.verification_status === "VERIFIED_VALID",
  );
  const hasMaterials = detail.advertisement_ids.length > 0;
  const needsDecision =
    pendingFactors.length > 0 || pendingDocuments.length > 0;
  const pendingEditor = pendingFactors.find((factor) =>
    ["R1", "R3", "R4", "R5", "R6"].includes(factor.code),
  );
  return (
    <section
      className="panel padded dossier-next-action"
      aria-labelledby="dossier-progress-title"
    >
      <h2 id="dossier-progress-title">{t("Ход проверки")}</h2>
      <dl className="dossier-progress">
        <dt>{t("Что сделать дальше")}</dt>
        <dd>
          {!writable ? (
            <Link className="text-link" href="#dossier-factors">
              {t("Изучите решения и доказательства")}
            </Link>
          ) : pendingDocuments.length > 0 ? (
            <Button variant="outline" onClick={openTools}>
              {t("Проверьте ожидающие решения документы")}
            </Button>
          ) : pendingEditor ? (
            <Button
              variant="outline"
              onClick={() => openFactor(pendingEditor.code)}
            >
              {t("Проверить ")}
              {pendingEditor.code}: {t(factorLabels[pendingEditor.code])}
            </Button>
          ) : !hasMaterials && importedAdvertisementId ? (
            <Link
              className="text-link"
              href={`/review?advertisement_id=${importedAdvertisementId}`}
            >
              {t(
                "Проверьте сохранённый материал и его связь с объектом",
                "Сақталған материалды және оның нысанмен байланысын тексеріңіз",
              )}
            </Link>
          ) : !hasMaterials ? (
            <Link className="text-link" href="/advertisements/new">
              {t("Добавьте публикацию, затем подтвердите её связь с объектом")}
            </Link>
          ) : needsDecision ? (
            <Link
              className="text-link"
              href={`/advertisements?property_id=${row.id}`}
            >
              {t("Откройте связанные публикации и проверьте гипотезы")}
            </Link>
          ) : (
            <Link
              className="text-link"
              href={`/advertisements?property_id=${row.id}`}
            >
              {t("Проверьте связанные публикации и даты источников")}
            </Link>
          )}
        </dd>
        <dt>{t("Что найдено")}</dt>
        <dd>
          {t("Связанные публикации: ")}
          {detail.advertisement_ids.length}
          {t(". Документы:")} {detail.legal_bases.length}
          {t(". Их наличие ещё не означает подтверждение.")}
        </dd>
        <dt>{t("Что подтверждено")}</dt>
        <dd>
          {t("Факторы:")}{" "}
          {row.risk.confirmed_codes.length
            ? row.risk.confirmed_codes.join(", ")
            : t("пока нет")}
          {t(". Проверенные документы: ")}
          {confirmedDocuments.length}
          {t(". Оценка на")} {date(row.risk.as_of)}.
        </dd>
        <dt>{t("Чего не хватает")}</dt>
        <dd>
          {!hasMaterials && t("Нужна публикация для проверки. ")}
          {pendingDocuments.length > 0 &&
            `${t("Ожидают решения документы:")} ${pendingDocuments.length}. `}
          {pendingFactors.length > 0 &&
            `${t("Ожидают решения факторы:")} ${pendingFactors.length}. `}
          {row.risk.unknown_codes.length > 0
            ? `${t("Не установлены:")} ${row.risk.unknown_codes.join(", ")}. ${t("Неизвестность не подтверждает нарушение.")}`
            : t(
                "Все факторы имеют сохранённое решение. Даты и область документов проверяются отдельно.",
              )}
        </dd>
      </dl>
    </section>
  );
}

function revealDossierTarget(targetId: string) {
  const target = document.getElementById(targetId);
  // Native disclosures stay mounted: opening an editor must preserve files and retry state.
  for (let node = target; node; node = node.parentElement)
    if (node instanceof HTMLDetailsElement) node.open = true;
  requestAnimationFrame(() => {
    target?.focus();
    target?.scrollIntoView({ block: "start" });
  });
}

const dossierTabs = [
  { id: "overview", label: "Обзор" },
  { id: "documents", label: "Документы" },
  { id: "review", label: "Проверка и риски" },
  { id: "publications", label: "Публикации" },
  { id: "signals", label: "Сигналы и отчёты" },
  { id: "history", label: "История" },
] as const;
function dossierSectionForHash(hash: string) {
  if (hash === "dossier-summary") return "overview";
  if (/^dossier-(bases|evidence|document-)/.test(hash)) return "documents";
  if (/^dossier-(factors|materials|editor-)/.test(hash)) return "review";
  return (
    {
      "dossier-advertisements": "publications",
      "dossier-signals": "signals",
      "dossier-history": "history",
    } as Record<string, string>
  )[hash];
}

export function PropertyView({ id }: { id: string }) {
  // Visited panels and transient selections belong to one exact property.
  return <PropertyDossier key={id} id={id} />;
}

function PropertyDossier({ id }: { id: string }) {
  const { locale, t } = useLocale();
  const { user } = useContext(Auth);
  const { detailed, setDetailed } = useInterfaceMode();
  const params = useSearchParams();
  const registryQuery = new URLSearchParams(
    params.get("registry") || "",
  ).toString();
  const sections = useWorkspaceSection(dossierTabs, dossierSectionForHash);
  const [visitedSections, setVisitedSections] = useState([sections.active]);
  useEffect(() => {
    setVisitedSections((visited) =>
      visited.includes(sections.active)
        ? visited
        : [...visited, sections.active],
    );
  }, [sections.active]);
  function isSectionMounted(section: string) {
    // Deep links need their target in the first active render, before effects.
    return sections.active === section || visitedSections.includes(section);
  }
  const pendingTarget = useRef<string | null>(null);
  const [documentSearch, setDocumentSearch] = useState("");
  const [documentStatus, setDocumentStatus] = useState("");
  const [documentPage, setDocumentPage] = useState(1);
  const detailPath = `/properties/${id}`;
  const detail = useData<PropertyDetail>(detailPath);
  const provenancePath = `/properties/${id}/provenance`;
  const provenance = useData<import("@/lib/types").AuditEvent | null>(
    provenancePath,
  );
  const [evidence, setEvidence] = useState<string | null>(null);
  const setDetailedRef = useRef(setDetailed);
  setDetailedRef.current = setDetailed;
  useEffect(() => {
    const reveal = () => {
      const target = window.location.hash.slice(1);
      if (
        !/^dossier-(materials|editor-R[13456]|document-[0-9a-f-]{36})$/.test(
          target,
        )
      )
        return;
      if (dossierSectionForHash(target) !== sections.active) return;
      setDetailedRef.current(true);
      if (target.startsWith("dossier-document-")) {
        setDocumentSearch("");
        setDocumentStatus("");
        const index =
          detail.data?.legal_bases.findIndex(
            (basis) => `dossier-document-${basis.id}` === target,
          ) ?? -1;
        setDocumentPage(index < 0 ? 1 : Math.floor(index / 10) + 1);
      }
      requestAnimationFrame(() => revealDossierTarget(target));
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, [detail.data, sections.active]);
  useEffect(() => {
    if (!pendingTarget.current) return;
    const target = document.getElementById(pendingTarget.current);
    if (!target || target.closest<HTMLElement>('[role="tabpanel"]')?.hidden)
      return;
    revealDossierTarget(pendingTarget.current);
    pendingTarget.current = null;
  }, [sections.active, documentPage, documentSearch, documentStatus, evidence]);
  if (!detail.data || detail.successfulPath !== detailPath)
    return <LoadState error={detail.error} retry={detail.reload} />;
  const row = detail.data.property;
  const sourceEvent =
    provenance.successfulPath === provenancePath &&
    provenance.data?.entity_id === id &&
    provenance.data.action === "SOURCE_PACKAGE_IMPORTED"
      ? provenance.data
      : null;
  const sourceEvents = sourceEvent ? [sourceEvent] : [];
  const importedAdvertisementId = sourceEvent?.details.advertisement_id;
  const matchedDocuments = detail.data.legal_bases.filter(
    (basis) =>
      (!documentStatus || basis.verification_status === documentStatus) &&
      [basis.document_number, basis.issuer, basis.scope_description]
        .join(" ")
        .toLocaleLowerCase()
        .includes(documentSearch.toLocaleLowerCase().trim()),
  );
  const visibleDocuments = new Set(
    matchedDocuments
      .slice((documentPage - 1) * 10, documentPage * 10)
      .map((basis) => basis.id),
  );
  function openTarget(section: string, target: string) {
    pendingTarget.current = target;
    if (target.startsWith("dossier-document-")) {
      setDocumentSearch("");
      setDocumentStatus("");
      const index = detail.data!.legal_bases.findIndex(
        (basis) => `dossier-document-${basis.id}` === target,
      );
      setDocumentPage(index < 0 ? 1 : Math.floor(index / 10) + 1);
      requestAnimationFrame(() => {
        window.dispatchEvent(
          new CustomEvent("saq-open-document", {
            detail: target.slice("dossier-document-".length),
          }),
        );
      });
    }
    if (sections.active === section) {
      requestAnimationFrame(() => {
        revealDossierTarget(target);
        pendingTarget.current = null;
      });
    } else {
      sections.select(section);
    }
  }
  const groups = [
    ...detail.data.factors.map((factor) => ({
      id: factor.id,
      label: `${factor.code} · ${t(factorLabels[factor.code]) || factor.code}`,
      ids: factor.evidence_ids,
    })),
    ...detail.data.legal_bases.map((basis) => ({
      id: `basis:${basis.id}`,
      label: `${t("Основание")} · ${basis.document_number || t("Номер не указан")}`,
      ids: basis.evidence_ids,
    })),
  ];
  const selected = groups.find((group) => group.id === evidence);
  const evidenceCount = new Set(groups.flatMap((group) => group.ids)).size;
  function openEditor(code?: string) {
    setDetailed(true);
    openTarget("review", code ? `dossier-editor-${code}` : "dossier-materials");
  }
  function showEvidence(value: string | null) {
    setEvidence(value);
    if (value) openTarget("documents", "dossier-evidence");
  }
  return (
    <div className="dossier-workspace">
      {detail.error && (
        <div
          className="notice error"
          role="alert"
          data-testid="dossier-stale-warning"
        >
          <p>
            {t(
              "Не удалось обновить; показаны предыдущие данные на ",
              "Жаңарту мүмкін болмады; көрсетілген алдыңғы мәліметтер уақыты: ",
            )}
            {date(detail.readAt)}.
          </p>
          <p>{detail.error}</p>
          <Button type="button" variant="outline" onClick={detail.reload}>
            {t("Повторить загрузку досье", "Досьені қайта жүктеу")}
          </Button>
        </div>
      )}
      <div className="dossier-actionbar">
        <Link
          href={registryQuery ? `/properties?${registryQuery}` : "/properties"}
          className="back"
        >
          <ArrowLeft size={15} aria-hidden="true" />{" "}
          {t("К реестру", "Тізілімге")}
        </Link>
        <div className="dossier-report-actions">
          <ReportOptions
            propertyId={id}
            propertyName={row.name}
            language={locale}
          />
          <Button
            variant="outline"
            onClick={() => sections.select("documents")}
          >
            {t("Документы объекта", "Нысан құжаттары")}
          </Button>
        </div>
        <span className="dossier-data-date">
          {t("Проверено:", "Тексерілген:")} {date(row.last_reviewed_at)}
        </span>
      </div>
      <section
        className="dossier-header"
        aria-label={t("Карточка объекта", "Нысан карточкасы")}
      >
        <PageTitle
          eyebrow=""
          title={row.name}
          description={`${row.city} · ${row.address}`}
          action={false}
        />
        {detail.data.source_candidate_id && (
          <p className="field-help">
            {t("Создано из")}{" "}
            <Link
              href={`/monitoring?candidate_id=${detail.data.source_candidate_id}&section=candidates`}
            >
              {t("кандидата и его исходных материалов")}
            </Link>
            {t(
              ". Создание досье не подтверждает привязку публикаций или правовое основание.",
            )}
          </p>
        )}
        {!!detail.data.linked_candidate_count && (
          <p className="field-help">
            <Link href={`/monitoring?property_id=${row.id}&section=candidates`}>
              {t("Связанные кандидаты: ")}
              {detail.data.linked_candidate_count}
            </Link>
            {t(
              ". Связь кандидата не подтверждает привязку публикаций или правовое основание.",
            )}
          </p>
        )}
        <div className="object-summary">
          <Demo value={row.is_demo} />
          <span>{row.developer.name}</span>
          <span>{t(legalLabels[row.legal_verification_status])}</span>
        </div>
        <div className="dossier-compact-state">
          <PropertyRisk row={row} />
          <span>
            {row.risk.confirmed_codes.length
              ? `${t("Подтверждены:")} ${row.risk.confirmed_codes.join(", ")}`
              : t("Подтверждённых факторов пока нет")}
          </span>
          <Button
            variant="outline"
            onClick={() =>
              user?.role === "analyst"
                ? openEditor()
                : sections.select("review")
            }
          >
            {t("Открыть проверку", "Тексеруді ашу")}
          </Button>
        </div>
        <p className="field-help">
          {t(
            "Красная зона не устанавливает нарушение, зелёная не гарантирует безопасность.",
          )}
        </p>
        <PropertyStructure
          key={row.id}
          row={row}
          registryQuery={registryQuery}
        />
        <WorkspaceTabs
          tabs={dossierTabs.map((tab) => ({
            ...tab,
            label: t(
              tab.label,
              (
                {
                  overview: "Шолу",
                  documents: "Құжаттар",
                  review: "Тексеру және тәуекелдер",
                  publications: "Жарияланымдар",
                  signals: "Сигналдар мен есептер",
                  history: "Тарих",
                } as Record<string, string>
              )[tab.id],
            ),
          }))}
          active={sections.active}
          onSelect={sections.select}
          prefix="dossier"
          label={t("Разделы карточки объекта", "Нысан карточкасының бөлімдері")}
        />
      </section>
      <WorkspacePanel id="overview" active={sections.active} prefix="dossier">
        {detail.data.unknown_information.length > 0 && (
          <details className="notice dossier-unknown-information">
            <summary>
              {t("Неизвестные сведения", "Белгісіз мәліметтер")} ·{" "}
              {detail.data.unknown_information.length}
            </summary>
            <p>{detail.data.unknown_information.join(" ")}</p>
          </details>
        )}
        <section
          id="dossier-summary"
          tabIndex={-1}
          className="dossier-section"
          aria-labelledby="dossier-summary-title"
        >
          <h2 id="dossier-summary-title" className="sr-only">
            {t("Обзор", "Шолу")}
          </h2>
          <DossierOverview
            detail={detail.data}
            provenance={{
              data: sourceEvent,
              error:
                provenance.resolvedPath === provenancePath
                  ? provenance.error
                  : "",
              loaded: provenance.resolvedPath === provenancePath,
              reload: provenance.reload,
            }}
            onDocuments={() => sections.select("documents")}
            progress={
              <DossierProgress
                detail={detail.data}
                importedAdvertisementId={
                  typeof importedAdvertisementId === "string" &&
                  /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(
                    importedAdvertisementId,
                  )
                    ? importedAdvertisementId
                    : undefined
                }
                writable={user?.role === "analyst"}
                openFactor={openEditor}
                openTools={() => {
                  setDetailed(true);
                  const pending = detail.data?.legal_bases.find(
                    (basis) => basis.verification_status === "PENDING",
                  );
                  if (pending)
                    openTarget("documents", `dossier-document-${pending.id}`);
                }}
              />
            }
          />
        </section>
      </WorkspacePanel>
      <WorkspacePanel id="documents" active={sections.active} prefix="dossier">
        {isSectionMounted("documents") && (
          <>
            <section className="panel padded" id="dossier-bases" tabIndex={-1}>
              <h2>{t("Основания и документы")}</h2>
              {!detailed && user?.role === "analyst" && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setDetailed(true);
                    revealDossierTarget("dossier-bases");
                  }}
                >
                  {t("Проверить или добавить основание")}
                </Button>
              )}
              <div className="document-filters">
                <label>
                  {t("Найти документ")}
                  <input
                    type="search"
                    value={documentSearch}
                    maxLength={300}
                    onChange={(event) => {
                      setDocumentSearch(event.target.value);
                      setDocumentPage(1);
                    }}
                  />
                </label>
                <label>
                  {t("Статус документа")}
                  <select
                    aria-label={t("Статус документа")}
                    value={documentStatus}
                    onChange={(event) => {
                      setDocumentStatus(event.target.value);
                      setDocumentPage(1);
                    }}
                  >
                    <option value="">{t("Все статусы")}</option>
                    {["PENDING", "VERIFIED_VALID", "REJECTED"].map((status) => (
                      <option key={status} value={status}>
                        {t(legalLabels[status])}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="field-help" role="status">
                {t("Документов по фильтру: ")}
                {matchedDocuments.length}
              </p>
              <DossierRecords
                propertyId={id}
                kind="documents"
                detail={detail.data}
                visibleDocumentIds={visibleDocuments}
                renderDocumentReview={(basis) => (
                  <>
                    {detail.error && (
                      <Notice
                        error={`${t("Не удалось обновить; показаны предыдущие данные на ", "Жаңарту мүмкін болмады; көрсетілген алдыңғы мәліметтер уақыты: ")}${date(detail.readAt)}.`}
                      />
                    )}
                    <LegalBasisDecision
                      key={basis.id}
                      basis={basis}
                      userId={user?.id || ""}
                      onSaved={detail.reload}
                      writable={user?.role === "analyst"}
                      showControls={detailed}
                    />
                  </>
                )}
              />
              {matchedDocuments.length > 10 && (
                <Pagination
                  label={t("Страницы документов")}
                  page={documentPage}
                  pageSize={10}
                  total={matchedDocuments.length}
                  onPageChange={setDocumentPage}
                />
              )}
              {detail.data.legal_bases.length > 0 &&
                !matchedDocuments.length && (
                  <p className="empty">
                    {t("Документы по этим условиям не найдены.")}
                  </p>
                )}
              <div hidden={!detailed}>
                {user?.role === "analyst" && (
                  <LegalBasisCreate
                    key={row.id}
                    userId={user.id}
                    detail={detail.data}
                    onSaved={detail.reload}
                  />
                )}
              </div>
            </section>
            <section
              className="panel padded"
              id="dossier-evidence"
              tabIndex={-1}
              aria-labelledby="dossier-evidence-title"
            >
              <h2 id="dossier-evidence-title">{t("Доказательства")}</h2>
              <p>
                {t("Доказательства сохранённых факторов и оснований: ")}
                {evidenceCount}
                {t(
                  ". У одного материала может быть несколько связей; это не отдельные нарушения.",
                )}
              </p>
              {groups.length > 0 ? (
                <>
                  <label htmlFor="dossier-evidence-selection">
                    {t("Материалы фактора или основания")}
                  </label>
                  <select
                    id="dossier-evidence-selection"
                    value={selected?.id || ""}
                    onChange={(event) =>
                      setEvidence(event.target.value || null)
                    }
                  >
                    <option value="">
                      {t("Выберите, чьи доказательства изучить")}
                    </option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.label} · {new Set(group.ids).size}
                      </option>
                    ))}
                  </select>
                  {selected ? (
                    <div
                      className="evidence-list"
                      id={`factor-evidence-${selected.id}`}
                    >
                      <h3>{selected.label}</h3>
                      {selected.ids.length ? (
                        Array.from(new Set(selected.ids)).map((value) => (
                          <EvidenceItem key={value} id={value} />
                        ))
                      ) : (
                        <p className="empty">
                          {t("К этому решению доказательства не прикреплены.")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="muted">
                      {t(
                        "Выберите фактор или основание. Источник, дата и сохранённый исходник загружаются по запросу.",
                      )}
                    </p>
                  )}
                </>
              ) : (
                <p className="empty">
                  {t(
                    "Доказательства ещё не привязаны к факторам или основаниям.",
                  )}
                </p>
              )}
            </section>
          </>
        )}
      </WorkspacePanel>
      <WorkspacePanel id="review" active={sections.active} prefix="dossier">
        {isSectionMounted("review") && (
          <>
            <section
              className="panel"
              id="dossier-factors"
              tabIndex={-1}
              aria-labelledby="dossier-factors-title"
            >
              <div className="panel-heading">
                <div>
                  <h2 id="dossier-factors-title">
                    {t("Факторы риска и решения")}
                  </h2>
                  <p>
                    {t(
                      "Только подтверждённые факторы участвуют в серверном балле. DEMO-решения отмечены отдельно. Отсутствие данных не подтверждает нарушение.",
                    )}
                  </p>
                </div>
              </div>
              <DossierRiskStatistics detail={detail.data} />
              {Object.entries(factorLabels).map(([code, label]) => {
                const factor = detail.data!.factors.find(
                  (item) => item.code === code,
                );
                return (
                  <div
                    className={`factor-row factor-${factor?.status.toLowerCase() || "unknown"}`}
                    key={code}
                  >
                    <span className="factor-token">{code}</span>
                    <div>
                      <strong>{t(label)}</strong>
                      <small>
                        {factor?.reason ||
                          t(
                            "Сохранённого фактора нет. Нужны материалы и отдельное решение.",
                          )}
                      </small>
                      {factor && (
                        <>
                          <small>
                            {t("Дата оценки: ")}
                            {date(factor.as_of)}
                          </small>
                          <small>
                            {t("Проверивший: ", "Тексеруші: ")}
                            {factor.reviewed_by ||
                              t("Не зафиксирован", "Тіркелмеген")}
                            {" · "}
                            {t("Решение принято: ", "Шешім қабылданған күні: ")}
                            {date(factor.reviewed_at || null)}
                          </small>
                        </>
                      )}
                    </div>
                    <span className="points">
                      {factor?.status === "CONFIRMED"
                        ? `+${factor.weight}`
                        : "0"}
                      <small>
                        {factor
                          ? t(statusLabel(factor.status))
                          : t("Не зафиксирован")}
                      </small>
                    </span>
                    <div className="dossier-factor-actions">
                      {factor && (
                        <PdfDownload
                          kind="risk-factors"
                          id={factor.id}
                          label={t("PDF решения")}
                        />
                      )}
                      {factor && (
                        <Button
                          variant="outline"
                          aria-expanded={evidence === factor.id}
                          aria-controls={`factor-evidence-${factor.id}`}
                          onClick={() =>
                            showEvidence(
                              evidence === factor.id ? null : factor.id,
                            )
                          }
                        >
                          {t("Доказательства")}
                        </Button>
                      )}
                      {user?.role === "analyst" &&
                        (code === "R2" ? (
                          <Link
                            className="text-link"
                            href={`/advertisements?property_id=${row.id}`}
                          >
                            {t("Проверить у публикации")}
                          </Link>
                        ) : (
                          <a
                            className="text-link"
                            href={`#dossier-editor-${code}`}
                            onClick={(event) => {
                              event.preventDefault();
                              openEditor(code);
                            }}
                          >
                            {t("Проверить ")}
                            {code}
                          </a>
                        ))}
                    </div>
                  </div>
                );
              })}
              {!detailed && user?.role === "analyst" && (
                <div className="expert-invitation">
                  <div>
                    <h3>{t("Нужно дополнить проверку?")}</h3>
                    <p>
                      {t(
                        "Документы и решения открываются без потери введённых данных.",
                      )}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => openEditor()}>
                    {t("Открыть инструменты")}
                  </Button>
                </div>
              )}
              <div hidden={!detailed}>
                {user?.role === "analyst" && (
                  <details
                    className="dossier-tools"
                    id="dossier-materials"
                    tabIndex={-1}
                  >
                    <summary>
                      <h3>{t("Материалы и проверки")}</h3>
                      <span>{t("R1, R3–R6 · загрузка и решения")}</span>
                    </summary>
                    <p className="muted">
                      {t(
                        "Сохраните источник и область его применения. Подтверждение каждого фактора выполняется отдельно.",
                      )}
                    </p>
                    <div id="dossier-editor-R1" tabIndex={-1}>
                      {user?.role === "analyst" && (
                        <LegalAbsenceReview
                          key={row.id}
                          userId={user?.id || ""}
                          detail={detail.data}
                          onSaved={detail.reload}
                        />
                      )}
                    </div>
                    <div id="dossier-editor-R4" tabIndex={-1}>
                      {user?.role === "analyst" && (
                        <AppealReview
                          key={row.id}
                          userId={user?.id || ""}
                          detail={detail.data}
                          onSaved={detail.reload}
                        />
                      )}
                    </div>
                    {user?.role === "analyst" && (
                      <ConstructionReview
                        key={row.id}
                        userId={user?.id || ""}
                        detail={detail.data}
                        onSaved={detail.reload}
                      />
                    )}
                  </details>
                )}
              </div>
            </section>
          </>
        )}
      </WorkspacePanel>
      <WorkspacePanel
        id="publications"
        active={sections.active}
        prefix="dossier"
      >
        {isSectionMounted("publications") && (
          <>
            <section
              className="panel padded"
              id="dossier-advertisements"
              tabIndex={-1}
              aria-labelledby="dossier-advertisements-title"
            >
              <h2 id="dossier-advertisements-title">
                {t("Реклама и публикации")}
              </h2>
              <p>
                {t("Связанные публикации: ")}
                {detail.data.advertisement_ids.length}
                {t(
                  ". Оригиналы, источники, даты и отдельные решения доступны в списке публикаций объекта.",
                )}
              </p>
              <div className="dossier-actions">
                <Button asChild variant="outline">
                  <Link href={`/advertisements?property_id=${row.id}`}>
                    {t("Открыть публикации объекта")}
                  </Link>
                </Button>
                {user?.role === "analyst" && (
                  <Link className="text-link" href="/advertisements/new">
                    {t("Добавить публикацию и проверить привязку")}
                  </Link>
                )}
              </div>
              <p className="muted">
                {t(
                  "Наличие публикации не подтверждает фактор. R2 проверяется у оригинала после проверки гипотезы и привязки к объекту.",
                )}
              </p>
            </section>
            <DossierRecords
              propertyId={id}
              kind="publications"
              detail={detail.data}
              sourceEvents={sourceEvents}
            />
          </>
        )}
      </WorkspacePanel>
      <WorkspacePanel id="signals" active={sections.active} prefix="dossier">
        {isSectionMounted("signals") && (
          <>
            <section
              className="panel padded"
              id="dossier-signals"
              tabIndex={-1}
              aria-labelledby="dossier-signals-title"
            >
              <h2 id="dossier-signals-title">{t("Сигналы по объекту")}</h2>
              <p>
                {t(
                  "Сигнал сохраняет снимок проверенных материалов и решений. Изменение текущего досье не переписывает прежние версии и PDF.",
                )}
              </p>
              <div className="dossier-actions">
                <Button asChild variant="outline">
                  <Link href={`/signals?property_id=${row.id}`}>
                    {t("Открыть версии сигналов")}
                  </Link>
                </Button>
                <CreateSignalButton property={row} onChange={detail.reload} />
              </div>
              <p className="muted">
                {t(
                  "Сигнал указывает на необходимость проверки и не является обвинением или юридическим заключением.",
                )}
              </p>
            </section>
            <ObjectRecords propertyId={row.id} kind="signals" />
            <PdfDownload
              kind="properties"
              id={row.id}
              label={t("Скачать отчёт по объекту")}
            />
          </>
        )}
      </WorkspacePanel>
      <WorkspacePanel id="history" active={sections.active} prefix="dossier">
        {isSectionMounted("history") && (
          <PropertyHistory key={id} id={id} revision={row.risk.revision} />
        )}
      </WorkspacePanel>
    </div>
  );
}

function advertisementExcerpt(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > 220 ? `${text.slice(0, 220).trimEnd()}…` : text;
}

export function AdvertisementsView() {
  const { t } = useLocale();
  const params = useSearchParams();
  const router = useRouter();
  const statusFilter = useRef<HTMLSelectElement>(null);
  const query = params.toString();
  const path = `/advertisements?${query}`;
  const result = useData<Page<Advertisement>>(path);
  const data =
    result.resolvedPath === path && !result.error ? result.data : null;
  const currentError = result.resolvedPath === path ? result.error : "";
  const hasFilters = !!(
    params.get("q") ||
    params.get("is_demo") ||
    params.get("status") ||
    params.get("property_id")
  );
  function filter(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== "page") next.delete("page");
    router.replace(`/advertisements?${next}`, { scroll: false });
  }
  return (
    <>
      <PageTitle
        eyebrow={t("РЕКЛАМНЫЕ МАТЕРИАЛЫ")}
        title={t("Реклама")}
        description={t(
          "Сохранённый оригинал, происхождение и время фиксации каждой публикации.",
        )}
      />
      <section
        className="registry-list-guide advertisements-start-guide"
        aria-labelledby="advertisements-start-guide-title"
      >
        <div>
          <p className="eyebrow">{t("С ЧЕГО НАЧАТЬ")}</p>
          <h2 id="advertisements-start-guide-title">
            {t("Добавьте материал для проверки")}
          </h2>
        </div>
        <p>
          {t(
            "Добавьте текст или загрузите PNG, JPEG либо TXT. Сохраните оригинал, затем перейдите к анализу и отдельной ручной проверке.",
          )}
        </p>
      </section>
      <section className="panel advertisements-panel">
        <div className="padded">
          <MaterialSearch
            query={params.get("q") || ""}
            onSearch={(value) => filter("q", value)}
          />
        </div>
        <div className="panel-heading">
          <div>
            <h2>{t("Публикации")}</h2>
            <p>
              {data ? `${data.total} ${t("материалов")}` : t("Загрузка…")}{" "}
              {t("· Оригиналы, состояние обработки и ручная проверка")}
            </p>
          </div>
          <div className="publication-filters">
            <label htmlFor="ad-demo">{t("Режим материалов")}</label>
            <select
              id="ad-demo"
              value={params.get("is_demo") || ""}
              onChange={(event) => filter("is_demo", event.target.value)}
            >
              <option value="">{t("DEMO и реальные")}</option>
              <option value="true">{t("Только DEMO")}</option>
              <option value="false">{t("Только реальные")}</option>
            </select>
            <label htmlFor="ad-status">{t("Состояние обработки")}</label>
            <select
              id="ad-status"
              ref={statusFilter}
              value={params.get("status") || ""}
              onChange={(event) => filter("status", event.target.value)}
            >
              <option value="">{t("Все состояния")}</option>
              {[
                "NEW",
                "ANALYZING",
                "READY_FOR_REVIEW",
                "REVIEWED",
                "FAILED",
              ].map((status) => (
                <option value={status} key={status}>
                  {t(statusLabel(status))}
                </option>
              ))}
            </select>
          </div>
        </div>
        {hasFilters && (
          <div className="active-filters">
            <ListFilter size={16} aria-hidden="true" />
            {params.get("status") && (
              <span>{t(statusLabel(params.get("status")!))}</span>
            )}
            {params.get("property_id") && (
              <Link
                className="text-link"
                href={`/properties/${params.get("property_id")}`}
              >
                {t("Материалы выбранного объекта")}
              </Link>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                const next = new URLSearchParams(params);
                for (const key of [
                  "q",
                  "is_demo",
                  "status",
                  "property_id",
                  "page",
                ])
                  next.delete(key);
                router.replace(`/advertisements?${next}`, { scroll: false });
                requestAnimationFrame(() => statusFilter.current?.focus());
              }}
            >
              {t("Сбросить фильтры")}
            </Button>
          </div>
        )}
        {data ? (
          data.items.map((ad) => (
            <article className="ad-row advertisements-list" key={ad.id}>
              <Link
                className="ad-row-link"
                href={`/advertisements/${ad.id}${query ? `?${new URLSearchParams({ materials: query })}` : ""}`}
                aria-label={ad.source_label}
              >
                <div className="ad-row-content">
                  <div className="ad-meta">
                    <Demo value={ad.is_demo} />
                    <span
                      className={`material-state state-${ad.status.toLowerCase()} ad-status ad-status-${ad.status.toLowerCase()}`}
                    >
                      {t(statusLabel(ad.status))}
                    </span>
                  </div>
                  <span className="object-name">{ad.source_label}</span>
                  {ad.confirmed_property_id && (
                    <span className="ad-property">
                      {t("Связанный объект: ")}
                      {ad.confirmed_property_id.slice(0, 8)}…
                    </span>
                  )}
                  <p>
                    {advertisementExcerpt(ad.original_text) ||
                      t("Исходный файл · оригинал доступен в карточке")}
                  </p>
                  <div className="ad-dates">
                    <span className="ad-date">
                      {t("Опубликовано: ")}
                      {date(ad.published_at)}
                    </span>
                    <span className="ad-date">
                      {t("Зафиксировано: ")}
                      {date(ad.captured_at)}
                    </span>
                  </div>
                </div>
                <span className="ad-row-arrow" aria-hidden="true">
                  <ArrowRight size={18} />
                </span>
              </Link>
              <div className="ad-actions">
                <Link
                  className="text-link"
                  href={`/review?advertisement_id=${ad.id}`}
                >
                  {t("Проверить публикацию")}{" "}
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))
        ) : (
          <LoadState error={currentError} retry={result.reload} />
        )}
        {data?.total === 0 && (
          <div className="empty">
            {hasFilters
              ? t(
                  "Нет публикаций по запросу и фильтрам. Измените или сбросьте поиск и фильтры.",
                )
              : t("Публикаций пока нет. Добавьте текст или исходный файл.")}
          </div>
        )}
        {data && (data.total > data.page_size || data.page > 1) && (
          <Pagination
            label={t("Страницы публикаций")}
            page={data.page}
            pageSize={data.page_size}
            total={data.total}
            previousLabel={t("Предыдущая")}
            nextLabel={t("Следующая")}
            onPageChange={(page) => filter("page", String(page))}
          />
        )}
      </section>
    </>
  );
}

function AdvertisementAnnotation({ ad }: { ad: Advertisement }) {
  const { t } = useLocale();
  const { user } = useContext(Auth);
  const result = useData<Extraction[]>(`/advertisements/${ad.id}/extractions`);
  const extraction =
    result.resolvedPath === `/advertisements/${ad.id}/extractions`
      ? result.data?.[0]
      : null;
  if (result.error)
    return <LoadState error={result.error} retry={result.reload} />;
  if (!extraction) return null;
  const proposals = extraction.hypotheses.filter(
    (item) => item.origin === "MANUAL",
  );
  return (
    <section className="panel padded">
      <ManualAnnotation
        advertisementId={ad.id}
        sourceLabel={ad.source_label}
        extraction={extraction}
        userId={user?.id || ""}
        writable={user?.role === "analyst" && ad.status !== "ANALYZING"}
        onChange={result.reload}
      />
      {proposals.length > 0 && (
        <div
          aria-label={t("Ручные предложения", "Қолмен енгізілген ұсыныстар")}
        >
          {proposals.map((item) => (
            <article className="hypothesis" key={item.id}>
              <strong>{t(statusLabel(item.review_status))}</strong>
              <blockquote>{item.fragment.quote}</blockquote>
              <p>
                {t("Предложил: ", "Ұсынған: ")}
                {item.proposed_by?.display_name ||
                  t("Не зафиксировано", "Тіркелмеген")}{" "}
                · {date(item.proposed_at || null)}
              </p>
              <p>{item.proposal_reason}</p>
              {item.reviewed_by && (
                <p>
                  {t("Проверил: ", "Тексерген: ")}
                  {item.reviewed_by.display_name} ·{" "}
                  {date(item.reviewed_at || null)}
                </p>
              )}
              {item.review_reason && <p>{item.review_reason}</p>}
            </article>
          ))}
          <Link
            href={`/review?advertisement_id=${ad.id}`}
            className="text-link"
          >
            {t("Открыть независимую проверку", "Тәуелсіз тексеруді ашу")}
          </Link>
        </div>
      )}
    </section>
  );
}

export function AdvertisementView({ id }: { id: string }) {
  const { t } = useLocale();
  const { detailed } = useInterfaceMode();
  const params = useSearchParams();
  const materials = new URLSearchParams(
    params.get("materials") || "",
  ).toString();
  const result = useData<Advertisement>(`/advertisements/${id}`);
  if (!result.data)
    return <LoadState error={result.error} retry={result.reload} />;
  const ad = result.data;
  const importedHtml = ad.assets.some((asset) => asset.kind === "HTML");
  const importedObservation = ad.original_text?.startsWith(
    "ИМПОРТИРОВАННОЕ НАБЛЮДЕНИЕ ИЗ ФАЙЛА.",
  );
  return (
    <>
      <Link
        href={materials ? `/advertisements?${materials}` : "/advertisements"}
        className="back"
      >
        <ArrowLeft size={15} /> {t("К публикациям")}
      </Link>
      <PageTitle
        eyebrow={t("СОХРАНЁННЫЙ МАТЕРИАЛ")}
        title={ad.source_label}
        description={
          importedObservation
            ? t(
                "Пересказ из пользовательского файла. Исходная интернет-страница не получена; правовой статус и связь требуют отдельной проверки.",
                "Пайдаланушы файлындағы мазмұндама. Бастапқы интернет-бет алынбаған; құқықтық мәртебе мен байланыс бөлек тексеріледі.",
              )
            : importedHtml
              ? t(
                  "HTML-оригинал сохранён отдельно. Ниже — извлечённый текст; анализ запускается отдельно.",
                )
              : t(
                  "Оригинал сохранён без изменений. Анализ не запускается автоматически.",
                )
        }
        action={false}
      />
      <div className="advertisement-statusbar">
        <div className="object-summary">
          <Demo value={ad.is_demo} />
          <span>
            {ad.status === "NEW"
              ? t("Новый · ожидает анализа")
              : t(statusLabel(ad.status))}
          </span>
          <span className="advertisement-revision">
            {t("Версия ")}
            {ad.revision}
          </span>
        </div>
        <span className="advertisement-status-hint">
          {importedObservation
            ? t("Сохранено наблюдение из файла", "Файлдағы бақылау сақталған")
            : t("Оригинал сохранён без изменений")}
        </span>
        <Button asChild>
          <Link href={`/review?advertisement_id=${id}`}>
            {t("Открыть анализ и проверку")}
          </Link>
        </Button>
      </div>
      <section className="panel padded publication-original advertisement-detail-panel">
        <div className="advertisement-detail-heading">
          <div>
            <p className="eyebrow">{t("ИСТОЧНИК МАТЕРИАЛА")}</p>
            <h2>
              {importedObservation
                ? t("Материал из файла", "Файл материалы")
                : t("Оригинал публикации")}
            </h2>
          </div>
          <span className="advertisement-captured">
            {t("Зафиксировано: ")}
            {date(ad.captured_at)}
          </span>
        </div>
        {importedHtml &&
          ad.source_url?.startsWith("https://primeminister.kz/") && (
            <p className="notice">
              {t("Источник: Primeminister.kz ·")}{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY 4.0
              </a>
              {t(
                ". Из статьи извлечён текст, оформление удалено. Публикация не означает одобрения SAQ QURYLYS издателем.",
              )}
            </p>
          )}
        <p hidden={!detailed}>
          <Link href={`/monitoring?advertisement_id=${ad.id}`}>
            {t("Сверить объект с реестром")}
          </Link>
        </p>
        {ad.source_url === "https://www.angroups.kz/payment" &&
          ad.assets.some((asset) => asset.kind === "HTML") && (
            <p className="notice">
              {t(
                "Текст извлечён из мобильных карточек условий оплаты. Настольная версия может отличаться — сверяйте HTML-оригинал. Дата публикации, ЖК и очередь не установлены.",
                "Мәтін төлем шарттарының мобильді карточкаларынан алынған. Компьютер нұсқасы өзгеше болуы мүмкін — HTML түпнұсқасымен салыстырыңыз. Жарияланған күні, ТК мен кезек анықталмаған.",
              )}
            </p>
          )}
        {ad.original_text ? (
          <p className="original-text">{ad.original_text}</p>
        ) : (
          <p className="muted">
            {t(
              "Исходный материал — изображение. Откройте анализ, чтобы сопоставить оригинал и OCR.",
            )}
          </p>
        )}
        <dl className="advertisement-metadata">
          <dt>{t("Дата публикации")}</dt>
          <dd>
            {ad.published_at
              ? date(ad.published_at)
              : t("Дата публикации неизвестна", "Жарияланған күні белгісіз")}
          </dd>
          <dt>{t("Зафиксировано")}</dt>
          <dd>{date(ad.captured_at)}</dd>
          <dt>{t("Источник")}</dt>
          <dd>
            {ad.source_url ? (
              <a href={ad.source_url} target="_blank" rel="noreferrer">
                {ad.source_url}
              </a>
            ) : (
              ad.source_label
            )}
          </dd>
        </dl>
        {ad.assets.length > 0 && (
          <div className="advertisement-assets">
            <h3>{t("Сохранённые материалы")}</h3>
            <p className="field-help">
              {t(
                "Исходный PDF скачивается без изменений. Для текста, HTML и изображения формируется PDF-копия; оригинал доступен отдельно.",
              )}
            </p>
            {ad.assets.map((asset) => (
              <div className="asset" key={asset.id}>
                <PdfDownload
                  kind="assets"
                  id={asset.id}
                  label={t(assetPdfLabel(asset))}
                />
                <a className="text-link" href={`/api/v1/assets/${asset.id}`}>
                  {t("Скачать материал ")}
                  <ArrowRight size={14} />
                </a>
                <small>SHA-256: {asset.sha256}</small>
              </div>
            ))}
          </div>
        )}
      </section>
      {ad.status !== "NEW" && <AdvertisementAnnotation key={ad.id} ad={ad} />}
      <div className="advertisement-detail-actions">
        <p className="notice">
          {t(
            "Анализ и ручная проверка доступны в рабочем месте. Гипотезы не влияют на балл риска без отдельного решения аналитика.",
          )}
        </p>
      </div>
    </>
  );
}

export function NewAdvertisementView() {
  const { t } = useLocale();
  const { detailed } = useInterfaceMode();
  const { user } = useContext(Auth);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Advertisement | null>(null);
  const savedPanel = useRef<HTMLElement>(null);
  const formDraft = useReviewDraft(user?.id || "", "new-advertisement", {
    text: "",
    source_label: "",
    source_url: "",
    published_at: "",
    is_demo: true,
  });
  const draft = formDraft.values;
  const key = useRef<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    if (saved) savedPanel.current?.focus();
  }, [saved]);
  function update(name: keyof typeof draft, value: string | boolean) {
    formDraft.update({ [name]: value });
    key.current = null;
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    key.current ||= crypto.randomUUID();
    try {
      const value = await command<Advertisement>(
        "/advertisements",
        {
          ...draft,
          source_url: draft.source_url || null,
          published_at: draft.published_at
            ? `${draft.published_at}:00+05:00`
            : null,
        },
        key.current,
      );
      setSaved(value);
      formDraft.saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (saved)
    return (
      <>
        <PageTitle
          eyebrow={t("МАТЕРИАЛ СОХРАНЁН")}
          title={t("Публикация добавлена")}
          description={t("Оригинал и происхождение сохранены в базе данных.")}
          action={false}
        />
        <section
          className="panel padded success"
          aria-label={t("Результат сохранения публикации")}
          tabIndex={-1}
          ref={savedPanel}
        >
          <Check size={32} />
          <h2>{t("Готово к следующему этапу")}</h2>
          <p>
            {t("Зафиксировано: ")}
            {date(saved.captured_at)}
            {t(". Правовые выводы и факторы не начислялись.")}
          </p>
          <div className="success-actions">
            <Button asChild>
              <Link href={`/review?advertisement_id=${saved.id}`}>
                {t("Перейти к проверке ")}
                <ArrowRight size={16} />
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/advertisements/${saved.id}`)}
            >
              {t("Открыть публикацию")}
            </Button>
          </div>
        </section>
      </>
    );
  return (
    <>
      <Link href="/advertisements" className="back">
        <ArrowLeft size={15} /> {t("К рекламе")}
      </Link>
      <PageTitle
        eyebrow={t("СБОР МАТЕРИАЛОВ")}
        title={t("Добавить публикацию")}
        description={t(
          "Укажите происхождение материала. Неизвестную дату публикации можно оставить пустой.",
        )}
        action={false}
      />
      <section className="panel form-panel intake-advertisement-panel new-advertisement-panel">
        <div className="form-tabs">
          <strong>{t("Текст")}</strong>
          <Link href="/advertisements/upload">
            {t("Файл · PNG / JPEG / TXT")}
          </Link>
          <Link href="/advertisements/import-url">
            {t("Открытая публикация по ссылке")}
          </Link>
        </div>
        <form
          className="intake-advertisement-form new-advertisement-form"
          onSubmit={submit}
        >
          {formDraft.restored && (
            <p className="notice" role="status">
              {t(
                "Черновик публикации восстановлен для вашего пользователя. Публикация ещё не сохранена.",
              )}
            </p>
          )}
          {formDraft.storageError && (
            <p className="notice" role="status">
              {formDraft.storageError}
            </p>
          )}
          <div className="form-section-heading">
            <span className="section-index" aria-hidden="true">
              01
            </span>
            <div>
              <h2>{t("Материал и происхождение")}</h2>
              <p>
                {t("Два обязательных поля. Сохраните формулировки оригинала.")}
              </p>
            </div>
          </div>
          <div className="form-primary-fields">
            <label htmlFor="source">
              {t("Источник / описание происхождения")}
            </label>
            <input
              id="source"
              aria-describedby="source-help"
              required
              maxLength={300}
              value={draft.source_label}
              onChange={(e) => update("source_label", e.target.value)}
              placeholder={t("Например: собственный DEMO-баннер")}
            />
            <p id="source-help" className="field-help">
              {t(
                "Где и кем получен материал: собственный баннер, публичная страница или предоставленный документ.",
              )}
            </p>
            <label htmlFor="ad-text">{t("Оригинальный текст")}</label>
            <textarea
              id="ad-text"
              aria-describedby="ad-text-count"
              required
              maxLength={100000}
              rows={8}
              value={draft.text}
              onChange={(e) => update("text", e.target.value)}
              placeholder={t("Вставьте текст публикации без изменений…")}
            />
            <p id="ad-text-count" className="field-help text-count">
              {draft.text.length.toLocaleString("ru-RU")}{" "}
              {t("/ 100 000 символов")}
            </p>
          </div>
          <details
            className="optional-context form-context-panel"
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
                  {t(
                    "Необязательные сведения. Неизвестную дату оставьте пустой.",
                  )}
                </p>
              </div>
            </div>
            <div className="form-columns">
              <div>
                <label htmlFor="url">
                  {t("Ссылка на источник ")}
                  <small>{t("необязательно")}</small>
                </label>
                <input
                  id="url"
                  type="url"
                  maxLength={2048}
                  value={draft.source_url}
                  onChange={(e) => update("source_url", e.target.value)}
                  placeholder="https://…"
                />
                <p className="field-help">
                  {t(
                    "Ссылка сохраняется; автоматическая загрузка страницы пока не выполняется.",
                  )}
                </p>
              </div>
              <div>
                <label htmlFor="published">
                  {t("Дата публикации ")}
                  <small>+05:00</small>
                </label>
                <input
                  id="published"
                  type="datetime-local"
                  value={draft.published_at}
                  onChange={(e) => update("published_at", e.target.value)}
                />
                <p className="field-help">
                  {t("Время фиксации сервер запишет отдельно.")}
                </p>
              </div>
            </div>
          </details>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={draft.is_demo}
              onChange={(e) => update("is_demo", e.target.checked)}
            />
            {t("Демонстрационный материал (DEMO)")}
          </label>
          {error && <Notice error={error} />}
          <div className="form-actions">
            <Button disabled={busy} aria-busy={busy}>
              {busy ? t("Сохранение…") : t("Сохранить публикацию")}
              <ArrowRight size={16} />
            </Button>
            <span>
              {t("Черновик сохраняется для вас в этой вкладке до отправки.")}
            </span>
          </div>
        </form>
      </section>
    </>
  );
}

export function LoginView() {
  const { t } = useLocale();
  const { user, refresh } = useContext(Auth);
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await command("/auth/login", {
        username: form.get("username"),
        password: form.get("password"),
      });
      await refresh();
      router.replace("/dashboard");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <ShieldCheck size={40} />
        <p className="eyebrow">SAQ QURYLYS</p>
        <h1>{t("Проверка рекламы и документов.")}</h1>
        <p>
          {t(
            "Реклама, объект и доказательства — в одном рабочем процессе аналитика.",
          )}
        </p>
        <span>{t("DEMO · Усть-Каменогорск")}</span>
      </section>
      <section className="login-form">
        <div>
          <span className="demo-label">{t("РАБОЧЕЕ МЕСТО АНАЛИТИКА")}</span>
          <h2>{t("Вход в систему")}</h2>
          <p className="muted">
            {t("Используйте локальную учётную запись проекта.")}
          </p>
          <form onSubmit={submit}>
            <label htmlFor="username">{t("Логин")}</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              required
              maxLength={300}
            />
            <label htmlFor="password">{t("Пароль")}</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={512}
            />
            {error && <Notice error={error} />}
            <Button disabled={busy} aria-busy={busy}>
              {busy ? t("Проверка…") : t("Войти")}
              <ArrowRight size={16} />
            </Button>
          </form>
          <p className="field-help">
            {t(
              "Доступ выдан локально. Система не отправляет материалы в государственные органы.",
            )}
          </p>
        </div>
      </section>
    </main>
  );
}

export function UpcomingView({ kind }: { kind: "review" | "signals" }) {
  const { t } = useLocale();
  return (
    <>
      <PageTitle
        eyebrow={t("СЛЕДУЮЩИЙ ВЕРТИКАЛЬНЫЙ СРЕЗ")}
        title={
          kind === "review" ? t("Проверка гипотез") : t("Сигнальные карточки")
        }
        description={t("Этот модуль ещё не реализован.")}
        action={false}
      />
      <section className="panel padded">
        <h2>
          {kind === "review"
            ? t("От оригинала к подтверждённому фактору")
            : t("От подтверждённых факторов к решению")}
        </h2>
        <p className="muted">
          {kind === "review"
            ? t(
                "Здесь появятся OCR-фрагменты, кандидаты объектов и ручная проверка. Пока можно сохранить новый текст и изучить DEMO-доказательства в карточках.",
              )
            : t(
                "Здесь появятся очередь, решения человека, версии и PDF. Действующих сигнальных карточек пока нет.",
              )}
        </p>
        <Button asChild variant="outline">
          <Link href={kind === "review" ? "/advertisements" : "/properties"}>
            {t("Перейти к данным ")}
            <ArrowRight size={16} />
          </Link>
        </Button>
      </section>
    </>
  );
}
