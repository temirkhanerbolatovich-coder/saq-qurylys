from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import AwareDatetime, Field, HttpUrl, field_validator, model_validator

from app.dto import DTO, AdvertisementOut, AssetOut, ErrorOut, Page, RiskCode, RiskFactorOut, RiskSummaryOut
from app.legal_absence import LegalMechanismCheck


class ReviewInput(DTO):
    @field_validator('*')
    @classmethod
    def meaningful_input(cls, value, info):
        if (
            info.field_name in {'reason', 'description', 'source_label', 'text'}
            and isinstance(value, str)
            and not value.strip()
        ):
            raise ValueError('Поле не может состоять из пробелов')
        if info.field_name == 'evidence_ids' and (len(value) > 100 or len(set(value)) != len(value)):
            raise ValueError('Укажите до 100 уникальных доказательств')
        return value


class AnalysisRequest(DTO):
    expected_advertisement_revision: int = Field(ge=1)


class AnalysisJobOut(DTO):
    id: UUID
    kind: Literal['IMPORT_URL', 'ANALYZE', 'RENDER_PDF']
    state: Literal['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'BLOCKED']
    stage: str
    attempt: int
    created_at: datetime
    updated_at: datetime
    advertisement_id: UUID | None
    signal_id: UUID | None = None
    result_asset_id: UUID | None
    error: ErrorOut | None


class BoundingBox(DTO):
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    width: int = Field(ge=1)
    height: int = Field(ge=1)


class Fragment(DTO):
    asset_id: UUID
    text_version_id: UUID
    quote: str = Field(min_length=1, max_length=2000)
    start_offset: int = Field(ge=0)
    end_offset: int = Field(ge=1)
    bbox: BoundingBox | None

    @model_validator(mode='after')
    def valid_range(self):
        if self.end_offset <= self.start_offset:
            raise ValueError('Invalid fragment offsets')
        return self


class Money(DTO):
    amount: str = Field(pattern=r'^\d+(\.\d{1,2})?$')
    currency: Literal['KZT', 'USD', 'EUR', 'UNKNOWN']


class HypothesisValue(DTO):
    text: str | None = Field(max_length=2000)
    money: Money | None
    percent: float | None = Field(ge=0, le=100)


class Hypothesis(DTO):
    id: UUID
    field: Literal['PROPERTY_NAME', 'PAYMENT_TERM', 'AMOUNT', 'STAGE', 'COMPLETION_DATE', 'LEGAL_DOCUMENT']
    value: HypothesisValue
    fragment: Fragment
    confidence: float | None = Field(ge=0, le=1)
    review_status: Literal['PENDING', 'CONFIRMED', 'CORRECTED', 'REJECTED']
    reviewed_value: HypothesisValue | None


class ExtractionOut(DTO):
    id: UUID
    advertisement_id: UUID
    parent_extraction_id: UUID | None
    revision: int
    pipeline_version: str
    original_ocr_text: str | None
    analysis_text: str
    hypotheses: list[Hypothesis]
    created_at: datetime
    warnings: list[str]


class ExtractionReview(ReviewInput):
    expected_revision: int = Field(ge=1)
    hypothesis_id: UUID
    action: Literal['CONFIRM', 'CORRECT', 'REJECT']
    corrected_value: HypothesisValue | None = None
    reason: str = Field(min_length=1, max_length=2000)

    @model_validator(mode='after')
    def correction_has_value(self):
        if not self.reason.strip():
            raise ValueError('Укажите причину')
        if self.action == 'CORRECT' and (
            self.corrected_value is None
            or not any(value is not None for value in self.corrected_value.model_dump().values())
        ):
            raise ValueError('Укажите исправленное значение')
        if self.action != 'CORRECT' and self.corrected_value is not None:
            raise ValueError('Исправленное значение допустимо только для CORRECT')
        return self


class TranscriptionRequest(ReviewInput):
    expected_revision: int = Field(ge=1)
    text: str = Field(min_length=1, max_length=100000)
    reason: str = Field(min_length=1, max_length=2000)


class PropertyMatchOut(DTO):
    id: UUID
    advertisement_id: UUID
    property_id: UUID
    extraction_id: UUID
    similarity: float
    reasons: list[str]
    status: Literal['PENDING', 'CONFIRMED', 'REJECTED']
    revision: int


ReviewAction = Literal['REVIEW_HYPOTHESES', 'REVIEW_MATCH', 'CREATE_PAYMENT_EVIDENCE', 'REVIEW_R2']


class PaymentReviewTarget(DTO):
    property_id: UUID
    property_name: str | None = None
    factor_id: UUID | None
    evidence_ids: list[UUID]


class AdvertisementReviewWork(DTO):
    advertisement_id: UUID
    extraction_id: UUID
    extraction_revision: int
    actions: list[ReviewAction]
    pending_hypothesis_ids: list[UUID]
    needs_property_match: bool
    payment_hypothesis_ids: list[UUID]
    r2_reviews: list[PaymentReviewTarget]


class AdvertisementReviewItem(AdvertisementReviewWork):
    advertisement: AdvertisementOut


class AdvertisementReviewPage(Page[AdvertisementReviewItem]):
    action_totals: dict[ReviewAction, int]


class PublicationComparisonSide(DTO):
    advertisement_id: UUID
    advertisement_revision: int
    source_label: str
    source_url: str | None
    published_at: datetime | None
    captured_at: datetime
    is_demo: bool
    text_basis: Literal['ORIGINAL', 'EXTRACTION']
    extraction_id: UUID | None
    extraction_revision: int | None
    pipeline_version: str | None
    analysis_created_at: datetime | None
    source_asset_id: UUID | None
    original_assets: list[AssetOut]
    text: str | None
    text_sha256: str | None


class PublicationTextChange(DTO):
    kind: Literal['REPLACE', 'INSERT', 'DELETE']
    left_start_line: int = Field(ge=0)
    left_end_line: int = Field(ge=0)
    right_start_line: int = Field(ge=0)
    right_end_line: int = Field(ge=0)
    left_text: str
    right_text: str


class PublicationComparison(DTO):
    left: PublicationComparisonSide
    right: PublicationComparisonSide
    status: Literal['IDENTICAL_TEXT', 'DIFFERENT_TEXT', 'TEXT_UNAVAILABLE']
    same_advertisement: bool
    same_source_url: bool | None
    changes: list[PublicationTextChange]


class MatchReview(ReviewInput):
    property_id: UUID
    candidate_id: UUID | None = None
    expected_advertisement_revision: int = Field(ge=1)
    action: Literal['CONFIRM', 'REJECT']
    reason: str = Field(min_length=1, max_length=2000)


class EvidenceCreate(ReviewInput):
    property_id: UUID
    kind: Literal[
        'ADVERTISEMENT_FRAGMENT',
        'LEGAL_DOCUMENT',
        'LEGAL_ABSENCE_REVIEW',
        'COLLECTIVE_APPEAL',
        'PROGRESS_MEASUREMENT',
        'DELAY_DOCUMENT',
        'CONSTRUCTION_STAGE',
        'ADVERTISEMENT_PUBLICATION',
    ]
    asset_id: UUID
    advertisement_id: UUID | None = None
    extraction_id: UUID | None = None
    hypothesis_id: UUID | None = None
    legal_basis_id: UUID | None = None
    fragment: Fragment | None = None
    description: str = Field(min_length=1, max_length=2000)
    source_label: str = Field(min_length=1, max_length=300)
    source_url: HttpUrl | None = None
    event_at: AwareDatetime | None
    measurement_percent: float | None = Field(default=None, ge=0, le=100)
    methodology: str | None = Field(default=None, min_length=1, max_length=2000)
    signatory_count: int | None = Field(default=None, ge=2, le=100000)
    construction_stage: Literal['UNDER_CONSTRUCTION', 'COMPLETED'] | None = None
    measurement_role: Literal['DECLARED', 'VERIFIED'] | None = None
    comparison_key: str | None = Field(default=None, min_length=1, max_length=300)
    planned_completion_at: AwareDatetime | None = None
    actual_completion_at: AwareDatetime | None = None
    delay_status: Literal['NOT_COMPLETED', 'COMPLETED_LATE'] | None = None
    absence_as_of: AwareDatetime | None = None
    scope_description: str | None = Field(default=None, min_length=1, max_length=2000)
    legal_checks: list[LegalMechanismCheck] | None = Field(default=None, min_length=1, max_length=3)
    is_demo: bool


class EvidenceOut(EvidenceCreate):
    id: UUID
    captured_at: datetime
    created_by: UUID


class RiskFactorCreate(ReviewInput):
    code: RiskCode
    as_of: AwareDatetime
    evidence_ids: list[UUID] = Field(min_length=1)
    reason: str = Field(min_length=1, max_length=2000)


class RiskFactorReview(ReviewInput):
    expected_revision: int = Field(ge=1)
    status: Literal['CONFIRMED', 'REJECTED', 'PENDING']
    evidence_ids: list[UUID]
    reason: str = Field(min_length=1, max_length=2000)
    as_of: AwareDatetime | None = None


class RiskReviewOut(DTO):
    factor: RiskFactorOut
    risk: RiskSummaryOut


class AuditEventOut(DTO):
    id: UUID
    actor_id: UUID
    actor_display_name: str | None = None
    risk_code: RiskCode | None = None
    occurred_at: datetime
    action: str
    entity_type: str
    entity_id: UUID
    old_revision: int | None
    new_revision: int | None
    reason: str | None
    request_id: UUID
    details: dict[str, Any]
