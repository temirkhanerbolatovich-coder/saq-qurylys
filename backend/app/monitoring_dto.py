"""Additive manual monitoring contract; registry input is explicitly DEMO only."""

import unicodedata
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, Field, field_validator, model_validator

from app.dto import DTO

ComparisonResult = Literal[
    'MATCHED_APPLICABLE_RECORD',
    'NO_MATCH_IN_APPROVED_SNAPSHOT',
    'RECORD_SCOPE_OR_STATUS_CONFLICT',
    'REGISTRY_UNAVAILABLE',
    'COVERAGE_OR_DATE_UNKNOWN',
    'ENTITY_AMBIGUOUS',
]
IncidentState = Literal['OPEN', 'IN_REVIEW', 'WAITING_DATA', 'CLOSED']
CloseReason = Literal['MATCH_FOUND', 'NOT_APPLICABLE', 'DUPLICATE']


def normalized(value: str | None) -> str:
    """Conservative identity equality shared by validation and registry comparison."""
    return ' '.join(unicodedata.normalize('NFC', value or '').casefold().split())


class Identity(DTO):
    name: str = Field(min_length=2, max_length=300)
    city: str = Field(min_length=2, max_length=100)
    address: str | None = Field(default=None, min_length=1, max_length=300)
    phase: str | None = Field(default=None, min_length=1, max_length=100)

    @field_validator('name', 'city', 'address', 'phase', mode='before')
    @classmethod
    def trim_identity(cls, value):
        return value.strip() if isinstance(value, str) else value


class Reasoned(DTO):
    reason: str = Field(min_length=1, max_length=1000)

    @field_validator('reason', mode='before')
    @classmethod
    def trim_reason(cls, value):
        return value.strip() if isinstance(value, str) else value


class CandidateCreate(Identity, Reasoned):
    advertisement_id: UUID


class CandidateOut(Identity):
    id: UUID
    is_demo: bool
    revision: int
    created_at: datetime
    last_result: ComparisonResult | None = None


class RegistryEntry(Identity):
    mechanism: Literal['GUARANTEE', 'MIO_PERMIT']
    document_number: str = Field(min_length=1, max_length=200)
    valid_from: AwareDatetime
    valid_until: AwareDatetime | None = None
    status: Literal['ACTIVE', 'REVOKED']

    @field_validator('document_number', mode='before')
    @classmethod
    def trim_document(cls, value):
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode='after')
    def date_order(self):
        if self.valid_until is not None and self.valid_until < self.valid_from:
            raise ValueError('Дата окончания документа раньше начала действия')
        return self


class RegistrySnapshotCreate(Reasoned):
    label: str = Field(min_length=1, max_length=300)
    city: str = Field(min_length=2, max_length=100)
    is_demo: Literal[True]
    coverage_from: AwareDatetime
    coverage_until: AwareDatetime
    expires_at: AwareDatetime
    complete: bool
    entries: list[RegistryEntry] = Field(max_length=200)

    @field_validator('is_demo', mode='before')
    @classmethod
    def explicit_demo(cls, value):
        if value is not True:
            raise ValueError('Разрешены только явно обозначенные DEMO-снимки')
        return value

    @field_validator('label', 'city', mode='before')
    @classmethod
    def trim_label(cls, value):
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode='after')
    def date_order(self):
        if self.coverage_until < self.coverage_from:
            raise ValueError('Окончание охвата раньше начала')
        seen = set()
        for entry in self.entries:
            key = tuple(
                normalized(getattr(entry, field))
                for field in ('name', 'city', 'address', 'phase', 'mechanism', 'document_number')
            )
            if key in seen:
                raise ValueError('Документ для одной области объекта не может повторяться в одном снимке')
            seen.add(key)
        return self


class RegistrySnapshotOut(DTO):
    id: UUID
    revision: Literal[1] = 1
    label: str
    city: str
    is_demo: Literal[True]
    coverage_from: datetime
    coverage_until: datetime
    expires_at: datetime
    complete: bool
    entries: list[RegistryEntry]
    sha256: str
    created_at: datetime
    created_by: UUID


class CompareRequest(Reasoned):
    expected_revision: int = Field(ge=1)
    snapshot_id: UUID | None
    advertisement_id: UUID


class ComparisonOut(DTO):
    id: UUID
    candidate_id: UUID
    advertisement_id: UUID
    candidate_revision: int
    advertisement_revision: int
    snapshot_id: UUID | None
    result: ComparisonResult
    explanation: str
    matched_entries: list[RegistryEntry]
    identity_snapshot: dict
    created_at: datetime
    algorithm_version: str


class IncidentHistory(DTO):
    action: str
    state: IncidentState
    reason: str
    actor_id: UUID
    occurred_at: datetime


class IncidentOut(DTO):
    id: UUID
    candidate_id: UUID
    candidate_name: str
    is_demo: bool
    rule_code: Literal['NO_MATCH_IN_APPROVED_SNAPSHOT', 'RECORD_SCOPE_OR_STATUS_CONFLICT']
    state: IncidentState
    revision: int
    created_at: datetime
    updated_at: datetime
    close_reason: CloseReason | None
    latest_comparison_id: UUID
    history: list[IncidentHistory]


class IncidentReview(Reasoned):
    expected_revision: int = Field(ge=1)
    state: IncidentState
    close_reason: CloseReason | None = None

    @model_validator(mode='after')
    def closure(self):
        if (self.state == 'CLOSED') != (self.close_reason is not None):
            raise ValueError('Причина закрытия обязательна только для закрываемой карточки')
        return self


class ObservationOut(DTO):
    id: UUID
    source_label: str
    source_url: str | None
    published_at: datetime | None
    captured_at: datetime


class CandidateDetailOut(DTO):
    candidate: CandidateOut
    advertisements: list[ObservationOut]
    advertisement_total: int
    comparisons: list[ComparisonOut]
    incidents: list[IncidentOut]
