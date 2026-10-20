"use client";

import { useLocale } from "@/lib/locale";

/** Original SAQ mark: a building framed by a protective open shield. */
export function BrandLogo({ compact = false }: { compact?: boolean }) {
  const { t } = useLocale();
  return (
    <span className={`saq-brand${compact ? " saq-brand-compact" : ""}`}>
      <svg
        className="saq-brand-mark"
        viewBox="0 0 40 44"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M20 2 36 8v13c0 10-7 17-16 21C11 38 4 31 4 21V8L20 2Z"
          fill="currentColor"
        />
        <path
          d="M11 29V17l9-6v18M20 15l9 5v9M10 32h20"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 20v2m0 3v2m10-4v2"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      {!compact && (
        <span className="saq-brand-name">
          SAQ <b>QURYLYS</b>
          <small>{t("Аналитика строительства", "Құрылыс талдауы")}</small>
        </span>
      )}
    </span>
  );
}
