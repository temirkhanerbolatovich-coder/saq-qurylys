"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Property } from "@/lib/types";
import { mapConfig } from "@/lib/map-config";
import { Button } from "@/components/ui/button";
import { propertyDossierUrl } from "@/lib/presentation";
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
            title: `Выбрать ${row.name}: ${row.risk.score}, ${zones[row.risk.zone]} зона`,
            keyboard: true,
          }).addTo(map);
          const select = () => {
            onSelect(row.id);
            card.current?.focus();
          };
          marker.on("click", select);
          const button = marker.getElement();
          button?.setAttribute("aria-label", marker.options.title!);
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
    };
  }, [rows, attempt, onSelect]);

  useEffect(() => {
    if (selectedId) card.current?.focus();
  }, [selectedId]);

  if (!rows.length) return null;
  return (
    <section className="property-map-section" aria-label="Карта объектов">
      <p className="map-note">
        DEMO-координаты условные и не указывают на реальные проекты. Зелёная
        зона не подтверждает безопасность.
      </p>
      <div className="map-legend" aria-label="Легенда карты">
        {Object.entries(zones).map(([zone, label]) => (
          <span className={`zone ${zone.toLowerCase()}`} key={zone}>
            <span className="zone-dot" />
            {label}
          </span>
        ))}
        <span>Число на метке — балл проверки</span>
      </div>
      <p className="map-note">
        На карте: {located.length} из {rows.length} объектов текущей страницы.
        Без пригодных координат: {rows.length - located.length}; они остаются в
        списке ниже.
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
          <a className="text-link map-skip" href="#property-list">
            Перейти к списку объектов
          </a>
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
                  <h2>{selected.name}</h2>
                  {selected.is_demo && <span className="demo-badge">DEMO</span>}
                  <p>
                    {selected.city} · {selected.address}
                  </p>
                  <p className={`zone ${selected.risk.zone.toLowerCase()}`}>
                    <span className="zone-dot" />
                    <strong>{selected.risk.score}</strong>{" "}
                    {zones[selected.risk.zone]}
                  </p>
                  <p>
                    Подтверждённые факторы:{" "}
                    {selected.risk.confirmed_codes.join(" · ") || "Нет"}
                  </p>
                  <Link
                    className="text-link"
                    href={propertyDossierUrl(selected.id, registryQuery)}
                  >
                    Открыть карточку
                  </Link>
                </>
              ) : (
                <>
                  <h2>Выберите объект на карте</h2>
                  <p>
                    Нажмите метку или выберите её клавишей Tab и нажмите Enter.
                    Сведения и причины проверки откроются здесь.
                  </p>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
