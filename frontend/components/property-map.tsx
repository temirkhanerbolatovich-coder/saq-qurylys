"use client";

import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Property } from "@/lib/types";
import { mapConfig } from "@/lib/map-config";
import { Button } from "@/components/ui/button";
import { statusLabel } from "@/lib/status-labels";
import { useLocale } from "@/lib/locale";
import { propertyDossierUrl, propertyRiskContext } from "@/lib/presentation";
import "leaflet/dist/leaflet.css";

const zones = { GREEN: "Зелёная", YELLOW: "Жёлтая", RED: "Красная" };
type MapCopy = {
  select: string;
  zone: string;
  zoomIn: string;
  zoomOut: string;
  zones: Record<string, string>;
  riskContexts: Record<string, string>;
};

function markerTitle(row: Property, copy: MapCopy) {
  const context = propertyRiskContext(row);
  return `${copy.select} ${row.name}: ${row.risk.score}, ${copy.zones[row.risk.zone]} ${copy.zone}${context ? `; ${copy.riskContexts[context] || context}` : ""}`;
}

function hasCoordinates(row: Property) {
  return (
    typeof row.latitude === "number" &&
    Number.isFinite(row.latitude) &&
    Math.abs(row.latitude) <= 85.05112878 &&
    typeof row.longitude === "number" &&
    Number.isFinite(row.longitude) &&
    Math.abs(row.longitude) <= 180
  );
}

export function PropertyMap({
  rows,
  registryQuery = "",
  selectedId,
  onSelect,
}: {
  rows: Property[];
  registryQuery?: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t, locale } = useLocale();
  const copy: MapCopy = {
    select: t("Выбрать", "Таңдау"),
    zone: t("зона", "аймақ"),
    zoomIn: t("Приблизить", "Жақындату"),
    zoomOut: t("Отдалить", "Алыстату"),
    zones: {
      GREEN: t("Зелёная", "Жасыл"),
      YELLOW: t("Жёлтая", "Сары"),
      RED: t("Красная", "Қызыл"),
    },
    riskContexts: {
      "Основание ожидает решения": t(
        "Основание ожидает решения",
        "Негіз бойынша шешім күтілуде",
      ),
      "Основание не проверено": t(
        "Основание не проверено",
        "Негіз тексерілмеген",
      ),
      "Основание отклонено": t("Основание отклонено", "Негіз қабылданбаған"),
    },
  };
  const latestCopy = useRef(copy);
  latestCopy.current = copy;
  const container = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const markerButtons = useRef(new Map<string, HTMLElement>());
  const currentSelection = useRef(selectedId);
  const [error, setError] = useState<"tiles" | "load" | null>(null);
  const [attempt, setAttempt] = useState(0);
  const config = mapConfig();
  const located = rows.filter(hasCoordinates);
  const selected = rows.find((row) => row.id === selectedId);

  useEffect(() => {
    const config = mapConfig();
    const points = rows.filter(hasCoordinates);
    if (!container.current || !config || !points.length) return;
    const element = container.current;
    let disposed = false;
    let map: import("leaflet").Map | undefined;
    let observer: ResizeObserver | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    void import("leaflet")
      .then((L) => {
        if (disposed) return;
        map = L.map(element, {
          attributionControl: false,
          zoomControl: false,
          scrollWheelZoom: false,
          minZoom: 2,
          maxZoom: 19,
        });
        L.control
          .zoom({
            zoomInTitle: latestCopy.current.zoomIn,
            zoomOutTitle: latestCopy.current.zoomOut,
          })
          .addTo(map);
        map.fitBounds(
          points.map(
            (row) => [row.latitude!, row.longitude!] as [number, number],
          ),
          { padding: [35, 35], maxZoom: 15, animate: false },
        );
        const tiles = L.tileLayer(config.url, {
          maxZoom: 19,
          noWrap: true,
          keepBuffer: 0,
        });
        const tileFailure = () => {
          if (!disposed) setError("tiles");
        };
        tiles.on("loading", () => {
          clearTimeout(timer);
          timer = setTimeout(tileFailure, 12000);
        });
        tiles.on("load", () => clearTimeout(timer));
        tiles.on("tileerror", tileFailure);
        tiles.addTo(map);
        for (const row of points) {
          // Never pass source names or other API data as HTML to Leaflet.
          const label = document.createElement("span");
          label.textContent = String(row.risk.score);
          const marker = L.marker([row.latitude!, row.longitude!], {
            icon: L.divIcon({
              html: label,
              className: `property-marker ${row.risk.zone.toLowerCase()}`,
              iconSize: [44, 44],
              iconAnchor: [22, 22],
            }),
            title: markerTitle(row, latestCopy.current),
            keyboard: true,
          }).addTo(map);
          const select = () => {
            onSelect(row.id);
            for (const [id, element] of markerButtons.current) {
              const isSelected = id === row.id;
              element.classList.toggle("is-selected", isSelected);
              element.setAttribute("aria-pressed", String(isSelected));
            }
            card.current?.focus();
          };
          marker.on("click", select);
          const button = marker.getElement();
          button?.setAttribute("aria-label", marker.options.title!);
          if (button) {
            const isSelected = currentSelection.current === row.id;
            button.classList.toggle("is-selected", isSelected);
            button.setAttribute("aria-pressed", String(isSelected));
            markerButtons.current.set(row.id, button);
          }
          button?.addEventListener("keydown", (event) => {
            if (event.key === " " || event.key === "Enter") {
              event.preventDefault();
              select();
            }
          });
        }
        observer = new ResizeObserver(() =>
          map?.invalidateSize({ animate: false }),
        );
        observer.observe(element);
      })
      .catch(() => {
        if (!disposed) setError("load");
      });
    return () => {
      disposed = true;
      clearTimeout(timer);
      observer?.disconnect();
      map?.remove();
      markerButtons.current.clear();
    };
  }, [rows, attempt, onSelect]);

  useEffect(() => {
    // Update authored labels in place: language changes preserve map position,
    // selected markers and keyboard focus without recreating Leaflet or tiles.
    for (const row of rows) {
      const marker = markerButtons.current.get(row.id);
      if (!marker) continue;
      const title = markerTitle(row, latestCopy.current);
      marker.setAttribute("title", title);
      marker.setAttribute("aria-label", title);
    }
    for (const [selector, title] of [
      [".leaflet-control-zoom-in", latestCopy.current.zoomIn],
      [".leaflet-control-zoom-out", latestCopy.current.zoomOut],
    ]) {
      const button = container.current?.querySelector(selector);
      button?.setAttribute("title", title);
      button?.setAttribute("aria-label", title);
    }
  }, [locale, rows]);

  useEffect(() => {
    currentSelection.current = selectedId;
    for (const [id, element] of markerButtons.current) {
      const isSelected = id === selectedId;
      element.classList.toggle("is-selected", isSelected);
      element.setAttribute("aria-pressed", String(isSelected));
    }
    if (selectedId) card.current?.focus({ preventScroll: true });
  }, [selectedId]);

  if (!rows.length) return null;
  return (
    <section
      className="property-map-section"
      aria-label={t("Карта объектов", "Нысандар картасы")}
    >
      <header className="map-section-heading">
        <div>
          <h2 id="property-map-title">
            {t("Карта текущей страницы", "Ағымдағы беттің картасы")}
          </h2>
          <a className="text-link map-skip" href="#property-list">
            {t("Перейти к списку объектов", "Нысандар тізіміне өту")}
          </a>
        </div>
        <div
          className="map-count"
          aria-label={t(
            `${located.length} из ${rows.length} объектов показаны на карте`,
            `${rows.length} нысанның ${located.length} нысаны картада көрсетілген`,
          )}
        >
          <strong>{located.length}</strong>
          <span>
            {t(`из ${rows.length} на карте`, `${rows.length} нысаннан картада`)}
          </span>
        </div>
      </header>
      <div className="map-context">
        <p className="map-note">
          {rows.some((row) => row.is_demo) &&
            t(
              "DEMO-координаты условные и не указывают на реальные проекты. ",
              "DEMO координаттары шартты, нақты жобаларды көрсетпейді. ",
            )}
          {t(
            "Точки показывают ориентиры проектов, а не границы участков или отдельные корпуса. Источники сохранённых координат — в истории досье. Зелёная зона не подтверждает безопасность.",
            "Нүктелер жер телімдерінің шекарасын не жеке ғимараттарды емес, жобалардың бағдарын көрсетеді. Сақталған координаттардың дереккөздері досье тарихында. Жасыл аймақ қауіпсіздікті растамайды.",
          )}
        </p>
        <div
          className="map-legend"
          aria-label={t("Легенда карты", "Карта белгілері")}
        >
          {Object.keys(zones).map((zone) => (
            <span className={`zone ${zone.toLowerCase()}`} key={zone}>
              <span className="zone-dot" aria-hidden="true" />
              {copy.zones[zone]}
            </span>
          ))}
          <span>
            {t(
              "Число на метке — балл проверки",
              "Белгідегі сан — тексеру балы",
            )}
          </span>
        </div>
      </div>
      <p className="map-note">
        {t(
          `Без пригодных координат: ${rows.length - located.length}. Такие объекты остаются в списке ниже.`,
          `Жарамды координаттары жоқ: ${rows.length - located.length}. Бұл нысандар төмендегі тізімде қалады.`,
        )}
      </p>
      {!config ? (
        <p role="status" className="notice">
          {t(
            "Карта отключена или провайдер настроен некорректно. Используйте список ниже.",
            "Карта өшірілген немесе провайдер қате бапталған. Төмендегі тізімді пайдаланыңыз.",
          )}
        </p>
      ) : !located.length ? (
        <p role="status" className="notice">
          {t(
            "Нет объектов с координатами для карты. Используйте список ниже.",
            "Картаға арналған координаттары бар нысандар жоқ. Төмендегі тізімді пайдаланыңыз.",
          )}
        </p>
      ) : (
        <>
          {error && (
            <div role="status" className="notice">
              {error === "tiles"
                ? t(
                    "Подложка карты недоступна или загружена не полностью. Объекты и список ниже доступны.",
                    "Карта қабаты қолжетімсіз немесе толық жүктелмеген. Нысандар мен төмендегі тізім қолжетімді.",
                  )
                : t(
                    "Не удалось загрузить карту. Используйте список ниже или повторите загрузку.",
                    "Картаны жүктеу мүмкін болмады. Төмендегі тізімді пайдаланыңыз немесе қайта жүктеңіз.",
                  )}{" "}
              <Button
                variant="outline"
                onClick={() => {
                  setError(null);
                  setAttempt((value) => value + 1);
                }}
              >
                {t("Повторить карту", "Картаны қайта жүктеу")}
              </Button>
            </div>
          )}
          <div className="map-grid">
            <div className="map-frame">
              <div
                ref={container}
                className="property-map"
                role="region"
                aria-label={t(
                  "Интерактивная карта: стрелки — перемещение, плюс и минус — масштаб",
                  "Интерактивті карта: көрсеткілер — жылжыту, қосу және азайту — масштаб",
                )}
              />
              <div className="map-attribution">
                <a href="https://leafletjs.com" target="_blank" rel="noopener">
                  Leaflet
                </a>{" "}
                · ©{" "}
                <a href={config.attributionUrl} target="_blank" rel="noopener">
                  {config.attribution}
                </a>
              </div>
            </div>
            <div
              ref={card}
              tabIndex={-1}
              className="map-card"
              role="region"
              aria-label={t("Выбранный объект", "Таңдалған нысан")}
            >
              {selected ? (
                <>
                  <div className="map-card-heading">
                    <div>
                      <p className="eyebrow">
                        {t("ВЫБРАННЫЙ ОБЪЕКТ", "ТАҢДАЛҒАН НЫСАН")}
                      </p>
                      <h3>{selected.name}</h3>
                    </div>
                    {selected.is_demo && (
                      <span className="demo-badge">DEMO</span>
                    )}
                  </div>
                  <p className="map-card-location">
                    <MapPin size={16} aria-hidden="true" />
                    <span>
                      {selected.city} · {selected.address}
                    </span>
                  </p>
                  <dl className="map-card-facts">
                    <div>
                      <dt>{t("Приоритет проверки", "Тексеру басымдығы")}</dt>
                      <dd>
                        <span
                          className={`zone ${selected.risk.zone.toLowerCase()}`}
                        >
                          <span className="zone-dot" aria-hidden="true" />
                          <strong>{selected.risk.score}</strong>{" "}
                          {copy.zones[selected.risk.zone]}
                        </span>
                        {propertyRiskContext(selected) && (
                          <span className="property-risk-context">
                            {copy.riskContexts[propertyRiskContext(selected)!]}
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("Правовое основание", "Құқықтық негіз")}</dt>
                      <dd>
                        {t(statusLabel(selected.legal_verification_status))}
                      </dd>
                    </div>
                  </dl>
                  <div className="map-card-reasons">
                    <span>
                      {t("Подтверждённые причины", "Расталған себептер")}
                    </span>
                    <strong>
                      {selected.risk.confirmed_codes.join(" · ") ||
                        t("Нет подтверждённых", "Расталған себептер жоқ")}
                    </strong>
                  </div>
                  <Button asChild className="map-card-action">
                    <Link href={propertyDossierUrl(selected.id, registryQuery)}>
                      {t("Открыть карточку", "Карточканы ашу")}
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </Button>
                </>
              ) : (
                <div className="map-card-empty">
                  <span className="map-card-pin" aria-hidden="true">
                    <MapPin size={22} />
                  </span>
                  <p className="eyebrow">
                    {t("СЛЕДУЮЩИЙ ШАГ", "КЕЛЕСІ ҚАДАМ")}
                  </p>
                  <h3>
                    {t("Выберите объект на карте", "Картадан нысанды таңдаңыз")}
                  </h3>
                  <p>
                    {t(
                      "Нажмите метку или выберите её клавишей Tab и нажмите Enter. Здесь появятся приоритет, правовой статус и переход в досье.",
                      "Белгіні басыңыз немесе Tab пернесімен таңдап, Enter басыңыз. Мұнда басымдық, құқықтық мәртебе және досьеге өту сілтемесі көрсетіледі.",
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
