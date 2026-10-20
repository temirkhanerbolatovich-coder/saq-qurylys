"use client";

import { useEffect, type ReactNode, type KeyboardEvent } from "react";
import { useSearchParams } from "next/navigation";

export type WorkspaceTab = { id: string; label: string };

/** URL-backed navigation. Panels stay mounted; only the selected panel is exposed. */
export function useWorkspaceSection(
  tabs: readonly WorkspaceTab[],
  legacySection: (hash: string) => string | undefined,
) {
  const params = useSearchParams();
  const query = params.toString();
  const requested = params.get("section");
  const active = tabs.some((tab) => tab.id === requested)
    ? requested!
    : tabs[0].id;
  useEffect(() => {
    function restoreLegacy() {
      const section = legacySection(window.location.hash.slice(1));
      if (
        !section ||
        new URLSearchParams(window.location.search).get("section") === section
      )
        return;
      const next = new URLSearchParams(window.location.search);
      next.set("section", section);
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}?${next}${window.location.hash}`,
      );
    }
    restoreLegacy();
    window.addEventListener("hashchange", restoreLegacy);
    return () => window.removeEventListener("hashchange", restoreLegacy);
  }, [query, legacySection]);
  function select(section: string) {
    if (!tabs.some((tab) => tab.id === section)) return;
    const next = new URLSearchParams(window.location.search);
    if (
      section === (next.get("section") || tabs[0].id) &&
      !window.location.hash
    )
      return;
    next.set("section", section);
    window.history.pushState(null, "", `${window.location.pathname}?${next}`);
  }
  return { active, select };
}

export function WorkspaceTabs({
  tabs,
  active,
  onSelect,
  prefix,
  label,
}: {
  tabs: readonly WorkspaceTab[];
  active: string;
  onSelect: (id: string) => void;
  prefix: string;
  label: string;
}) {
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft")
      next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    document.getElementById(`${prefix}-tab-${tabs[next].id}`)?.focus();
    onSelect(tabs[next].id);
  }
  return (
    <div role="tablist" aria-label={label} className="workspace-tabs">
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`${prefix}-tab-${tab.id}`}
          aria-controls={`${prefix}-panel-${tab.id}`}
          aria-selected={active === tab.id}
          tabIndex={active === tab.id ? 0 : -1}
          onClick={() => onSelect(tab.id)}
          onKeyDown={(event) => navigate(event, index)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function WorkspacePanel({
  id,
  active,
  prefix,
  children,
}: {
  id: string;
  active: string;
  prefix: string;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      className="workspace-panel"
      tabIndex={0}
      id={`${prefix}-panel-${id}`}
      aria-labelledby={`${prefix}-tab-${id}`}
      hidden={active !== id}
    >
      {children}
    </div>
  );
}
