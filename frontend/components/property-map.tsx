"use client";

import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Property } from "@/lib/types";
import { mapConfig } from "@/lib/map-config";
import { Button } from "@/components/ui/button";
import { statusLabel } from "@/lib/status-labels";
import { propertyDossierUrl, propertyRiskContext } from "@/lib/presentation";
import "leaflet/dist/leaflet.css";

const zones = { GREEN: "Зелёная", YELLOW: "Жёлтая", RED: "Красная" };

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
  const container = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const markerButtons = useRef(new Map<string, HTMLElement>());
  const currentSelection = useRef(selectedId);
  const [error, setError] = useState("");
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
          .zoom({ zoomInTitle: "Приблизить", zoomOutTitle: "Отдалить" })
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
          if (!disposed)
            setError(
              "Подложка карты недоступна или загружена не полностью. Объекты и список ниже доступны.",
            );
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
            title: `Выбрать ${row.name}: ${row.risk.score}, ${zones[row.risk.zone]} зона${propertyRiskContext(row) ? `; ${propertyRiskContext(row)}` : ""}`,
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
        if (!disposed)
          setError(
            "Не удалось загрузить карту. Используйте список ниже или повторите загрузку.",
          );
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
    <section className="property-map-section" aria-label="Карта объектов">
      <header className="map-section-heading">
        <div>
          <h2 id="property-map-title">Карта текущей страницы</h2>
          <a className="text-link map-skip" href="#property-list">
            Перейти к списку объектов
          </a>
        </div>
        <div
          className="map-count"
          aria-label={`${located.length} из ${rows.length} объектов показаны на карте`}
        >
          <strong>{located.length}</strong>
          <span>из {rows.length} на карте</span>
        </div>
      </header>
      <div className="map-context">
        <p className="map-note">
          DEMO-координаты условные и не указывают на реальные проекты. Зелёная
          зона не подтверждает безопасность.
        </p>
        <div className="map-legend" aria-label="Легенда карты">
          {Object.entries(zones).map(([zone, label]) => (
            <span className={`zone ${zone.toLowerCase()}`} key={zone}>
              <span className="zone-dot" aria-hidden="true" />
              {label}
            </span>
          ))}
          <span>Число на метке — балл проверки</span>
        </div>
      </div>
      <p className="map-note">
        Без пригодных координат: {rows.length - located.length}. Такие объекты
        остаются в списке ниже.
      </p>
      {!config ? (
        <p role="status" className="notice">
          Карта отключена или провайдер настроен некорректно. Используйте список
          ниже.
        </p>
      ) : !located.length ? (
        <p role="status" className="notice">
          Нет объектов с координатами для карты. Используйте список ниже.
        </p>
      ) : (
        <>
          {error && (
            <div role="status" className="notice">
              {error}{" "}
              <Button
                variant="outline"
                onClick={() => {
                  setError("");
                  setAttempt((value) => value + 1);
                }}
              >
                Повторить карту
              </Button>
            </div>
          )}
          <div className="map-grid">
            <div className="map-frame">
              <div
                ref={container}
                className="property-map"
                role="region"
                aria-label="Интерактивная карта: стрелки — перемещение, плюс и минус — масштаб"
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
              aria-label="Выбранный объект"
            >
              {selected ? (
                <>
                  <div className="map-card-heading">
                    <div>
                      <p className="eyebrow">ВЫБРАННЫЙ ОБЪЕКТ</p>
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
                      <dt>Приоритет проверки</dt>
                      <dd>
                        <span
                          className={`zone ${selected.risk.zone.toLowerCase()}`}
                        >
                          <span className="zone-dot" aria-hidden="true" />
                          <strong>{selected.risk.score}</strong>{" "}
                          {zones[selected.risk.zone]}
                        </span>
                        {propertyRiskContext(selected) && (
                          <span className="property-risk-context">
                            {propertyRiskContext(selected)}
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Правовое основание</dt>
                      <dd>{statusLabel(selected.legal_verification_status)}</dd>
                    </div>
                  </dl>
                  <div className="map-card-reasons">
                    <span>Подтверждённые причины</span>
                    <strong>
                      {selected.risk.confirmed_codes.join(" · ") ||
                        "Нет подтверждённых"}
                    </strong>
                  </div>
                  <Button asChild className="map-card-action">
                    <Link href={propertyDossierUrl(selected.id, registryQuery)}>
                      Открыть карточку
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </Button>
                </>
              ) : (
                <div className="map-card-empty">
                  <span className="map-card-pin" aria-hidden="true">
                    <MapPin size={22} />
                  </span>
                  <p className="eyebrow">СЛЕДУЮЩИЙ ШАГ</p>
                  <h3>Выберите объект на карте</h3>
                  <p>
                    Нажмите метку или выберите её клавишей Tab и нажмите Enter.
                    Здесь появятся приоритет, правовой статус и переход в досье.
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
