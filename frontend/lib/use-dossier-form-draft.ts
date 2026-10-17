"use client";

import { useLayoutEffect, useRef, type FormEvent } from "react";
import { useReviewDraft } from "@/lib/use-review-draft";

type Snapshot = {
  text: Record<string, string>;
  files: Record<string, string>;
};
type Memory = {
  updatedAt: number;
  files: Map<string, File[]>;
  retry: Map<string, unknown>;
};
const memories = new Map<string, Memory>();
const maxAge = 12 * 60 * 60 * 1000;

/** File objects and retry state live only in this tab, never in Web Storage. */
export function clearDossierFormDrafts() {
  memories.clear();
}

function snapshot(value: string): Snapshot {
  try {
    const parsed = JSON.parse(value);
    const strings = (record: unknown): Record<string, string> =>
      record && typeof record === "object"
        ? Object.fromEntries(
            Object.entries(record).filter(
              ([key, text]) =>
                key !== "__proto__" &&
                typeof text === "string" &&
                text.length <= 100_000,
            ),
          )
        : {};
    return { text: strings(parsed.text), files: strings(parsed.files) };
  } catch {
    return { text: {}, files: {} };
  }
}

/** Captures native dossier fields; each caller restores its controlled React state explicitly. */
export function useDossierFormDraft<T extends HTMLElement = HTMLElement>(
  userId: string,
  scope: string,
  restore: (fields: Record<string, string>, missingFiles: boolean) => void,
  decisionFieldIds: readonly string[] = [],
) {
  const draft = useReviewDraft(userId, `dossier:${scope}`, { fields: "" });
  const ref = useRef<T>(null);
  const restored = useRef(false);
  const restoreCallback = useRef(restore);
  restoreCallback.current = restore;
  const memoryKey = `${userId}:${scope}`;
  const previous = memories.get(memoryKey);
  if (!previous || Date.now() - previous.updatedAt > maxAge)
    memories.set(memoryKey, {
      updatedAt: Date.now(),
      files: new Map(),
      retry: new Map(),
    });
  const memory = memories.get(memoryKey)!;
  const stored = snapshot(draft.values.fields);

  useLayoutEffect(() => {
    if (!ref.current || !draft.restored) return;
    if (!restored.current) {
      restored.current = true;
      restoreCallback.current(
        stored.text,
        Object.keys(stored.files).some((id) => !memory.files.has(id)),
      );
    }
    // R3 options and conditional R6 fields may appear after the first restore.
    for (const field of ref.current.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >("input[id], textarea[id], select[id]")) {
      if (field instanceof HTMLInputElement && field.type === "file") {
        const files = memory.files.get(field.id);
        if (files?.length && !field.files?.length) {
          const transfer = new DataTransfer();
          for (const file of files) transfer.items.add(file);
          field.files = transfer.files;
        }
      } else if (Object.hasOwn(stored.text, field.id)) {
        const value = stored.text[field.id];
        if (
          !(field instanceof HTMLSelectElement) ||
          Array.from(field.options).some((option) => option.value === value)
        )
          field.value = value;
      }
    }
  });

  function capture(event?: FormEvent<HTMLElement>) {
    if (!ref.current) return;
    const next: Snapshot = { text: {}, files: { ...stored.files } };
    next.text.$formChanged =
      event?.target instanceof HTMLElement &&
      event.target.closest("form") &&
      !decisionFieldIds.includes(event.target.id)
        ? "true"
        : stored.text.$formChanged || "false";
    for (const field of ref.current.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >("input[id], textarea[id], select[id]")) {
      if (field instanceof HTMLInputElement && field.type === "file") {
        const files = Array.from(field.files || []);
        if (files.length) {
          memory.files.set(field.id, files);
          next.files[field.id] = files.map((file) => file.name).join(", ");
        } else if (memory.files.has(field.id)) {
          memory.files.delete(field.id);
          delete next.files[field.id];
        }
      } else next.text[field.id] = field.value;
    }
    memory.updatedAt = Date.now();
    draft.update({ fields: JSON.stringify(next) });
  }

  function saved() {
    draft.update({ fields: "" });
    draft.saved();
    memory.files.clear();
  }

  function remember<V>(name: string, initial: () => V): V {
    if (!memory.retry.has(name)) memory.retry.set(name, initial());
    return memory.retry.get(name) as V;
  }

  const missingFiles = Object.entries(stored.files)
    .filter(([id]) => !memory.files.has(id))
    .map(([, name]) => name);
  return {
    containerProps: { ref, onChangeCapture: capture },
    dirty: draft.dirty,
    hasFiles: Object.keys(stored.files).length > 0,
    restored: draft.restored,
    storageError: draft.storageError,
    missingFiles,
    saved,
    checkpoint: () => capture(),
    remember,
  };
}
