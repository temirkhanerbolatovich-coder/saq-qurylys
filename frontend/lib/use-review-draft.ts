"use client";

import { useEffect, useRef, useState } from "react";

const PREFIX = "saq:review-draft:";
const MAX_AGE = 12 * 60 * 60 * 1000;
type DraftValues = Record<string, string | boolean | null>;
const memoryDrafts = new Map<string, string>();

/** Clears tab-local review input at an authentication boundary. Never stores credentials. */
export function clearReviewDrafts() {
  memoryDrafts.clear();
  try {
    for (const key of Object.keys(sessionStorage))
      if (key.startsWith(PREFIX)) sessionStorage.removeItem(key);
  } catch {
    // Storage may be disabled; no persisted review input exists in that case.
  }
}

/** Only explicitly changed fields are stored, never the source or initial OCR text. */
export function useReviewDraft<T extends DraftValues>(
  userId: string,
  scope: string,
  initial: T,
  contextFields: (keyof T)[] = [],
) {
  const baseline = useRef(initial);
  const storageKey = useRef("");
  const [storageError, setStorageError] = useState("");
  const [restored, setRestored] = useState(false);
  const [values, setValues] = useState<T>(initial);
  const current = useRef(initial);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!userId) return;
    storageKey.current = `${PREFIX}${userId}:memory:${scope}`;
    let raw: string | null;
    try {
      let session = sessionStorage.getItem(`${PREFIX}session`);
      if (!session) {
        session = crypto.randomUUID();
        sessionStorage.setItem(`${PREFIX}session`, session);
      }
      storageKey.current = `${PREFIX}${userId}:${session}:${scope}`;
      const memory = memoryDrafts.get(storageKey.current);
      raw = memory || sessionStorage.getItem(storageKey.current);
      if (memory)
        setStorageError(
          "Черновик хранится только в памяти приложения. Перезагрузка или закрытие вкладки могут его удалить.",
        );
    } catch {
      raw = memoryDrafts.get(storageKey.current) || null;
      setStorageError(
        "Сохранение в хранилище вкладки недоступно. Черновик сохранится при переходах внутри приложения, но не после перезагрузки или закрытия вкладки.",
      );
    }
    try {
      if (!raw) return;
      const record = JSON.parse(raw);
      if (
        raw.length > 400_000 ||
        typeof record.updatedAt !== "number" ||
        Date.now() - record.updatedAt > MAX_AGE ||
        !record.values ||
        typeof record.values !== "object"
      ) {
        try {
          sessionStorage.removeItem(storageKey.current);
        } catch {
          /* Memory-only fallback. */
        }
        memoryDrafts.delete(storageKey.current);
        return;
      }
      const fields: Partial<T> = {};
      for (const field of Object.keys(initial) as (keyof T)[]) {
        const value = record.values[field];
        if (
          (typeof value === "string" &&
            value.length <= 100_000 &&
            (typeof initial[field] === "string" || initial[field] === null)) ||
          (value === null && initial[field] === null) ||
          (typeof value === "boolean" && typeof initial[field] === "boolean")
        )
          fields[field] = value as T[keyof T];
      }
      current.current = { ...initial, ...fields };
      setValues(current.current);
      setDirty(Object.keys(fields).some((key) => !contextFields.includes(key)));
      setRestored(Object.keys(fields).length > 0);
    } catch {
      setStorageError(
        "Локальное сохранение черновика недоступно. Не закрывайте вкладку до сохранения решения.",
      );
    }
    // Each caller is keyed by its material/extraction, so its initial values are immutable.
  }, [userId, scope]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function persist(next: T) {
    const fields: Partial<T> = {};
    for (const field of Object.keys(next) as (keyof T)[])
      if (next[field] !== baseline.current[field]) fields[field] = next[field];
    setDirty(Object.keys(fields).some((key) => !contextFields.includes(key)));
    try {
      if (!storageKey.current) throw new Error("Storage is not ready");
      if (Object.keys(fields).length)
        sessionStorage.setItem(
          storageKey.current,
          JSON.stringify({ updatedAt: Date.now(), values: fields }),
        );
      else sessionStorage.removeItem(storageKey.current);
      memoryDrafts.delete(storageKey.current);
      setStorageError("");
    } catch {
      if (Object.keys(fields).length)
        memoryDrafts.set(
          storageKey.current,
          JSON.stringify({ updatedAt: Date.now(), values: fields }),
        );
      else memoryDrafts.delete(storageKey.current);
      setStorageError(
        "Черновик хранится только в памяти приложения. Переходы внутри приложения сохранят ввод, перезагрузка или закрытие вкладки могут его удалить.",
      );
    }
  }

  function update(patch: Partial<T>) {
    const next = { ...current.current, ...patch };
    current.current = next;
    setValues(next);
    persist(next);
  }

  function saved(fields: (keyof T)[] = Object.keys(current.current)) {
    for (const field of fields)
      baseline.current[field] = current.current[field];
    persist(current.current);
    setRestored(false);
  }

  return { values, update, saved, dirty, restored, storageError };
}

/** Fingerprints permit retries with the same key without persisting command payloads. */
export async function reviewCommandFingerprint(path: string, body: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify({ path, body }));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
