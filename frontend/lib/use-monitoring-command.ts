"use client";

import { useContext, useRef, useState } from "react";
import { Auth } from "@/components/workspace";
import { command } from "@/lib/api";
import {
  useReviewDraft,
  reviewCommandFingerprint,
} from "@/lib/use-review-draft";

export function useMonitoringCommand(scope?: string) {
  const { user } = useContext(Auth);
  const retry = useReviewDraft(
    scope ? user?.id || "" : "",
    `monitoring-command:${scope || "transient"}`,
    { fingerprint: "", key: "" },
    ["fingerprint", "key"],
  );
  const pending = useRef<{ payload: string; key: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return {
    busy,
    error,
    storageError: scope ? retry.storageError : "",
    async run<T>(path: string, body: unknown): Promise<T | null> {
      const payload = JSON.stringify({ path, body });
      if (pending.current?.payload !== payload)
        pending.current = { payload, key: crypto.randomUUID() };
      setBusy(true);
      setError("");
      try {
        if (scope) {
          const fingerprint = await reviewCommandFingerprint(path, body);
          const key =
            retry.values.fingerprint === fingerprint && retry.values.key
              ? retry.values.key
              : pending.current.key;
          pending.current = { payload, key };
          retry.update({ fingerprint, key });
        }
        const result = await command<T>(path, body, pending.current.key);
        pending.current = null;
        if (scope) {
          retry.update({ fingerprint: "", key: "" });
          retry.saved();
        }
        return result;
      } catch (e) {
        setError((e as Error).message);
        return null;
      } finally {
        setBusy(false);
      }
    },
  };
}
