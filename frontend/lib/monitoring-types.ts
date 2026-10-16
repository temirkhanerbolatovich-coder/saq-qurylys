export type MonitoringResult =
  | "MATCHED_APPLICABLE_RECORD"
  | "NO_MATCH_IN_APPROVED_SNAPSHOT"
  | "RECORD_SCOPE_OR_STATUS_CONFLICT"
  | "REGISTRY_UNAVAILABLE"
  | "COVERAGE_OR_DATE_UNKNOWN"
  | "ENTITY_AMBIGUOUS";

export type MonitoringCandidate = {
  id: string;
  name: string;
  city: string;
  address: string | null;
  phase: string | null;
  is_demo: boolean;
  revision: number;
  created_at: string;
  last_result: MonitoringResult | null;
};

export type RegistryEntry = {
  name: string;
  city: string;
  address: string | null;
  phase: string | null;
  mechanism: "GUARANTEE" | "MIO_PERMIT";
  document_number: string;
  valid_from: string;
  valid_until: string | null;
  status: "ACTIVE" | "REVOKED";
};

export type RegistrySnapshot = {
  id: string;
  label: string;
  city: string;
  is_demo: boolean;
  coverage_from: string;
  coverage_until: string;
  expires_at: string;
  complete: boolean;
  entries: RegistryEntry[];
  created_at: string;
  created_by: string;
  sha256: string;
};

export type MonitoringComparison = {
  id: string;
  candidate_id: string;
  advertisement_id: string;
  snapshot_id: string | null;
  result: MonitoringResult;
  explanation: string;
  matched_entries: RegistryEntry[];
  created_at: string;
  algorithm_version: string;
};

export type IncidentState = "OPEN" | "IN_REVIEW" | "WAITING_DATA" | "CLOSED";
export type IncidentCloseReason =
  "MATCH_FOUND" | "NOT_APPLICABLE" | "DUPLICATE";
export type MonitoringIncident = {
  id: string;
  candidate_id: string;
  candidate_name: string;
  is_demo: boolean;
  rule_code: string;
  state: IncidentState;
  revision: number;
  created_at: string;
  updated_at: string;
  close_reason: IncidentCloseReason | null;
  latest_comparison_id: string;
  history: {
    action: string;
    state: IncidentState;
    reason: string;
    actor_id: string;
    occurred_at: string;
  }[];
};

export type MonitoringCandidateDetail = {
  candidate: MonitoringCandidate;
  advertisement_total: number;
  advertisements: {
    id: string;
    source_label: string;
    source_url: string | null;
    published_at: string | null;
    captured_at: string;
  }[];
  comparisons: MonitoringComparison[];
  incidents: MonitoringIncident[];
};
