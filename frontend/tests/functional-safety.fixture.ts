import type {
  Property,
  PropertyDetail,
  SignalDetail,
  User,
} from "../lib/types";

const now = "2026-10-19T00:00:00+05:00";
export const fixtureUser: User = {
  id: "60000000-0000-4000-8000-000000000001",
  username: "demo-analyst",
  display_name: "DEMO Аналитик",
  role: "analyst",
};
export const fixtureProperty: Property = {
  id: "60000000-0000-4000-8000-000000000002",
  parent_id: null,
  level: "PHASE",
  aliases: [],
  name: "DEMO Өркен · очередь 1",
  city: "Өскемен",
  address: "DEMO участок 1",
  latitude: null,
  longitude: null,
  stage: "UNKNOWN",
  progress_percent: null,
  legal_verification_status: "UNKNOWN",
  is_demo: true,
  last_reviewed_at: null,
  developer: { name: "DEMO компания", bin: null },
  risk: {
    revision: 1,
    score: 0,
    zone: "GREEN",
    confirmed_codes: [],
    unknown_codes: ["R1", "R2", "R3", "R4", "R5", "R6"],
    as_of: now,
    rules_version: "saq-rules-v1",
  },
};

/** Synthetic presentation responses. No API, database, OCR or legal decision is exercised. */
export function functionalSafetyFixture(code = "R4") {
  let actor: User | null = { ...fixtureUser };
  let conflict = false;
  const writes: string[] = [];
  const detail: PropertyDetail = {
    property: structuredClone(fixtureProperty),
    factors: [
      {
        id: "60000000-0000-4000-8000-000000000003",
        code,
        revision: 1,
        status: "PENDING",
        weight: 0,
        as_of: now,
        evidence_ids: [],
        reason: null,
      },
    ],
    legal_bases: [],
    advertisement_ids: [],
    unknown_information: ["Основание не проверено"],
  };
  const signals: SignalDetail[] = [1, 2].map((version) => ({
    signal: {
      id: `60000000-0000-4000-8000-${String(version + 10).padStart(12, "0")}`,
      property_id: fixtureProperty.id,
      version,
      revision: 1,
      previous_signal_id: null,
      state: "DRAFT",
      is_stale: false,
      risk_snapshot: structuredClone(fixtureProperty.risk),
      created_at: now,
      created_by: fixtureUser,
      is_demo: true,
      pdf_state: "NOT_REQUESTED",
      pdf_job_id: null,
    },
    snapshot: {
      property: structuredClone(fixtureProperty),
      legal_bases: [],
      factors: [],
      evidence: [],
      assets: [],
      unknown_information: ["Основание не проверено"],
      disclaimer: "DEMO · Сигнал не устанавливает нарушение.",
    },
    decisions: [],
  }));
  const page = (items: unknown[] = []) => ({
    items,
    total: items.length,
    page: 1,
    page_size: 25,
  });
  function response(method: string, pathname: string, payload: unknown = null) {
    if (method === "POST") writes.push(pathname);
    if (pathname.endsWith("/auth/csrf"))
      return { status: 200, json: { csrf_token: "demo-fixture" } };
    if (pathname.endsWith("/auth/logout")) {
      actor = null;
      return { status: 204 };
    }
    if (!actor)
      return {
        status: 401,
        json: { error: { message: "DEMO session expired" } },
      };
    if (pathname.endsWith("/auth/me")) return { status: 200, json: actor };
    if (pathname.endsWith("/dashboard/summary"))
      return {
        status: 200,
        json: {
          property_count: 1,
          zones: { GREEN: 1, YELLOW: 0, RED: 0 },
          new_advertisements: 0,
          pending_hypotheses: 0,
          pending_signals: 2,
          unknown_legal_bases: 1,
          calculated_at: now,
        },
      };
    if (pathname === "/api/v1/properties")
      return { status: 200, json: page([detail.property]) };
    if (pathname === `/api/v1/properties/${fixtureProperty.id}`)
      return { status: 200, json: detail };
    if (pathname.endsWith("/structure"))
      return {
        status: 200,
        json: {
          ancestors: [],
          children: page(),
          siblings: page(),
        },
      };
    if (pathname.endsWith("/advertisements/review-queue"))
      return {
        status: 200,
        json: {
          ...page(),
          action_totals: {
            REVIEW_HYPOTHESES: 0,
            REVIEW_MATCH: 0,
            CREATE_PAYMENT_EVIDENCE: 0,
            REVIEW_R2: 0,
          },
        },
      };
    if (pathname === "/api/v1/signals")
      return { status: 200, json: page(signals.map((item) => item.signal)) };
    const selected = signals.find(
      (item) =>
        pathname === `/api/v1/signals/${item.signal.id}` ||
        pathname === `/api/v1/signals/${item.signal.id}/decision`,
    );
    if (selected) {
      if (method === "POST") {
        if (conflict)
          return {
            status: 409,
            json: { error: { message: "DEMO версия изменилась" } },
          };
        const decision = payload as {
          action: "CONFIRM" | "RETURN";
          reason: string;
        };
        selected.signal.state =
          decision.action === "CONFIRM" ? "CONFIRMED" : "RETURNED";
        selected.signal.revision++;
        selected.decisions.push({
          id: "demo-decision",
          action: decision.action,
          actor,
          decided_at: now,
          reason: decision.reason,
        });
      }
      return { status: 200, json: selected };
    }
    if (pathname === "/api/v1/advertisements" && method === "POST") {
      const input = payload as {
        text: string;
        source_label: string;
        is_demo: boolean;
      };
      return {
        status: 201,
        json: {
          id: "60000000-0000-4000-8000-000000000030",
          revision: 1,
          latest_job_id: null,
          original_text: input.text,
          source_label: input.source_label,
          source_url: null,
          published_at: null,
          captured_at: now,
          status: "NEW",
          assets: [],
          is_demo: input.is_demo,
          confirmed_property_id: null,
        },
      };
    }
    return { status: 200, json: page() };
  }
  return {
    detail,
    signals,
    writes,
    response,
    setActor(value: User | null) {
      actor = value;
    },
    setConflict(value: boolean) {
      conflict = value;
    },
  };
}
