"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

const key = "saq:registry-context";
export function clearRegistryContext() {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* Optional navigation context. */
  }
}

/** Restore only the same user's exact registry query after its results have loaded. */
export function useRegistryContext(
  userId: string,
  query: string,
  ready: boolean,
) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const restored = useRef(false);
  const pendingRestore = useRef<{
    selectedId: string | null;
    href: string;
    label: string | null;
    mapCard: boolean;
    y: number;
  } | null>(null);
  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || "null");
      if (
        saved?.userId !== userId ||
        saved.query !== query ||
        typeof saved.at !== "number" ||
        Date.now() - saved.at > 12 * 3600_000 ||
        !Number.isFinite(saved.y)
      )
        return;
      pendingRestore.current = saved;
      if (typeof saved.selectedId === "string") setSelectedId(saved.selectedId);
    } catch {
      /* Missing or blocked storage keeps ordinary browser navigation. */
    }
  }, [userId, query, ready]);
  useEffect(() => {
    const saved = pendingRestore.current;
    // Wait for the restored marker/card to commit before choosing the focus target.
    if (!ready || !saved || selectedId !== saved.selectedId) return;
    const frame = requestAnimationFrame(() => {
      const link = Array.from(
        document.querySelectorAll<HTMLAnchorElement>(
          saved.mapCard ? ".map-card a" : ".registry-panel a",
        ),
      ).find(
        (element) =>
          element.getAttribute("href") === saved.href &&
          element.getAttribute("aria-label") === saved.label &&
          // The brief registry has a table on desktop and cards on phones.
          element.getClientRects().length > 0,
      );
      link?.focus({ preventScroll: true });
      window.scrollTo({ top: Math.max(0, saved.y), behavior: "instant" });
      pendingRestore.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedId, ready]);
  function remember(event: MouseEvent<HTMLElement>) {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a");
    if (!link || !/^\/properties\/[^/?]+/.test(link.getAttribute("href") || ""))
      return;
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify({
          userId,
          query,
          selectedId,
          href: link.getAttribute("href"),
          label: link.getAttribute("aria-label"),
          mapCard: !!link.closest(".map-card"),
          y: window.scrollY,
          at: Date.now(),
        }),
      );
    } catch {
      /* Optional context must not block opening a dossier. */
    }
  }
  return { selectedId, setSelectedId, remember };
}
