export type User = {
  id: string;
  username: string;
  display_name: string;
  role: "analyst" | "viewer";
};
export type Risk = {
  revision: number;
  score: number;
  zone: "GREEN" | "YELLOW" | "RED";
  confirmed_codes: string[];
  unknown_codes: string[];
  as_of: string;
  rules_version: string;
};
export type Property = {
  revision: number;
  id: string;
  parent_id: string | null;
  level: "PROJECT" | "PHASE" | "BUILDING";
  aliases: string[];
  name: string;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  stage: string;
  progress_percent: number | null;
  legal_verification_status: string;
  legal_absence_as_of?: string | null;
  is_demo: boolean;
  last_reviewed_at: string | null;
  developer: { name: string; bin: string | null };
  risk: Risk;
};
export type PropertyReference = Pick<
  Property,
  "id" | "parent_id" | "level" | "name" | "address" | "is_demo"
>;
export type PropertyStructure = {
  ancestors: PropertyReference[];
  children: Page<PropertyReference>;
  siblings: Page<PropertyReference>;
};
export type Asset = {
  id: string;
  kind: string;
  mime_type?: string;
  sha256: string;
  byte_size: number;
  captured_at: string;
  is_demo: boolean;
};
export type Advertisement = {
  id: string;
  revision: number;
  latest_job_id: string | null;
  source_label: string;
  source_url: string | null;
  original_text: string;
  published_at: string | null;
  captured_at: string;
  status: string;
  assets: Asset[];
  is_demo: boolean;
  confirmed_property_id: string | null;
};
export type Page<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
};
export type ReviewAction =
  | "REVIEW_HYPOTHESES"
  | "REVIEW_MATCH"
  | "CREATE_PAYMENT_EVIDENCE"
  | "REVIEW_R2";
export type AdvertisementReviewItem = {
  advertisement: Advertisement;
  advertisement_id: string;
  extraction_id: string;
  extraction_revision: number;
  actions: ReviewAction[];
  pending_hypothesis_ids: string[];
  needs_property_match: boolean;
  payment_hypothesis_ids: string[];
  r2_reviews: {
    property_id: string;
    property_name?: string | null;
    factor_id: string | null;
    evidence_ids: string[];
  }[];
};
export type AdvertisementReviewPage = Page<AdvertisementReviewItem> & {
  action_totals: Record<ReviewAction, number>;
};
export type AuditEvent = {
  id: string;
  actor_id: string;
  actor_display_name: string | null;
  risk_code: string | null;
  occurred_at: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_revision: number | null;
  new_revision: number | null;
  reason: string | null;
  details: Record<string, unknown>;
};
export type PropertyDetail = {
  source_candidate_id?: string | null;
  linked_candidate_count?: number;
  property: Property;
  factors: {
    id: string;
    revision: number;
    code: string;
    status: string;
    weight: number;
    as_of: string;
    evidence_ids: string[];
    reason: string | null;
    reviewed_by?: string | null;
    reviewed_by_details?: User | null;
    reviewed_at?: string | null;
  }[];
  legal_bases: {
    id: string;
    mechanism: string;
    document_number: string | null;
    document_date: string | null;
    issuer: string;
    scope_description: string;
    asset_id: string;
    is_demo: boolean;
    revision: number;
    verification_status: string;
    applies_from: string | null;
    applies_until: string | null;
    verification_as_of: string | null;
    reviewed_at: string | null;
    reviewed_by?: string | null;
    reviewed_by_details?: User | null;
    evidence_ids: string[];
  }[];
  advertisement_ids: string[];
  unknown_information: string[];
};

export type Job = {
  id: string;
  state: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "BLOCKED";
  stage: string;
  attempt: number;
  error: { error: { message: string } } | null;
};
export type Value = {
  text: string | null;
  money: { amount: string; currency: "KZT" | "USD" | "EUR" | "UNKNOWN" } | null;
  percent: number | null;
};
export type Hypothesis = {
  id: string;
  field: string;
  origin?: "AUTO" | "MANUAL";
  proposed_by?: User | null;
  proposed_at?: string | null;
  proposal_reason?: string | null;
  reviewed_by?: User | null;
  reviewed_at?: string | null;
  review_reason?: string | null;
  value: Value;
  reviewed_value: Value | null;
  review_status: string;
  fragment: {
    asset_id: string;
    text_version_id: string;
    quote: string;
    start_offset: number;
    end_offset: number;
    bbox: { x: number; y: number; width: number; height: number } | null;
  };
};
export type Extraction = {
  id: string;
  revision: number;
  parent_extraction_id: string | null;
  pipeline_version: string;
  original_ocr_text: string | null;
  analysis_text: string;
  hypotheses: Hypothesis[];
  warnings: string[];
  created_at: string;
};
export type Match = {
  id: string;
  property_id: string;
  status: string;
  similarity: number;
  reasons: string[];
};
export type Dashboard = {
  property_count: number;
  zones: Record<"GREEN" | "YELLOW" | "RED", number>;
  new_advertisements: number;
  pending_hypotheses: number;
  pending_signals: number;
  unknown_legal_bases: number;
  calculated_at: string;
};
export type Evidence = {
  id: string;
  description: string;
  source_label: string;
  asset_id: string;
  captured_at: string;
  is_demo: boolean;
  event_at?: string | null;
  published_at?: string | null;
  date_basis?: "PUBLICATION" | "CAPTURE_ONLY" | "LEGACY_UNSPECIFIED";
  methodology?: string | null;
  signatory_count?: number | null;
  construction_stage?: "UNDER_CONSTRUCTION" | "COMPLETED" | null;
  measurement_percent?: number | null;
  measurement_role?: "DECLARED" | "VERIFIED" | null;
  comparison_key?: string | null;
  planned_completion_at?: string | null;
  actual_completion_at?: string | null;
  delay_status?: "NOT_COMPLETED" | "COMPLETED_LATE" | null;
  absence_as_of?: string | null;
  scope_description?: string | null;
  legal_checks?:
    | {
        mechanism: string;
        result: "DOCUMENTED_ABSENT" | "NOT_FOUND" | "UNAVAILABLE" | "UNKNOWN";
        reason: string;
      }[]
    | null;
};

export type Signal = {
  id: string;
  property_id: string;
  version: number;
  revision: number;
  previous_signal_id: string | null;
  state: "DRAFT" | "CONFIRMED" | "RETURNED";
  is_stale: boolean;
  risk_snapshot: Risk;
  created_at: string;
  created_by: User;
  is_demo: boolean;
  pdf_state: "NOT_REQUESTED" | "QUEUED" | "READY" | "FAILED";
  pdf_job_id: string | null;
};

export type SignalEvidence = Evidence & {
  kind: string;
  source_url: string | null;
  advertisement_id: string | null;
  fragment: { quote: string } | null;
};

export type SignalDetail = {
  signal: Signal;
  snapshot: {
    property: Property;
    legal_bases: PropertyDetail["legal_bases"];
    factors: PropertyDetail["factors"];
    evidence: SignalEvidence[];
    assets: Asset[];
    unknown_information: string[];
    disclaimer: string;
  };
  decisions: {
    id: string;
    action: "CONFIRM" | "RETURN";
    actor: User;
    decided_at: string;
    reason: string;
  }[];
};
