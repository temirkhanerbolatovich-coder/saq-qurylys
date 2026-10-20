"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { kazakhCopy } from "@/lib/ui-copy";
import { workspaceKazakhCopy } from "@/lib/ui-copy-workspace";
import { workflowKazakhCopy } from "@/lib/ui-copy-workflows";
import { reviewKazakhCopy } from "@/lib/ui-copy-review";

export type Locale = "ru" | "kk";
type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (ru: string, kk?: string) => string;
};
const LocaleContext = createContext<LocaleContextValue>({
  locale: "ru",
  setLocale: () => {},
  t: (ru) => ru,
});

/** Translates authored interface copy only; original sources and decisions stay intact. */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>("ru");
  const applyLocale = useCallback((next: Locale) => {
    // Shared date formatting reads the active document language during render.
    document.documentElement.lang = next;
    updateLocale(next);
  }, []);
  useEffect(() => {
    try {
      applyLocale(localStorage.getItem("saq-locale") === "kk" ? "kk" : "ru");
    } catch {
      // The interface remains usable when browser preference storage is unavailable.
    }
    function synchronize(event: StorageEvent) {
      if (event.key === "saq-locale")
        applyLocale(event.newValue === "kk" ? "kk" : "ru");
    }
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, [applyLocale]);
  function setLocale(next: Locale) {
    if (next !== "ru" && next !== "kk") return;
    applyLocale(next);
    try {
      localStorage.setItem("saq-locale", next);
    } catch {
      // A presentation preference must not block navigation or discard a draft.
    }
  }
  return (
    <LocaleContext.Provider
      value={{
        locale,
        setLocale,
        t: (ru, kk) =>
          locale === "kk"
            ? kk ||
              ru.replace(
                /\S(?:[\s\S]*\S)?/,
                (copy) =>
                  kazakhCopy[copy] ||
                  workspaceKazakhCopy[copy] ||
                  workflowKazakhCopy[copy] ||
                  reviewKazakhCopy[copy] ||
                  copy,
              ) ||
              ru
            : ru,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
