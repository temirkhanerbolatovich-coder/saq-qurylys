from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from app.analysis_dto import EvidenceOut, ReviewInput
from app.dto import DTO, AssetOut, LegalBasisOut, PropertyOut, RiskFactorOut, RiskSummaryOut, UserOut

DISCLAIMER = 'Сигнал необходимости проверки; не устанавливает факт правонарушения'
SignalState = Literal['DRAFT', 'CONFIRMED', 'RETURNED']


class SignalCreate(DTO):
    property_id: UUID
    expected_risk_revision: int = Field(ge=1)
    previous_signal_id: UUID | None = None


class SignalDecisionRequest(ReviewInput):
    expected_revision: int = Field(ge=1)
    expected_risk_revision: int = Field(ge=1)
    action: Literal['CONFIRM', 'RETURN']
    reason: str = Field(min_length=1, max_length=2000)


class SignalDecision(DTO):
    id: UUID
    action: Literal['CONFIRM', 'RETURN']
    actor: UserOut
    decided_at: datetime
    reason: str = Field(min_length=1, max_length=2000)


class SignalSnapshot(DTO):
    property: PropertyOut
    legal_bases: list[LegalBasisOut]
    factors: list[RiskFactorOut]
    evidence: list[EvidenceOut]
    assets: list[AssetOut]
    unknown_information: list[str]
    disclaimer: Literal['Сигнал необходимости проверки; не устанавливает факт правонарушения'] = DISCLAIMER


class SignalOut(DTO):
    id: UUID
    property_id: UUID
    version: int
    revision: int
    previous_signal_id: UUID | None
    state: SignalState
    is_stale: bool
    risk_snapshot: RiskSummaryOut
    created_at: datetime
    created_by: UserOut
    is_demo: bool
    pdf_state: Literal['NOT_REQUESTED', 'QUEUED', 'READY', 'FAILED']
    pdf_job_id: UUID | None = None


class SignalDetail(DTO):
    signal: SignalOut
    snapshot: SignalSnapshot
    decisions: list[SignalDecision]
