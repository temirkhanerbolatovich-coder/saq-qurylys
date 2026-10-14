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
  User,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { AppealReview } from "@/components/appeal-review";
import {
  LegalBasisCreate,
  LegalBasisDecision,
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
                {href === "/signals" && <span className="soon">Далее</span>}
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
            <span>
              Региональный мониторинг <ChevronRight size={14} />{" "}
              <strong>Усть-Каменогорск</strong>
            </span>
            <span className="demo-label">DEMO · синтетические данные</span>
          </header>
          <main className="content">{children}</main>
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
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal })
      .then((value) => {
        setData(value);
        setError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [path, version]);
  return { data, error, reload: () => setVersion((value) => value + 1) };
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
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Объект / очередь</th>
            <th>Правовое основание</th>
            <th>Приоритет проверки</th>
            <th>Факторы</th>
            <th>Последняя проверка</th>
            <th>
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
                  {row.risk.confirmed_codes.join(" · ") || "Нет подтверждённых"}
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
    </div>
  );
}

export function DashboardView() {
  const summary = useData<Dashboard>("/dashboard/summary");
  const registry = useData<Page<Property>>("/properties?page_size=100");
  return (
    <>
      <PageTitle
        eyebrow="СИТУАЦИЯ В РЕГИОНЕ"
        title="Обзор мониторинга"
        description="Объекты, источники и причины, требующие внимания аналитика."
      />
      <div className="context-line">
        <span className="live-dot" /> Данные из PostgreSQL <span>·</span>{" "}
        {summary.data
          ? `Обновлено ${date(summary.data.calculated_at)}`
          : "Подключение…"}
      </div>
      {summary.error && <Notice error={summary.error} />}
      <div className="metrics">
        {[
          [
            "Объектов в реестре",
            summary.data?.property_count,
            "Полные DEMO-карточки",
            "neutral",
          ],
          [
            "Приоритетная проверка",
            summary.data?.zones.RED,
            "Красная зона · подтверждены R1 + R2",
            "red",
          ],
          [
            "Углублённая проверка",
            summary.data?.zones.YELLOW,
            "Жёлтая зона",
            "yellow",
          ],
          [
            "Основание не проверено",
            summary.data?.unknown_legal_bases,
            "Неизвестность не даёт R1",
            "neutral",
          ],
        ].map(([label, count, note, style]) => (
          <div className={`metric ${style}`} key={label}>
            <p>{label}</p>
            <strong>{count ?? "—"}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Объекты под наблюдением</h2>
            <p>Балл отражает необходимость проверки, а не наличие нарушения.</p>
          </div>
          <Link className="text-link" href="/properties">
            Весь реестр <ArrowRight size={15} />
          </Link>
        </div>
        {registry.data ? (
          <PropertyTable
            rows={[...registry.data.items].sort(
              (a, b) => b.risk.score - a.risk.score,
            )}
          />
        ) : (
          <LoadState error={registry.error} retry={registry.reload} />
        )}
      </section>
      <div className="dashboard-bottom">
        <section className="panel compact">
          <FileText size={23} />
          <div>
            <h2>Новые материалы</h2>
            <p>
              {summary.data?.new_advertisements ?? "—"} публикаций сохранено.
              Добавьте новый текст, чтобы начать проверку.
            </p>
            <Link className="text-link" href="/advertisements">
              Открыть рекламу <ArrowRight size={14} />
            </Link>
          </div>
        </section>
        <section className="panel compact">
          <ClipboardCheck size={23} />
          <div>
            <h2>Следующий этап разработки</h2>
            <p>
              OCR, сопоставление и ручная проверка гипотез ещё не подключены.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

export function PropertiesView() {
  const params = useSearchParams();
  const router = useRouter();
  const query = params.toString();
  const registry = useData<Page<Property>>(`/properties?${query}`);
  function filter(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete("page");
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
        <div className="list-caption">
          {registry.data
            ? `Найдено объектов: ${registry.data.total}`
            : "Поиск…"}
          <span>Карта будет добавлена после основного сценария</span>
        </div>
        {registry.data ? (
          <PropertyTable rows={registry.data.items} />
        ) : (
          <LoadState error={registry.error} retry={registry.reload} />
        )}
        {registry.error && registry.data && <Notice error={registry.error} />}
      </section>
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
      {item.data.signatory_count && (
        <p>
          Заявителей: {item.data.signatory_count} · дата обращения:{" "}
          {date(item.data.event_at || null)}
          <br />
          Проверка: {item.data.methodology}
        </p>
      )}
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
      {detail.data.unknown_information.map((value) => (
        <p className="notice" key={value}>
          {value}
        </p>
      ))}
      <div className="detail-grid">
        <section className="panel padded">
          <h2>Сведения об объекте</h2>
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
          </dl>
          <Link
            className="text-link"
            href={`/advertisements?property_id=${row.id}`}
          >
            Связанные публикации: {detail.data.advertisement_ids.length}{" "}
            <ArrowRight size={14} />
          </Link>
        </section>
        <section className="panel padded">
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
      <section className="panel">
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
              </div>
              <span className="points">
                {factor.status === "CONFIRMED" ? `+${factor.weight}` : "0"}
                <small>{factor.status}</small>
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
      {user?.role === "analyst" && (
        <AppealReview detail={detail.data} onSaved={detail.reload} />
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
              Новые тексты ожидают следующего этапа анализа
            </p>
          </div>
        </div>
        {result.data ? (
          result.data.items.map((ad) => (
            <article className="ad-row" key={ad.id}>
              <div>
                <div className="ad-meta">
                  <Demo value={ad.is_demo} />
                  <span>
                    {ad.status === "NEW"
                      ? "Новый материал"
                      : "Учебный сценарий"}
                  </span>
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
          {ad.status === "NEW" ? "Новый · ожидает анализа" : ad.status}
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
        <section className="panel padded success">
          <Check size={32} />
          <h2>Готово к следующему этапу</h2>
          <p>
            Зафиксировано: {date(saved.captured_at)}. Правовые выводы и факторы
            не начислялись.
          </p>
          <Button onClick={() => router.push(`/advertisements/${saved.id}`)}>
            Открыть публикацию <ArrowRight size={16} />
          </Button>
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
          <label htmlFor="source">Источник / описание происхождения</label>
          <input
            id="source"
            required
            maxLength={300}
            value={draft.source_label}
            onChange={(e) => update("source_label", e.target.value)}
            placeholder="Например: собственный DEMO-баннер"
          />
          <label htmlFor="ad-text">Оригинальный текст</label>
          <textarea
            id="ad-text"
            required
            maxLength={100000}
            rows={8}
            value={draft.text}
            onChange={(e) => update("text", e.target.value)}
            placeholder="Вставьте текст публикации без изменений…"
          />
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
            <Button disabled={busy}>
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
        <h1>
          От публикации
          <br />к проверяемому
          <br />
          сигналу.
        </h1>
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
            <Button disabled={busy}>
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
