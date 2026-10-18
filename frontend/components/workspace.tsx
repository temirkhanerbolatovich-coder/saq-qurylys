"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  ListFilter,
  Plus,
  Search,
  ShieldCheck,
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
import { ObjectRecords } from "@/components/object-records";
import { PropertyHistory } from "@/components/property-history";
import { PropertyStructure } from "@/components/property-structure";
import { clearReviewDrafts } from "@/lib/use-review-draft";
import { clearDossierFormDrafts } from "@/lib/use-dossier-form-draft";
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
  { href: "/dashboard", label: "Обзор", icon: LayoutDashboard },
  { href: "/properties", label: "Объекты", icon: Building2 },
  { href: "/advertisements", label: "Реклама", icon: FileText },
  { href: "/review", label: "Проверка", icon: ClipboardCheck },
  { href: "/signals", label: "Сигналы", icon: Siren },
];

function GlobalSearch() {
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
        <Search size={16} aria-hidden="true" /> Поиск
      </button>
      <form
        id="global-search-form"
        className="topbar-search"
        role="search"
        aria-label="Поиск объекта"
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
          Найти объект или адрес
        </label>
        <input
          ref={input}
          id="global-property-search"
          name="q"
          type="search"
          placeholder="Найти объект или адрес"
          autoComplete="off"
          maxLength={300}
        />
        <button type="submit" aria-label="Найти объект">
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

function WorkspaceContext({ pathname }: { pathname: string }) {
  let parent: { href: string; label: string } | null = null;
  let title = "";
  if (pathname.startsWith("/properties/")) {
    parent = { href: "/properties", label: "Объекты" };
    title = "Досье объекта";
  } else if (pathname.startsWith("/advertisements/")) {
    parent = { href: "/advertisements", label: "Реклама" };
    title =
      (
        {
          "/advertisements/new": "Добавить текст",
          "/advertisements/upload": "Загрузить файл",
          "/advertisements/import-url": "Импорт по ссылке",
        } as Record<string, string>
      )[pathname] || "Оригинал публикации";
  } else if (pathname.startsWith("/monitoring")) {
    parent = { href: "/review", label: "Проверка" };
    title = "Сверка находок";
  } else if (pathname.startsWith("/comparison")) {
    parent = { href: "/review?queue=actions", label: "Проверка" };
    title = "Сравнение публикаций";
  }
  return parent ? (
    <nav className="breadcrumbs" aria-label="Путь к странице">
      <Link href={parent.href}>{parent.label}</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{title}</span>
    </nav>
  ) : (
    <span>Рабочее место аналитика</span>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
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
    return <main className="boot">Подключение к рабочему месту…</main>;
  if (error)
    return (
      <main className="boot">
        <Notice error={error} />
        <Button onClick={refresh}>Повторить</Button>
      </main>
    );
  if (!user) return <main className="boot">Необходим вход…</main>;
  return (
    <InterfaceMode.Provider value={{ detailed, setDetailed }}>
      <Auth.Provider value={{ user, refresh }}>
        <div
          className={`workspace analyst-workspace ${detailed ? "detailed-view" : "simple-view"}`}
        >
          <a className="skip-link" href="#main-content">
            Перейти к содержимому
          </a>
          <aside className="sidebar">
            <Link href="/dashboard" className="brand">
              <span className="brand-symbol">
                <ShieldCheck size={25} aria-hidden="true" />
              </span>
              <span>
                SAQ <b>QURYLYS</b>
                <small>Аналитика строительства</small>
              </span>
            </Link>
            <p className="sidebar-caption">РАБОЧИЕ ЗОНЫ</p>
            <nav aria-label="Основная навигация">
              {nav.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname.startsWith(href) || (href === "/review" && checking);
                return (
                  <Link
                    key={href}
                    href={href === "/review" ? "/review?queue=actions" : href}
                    className={active ? "active" : ""}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={18} aria-hidden="true" />
                    {label}
                  </Link>
                );
              })}
            </nav>
            <button
              className="interface-toggle"
              type="button"
              aria-pressed={detailed}
              onClick={() => setDetailed(!detailed)}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              {detailed ? "Краткий вид" : "Подробный вид"}
            </button>
            <div className="user">
              <span className="avatar" aria-hidden="true">
                {user.display_name.slice(0, 1)}
              </span>
              <div>
                <strong>{user.display_name}</strong>
                <small>
                  {user.role === "analyst" ? "Аналитик" : "Просмотр"}
                </small>
              </div>
              <button
                aria-label="Выйти"
                onClick={async () => {
                  await command("/auth/logout");
                  clearReviewDrafts();
                  clearDossierFormDrafts();
                  clearRegistryContext();
                  await refresh();
                  router.replace("/login");
                }}
              >
                <LogOut size={17} aria-hidden="true" />
              </button>
            </div>
          </aside>
          <div className="main-column">
            <header className="topbar">
              <div className="topbar-context">
                <WorkspaceContext pathname={pathname} />
              </div>
              <GlobalSearch />
              <div className="topbar-meta">
                <span className="demo-label">
                  Прототип · DEMO отмечено отдельно
                </span>
              </div>
            </header>
            {checking && (
              <nav className="checking-nav" aria-label="Проверки">
                <Link
                  href="/review?queue=actions"
                  aria-current={pathname === "/review" ? "page" : undefined}
                >
                  Материалы
                </Link>
                <Link
                  href="/comparison"
                  aria-current={
                    pathname.startsWith("/comparison") ? "page" : undefined
                  }
                >
                  Сравнение публикаций
                </Link>
                <Link
                  href="/monitoring"
                  aria-current={
                    pathname.startsWith("/monitoring") ? "page" : undefined
                  }
                >
                  Сверка
                </Link>
              </nav>
            )}
            <main className="content" id="main-content" tabIndex={-1}>
              {children}
            </main>
            <footer>
              SAQ QURYLYS · Прототип · Сигнал не устанавливает факт
              правонарушения
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
  return (
    <span className={`zone ${risk.zone.toLowerCase()}`}>
      <span className="zone-dot" aria-hidden="true" />
      <strong>{risk.score}</strong> {zoneLabels[risk.zone]}
    </span>
  );
}

function PropertyRisk({ row }: { row: Property }) {
  const context = propertyRiskContext(row);
  return (
    <span className="property-risk">
      <Zone risk={row.risk} />
      {context && <span className="property-risk-context">{context}</span>}
    </span>
  );
}

export function RiskSummary({ risk }: { risk: Property["risk"] }) {
  const { detailed } = useInterfaceMode();
  return (
    <section
      className={`risk-summary ${risk.zone.toLowerCase()}`}
      aria-label="Рассчитанный приоритет проверки"
    >
      <div className="risk-summary-score">
        <span className="risk-number">
          {risk.score}
          <small> / 100</small>
        </span>
        <span className={`zone ${risk.zone.toLowerCase()}`}>
          {zoneLabels[risk.zone]} зона
        </span>
      </div>
      <div>
        <h2>Приоритет проверки</h2>
        <p>
          Подтверждённые факторы:{" "}
          <strong>{risk.confirmed_codes.join(" · ") || "нет"}</strong>
        </p>
        <p className="field-help">
          Балл рассчитан сервером. Красная зона не устанавливает нарушение;
          зелёная не гарантирует безопасность.
        </p>
      </div>
      <div className="risk-summary-meta" hidden={!detailed}>
        <span>
          Ревизия {risk.revision} · {risk.rules_version}
        </span>
        <span>Оценка на {date(risk.as_of)}</span>
      </div>
    </section>
  );
}

export function useData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal })
      .then((value) => {
        setData(value);
        setError("");
        setResolvedPath(path);
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
  return error ? (
    <>
      <Notice error={error} />
      <Button type="button" variant="outline" onClick={retry}>
        Повторить загрузку
      </Button>
    </>
  ) : (
    <p className="loading" role="status">
      Загрузка данных…
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
  const { user } = useContext(Auth);
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="subtitle">{description}</p>
      </div>
      {action && user?.role === "analyst" && (
        <Button asChild>
          <Link href="/advertisements/new">
            <Plus size={16} />
            Добавить публикацию
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
  if (!rows.length)
    return (
      <div className="empty">Объекты по выбранным фильтрам не найдены.</div>
    );
  return (
    <TableRegion label="Реестр объектов — таблица с горизонтальной прокруткой">
      <table>
        <thead>
          <tr>
            <th scope="col">Объект / очередь</th>
            <th scope="col">Правовое основание</th>
            <th scope="col">Приоритет проверки</th>
            <th scope="col">Подтверждённые причины</th>
            <th scope="col">Последняя проверка</th>
            <th scope="col">
              <span className="sr-only">Открыть</span>
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
                  <small className="selected-row-label">Выбран на карте</small>
                )}
              </td>
              <td>
                <span
                  className={`legal ${row.legal_verification_status.toLowerCase()}`}
                >
                  {legalLabels[row.legal_verification_status]}
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
                          <b>{code}</b> · {factorLabels[code] || code}
                        </span>
                      ))
                    : "Нет подтверждённых"}
                </span>
              </td>
              <td className="date-cell">{date(row.last_reviewed_at)}</td>
              <td>
                <Link
                  aria-label={`Открыть ${row.name}`}
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
  return (
    <div className="property-cards">
      {rows.map((row, index) => (
        <article className="property-card" key={row.id}>
          <div className="property-card-top">
            <span className="catalog-number" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
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
          </div>
          <div className="property-card-state">
            <PropertyRisk row={row} />
            {!propertyRiskContext(row) && (
              <span>{legalLabels[row.legal_verification_status]}</span>
            )}
          </div>
          <p className="property-card-reason">
            <strong>{propertyNextAction(row).label}. </strong>
            {row.risk.confirmed_codes.length
              ? row.risk.confirmed_codes
                  .map((code) => factorLabels[code] || code)
                  .join(" · ")
              : "Подтверждённых факторов нет. Полнота данных требует проверки."}
          </p>
          <div className="property-card-footer">
            <span>Проверено: {date(row.last_reviewed_at)}</span>
            <Link
              href={propertyDossierUrl(row.id, registryQuery)}
              aria-label={`Открыть ${row.name}`}
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
  const { user } = useContext(Auth);
  return (
    <>
      <PageTitle
        eyebrow="РАБОЧЕЕ ПРОСТРАНСТВО"
        title="Рабочий обзор"
        description="Продолжите проверку материалов, разберите ошибки или откройте сохранённые сигналы."
      />
      <div className="overview-links">
        <Link className="text-link" href="/properties">
          Найти объект <ArrowRight size={15} aria-hidden="true" />
        </Link>
        {user?.role === "viewer" && (
          <Link className="text-link" href="/advertisements">
            Открыть публикации
          </Link>
        )}
      </div>
    </>
  );
}

function DashboardQueues({
  summary,
}: {
  summary: ReturnType<typeof useData<Dashboard>>;
}) {
  const unresolved = useData<AdvertisementReviewPage>(
    "/advertisements/review-queue?page_size=1",
  );
  const failed = useData<Page<Advertisement>>(
    "/advertisements?status=FAILED&page_size=1",
  );
  const queues = [
    {
      title: "Новые публикации",
      count: summary.data?.new_advertisements,
      resource: summary,
      note: "Сохранены и ожидают анализа. Подтверждения выполняются отдельно.",
      href: "/advertisements?status=NEW",
      action: "Открыть новые материалы",
    },
    {
      title: "Материалы с нерешёнными действиями",
      count: unresolved.data?.total,
      resource: unresolved,
      note: "Точное число материалов, где осталось проверить гипотезы, привязку, доказательство оплаты или R2. Один материал учитывается один раз.",
      href: "/review?queue=actions",
      action: "Открыть очередь решений",
    },
    {
      title: "Ошибки обработки",
      count: failed.data?.total,
      resource: failed,
      note: "Проверьте оригинал и причину ошибки перед явным повтором анализа.",
      href: "/review?status=FAILED",
      action: "Открыть ошибки",
    },
    {
      title: "Сигналы без решения",
      count: summary.data?.pending_signals,
      resource: summary,
      note: "Сохранённые снимки ожидают отдельного решения аналитика.",
      href: "/signals?state=DRAFT",
      action: "Рассмотреть сигналы",
    },
  ];
  return (
    <div className="action-queues" role="group" aria-label="Следующие действия">
      {queues.map((queue) => (
        <section className="panel action-queue" key={queue.href}>
          <h2>{queue.title}</h2>
          <p className="rail-number">
            {queue.resource.error ? "—" : (queue.count ?? "—")}
          </p>
          <details className="queue-explanation">
            <summary>Что учитывается</summary>
            <p className="muted">{queue.note}</p>
          </details>
          {queue.resource.error ? (
            <LoadState
              error={queue.resource.error}
              retry={queue.resource.reload}
            />
          ) : queue.count === undefined ? (
            <p className="loading" role="status">
              Загрузка количества…
            </p>
          ) : null}
          <Link className="text-link" href={queue.href}>
            {queue.action} <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      ))}
    </div>
  );
}

function SimpleDashboard({
  registry,
  rows,
}: {
  registry: ReturnType<typeof useData<Page<Property>>>;
  rows: Property[];
}) {
  return (
    <div className="simple-home">
      <section className="home-collection" aria-labelledby="home-objects">
        <div className="collection-heading">
          <div>
            <p className="eyebrow">ОБЪЕКТЫ</p>
            <h2 id="home-objects">Требуют внимания</h2>
          </div>
          <Link className="text-link" href="/properties">
            Все объекты <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
        {registry.error || !registry.data ? (
          <LoadState error={registry.error} retry={registry.reload} />
        ) : (
          <>
            {rows.length ? (
              <PropertyCards rows={rows.slice(0, 3)} />
            ) : (
              <p className="empty">Объектов пока нет.</p>
            )}
            <p className="collection-note">
              Показано {Math.min(rows.length, 3)} из {registry.data.total}{" "}
              объектов по приоритету проверки по всему доступному реестру. Балл
              не является правовым заключением. Сначала ожидающее решение, затем
              неизвестное основание; внутри группы — отсутствие даты, более
              давняя проверка и балл. Сроки задач не установлены.
            </p>
          </>
        )}
      </section>
    </div>
  );
}

function DashboardPublicationOverview() {
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
    label: statusLabel(status),
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
    { label: "Сайты и ссылки", value: sources.site, tone: "blue" },
    { label: "Текстовые материалы", value: sources.text, tone: "green" },
    { label: "Изображения", value: sources.image, tone: "yellow" },
    { label: "DEMO-материалы", value: sources.demo, tone: "neutral" },
  ];
  return (
    <div className="dashboard-publication-overview">
      {[
        {
          title: "Статус публикаций",
          eyebrow: "СОСТОЯНИЕ ОБРАБОТКИ",
          className: "publication-status-card",
          items: statusRows,
          help: "Готовность обработки не означает завершения решений аналитика. Точные оставшиеся действия — в очереди проверки.",
        },
        {
          title: "Материалы по источникам",
          eyebrow: "ИСТОЧНИКИ",
          className: "source-distribution-card",
          items: sourceRows,
          help: "Каждый материал учтён один раз: DEMO, затем изображение, сайт или текст. Тип источника не подтверждает его достоверность.",
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
              Открыть <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          {data ? (
            <>
              <p className="analytics-caption">
                Показано {rows.length} из {data.total} публикаций.
                {data.total > rows.length
                  ? " Распределение только по первым 100 материалам, не по всему реестру."
                  : " Распределение по сохранённым материалам."}
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
                <p className="empty">Сохранённых публикаций пока нет.</p>
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
        { label: "Красная зона", value: summary.data.zones.RED, tone: "red" },
        {
          label: "Жёлтая зона",
          value: summary.data.zones.YELLOW,
          tone: "yellow",
        },
        {
          label: "Зелёная зона",
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
        <SimpleDashboard registry={registry} rows={priorityRows} />
        <DashboardPublicationOverview />
      </>
    );
  return (
    <>
      <DashboardHeading />
      <DashboardQueues summary={summary} />
      <div className="context-line">
        <span className="live-dot" /> Сведения реестра <span>·</span>{" "}
        {summary.data
          ? `Обновлено ${date(summary.data.calculated_at)}`
          : "Подключение…"}
      </div>
      {summary.error && <Notice error={summary.error} />}
      <section className="metrics" aria-label="Ключевые показатели">
        {[
          [
            "Объектов в реестре",
            summary.data?.property_count,
            "ЖК, очереди и корпуса",
            "neutral",
            "/properties",
          ],
          [
            "Приоритетная проверка",
            summary.data?.zones.RED,
            "Красная зона · подтверждены R1 + R2",
            "red",
            "/properties?zone=RED",
          ],
          [
            "Сигналов",
            signals.error ? undefined : signals.data?.total,
            "Сохранённые версии и решения",
            "green",
            "/signals",
          ],
          [
            "Основание не проверено",
            summary.data?.unknown_legal_bases,
            "Неизвестность не даёт R1",
            "neutral",
            "/properties",
          ],
        ].map(([label, count, note, style, href]) => (
          <Link className={`metric ${style}`} href={String(href)} key={label}>
            <p>{label}</p>
            <strong>{count ?? "—"}</strong>
            <small>{note}</small>
            <span className="metric-action" aria-hidden="true">
              Открыть <ArrowRight size={14} />
            </span>
          </Link>
        ))}
      </section>
      <div className="dashboard-analytics">
        <section className="panel analytics-card risk-distribution">
          <div className="analytics-heading">
            <div>
              <p className="eyebrow">СТРУКТУРА РЕЕСТРА</p>
              <h2>Распределение по приоритету</h2>
            </div>
            <Link className="text-link" href="/properties">
              Реестр <ArrowRight size={14} />
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
              <p className="eyebrow">СТАТУСЫ ОСНОВАНИЯ</p>
              <h2>Решения по основаниям</h2>
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
                  <small>из {riskTotal}</small>
                </span>
              </div>
              <dl className="verification-legend">
                <div>
                  <dt>Решение зафиксировано</dt>
                  <dd>{reviewedLegal}</dd>
                </div>
                <div>
                  <dt>Не проверено или на проверке</dt>
                  <dd>{summary.data.unknown_legal_bases}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <LoadState error={summary.error} retry={summary.reload} />
          )}
          <p className="field-help">
            Решение включает подтверждение, установленное отсутствие или
            отклонение. Это не число действующих правовых оснований.
          </p>
        </section>
        <section className="panel analytics-card history-card">
          <div className="analytics-heading">
            <div>
              <p className="eyebrow">ДИНАМИКА</p>
              <h2>Сигналы во времени</h2>
            </div>
          </div>
          <div className="insufficient-data">
            <Siren size={24} aria-hidden="true" />
            <strong>Недостаточно данных</strong>
            <p>
              Для сопоставимого временного ряда пока недостаточно данных.
              Сохранённые версии и решения доступны в разделе «Сигналы».
            </p>
            {signals.error ? (
              <LoadState error={signals.error} retry={signals.reload} />
            ) : signals.data ? (
              <span>Всего сигналов: {signals.data.total}</span>
            ) : (
              <p role="status">Загрузка количества сигналов…</p>
            )}
          </div>
        </section>
      </div>
      <DashboardPublicationOverview />
      <div className="dashboard-workspace">
        <section className="panel priority-panel">
          <div className="panel-heading">
            <div>
              <h2>С чего начать проверку</h2>
              <p>
                Сначала решение по основанию, затем недостающие сведения. Внутри
                группы — отсутствие даты, более давняя проверка, затем балл.
                Сроки задач не установлены.
              </p>
            </div>
            <Link className="text-link" href="/properties">
              Весь реестр <ArrowRight size={15} />
            </Link>
          </div>
          {registry.data && !registry.error ? (
            <>
              <ol className="priority-list">
                {priorityRows.map((row, index) => (
                  <li key={row.id}>
                    <span className="priority-order" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
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
                                  `${code} · ${factorLabels[code] || code}`,
                              )
                              .join("; ")
                          : "Подтверждённых факторов нет. Проверьте полноту материалов."}
                      </p>
                    </div>
                    <div className="priority-action">
                      <PropertyRisk row={row} />
                      <p className="field-help">
                        {propertyNextAction(row).label}
                      </p>
                      <Link
                        className="text-link"
                        href={`/properties/${row.id}`}
                      >
                        Открыть досье{" "}
                        <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </li>
                ))}
              </ol>
              {!priorityRows.length && (
                <p className="empty">В реестре пока нет объектов.</p>
              )}
              <p className="queue-scope">
                Показано {priorityRows.length} из {registry.data.total}{" "}
                объектов. Порядок рассчитан по всему доступному реестру:
                необходимое действие и давность проверки; балл используется при
                равенстве.
              </p>
            </>
          ) : (
            <LoadState error={registry.error} retry={registry.reload} />
          )}
        </section>
        <aside className="dashboard-rail" aria-label="Продолжить работу">
          <nav
            className="workflow-links"
            aria-label="Основные рабочие сценарии"
          >
            <Link href="/review?queue=actions">
              <span>
                01 · Проверить факты <ArrowRight size={15} aria-hidden="true" />
              </span>
              <small>Оригинал, гипотезы и точная очередь</small>
            </Link>
            <Link href="/signals">
              <span>
                02 · Сигналы и PDF <ArrowRight size={15} aria-hidden="true" />
              </span>
              <small>Сохранённые версии и решения</small>
            </Link>
            <Link href="/properties?view=map" aria-label="Открыть карту">
              <span>
                03 · Открыть карту <MapPin size={15} aria-hidden="true" />
              </span>
              <small>Расположение объектов реестра</small>
            </Link>
          </nav>
          <p className="rail-note">
            <ShieldCheck size={18} aria-hidden="true" />
            Гипотеза помогает найти факт. Окончательное решение принимает
            аналитик.
          </p>
        </aside>
      </div>
    </>
  );
}

export function PropertiesView() {
  const params = useSearchParams();
  const router = useRouter();
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
      for (const key of ["q", "city"] as const) {
        if (text[key]) next.set(key, text[key]);
        else next.delete(key);
      }
      next.delete("page");
      router.replace(`/properties?${next}`, { scroll: false });
    }, 350);
    return () => clearTimeout(timer);
  }, [text, textSource, paramsText, router]);
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
    const next = new URLSearchParams(params);
    for (const name of ["q", "city", "zone", "legal_status", "page"])
      next.delete(name);
    router.replace(`/properties?${next.toString()}`, { scroll: false });
    requestAnimationFrame(() => searchInput.current?.focus());
  }
  function filter(name: string, value: string) {
    const next = new URLSearchParams(params);
    for (const key of ["q", "city"] as const) {
      if (text[key]) next.set(key, text[key]);
      else next.delete(key);
    }
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== "page" && name !== "view") next.delete("page");
    router.replace(`/properties?${next.toString()}`, { scroll: false });
  }
  return (
    <>
      <PageTitle
        eyebrow="РЕЕСТР СТРОИТЕЛЬСТВА"
        title={showMap ? "Карта объектов" : "Объекты"}
        description={
          showMap
            ? "Найдите объект, сравните приоритет проверки и откройте его досье."
            : "Каждая очередь и корпус проверяются по своим документам и датам."
        }
        action={!showMap}
      />
      <section className="panel registry-panel">
        <div className="filters">
          <div className="search">
            <Search size={17} aria-hidden="true" />
            <label className="sr-only" htmlFor="search">
              Поиск ЖК или адреса, застройщика или БИН
            </label>
            <input
              id="search"
              ref={searchInput}
              type="search"
              maxLength={300}
              placeholder="ЖК, адрес, застройщик или БИН"
              value={text.q}
              onChange={(event) => setText({ ...text, q: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") filter("q", text.q);
              }}
            />
          </div>
          <label>
            Город · точное название
            <input
              aria-label="Фильтр по городу"
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
            Зона
            <select
              aria-label="Фильтр по зоне"
              value={params.get("zone") || ""}
              onChange={(e) => filter("zone", e.target.value)}
            >
              <option value="">Все зоны</option>
              <option value="RED">Красная</option>
              <option value="YELLOW">Жёлтая</option>
              <option value="GREEN">Зелёная</option>
            </select>
          </label>
          <label>
            Основание
            <select
              aria-label="Фильтр по основанию"
              value={params.get("legal_status") || ""}
              onChange={(e) => filter("legal_status", e.target.value)}
            >
              <option value="">Все статусы</option>
              {Object.entries(legalLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="registry-views" role="group" aria-label="Вид реестра">
          <Button
            variant="outline"
            aria-pressed={!showMap}
            onClick={() => filter("view", "")}
          >
            Список
          </Button>
          <Button
            variant="outline"
            aria-pressed={showMap}
            onClick={() => filter("view", "map")}
          >
            Карта и список
          </Button>
          {hasFilters && (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              Сбросить фильтры
            </Button>
          )}
        </div>
        {hasFilters && (
          <div className="active-filters" aria-label="Активные фильтры">
            <ListFilter size={16} aria-hidden="true" />
            {params.get("q") && <span>Поиск: {params.get("q")}</span>}
            {params.get("city") && <span>Город: {params.get("city")}</span>}
            {params.get("zone") && (
              <span>
                Зона:{" "}
                {zoneLabels[params.get("zone") as keyof typeof zoneLabels] ||
                  params.get("zone")}
              </span>
            )}
            {params.get("legal_status") && (
              <span>
                Основание:{" "}
                {legalLabels[params.get("legal_status")!] ||
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
        Найдено объектов: {data.total}
        <span>На странице: {data.items.length}</span>
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
            <p className="eyebrow">СПИСОК</p>
            <h2>Все объекты текущей страницы</h2>
          </div>
          <p>
            Объекты без координат остаются здесь. Таблица содержит статусы,
            подтверждённые факторы и дату проверки.
          </p>
        </div>
      )}
      <div id="property-list" tabIndex={-1} aria-label="Список объектов">
        {detailed ? (
          <PropertyTable
            rows={data.items}
            registryQuery={registryQuery}
            selectedId={selectedId}
          />
        ) : data.items.length ? (
          <PropertyCards rows={data.items} registryQuery={registryQuery} />
        ) : (
          <p className="empty">Объекты по выбранным фильтрам не найдены.</p>
        )}
      </div>
      {(pages > 1 || data.page > 1) && (
        <Pagination
          label="Страницы реестра"
          page={data.page}
          pageSize={data.page_size}
          total={data.total}
          onPageChange={onPage}
          previousLabel="Предыдущая"
          nextLabel="Следующая"
        />
      )}
      {registry.error && <Notice error={registry.error} />}
    </div>
  );
}

function EvidenceItem({ id }: { id: string }) {
  const item = useData<Evidence>(`/evidence/${id}`);
  return item.data ? (
    <div className="evidence">
      <Demo value={item.data.is_demo} />
      <strong>{item.data.source_label}</strong>
      <p>{item.data.description}</p>
      {item.data.event_at && <p>Дата источника: {date(item.data.event_at)}</p>}
      {item.data.signatory_count && (
        <p>Заявителей: {item.data.signatory_count}</p>
      )}
      {item.data.construction_stage && (
        <p>Стадия: {stageLabels[item.data.construction_stage]}</p>
      )}
      {item.data.measurement_percent != null && (
        <p>
          {item.data.measurement_role === "DECLARED"
            ? "Заявленная"
            : "Проверенная"}{" "}
          готовность: {item.data.measurement_percent}%
          <br />
          Область сравнения: {item.data.comparison_key}
        </p>
      )}
      {item.data.planned_completion_at && (
        <p>
          Плановое завершение: {date(item.data.planned_completion_at)}
          <br />
          {item.data.delay_status === "NOT_COMPLETED"
            ? "Не завершено на дату источника"
            : `Фактическое завершение: ${date(item.data.actual_completion_at || null)}`}
        </p>
      )}
      {item.data.methodology && <p>Методика: {item.data.methodology}</p>}
      {item.data.absence_as_of && (
        <p>
          Дата проверки отсутствия: {date(item.data.absence_as_of)}
          <br />
          Охват: {item.data.scope_description}
        </p>
      )}
      {item.data.legal_checks?.map((check) => (
        <p key={check.mechanism}>
          {mechanismLabels[check.mechanism]}:{" "}
          {check.result === "DOCUMENTED_ABSENT"
            ? "Отсутствие документировано"
            : check.result === "NOT_FOUND"
              ? "Не найдено в выборке — недостаточно для R1"
              : check.result === "UNAVAILABLE"
                ? "Источник недоступен"
                : "Не проверено"}
          <br />
          {check.reason}
        </p>
      ))}
      <a className="text-link" href={`/api/v1/assets/${item.data.asset_id}`}>
        Скачать исходник <ArrowRight size={14} />
      </a>
      <PdfDownload
        kind="assets"
        id={item.data.asset_id}
        label="Источник в PDF"
      />
      <PdfDownload kind="evidence" id={id} label="PDF доказательства" />
    </div>
  ) : (
    <LoadState error={item.error} retry={item.reload} />
  );
}

function DossierProgress({
  detail,
  writable,
  openTools,
}: {
  detail: PropertyDetail;
  writable: boolean;
  openTools: () => void;
}) {
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
  return (
    <section className="panel padded" aria-labelledby="dossier-progress-title">
      <h2 id="dossier-progress-title">Ход проверки</h2>
      <dl className="dossier-progress">
        <dt>Что найдено</dt>
        <dd>
          Связанные публикации: {detail.advertisement_ids.length}. Документы:{" "}
          {detail.legal_bases.length}. Их наличие ещё не означает подтверждение.
        </dd>
        <dt>Что подтверждено</dt>
        <dd>
          Факторы:{" "}
          {row.risk.confirmed_codes.length
            ? row.risk.confirmed_codes.join(", ")
            : "пока нет"}
          . Проверенные документы: {confirmedDocuments.length}. Оценка на{" "}
          {date(row.risk.as_of)}.
        </dd>
        <dt>Чего не хватает</dt>
        <dd>
          {!hasMaterials && "Нужна публикация для проверки. "}
          {pendingDocuments.length > 0 &&
            `Ожидают решения документы: ${pendingDocuments.length}. `}
          {pendingFactors.length > 0 &&
            `Ожидают решения факторы: ${pendingFactors.length}. `}
          {row.risk.unknown_codes.length > 0
            ? `Не установлены: ${row.risk.unknown_codes.join(", ")}. Неизвестность не подтверждает нарушение.`
            : "Все факторы имеют сохранённое решение. Даты и область документов проверяются отдельно."}
        </dd>
        <dt>Что сделать дальше</dt>
        <dd>
          {!writable ? (
            <Link className="text-link" href="#dossier-factors">
              Изучите решения и доказательства
            </Link>
          ) : !hasMaterials ? (
            <Link className="text-link" href="/advertisements/new">
              Добавьте публикацию, затем подтвердите её связь с объектом
            </Link>
          ) : pendingDocuments.length > 0 ? (
            <Button variant="outline" onClick={openTools}>
              Проверьте ожидающие решения документы
            </Button>
          ) : needsDecision ? (
            <Link
              className="text-link"
              href={`/advertisements?property_id=${row.id}`}
            >
              Откройте связанные публикации и проверьте гипотезы
            </Link>
          ) : (
            <Link
              className="text-link"
              href={`/advertisements?property_id=${row.id}`}
            >
              Проверьте связанные публикации и даты источников
            </Link>
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
  const { user } = useContext(Auth);
  const { detailed, setDetailed } = useInterfaceMode();
  const params = useSearchParams();
  const registryQuery = new URLSearchParams(
    params.get("registry") || "",
  ).toString();
  const sections = useWorkspaceSection(dossierTabs, dossierSectionForHash);
  const pendingTarget = useRef<string | null>(null);
  const [documentSearch, setDocumentSearch] = useState("");
  const [documentStatus, setDocumentStatus] = useState("");
  const [documentPage, setDocumentPage] = useState(1);
  const detail = useData<PropertyDetail>(`/properties/${id}`);
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
  if (!detail.data)
    return <LoadState error={detail.error} retry={detail.reload} />;
  const row = detail.data.property;
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
      label: `${factor.code} · ${factorLabels[factor.code] || factor.code}`,
      ids: factor.evidence_ids,
    })),
    ...detail.data.legal_bases.map((basis) => ({
      id: `basis:${basis.id}`,
      label: `Основание · ${basis.document_number || "Номер не указан"}`,
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
      <Link
        href={registryQuery ? `/properties?${registryQuery}` : "/properties"}
        className="back"
      >
        <ArrowLeft size={15} /> К реестру
      </Link>
      <PageTitle
        eyebrow="КАРТОЧКА ОБЪЕКТА"
        title={row.name}
        description={`${row.city} · ${row.address}`}
        action={false}
      />
      <div className="object-summary">
        <Demo value={row.is_demo} />
        <span>{row.developer.name}</span>
        <span>{legalLabels[row.legal_verification_status]}</span>
      </div>
      <div className="dossier-compact-state">
        <PropertyRisk row={row} />
        <span>
          {row.risk.confirmed_codes.length
            ? `Подтверждены: ${row.risk.confirmed_codes.join(", ")}`
            : "Подтверждённых факторов пока нет"}
        </span>
        <Button
          variant="outline"
          onClick={() =>
            user?.role === "analyst" ? openEditor() : sections.select("review")
          }
        >
          Открыть проверку
        </Button>
      </div>
      <p className="field-help">
        Красная зона не устанавливает нарушение, зелёная не гарантирует
        безопасность.
      </p>
      <PropertyStructure key={row.id} row={row} registryQuery={registryQuery} />
      <WorkspaceTabs
        tabs={dossierTabs}
        active={sections.active}
        onSelect={sections.select}
        prefix="dossier"
        label="Разделы карточки объекта"
      />
      <WorkspacePanel id="overview" active={sections.active} prefix="dossier">
        {detail.data.unknown_information.length > 0 && (
          <div className="notice">
            {detail.data.unknown_information.join(" ")}
          </div>
        )}
        <section
          id="dossier-summary"
          tabIndex={-1}
          className="dossier-section"
          aria-labelledby="dossier-summary-title"
        >
          <h2 id="dossier-summary-title">Обзор</h2>
          <div className="detail-grid dossier-overview">
            <section className="panel padded">
              <h2>Сведения об объекте</h2>
              <dl>
                <dt>БИН</dt>
                <dd>{row.developer.bin || "Не указан · DEMO"}</dd>
                <dt>Стадия</dt>
                <dd>{stageLabels[row.stage] || "Не проверена"}</dd>
                <dt>Готовность</dt>
                <dd>
                  {row.progress_percent === null
                    ? "Не проверена"
                    : `${row.progress_percent}% · DEMO`}
                </dd>
                <dt>Правовой статус</dt>
                <dd>{legalLabels[row.legal_verification_status]}</dd>
                <dt>Проверено</dt>
                <dd>{date(row.last_reviewed_at)}</dd>
                {row.legal_absence_as_of && (
                  <>
                    <dt>Отсутствие документировано на дату</dt>
                    <dd>{date(row.legal_absence_as_of)} · решение R1</dd>
                  </>
                )}
              </dl>
              <Link
                className="text-link"
                href={`/advertisements?property_id=${row.id}`}
              >
                Связанные публикации: {detail.data.advertisement_ids.length}{" "}
                <ArrowRight size={14} />
              </Link>
            </section>
            <DossierProgress
              detail={detail.data}
              writable={user?.role === "analyst"}
              openTools={() => {
                setDetailed(true);
                const pending = detail.data?.legal_bases.find(
                  (basis) => basis.verification_status === "PENDING",
                );
                if (pending)
                  openTarget("documents", `dossier-document-${pending.id}`);
              }}
            />
          </div>
        </section>
      </WorkspacePanel>
      <WorkspacePanel id="documents" active={sections.active} prefix="dossier">
        <section className="panel padded" id="dossier-bases" tabIndex={-1}>
          <h2>Основания и документы</h2>
          {!detailed && user?.role === "analyst" && (
            <Button
              variant="outline"
              onClick={() => {
                setDetailed(true);
                revealDossierTarget("dossier-bases");
              }}
            >
              Проверить или добавить основание
            </Button>
          )}
          <div className="document-filters">
            <label>
              Найти документ
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
              Статус документа
              <select
                aria-label="Статус документа"
                value={documentStatus}
                onChange={(event) => {
                  setDocumentStatus(event.target.value);
                  setDocumentPage(1);
                }}
              >
                <option value="">Все статусы</option>
                {["PENDING", "VERIFIED_VALID", "REJECTED"].map((status) => (
                  <option key={status} value={status}>
                    {legalLabels[status]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="field-help" role="status">
            Документов по фильтру: {matchedDocuments.length}
          </p>
          {detail.data.legal_bases.length ? (
            detail.data.legal_bases.map((basis) => (
              <details
                className="document dossier-document"
                hidden={!visibleDocuments.has(basis.id)}
                key={basis.id}
                id={`dossier-document-${basis.id}`}
                tabIndex={-1}
              >
                <summary>
                  <Demo value={basis.is_demo} />
                  <h3>
                    {basis.document_number || "Номер не указан"} ·{" "}
                    {basis.document_date || "Дата не установлена"}
                  </h3>
                  <span>
                    {mechanismLabels[basis.mechanism] || basis.mechanism} ·{" "}
                    {legalLabels[basis.verification_status] ||
                      basis.verification_status}
                  </span>
                  <span>Охват: {basis.scope_description}</span>
                  <span>
                    Период: {date(basis.applies_from)} —{" "}
                    {date(basis.applies_until)}
                  </span>
                </summary>
                <p>Источник: {basis.issuer}</p>
                <PdfDownload
                  kind="assets"
                  id={basis.asset_id}
                  label="Скачать документ в PDF"
                />
                <PdfDownload
                  kind="legal-bases"
                  id={basis.id}
                  label="PDF проверки документа"
                />
                <LegalBasisDecision
                  key={`${basis.id}:${basis.revision}`}
                  basis={basis}
                  userId={user?.id || ""}
                  onSaved={detail.reload}
                  writable={user?.role === "analyst"}
                  showControls={detailed}
                />
                <a
                  className="text-link"
                  href={`/api/v1/assets/${basis.asset_id}`}
                >
                  Открыть сохранённый материал <ArrowRight size={14} />
                </a>
              </details>
            ))
          ) : (
            <p className="muted">
              Документы об основании в карточку не добавлены. Это само по себе
              не подтверждает его отсутствие.
            </p>
          )}
          {matchedDocuments.length > 10 && (
            <Pagination
              label="Страницы документов"
              page={documentPage}
              pageSize={10}
              total={matchedDocuments.length}
              onPageChange={setDocumentPage}
            />
          )}
          {detail.data.legal_bases.length > 0 && !matchedDocuments.length && (
            <p className="empty">Документы по этим условиям не найдены.</p>
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
          <h2 id="dossier-evidence-title">Доказательства</h2>
          <p>
            Доказательства сохранённых факторов и оснований: {evidenceCount}. У
            одного материала может быть несколько связей; это не отдельные
            нарушения.
          </p>
          {groups.length > 0 ? (
            <>
              <label htmlFor="dossier-evidence-selection">
                Материалы фактора или основания
              </label>
              <select
                id="dossier-evidence-selection"
                value={selected?.id || ""}
                onChange={(event) => setEvidence(event.target.value || null)}
              >
                <option value="">Выберите, чьи доказательства изучить</option>
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
                      К этому решению доказательства не прикреплены.
                    </p>
                  )}
                </div>
              ) : (
                <p className="muted">
                  Выберите фактор или основание. Источник, дата и сохранённый
                  исходник загружаются по запросу.
                </p>
              )}
            </>
          ) : (
            <p className="empty">
              Доказательства ещё не привязаны к факторам или основаниям.
            </p>
          )}
        </section>
      </WorkspacePanel>
      <WorkspacePanel id="review" active={sections.active} prefix="dossier">
        <section
          className="panel"
          id="dossier-factors"
          tabIndex={-1}
          aria-labelledby="dossier-factors-title"
        >
          <div className="panel-heading">
            <div>
              <h2 id="dossier-factors-title">Факторы риска и решения</h2>
              <p>
                Только подтверждённые факторы участвуют в серверном балле.
                DEMO-решения отмечены отдельно. Отсутствие данных не
                подтверждает нарушение.
              </p>
            </div>
          </div>
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
                  <strong>{label}</strong>
                  <small>
                    {factor?.reason ||
                      "Сохранённого фактора нет. Нужны материалы и отдельное решение."}
                  </small>
                  {factor && <small>Дата оценки: {date(factor.as_of)}</small>}
                </div>
                <span className="points">
                  {factor?.status === "CONFIRMED" ? `+${factor.weight}` : "0"}
                  <small>
                    {factor ? statusLabel(factor.status) : "Не зафиксирован"}
                  </small>
                </span>
                <div className="dossier-factor-actions">
                  {factor && (
                    <PdfDownload
                      kind="risk-factors"
                      id={factor.id}
                      label="PDF решения"
                    />
                  )}
                  {factor && (
                    <Button
                      variant="outline"
                      aria-expanded={evidence === factor.id}
                      aria-controls={`factor-evidence-${factor.id}`}
                      onClick={() =>
                        showEvidence(evidence === factor.id ? null : factor.id)
                      }
                    >
                      Доказательства
                    </Button>
                  )}
                  {user?.role === "analyst" &&
                    (code === "R2" ? (
                      <Link
                        className="text-link"
                        href={`/advertisements?property_id=${row.id}`}
                      >
                        Проверить у публикации
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
                        Проверить {code}
                      </a>
                    ))}
                </div>
              </div>
            );
          })}
          {!detailed && user?.role === "analyst" && (
            <div className="expert-invitation">
              <div>
                <h3>Нужно дополнить проверку?</h3>
                <p>
                  Документы и решения открываются без потери введённых данных.
                </p>
              </div>
              <Button variant="outline" onClick={() => openEditor()}>
                Открыть инструменты
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
                  <h3>Материалы и проверки</h3>
                  <span>R1, R3–R6 · загрузка и решения</span>
                </summary>
                <p className="muted">
                  Сохраните источник и область его применения. Подтверждение
                  каждого фактора выполняется отдельно.
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
      </WorkspacePanel>
      <WorkspacePanel
        id="publications"
        active={sections.active}
        prefix="dossier"
      >
        <section
          className="panel padded"
          id="dossier-advertisements"
          tabIndex={-1}
          aria-labelledby="dossier-advertisements-title"
        >
          <h2 id="dossier-advertisements-title">Реклама и публикации</h2>
          <p>
            Связанные публикации: {detail.data.advertisement_ids.length}.
            Оригиналы, источники, даты и отдельные решения доступны в списке
            публикаций объекта.
          </p>
          <div className="dossier-actions">
            <Button asChild variant="outline">
              <Link href={`/advertisements?property_id=${row.id}`}>
                Открыть публикации объекта
              </Link>
            </Button>
            {user?.role === "analyst" && (
              <Link className="text-link" href="/advertisements/new">
                Добавить публикацию и проверить привязку
              </Link>
            )}
          </div>
          <p className="muted">
            Наличие публикации не подтверждает фактор. R2 проверяется у
            оригинала после проверки гипотезы и привязки к объекту.
          </p>
        </section>
        <ObjectRecords propertyId={row.id} kind="advertisements" />
      </WorkspacePanel>
      <WorkspacePanel id="signals" active={sections.active} prefix="dossier">
        <section
          className="panel padded"
          id="dossier-signals"
          tabIndex={-1}
          aria-labelledby="dossier-signals-title"
        >
          <h2 id="dossier-signals-title">Сигналы по объекту</h2>
          <p>
            Сигнал сохраняет снимок проверенных материалов и решений. Изменение
            текущего досье не переписывает прежние версии и PDF.
          </p>
          <div className="dossier-actions">
            <Button asChild variant="outline">
              <Link href={`/signals?property_id=${row.id}`}>
                Открыть версии сигналов
              </Link>
            </Button>
            <CreateSignalButton property={row} onChange={detail.reload} />
          </div>
          <p className="muted">
            Сигнал указывает на необходимость проверки и не является обвинением
            или юридическим заключением.
          </p>
        </section>
        <ObjectRecords propertyId={row.id} kind="signals" />
        <PdfDownload
          kind="properties"
          id={row.id}
          label="Скачать отчёт по объекту"
        />
      </WorkspacePanel>
      <WorkspacePanel id="history" active={sections.active} prefix="dossier">
        <PropertyHistory key={id} id={id} revision={row.risk.revision} />
      </WorkspacePanel>
    </div>
  );
}

function advertisementExcerpt(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return "Исходный файл · оригинал доступен в карточке";
  return text.length > 220 ? `${text.slice(0, 220).trimEnd()}…` : text;
}

export function AdvertisementsView() {
  const params = useSearchParams();
  const router = useRouter();
  const statusFilter = useRef<HTMLSelectElement>(null);
  const query = params.toString();
  const path = `/advertisements?${query}`;
  const result = useData<Page<Advertisement>>(path);
  const data =
    result.resolvedPath === path && !result.error ? result.data : null;
  const currentError = result.resolvedPath === path ? result.error : "";
  const hasFilters = !!(params.get("status") || params.get("property_id"));
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
        eyebrow="РЕКЛАМНЫЕ МАТЕРИАЛЫ"
        title="Реклама"
        description="Сохранённый оригинал, происхождение и время фиксации каждой публикации."
      />
      <section
        className="registry-list-guide advertisements-start-guide"
        aria-labelledby="advertisements-start-guide-title"
      >
        <div>
          <p className="eyebrow">С ЧЕГО НАЧАТЬ</p>
          <h2 id="advertisements-start-guide-title">
            Добавьте материал для проверки
          </h2>
        </div>
        <p>
          Добавьте текст или загрузите PNG, JPEG либо TXT. Сохраните оригинал,
          затем перейдите к анализу и отдельной ручной проверке.
        </p>
      </section>
      <section className="panel advertisements-panel">
        <div className="panel-heading">
          <div>
            <h2>Публикации</h2>
            <p>
              {data ? `${data.total} материалов` : "Загрузка…"} · Оригиналы,
              состояние обработки и ручная проверка
            </p>
          </div>
          <div className="publication-filters">
            <label htmlFor="ad-status">Состояние обработки</label>
            <select
              id="ad-status"
              ref={statusFilter}
              value={params.get("status") || ""}
              onChange={(event) => filter("status", event.target.value)}
            >
              <option value="">Все состояния</option>
              {[
                "NEW",
                "ANALYZING",
                "READY_FOR_REVIEW",
                "REVIEWED",
                "FAILED",
              ].map((status) => (
                <option value={status} key={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {hasFilters && (
          <div className="active-filters">
            <ListFilter size={16} aria-hidden="true" />
            {params.get("status") && (
              <span>{statusLabel(params.get("status")!)}</span>
            )}
            {params.get("property_id") && (
              <Link
                className="text-link"
                href={`/properties/${params.get("property_id")}`}
              >
                Материалы выбранного объекта
              </Link>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                const next = new URLSearchParams(params);
                for (const key of ["status", "property_id", "page"])
                  next.delete(key);
                router.replace(`/advertisements?${next}`, { scroll: false });
                requestAnimationFrame(() => statusFilter.current?.focus());
              }}
            >
              Сбросить фильтры
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
                      {statusLabel(ad.status)}
                    </span>
                  </div>
                  <span className="object-name">{ad.source_label}</span>
                  {ad.confirmed_property_id && (
                    <span className="ad-property">
                      Связанный объект: {ad.confirmed_property_id.slice(0, 8)}…
                    </span>
                  )}
                  <p>{advertisementExcerpt(ad.original_text)}</p>
                  <div className="ad-dates">
                    <span className="ad-date">
                      Опубликовано: {date(ad.published_at)}
                    </span>
                    <span className="ad-date">
                      Зафиксировано: {date(ad.captured_at)}
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
                  Проверить публикацию{" "}
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
              ? "Нет публикаций по выбранным фильтрам. Измените состояние или сбросьте фильтры."
              : "Публикаций пока нет. Добавьте текст или исходный файл."}
          </div>
        )}
        {data && (data.total > data.page_size || data.page > 1) && (
          <Pagination
            label="Страницы публикаций"
            page={data.page}
            pageSize={data.page_size}
            total={data.total}
            previousLabel="Предыдущая"
            nextLabel="Следующая"
            onPageChange={(page) => filter("page", String(page))}
          />
        )}
      </section>
    </>
  );
}

export function AdvertisementView({ id }: { id: string }) {
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
  return (
    <>
      <Link
        href={materials ? `/advertisements?${materials}` : "/advertisements"}
        className="back"
      >
        <ArrowLeft size={15} /> К публикациям
      </Link>
      <PageTitle
        eyebrow="СОХРАНЁННЫЙ МАТЕРИАЛ"
        title={ad.source_label}
        description={
          importedHtml
            ? "HTML-оригинал сохранён отдельно. Ниже — извлечённый текст; анализ запускается отдельно."
            : "Оригинал сохранён без изменений. Анализ не запускается автоматически."
        }
        action={false}
      />
      <div className="advertisement-statusbar">
        <div className="object-summary">
          <Demo value={ad.is_demo} />
          <span>
            {ad.status === "NEW"
              ? "Новый · ожидает анализа"
              : statusLabel(ad.status)}
          </span>
          <span className="advertisement-revision">Версия {ad.revision}</span>
        </div>
        <span className="advertisement-status-hint">
          Оригинал сохранён без изменений
        </span>
        <Button asChild>
          <Link href={`/review?advertisement_id=${id}`}>
            Открыть анализ и проверку
          </Link>
        </Button>
      </div>
      <section className="panel padded publication-original advertisement-detail-panel">
        <div className="advertisement-detail-heading">
          <div>
            <p className="eyebrow">ИСТОЧНИК МАТЕРИАЛА</p>
            <h2>Оригинал публикации</h2>
          </div>
          <span className="advertisement-captured">
            Зафиксировано: {date(ad.captured_at)}
          </span>
        </div>
        {importedHtml && (
          <p className="notice">
            Источник: Primeminister.kz ·{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY 4.0
            </a>
            . Из статьи извлечён текст, оформление удалено. Публикация не
            означает одобрения SAQ QURYLYS издателем.
          </p>
        )}
        <p hidden={!detailed}>
          <Link href={`/monitoring?advertisement_id=${ad.id}`}>
            Сверить объект с реестром
          </Link>
        </p>
        {ad.original_text ? (
          <p className="original-text">{ad.original_text}</p>
        ) : (
          <p className="muted">
            Исходный материал — изображение. Откройте анализ, чтобы сопоставить
            оригинал и OCR.
          </p>
        )}
        <dl className="advertisement-metadata">
          <dt>Дата публикации</dt>
          <dd>{date(ad.published_at)}</dd>
          <dt>Зафиксировано</dt>
          <dd>{date(ad.captured_at)}</dd>
          <dt>Источник</dt>
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
            <h3>Сохранённые материалы</h3>
            <p className="field-help">
              Исходный PDF скачивается без изменений. Для текста, HTML и
              изображения формируется PDF-копия; оригинал доступен отдельно.
            </p>
            {ad.assets.map((asset) => (
              <div className="asset" key={asset.id}>
                <PdfDownload
                  kind="assets"
                  id={asset.id}
                  label={assetPdfLabel(asset)}
                />
                <a className="text-link" href={`/api/v1/assets/${asset.id}`}>
                  Скачать материал <ArrowRight size={14} />
                </a>
                <small>SHA-256: {asset.sha256}</small>
              </div>
            ))}
          </div>
        )}
      </section>
      <div className="advertisement-detail-actions">
        <p className="notice">
          Анализ и ручная проверка доступны в рабочем месте. Гипотезы не влияют
          на балл риска без отдельного решения аналитика.
        </p>
      </div>
    </>
  );
}

export function NewAdvertisementView() {
  const { detailed } = useInterfaceMode();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Advertisement | null>(null);
  const savedPanel = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState({
    text: "",
    source_label: "",
    source_url: "",
    published_at: "",
    is_demo: true,
  });
  const key = useRef<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    if (saved) savedPanel.current?.focus();
  }, [saved]);
  useEffect(() => {
    const value = sessionStorage.getItem("saq-ad-draft");
    if (value) {
      try {
        setDraft(JSON.parse(value));
      } catch {
        sessionStorage.removeItem("saq-ad-draft");
      }
    }
  }, []);
  function update(name: string, value: string | boolean) {
    const next = { ...draft, [name]: value };
    setDraft(next);
    sessionStorage.setItem("saq-ad-draft", JSON.stringify(next));
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
      sessionStorage.removeItem("saq-ad-draft");
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
          eyebrow="МАТЕРИАЛ СОХРАНЁН"
          title="Публикация добавлена"
          description="Оригинал и происхождение сохранены в базе данных."
          action={false}
        />
        <section
          className="panel padded success"
          aria-label="Результат сохранения публикации"
          tabIndex={-1}
          ref={savedPanel}
        >
          <Check size={32} />
          <h2>Готово к следующему этапу</h2>
          <p>
            Зафиксировано: {date(saved.captured_at)}. Правовые выводы и факторы
            не начислялись.
          </p>
          <div className="success-actions">
            <Button asChild>
              <Link href={`/review?advertisement_id=${saved.id}`}>
                Перейти к проверке <ArrowRight size={16} />
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/advertisements/${saved.id}`)}
            >
              Открыть публикацию
            </Button>
          </div>
        </section>
      </>
    );
  return (
    <>
      <Link href="/advertisements" className="back">
        <ArrowLeft size={15} /> К рекламе
      </Link>
      <PageTitle
        eyebrow="СБОР МАТЕРИАЛОВ"
        title="Добавить публикацию"
        description="Укажите происхождение материала. Неизвестную дату публикации можно оставить пустой."
        action={false}
      />
      <section className="panel form-panel intake-advertisement-panel new-advertisement-panel">
        <div className="form-tabs">
          <strong>Текст</strong>
          <Link href="/advertisements/upload">Файл · PNG / JPEG / TXT</Link>
          <Link href="/advertisements/import-url">
            Открытая публикация по ссылке
          </Link>
        </div>
        <form
          className="intake-advertisement-form new-advertisement-form"
          onSubmit={submit}
        >
          <div className="form-section-heading">
            <span className="section-index" aria-hidden="true">
              01
            </span>
            <div>
              <h2>Материал и происхождение</h2>
              <p>Два обязательных поля. Сохраните формулировки оригинала.</p>
            </div>
          </div>
          <div className="form-primary-fields">
            <label htmlFor="source">Источник / описание происхождения</label>
            <input
              id="source"
              aria-describedby="source-help"
              required
              maxLength={300}
              value={draft.source_label}
              onChange={(e) => update("source_label", e.target.value)}
              placeholder="Например: собственный DEMO-баннер"
            />
            <p id="source-help" className="field-help">
              Где и кем получен материал: собственный баннер, публичная страница
              или предоставленный документ.
            </p>
            <label htmlFor="ad-text">Оригинальный текст</label>
            <textarea
              id="ad-text"
              aria-describedby="ad-text-count"
              required
              maxLength={100000}
              rows={8}
              value={draft.text}
              onChange={(e) => update("text", e.target.value)}
              placeholder="Вставьте текст публикации без изменений…"
            />
            <p id="ad-text-count" className="field-help text-count">
              {draft.text.length.toLocaleString("ru-RU")} / 100 000 символов
            </p>
          </div>
          <details
            className="optional-context form-context-panel"
            open={detailed || undefined}
          >
            <summary>Ссылка и дата публикации · необязательно</summary>
            <div className="form-section-heading">
              <span className="section-index" aria-hidden="true">
                02
              </span>
              <div>
                <h2>Контекст публикации</h2>
                <p>
                  Необязательные сведения. Неизвестную дату оставьте пустой.
                </p>
              </div>
            </div>
            <div className="form-columns">
              <div>
                <label htmlFor="url">
                  Ссылка на источник <small>необязательно</small>
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
                  Ссылка сохраняется; автоматическая загрузка страницы пока не
                  выполняется.
                </p>
              </div>
              <div>
                <label htmlFor="published">
                  Дата публикации <small>+05:00</small>
                </label>
                <input
                  id="published"
                  type="datetime-local"
                  value={draft.published_at}
                  onChange={(e) => update("published_at", e.target.value)}
                />
                <p className="field-help">
                  Время фиксации сервер запишет отдельно.
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
            Демонстрационный материал (DEMO)
          </label>
          {error && <Notice error={error} />}
          <div className="form-actions">
            <Button disabled={busy} aria-busy={busy}>
              {busy ? "Сохранение…" : "Сохранить публикацию"}
              <ArrowRight size={16} />
            </Button>
            <span>Черновик сохраняется в этой вкладке до отправки.</span>
          </div>
        </form>
      </section>
    </>
  );
}

export function LoginView() {
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
        <h1>Проверка рекламы и документов.</h1>
        <p>
          Реклама, объект и доказательства — в одном рабочем процессе аналитика.
        </p>
        <span>DEMO · Усть-Каменогорск</span>
      </section>
      <section className="login-form">
        <div>
          <span className="demo-label">РАБОЧЕЕ МЕСТО АНАЛИТИКА</span>
          <h2>Вход в систему</h2>
          <p className="muted">Используйте локальную учётную запись проекта.</p>
          <form onSubmit={submit}>
            <label htmlFor="username">Логин</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              required
              maxLength={300}
            />
            <label htmlFor="password">Пароль</label>
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
              {busy ? "Проверка…" : "Войти"}
              <ArrowRight size={16} />
            </Button>
          </form>
          <p className="field-help">
            Доступ выдан локально. Система не отправляет материалы в
            государственные органы.
          </p>
        </div>
      </section>
    </main>
  );
}

export function UpcomingView({ kind }: { kind: "review" | "signals" }) {
  return (
    <>
      <PageTitle
        eyebrow="СЛЕДУЮЩИЙ ВЕРТИКАЛЬНЫЙ СРЕЗ"
        title={kind === "review" ? "Проверка гипотез" : "Сигнальные карточки"}
        description="Этот модуль ещё не реализован."
        action={false}
      />
      <section className="panel padded">
        <h2>
          {kind === "review"
            ? "От оригинала к подтверждённому фактору"
            : "От подтверждённых факторов к решению"}
        </h2>
        <p className="muted">
          {kind === "review"
            ? "Здесь появятся OCR-фрагменты, кандидаты объектов и ручная проверка. Пока можно сохранить новый текст и изучить DEMO-доказательства в карточках."
            : "Здесь появятся очередь, решения человека, версии и PDF. Действующих сигнальных карточек пока нет."}
        </p>
        <Button asChild variant="outline">
          <Link href={kind === "review" ? "/advertisements" : "/properties"}>
            Перейти к данным <ArrowRight size={16} />
          </Link>
        </Button>
      </section>
    </>
  );
}
