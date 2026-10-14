export type User = {
  id: string;
  username: string;
  display_name: string;
  role: "analyst" | "viewer";
};
export type Risk = {
  score: number;
  zone: "GREEN" | "YELLOW" | "RED";
  confirmed_codes: string[];
  unknown_codes: string[];
  as_of: string;
  rules_version: string;
};
export type Property = {
  id: string;
  name: string;
  city: string;
  address: string;
  stage: string;
  progress_percent: number | null;
  legal_verification_status: string;
  is_demo: boolean;
  last_reviewed_at: string | null;
  developer: { name: string; bin: string | null };
  risk: Risk;
};
export type Asset = {
  id: string;
  kind: string;
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
export type PropertyDetail = {
  property: Property;
  factors: {
    id: string;
    revision: number;
    code: string;
    status: string;
    weight: number;
    evidence_ids: string[];
    reason: string | null;
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
};
