import { useSearchParams } from "next/navigation";

export type V2Parameters = {
  dictionary_version: "2.0";
  dictionary_id: string;
  source_code: "OFFLINE";
  keyword: boolean;
  hashtag: boolean;
  budget: number;
  max_query_length: number;
  language: "both" | "ru" | "kk";
};
export type V2Profile = {
  id: string;
  name: string;
  revision: number;
  current_revision: number;
  dictionary_sha256: string;
  parameters: V2Parameters;
  compiled_preview: {
    queries: {
      id: string;
      text: string;
      discovery: string;
      capability_status: string;
    }[];
    omitted_queries: { id: string; text: string; skip_reason: string }[];
  };
};
export type Dictionary = {
  id: string;
  dictionary_version: string;
  content_sha256: string;
  created_at: string;
};
export type Activation = {
  revision: number;
  dictionary_id: string | null;
  reason: string | null;
  created_at: string | null;
};
export type Finding = {
  id: string;
  version_id: string;
  version: number;
  external_id: string;
  is_demo: boolean;
  source_url: string;
  published_at: string | null;
  captured_at: string;
  dictionary_sha256: string;
  content_sha256: string;
  rules_version: string;
  media_type: string;
  priority: string;
  advertisement_id: string | null;
};
export type FindingDetail = Finding & {
  text: string | null;
  context: {
    priority_reason: string;
    content_limits: string[];
    matched_spans: { kind: string; text: string; start: number; end: number }[];
  };
};
export type Observation = {
  id: string;
  version_id: string;
  run_id: string;
  profile_version_id: string;
  query_id: string;
  captured_at: string;
  has_more: boolean;
  raw_response_sha256: string;
};
export const priorities = [
  "P1",
  "P2",
  "P3",
  "NOT_RELEVANT",
  "NEEDS_CONTEXT",
] as const;
export const priorityNames: Record<string, [string, string]> = {
  P1: ["P1 · проверить условия оплаты", "P1 · төлем шарттарын тексеру"],
  P2: ["P2 · проверить предложение", "P2 · ұсынысты тексеру"],
  P3: ["P3 · региональное предложение", "P3 · өңірлік ұсыныс"],
  NOT_RELEVANT: ["Предположительно не относится", "Қатысы жоқ болуы мүмкін"],
  NEEDS_CONTEXT: ["Нужен контекст", "Мәнмәтін қажет"],
};
export const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const positive = (value: string | null) =>
  value !== null && /^[1-9]\d{0,8}$/.test(value);

/** Change only V2 state; retain existing candidate, source and legacy profile links. */
export function useV2Navigation() {
  const params = useSearchParams();
  function href(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes))
      if (value === null) next.delete(key);
      else next.set(key, value);
    return `/monitoring?${next}`;
  }
  function select(changes: Record<string, string | null>) {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes))
      if (value === null) next.delete(key);
      else next.set(key, value);
    window.history.pushState(null, "", `/monitoring?${next}`);
  }
  return { params, select, href };
}
