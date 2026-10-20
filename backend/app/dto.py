from datetime import datetime
from typing import Generic, Literal, TypeVar
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, HttpUrl, field_validator

RiskCode = Literal['R1', 'R2', 'R3', 'R4', 'R5', 'R6']
RiskZone = Literal['GREEN', 'YELLOW', 'RED']
LegalStatus = Literal['UNKNOWN', 'PENDING', 'VERIFIED_VALID', 'VERIFIED_ABSENT', 'REJECTED']
LegalMechanism = Literal['KZHK_GUARANTEE', 'BANK_WITH_MIO_PERMIT', 'FRAME_WITH_MIO_PERMIT']


class DTO(BaseModel):
    model_config = ConfigDict(extra='forbid', from_attributes=True)


class LoginRequest(DTO):
    username: str = Field(min_length=1, max_length=300)
    password: str = Field(min_length=1, max_length=512)


class UserOut(DTO):
    id: UUID
    username: str
    display_name: str
    role: Literal['analyst', 'viewer']


class CsrfToken(DTO):
    csrf_token: str


class ErrorDetail(DTO):
    code: str
    message: str
    request_id: UUID
    fields: list[dict[str, str]] = Field(default_factory=list)


class ErrorOut(DTO):
    error: ErrorDetail


class AdvertisementCreate(DTO):
    text: str = Field(min_length=1, max_length=100000)
    source_label: str = Field(min_length=1, max_length=300)
    source_url: HttpUrl | None = Field(default=None, max_length=2048)
    published_at: AwareDatetime | None = None
    is_demo: bool

    @field_validator('text', 'source_label')
    @classmethod
    def reject_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError('Поле не может состоять только из пробелов')
        return value


class AssetOut(DTO):
    id: UUID
    kind: Literal['TEXT', 'OCR_TEXT', 'HTML', 'IMAGE', 'DOCUMENT', 'SIGNAL_PDF']
    mime_type: str
    byte_size: int
    sha256: str
    captured_at: datetime
    is_demo: bool


class AdvertisementOut(DTO):
    id: UUID
    revision: int
    source_label: str
    source_url: str | None
    published_at: datetime | None
    captured_at: datetime
    original_text: str | None
    assets: list[AssetOut]
    is_demo: bool
    status: Literal['NEW', 'ANALYZING', 'READY_FOR_REVIEW', 'REVIEWED', 'FAILED']
    confirmed_property_id: UUID | None
    latest_job_id: UUID | None = None


class DeveloperOut(DTO):
    id: UUID
    name: str
    bin: str | None
    is_demo: bool


class RiskSummaryOut(DTO):
    score: int
    zone: RiskZone
    rules_version: Literal['saq-rules-v1'] = 'saq-rules-v1'
    revision: int
    as_of: datetime
    confirmed_codes: list[RiskCode]
    unknown_codes: list[RiskCode]


class PropertyOut(DTO):
    id: UUID
    parent_id: UUID | None
    level: Literal['PROJECT', 'PHASE', 'BUILDING']
    name: str
    aliases: list[str]
    city: str
    address: str
    latitude: float | None
    longitude: float | None
    developer: DeveloperOut
    authorized_company: DeveloperOut | None = None
    contractor: DeveloperOut | None = None
    stage: Literal['UNKNOWN', 'PLANNED', 'UNDER_CONSTRUCTION', 'COMPLETED']
    progress_percent: float | None
    progress_as_of: datetime | None
    legal_verification_status: LegalStatus
    legal_absence_as_of: datetime | None = None
    risk: RiskSummaryOut
    is_demo: bool
    revision: int
    last_reviewed_at: datetime | None


class RiskFactorOut(DTO):
    id: UUID
    property_id: UUID
    code: RiskCode
    status: Literal['UNKNOWN', 'PENDING', 'CONFIRMED', 'REJECTED']
    weight: int
    as_of: datetime
    evidence_ids: list[UUID]
    revision: int
    reviewed_by: UUID | None
    reviewed_by_details: UserOut | None = None
    reviewed_at: datetime | None
    reason: str | None


class LegalBasisOut(DTO):
    id: UUID
    property_id: UUID
    mechanism: LegalMechanism
    document_number: str | None
    document_date: str | None
    issuer: str
    company_id: UUID | None = None
    asset_id: UUID
    source_url: str | None = None
    applies_from: datetime | None = None
    applies_until: datetime | None = None
    scope_description: str
    is_demo: bool
    captured_at: datetime
    verification_status: LegalStatus
    revision: int
    reviewed_by: UUID | None
    reviewed_by_details: UserOut | None = None
    reviewed_at: datetime | None
    verification_as_of: datetime | None = None
    evidence_ids: list[UUID] = Field(default_factory=list)


class PropertyDetailOut(DTO):
    source_candidate_id: UUID | None = None
    linked_candidate_count: int = 0
    property: PropertyOut
    legal_bases: list[LegalBasisOut]
    factors: list[RiskFactorOut]
    advertisement_ids: list[UUID]
    unknown_information: list[str]


class RiskDetailOut(DTO):
    property_id: UUID
    summary: RiskSummaryOut
    factors: list[RiskFactorOut]
    unknown_information: list[str]


T = TypeVar('T')


class Page(DTO, Generic[T]):
    items: list[T]
    page: int
    page_size: int
    total: int


class PropertyReferenceOut(DTO):
    id: UUID
    parent_id: UUID | None
    level: Literal['PROJECT', 'PHASE', 'BUILDING']
    name: str
    address: str
    is_demo: bool


class PropertyStructureOut(DTO):
    ancestors: list[PropertyReferenceOut]
    children: Page[PropertyReferenceOut]
    siblings: Page[PropertyReferenceOut]
