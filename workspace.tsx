"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Siren,
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
import { statusLabel } from "@/lib/status-labels";
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
const factorLabels: Record<string, string> = {
  R1: "Отсутствие основания установлено",
  R2: "Прямое предложение внести деньги",
  R3: "Активная реклама строящегося жилья",
  R4: "Коллективное обращение",
  R5: "Расхождение готовности ≥20 п.п.",
  R6: "Подтверждённая задержка",
};
const zoneLabels = { GREEN: "Зелёная", YELLOW: "Жёлтая", RED: "Красная" };
const nav = [
  { href: "/dashboard", label: "Обзор", icon: LayoutDashboard },
  { href: "/properties", label: "Объекты", icon: Building2 },
  { href: "/advertisements", label: "Реклама", icon: FileText },
  { href: "/review", label: "Проверка", icon: ClipboardCheck },
  { href: "/signals", label: "Сигналы", icon: Siren },
];

function GlobalSearch() {
  const router = useRouter();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const query = String(data.get("q") || "").trim();
    if (!query) return;
    router.push(`/properties?q=${encodeURIComponent(query)}`);
  }

  return (
    <form className="topbar-search" role="search" onSubmit={submit}>
      <Search size={16} aria-hidden="true" />
      <label className="sr-only" htmlFor="global-property-search">
        Найти объект или адрес
      </label>
      <input
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
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  async function refresh() {
    try {
      setUser(await api<User>("/auth/me"));
      setError("");
    } catch (e) {
      setUser(null);
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
    <Auth.Provider value={{ user, refresh }}>
      <div className="workspace">
        <a className="skip-link" href="#main-content">
          Перейти к содержимому
        </a>
        <aside className="sidebar">
          <Link href="/dashboard" className="brand">
            <span className="brand-symbol">
              <ShieldCheck size={25} />
            </span>
            <span>
              SAQ <b>QURYLYS</b>
              <small>Рабочее место аналитика</small>
            </span>
          </Link>
          <div className="sidebar-caption">МОНИТОРИНГ</div>
          <nav aria-label="Основная навигация">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={pathname.startsWith(href) ? "active" : ""}
                aria-current={pathname.startsWith(href) ? "page" : undefined}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-note">
            <ShieldCheck size={20} />
            <p>
              Решение принимает человек
              <small>Система формирует сигнал необходимости проверки.</small>
            </p>
          </div>
          <div className="user">
            <span className="avatar">А</span>
            <div>
              <strong>{user.display_name}</strong>
              <small>{user.role === "analyst" ? "Аналитик" : "Просмотр"}</small>
            </div>
            <button
              aria-label="Выйти"
              onClick={async () => {
                await command("/auth/logout");
                await refresh();
                router.replace("/login");
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </aside>
        <div className="main-column">
          <header className="topbar">
            <div className="topbar-context">
              Региональный мониторинг <ChevronRight size={14} />{" "}
              <strong>Усть-Каменогорск</strong>
            </div>
            <GlobalSearch />
            <div className="topbar-meta">
              <span className="demo-label">DEMO · синтетические данные</span>
            </div>
          </header>
          <main className="content" id="main-content" tabIndex={-1}>
            {children}
          </main>
          <footer>
            SAQ QURYLYS · Прототип · Сигнал не устанавливает факт правонарушения
          </footer>
        </div>
      </div>
    </Auth.Provider>
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
      <span className="zone-dot" />
      <strong>{risk.score}</strong> {zoneLabels[risk.zone]}
    </span>
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
      <Button variant="outline" onClick={retry}>
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

function PropertyTable({ rows }: { rows: Property[] }) {
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
            <tr key={row.id}>
              <td>
                <Link className="object-name" href={`/properties/${row.id}`}>
                  {row.name}
                </Link>
                <small>
                  {row.address} <Demo value={row.is_demo} />
                </small>
              </td>
              <td>
                <span
                  className={`legal ${row.legal_verification_status.toLowerCase()}`}
                >
                  {legalLabels[row.legal_verification_status]}
                </span>
              </td>
              <td>
                <Zone risk={row.risk} />
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
                  href={`/properties/${row.id}`}
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

export function DashboardView() {
  const summary = useData<Dashboard>("/dashboard/summary");
  const registry = useData<Page<Property>>("/properties?page_size=100");
  const signals = useData<Page<Signal>>("/signals?page_size=1");
  const pendingReview = useData<Page<Advertisement>>(
    "/advertisements?status=READY_FOR_REVIEW&page_size=1",
  );
  const riskTotal = summary.data?.property_count || 0;
  const reviewedLegal = summary.data
    ? Math.max(
        0,
        summary.data.property_count - summary.data.unknown_legal_bases,
      )
    : 0;
  const riskRows = summary.data
    ? [
        { label: "Высокий риск", value: summary.data.zones.RED, tone: "red" },
        {
          label: "Требует внимания",
          value: summary.data.zones.YELLOW,
          tone: "yellow",
        },
        {
          label: "Низкий риск",
          value: summary.data.zones.GREEN,
          tone: "green",
        },
      ]
    : [];
  const recentProperties = registry.data
    ? [...registry.data.items]
        .sort((a, b) =>
          (b.last_reviewed_at || "").localeCompare(a.last_reviewed_at || ""),
        )
        .slice(0, 5)
    : [];
  return (
    <>
      <PageTitle
        eyebrow="СИТУАЦИЯ В РЕГИОНЕ"
        title="Обзор мониторинга"
        description="Объекты, источники и причины, требующие внимания аналитика."
      />
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
            "Все очереди и корпуса в мониторинге",
            "neutral",
          ],
          [
            "Приоритетная проверка",
            summary.data?.zones.RED,
            "Красная зона · подтверждены R1 + R2",
            "red",
          ],
          [
            "Сигналов",
            signals.data?.total,
            "Сохранённые версии и решения",
            "green",
          ],
          [
            "Ожидают проверки",
            pendingReview.data?.total,
            "Материалы готовы к решению аналитика",
            "yellow",
          ],
        ].map(([label, count, note, style]) => (
          <div className={`metric ${style}`} key={label}>
            <p>{label}</p>
            <strong>{count ?? "—"}</strong>
            <small>{note}</small>
          </div>
        ))}
      </section>
      <div className="dashboard-analytics">
        <section className="panel analytics-card risk-distribution">
          <div className="analytics-heading">
            <div>
              <p className="eyebrow">СТРУКТУРА РЕЕСТРА</p>
              <h2>Распределение по риску</h2>
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
              <p className="eyebrow">ПОЛНОТА ПРОВЕРКИ</p>
              <h2>Правовое основание</h2>
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
                  <dt>Статус определён</dt>
                  <dd>{reviewedLegal}</dd>
                </div>
                <div>
                  <dt>Не проверено</dt>
                  <dd>{summary.data.unknown_legal_bases}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <LoadState error={summary.error} retry={summary.reload} />
          )}
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
              API хранит версии сигналов, но пока не предоставляет сопоставимый
              временной ряд. Фиктивный график не строится.
            </p>
            <span>Всего сигналов: {signals.data?.total ?? "—"}</span>
          </div>
        </section>
      </div>
      <nav className="workflow-links" aria-label="Основные рабочие сценарии">
        <Link href="/advertisements">
          01 · Собрать материалы<small>Оригиналы публикаций и источники</small>
        </Link>
        <Link href="/review">
          02 · Проверить факты<small>Сверка гипотез и привязка к объекту</small>
        </Link>
        <Link href="/signals">
          03 · Сигналы и PDF<small>История версий и решения аналитика</small>
        </Link>
      </nav>
      <div className="dashboard-workspace">
        <section className="panel recent-properties">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">ПОСЛЕДНИЕ ОБЪЕКТЫ</p>
              <h2>Рабочий реестр</h2>
              <p>Балл отражает необходимость проверки, а не нарушение.</p>
            </div>
            <Link className="text-link" href="/properties">
              Весь реестр <ArrowRight size={15} />
            </Link>
          </div>
          {registry.data ? (
            <PropertyTable rows={recentProperties} />
          ) : (
            <LoadState error={registry.error} retry={registry.reload} />
          )}
        </section>
        <aside className="panel work-queue" aria-labelledby="work-queue-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">РАБОЧАЯ ОЧЕРЕДЬ</p>
              <h2 id="work-queue-title">Требует действий</h2>
            </div>
          </div>
          <div className="queue-list">
            <Link href="/advertisements?status=READY_FOR_REVIEW">
              <span className="queue-icon">
                <FileText size={18} aria-hidden="true" />
              </span>
              <span>
                <strong>Материалы к проверке</strong>
                <small>Открыть подготовленные публикации</small>
              </span>
              <b>{pendingReview.data?.total ?? "—"}</b>
            </Link>
            <Link href="/review">
              <span className="queue-icon">
                <ClipboardCheck size={18} aria-hidden="true" />
              </span>
              <span>
                <strong>Проверить факты</strong>
                <small>Гипотезы, объект и решения</small>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/signals">
              <span className="queue-icon">
                <Siren size={18} aria-hidden="true" />
              </span>
              <span>
                <strong>Сигналы и PDF</strong>
                <small>Версии и решения аналитика</small>
              </span>
              <b>{signals.data?.total ?? "—"}</b>
            </Link>
            <Link href="/properties?view=map" aria-label="Открыть карту">
              <span className="queue-icon">
                <Building2 size={18} aria-hidden="true" />
              </span>
              <span>
                <strong>Карта объектов</strong>
                <small>Расположение и приоритет</small>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <p className="queue-footnote">
            {summary.data?.new_advertisements ?? "—"} новых материалов в текущем
            срезе.
          </p>
        </aside>
      </div>
    </>
  );
}

export function PropertiesView() {
  const params = useSearchParams();
  const router = useRouter();
  const apiParams = new URLSearchParams(params);
  apiParams.delete("view");
  const query = apiParams.toString();
  const showMap = params.get("view") === "map";
  const searchInput = useRef<HTMLInputElement>(null);
  const hasFilters = ["q", "zone", "legal_status"].some((name) =>
    params.get(name),
  );
  function clearFilters() {
    const next = new URLSearchParams(params);
    for (const name of ["q", "zone", "legal_status", "page"]) next.delete(name);
    router.replace(`/properties?${next.toString()}`, { scroll: false });
    requestAnimationFrame(() => searchInput.current?.focus());
  }
  function filter(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== "page" && name !== "view") next.delete("page");
    router.replace(`/properties?${next.toString()}`, { scroll: false });
  }
  return (
    <>
      <PageTitle
        eyebrow="РЕЕСТР СТРОИТЕЛЬСТВА"
        title="Объекты"
        description="Каждая очередь и корпус проверяются по своим документам и датам."
      />
      <section className="panel">
        <div className="filters">
          <div className="search">
            <Search size={17} />
            <label className="sr-only" htmlFor="search">
              Поиск ЖК или адреса
            </label>
            <input
              id="search"
              ref={searchInput}
              type="search"
              maxLength={300}
              placeholder="Название ЖК или адрес"
              value={params.get("q") || ""}
              onChange={(e) => filter("q", e.target.value)}
            />
          </div>
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
        {/* A changed filter must never display the previous request's markers. */}
        <PropertyResults
          key={query}
          query={query}
          showMap={showMap}
          onPage={(page) => filter("page", String(page))}
        />
      </section>
    </>
  );
}

function PropertyResults({
  query,
  showMap,
  onPage,
}: {
  query: string;
  showMap: boolean;
  onPage: (page: number) => void;
}) {
  const registry = useData<Page<Property>>(`/properties?${query}`);
  if (!registry.data)
    return <LoadState error={registry.error} retry={registry.reload} />;
  const data = registry.data;
  const pages = Math.max(1, Math.ceil(data.total / data.page_size));
  return (
    <>
      <div className="list-caption">
        Найдено объектов: {data.total}
        <span>На странице: {data.items.length}</span>
      </div>
      {showMap && <PropertyMap rows={data.items} />}
      <div id="property-list" tabIndex={-1} aria-label="Список объектов">
        <PropertyTable rows={data.items} />
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
    </>
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
    </div>
  ) : (
    <LoadState error={item.error} retry={item.reload} />
  );
}

export function PropertyView({ id }: { id: string }) {
  const { user } = useContext(Auth);
  const detail = useData<PropertyDetail>(`/properties/${id}`);
  const [evidence, setEvidence] = useState<string | null>(null);
  if (!detail.data)
    return <LoadState error={detail.error} retry={detail.reload} />;
  const row = detail.data.property;
  return (
    <>
      <Link href="/properties" className="back">
        <ArrowLeft size={15} /> К реестру
      </Link>
      <PageTitle
        eyebrow="КАРТОЧКА ОБЪЕКТА"
        title={row.name}
        description={`${row.city} · ${row.address}`}
        action={false}
      />
      <div className="object-summary">
        <Zone risk={row.risk} />
        <Demo value={row.is_demo} />
        <span>Версия правил: {row.risk.rules_version}</span>
      </div>
      <nav className="dossier-nav" aria-label="Разделы карточки объекта">
        <a href="#dossier-summary">Сведения</a>
        <a href="#dossier-bases">Основания</a>
        <a href="#dossier-factors">Факторы и решения</a>
        <a href="#dossier-materials">Материалы и проверки</a>
      </nav>
      {detail.data.unknown_information.map((value) => (
        <p className="notice" key={value}>
          {value}
        </p>
      ))}
      <div className="detail-grid">
        <section className="panel padded" id="dossier-summary" tabIndex={-1}>
          <h2>Сведения об объекте</h2>
          <CreateSignalButton property={row} onChange={detail.reload} />
          <dl>
            <dt>Застройщик</dt>
            <dd>
              {row.developer.name} <Demo />
            </dd>
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
        <section className="panel padded" id="dossier-bases" tabIndex={-1}>
          <h2>Основания и документы</h2>
          {detail.data.legal_bases.length ? (
            detail.data.legal_bases.map((basis) => (
              <div className="document" key={basis.id}>
                <Demo value={basis.is_demo} />
                <h3>
                  {basis.document_number} · {basis.document_date}
                </h3>
                <p>{basis.issuer}</p>
                <p>Охват: {basis.scope_description}</p>
                <LegalBasisDecision
                  key={`${basis.id}:${basis.revision}`}
                  basis={basis}
                  onSaved={detail.reload}
                  writable={user?.role === "analyst"}
                />
                <a
                  className="text-link"
                  href={`/api/v1/assets/${basis.asset_id}`}
                >
                  Открыть сохранённый материал <ArrowRight size={14} />
                </a>
              </div>
            ))
          ) : (
            <p className="muted">
              Документы об основании в карточку не добавлены. Это само по себе
              не подтверждает его отсутствие.
            </p>
          )}
        </section>
      </div>
      <section className="panel" id="dossier-factors" tabIndex={-1}>
        <div className="panel-heading">
          <div>
            <h2>Факторы и решения</h2>
            <p>
              Только подтверждённые факторы участвуют в балле. DEMO-решения из
              учебного набора отмечены отдельно.
            </p>
          </div>
        </div>
        {detail.data.factors.length ? (
          detail.data.factors.map((factor) => (
            <div className="factor-row" key={factor.id}>
              <span className="factor-token">{factor.code}</span>
              <div>
                <strong>{factorLabels[factor.code] || factor.code}</strong>
                <small>{factor.reason}</small>
                <small>Дата оценки: {date(factor.as_of)}</small>
              </div>
              <span className="points">
                {factor.status === "CONFIRMED" ? `+${factor.weight}` : "0"}
                <small>{statusLabel(factor.status)}</small>
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  setEvidence(evidence === factor.id ? null : factor.id)
                }
              >
                Доказательства
              </Button>
              {evidence === factor.id && (
                <div className="evidence-list">
                  {factor.evidence_ids.map((value) => (
                    <EvidenceItem key={value} id={value} />
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="empty">Подтверждённых факторов пока нет.</div>
        )}
      </section>
      <div id="dossier-materials" tabIndex={-1}>
        <h2>Материалы и проверки</h2>
        <p className="muted">
          Сохраните источник и область его применения. Подтверждение каждого
          фактора выполняется отдельно.
        </p>
      </div>
      {user?.role === "analyst" && (
        <LegalAbsenceReview
          key={row.id}
          detail={detail.data}
          onSaved={detail.reload}
        />
      )}
      {user?.role === "analyst" && (
        <AppealReview detail={detail.data} onSaved={detail.reload} />
      )}
      {user?.role === "analyst" && (
        <ConstructionReview detail={detail.data} onSaved={detail.reload} />
      )}
      {user?.role === "analyst" && (
        <LegalBasisCreate detail={detail.data} onSaved={detail.reload} />
      )}
    </>
  );
}

export function AdvertisementsView() {
  const params = useSearchParams();
  const result = useData<Page<Advertisement>>(
    `/advertisements?${params.toString()}`,
  );
  return (
    <>
      <PageTitle
        eyebrow="РЕКЛАМНЫЕ МАТЕРИАЛЫ"
        title="Реклама"
        description="Сохранённый оригинал, происхождение и время фиксации каждой публикации."
      />
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Публикации</h2>
            <p>
              {result.data ? `${result.data.total} материалов` : "Загрузка…"} ·
              Оригиналы, состояние обработки и ручная проверка
            </p>
          </div>
        </div>
        {result.data ? (
          result.data.items.map((ad) => (
            <article className="ad-row" key={ad.id}>
              <div>
                <div className="ad-meta">
                  <Demo value={ad.is_demo} />
                  <span>{statusLabel(ad.status)}</span>
                  <span>{date(ad.captured_at)}</span>
                </div>
                <Link className="object-name" href={`/advertisements/${ad.id}`}>
                  {ad.source_label}
                </Link>
                <p>{ad.original_text}</p>
              </div>
              <Link
                aria-label="Открыть публикацию"
                href={`/advertisements/${ad.id}`}
              >
                <ArrowRight size={18} />
              </Link>
            </article>
          ))
        ) : (
          <LoadState error={result.error} retry={result.reload} />
        )}
        {result.data?.total === 0 && (
          <div className="empty">
            Публикаций пока нет. Добавьте новый текст.
          </div>
        )}
      </section>
    </>
  );
}

export function AdvertisementView({ id }: { id: string }) {
  const result = useData<Advertisement>(`/advertisements/${id}`);
  if (!result.data)
    return <LoadState error={result.error} retry={result.reload} />;
  const ad = result.data;
  return (
    <>
      <Link href="/advertisements" className="back">
        <ArrowLeft size={15} /> К публикациям
      </Link>
      <PageTitle
        eyebrow="СОХРАНЁННЫЙ МАТЕРИАЛ"
        title={ad.source_label}
        description="Оригинал сохранён без изменений. Анализ не запускается автоматически."
        action={false}
      />
      <div className="object-summary">
        <Demo value={ad.is_demo} />
        <span>
          {ad.status === "NEW"
            ? "Новый · ожидает анализа"
            : statusLabel(ad.status)}
        </span>
      </div>
      <section className="panel padded">
        <h2>Оригинал публикации</h2>
        <p className="original-text">{ad.original_text}</p>
        <dl>
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
        {ad.assets.map((asset) => (
          <div className="asset" key={asset.id}>
            <a className="text-link" href={`/api/v1/assets/${asset.id}`}>
              Скачать материал <ArrowRight size={14} />
            </a>
            <small>SHA-256: {asset.sha256}</small>
          </div>
        ))}
      </section>
      <Button asChild>
        <Link href={`/review?advertisement_id=${id}`}>
          Открыть анализ и проверку
        </Link>
      </Button>
      <p className="notice">
        Анализ и ручная проверка доступны в рабочем месте. Гипотезы не влияют на
        балл риска без отдельного решения аналитика.
      </p>
    </>
  );
}

export function NewAdvertisementView() {
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
      <section className="panel form-panel">
        <div className="form-tabs">
          <strong>Текст</strong>
          <span>URL-импорт · следующий этап</span>
          <Link href="/advertisements/upload">Файл · PNG / JPEG / TXT</Link>
        </div>
        <form onSubmit={submit}>
          <div className="form-section-heading">
            <span className="section-index" aria-hidden="true">
              01
            </span>
            <div>
              <h2>Материал и происхождение</h2>
              <p>Два обязательных поля. Сохраните формулировки оригинала.</p>
            </div>
          </div>
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
          <div className="form-section-heading">
            <span className="section-index" aria-hidden="true">
              02
            </span>
            <div>
              <h2>Контекст публикации</h2>
              <p>Необязательные сведения. Неизвестную дату оставьте пустой.</p>
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
