"""A dated, manual review of all project mechanisms; missing registry rows prove nothing."""

from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, Field, field_validator, model_validator
from sqlalchemy import select
from starlette.exceptions import HTTPException

from app.dto import DTO, LegalMechanism
from app.legal import applies_at, document_calendar_date
from app.models import Advertisement, Asset, Evidence, LegalBasis, RiskFactor, utcnow
from app.storage import read_asset

MECHANISMS = {'KZHK_GUARANTEE', 'BANK_WITH_MIO_PERMIT', 'FRAME_WITH_MIO_PERMIT'}
ABSENCE_FIELDS = ('absence_as_of', 'scope_description', 'legal_checks')


class LegalMechanismCheck(DTO):
    mechanism: LegalMechanism
    result: Literal['DOCUMENTED_ABSENT', 'NOT_FOUND', 'UNAVAILABLE', 'UNKNOWN']
    reason: str = Field(min_length=1, max_length=2000)

    @field_validator('reason')
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError('Объясните результат проверки механизма')
        return value


class LegalAbsenceFacts(DTO):
    event_at: AwareDatetime
    absence_as_of: AwareDatetime
    scope_description: str = Field(min_length=1, max_length=2000)
    legal_checks: list[LegalMechanismCheck] = Field(min_length=1, max_length=3)

    @field_validator('scope_description')
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError('Укажите конкретную очередь/корпус и область проверки')
        return value

    @model_validator(mode='after')
    def coherent_review(self):
        if len({check.mechanism for check in self.legal_checks}) != len(self.legal_checks):
            raise ValueError('Каждый механизм указывается один раз')
        if self.absence_as_of > self.event_at:
            raise ValueError('Документ не может устанавливать отсутствие на будущую для него дату')
        return self


def absence_document(db, prop, asset_id, root):
    asset = db.get(Asset, asset_id)
    source = asset.source_details if asset else None
    if (
        not asset
        or asset.kind != 'DOCUMENT'
        or asset.advertisement_id
        or not source
        or source.get('purpose') != 'LEGAL_ABSENCE_REVIEW'
        or source.get('property_id') != str(prop.id)
        or asset.is_demo != prop.is_demo
    ):
        raise HTTPException(422, 'Нужен самостоятельный документ проверки всех оснований этого ЖК/DEMO-области')
    try:
        facts = LegalAbsenceFacts.model_validate({key: source.get(key) for key in (*ABSENCE_FIELDS, 'event_at')})
    except ValueError:
        raise HTTPException(422, 'Документ не содержит согласованной датированной проверки механизмов') from None
    if facts.event_at > utcnow() or not source.get('methodology', '').strip():
        raise HTTPException(422, 'Нужны методика проверки и дата документа не в будущем')
    try:
        read_asset(root, asset.storage_key, asset.sha256)
    except OSError:
        raise HTTPException(409, 'Оригинал проверки недоступен или нарушена контрольная сумма') from None
    return asset, source, facts


def validate_absence_factor(db, prop, ids, as_of, root):
    if len(ids) != 1:
        raise HTTPException(422, 'R1 требует одно заключение, явно охватывающее все три механизма')
    evidence = db.get(Evidence, ids[0])
    if (
        not evidence
        or evidence.property_id != prop.id
        or evidence.details.get('kind') != 'LEGAL_ABSENCE_REVIEW'
        or evidence.details.get('is_demo') != prop.is_demo
    ):
        raise HTTPException(422, 'R1 требует датированную проверку всех механизмов именно этого ЖК')
    _, source, facts = absence_document(db, prop, evidence.asset_id, root)
    if any(evidence.details.get(key) != source.get(key) for key in (*ABSENCE_FIELDS, 'event_at', 'methodology')):
        raise HTTPException(422, 'Снимок проверки не совпадает с сохранёнными фактами документа')
    if facts.absence_as_of != as_of:
        raise HTTPException(422, 'Дата R1 должна точно совпадать с датой отсутствия, охваченной документом')
    if {check.mechanism for check in facts.legal_checks} != MECHANISMS or any(
        check.result != 'DOCUMENTED_ABSENT' for check in facts.legal_checks
    ):
        raise HTTPException(
            422, 'Нужно документально исключить все три механизма; неизвестность и пустой реестр недостаточны'
        )
    for basis in db.scalars(select(LegalBasis).where(LegalBasis.property_id == prop.id)):
        details = basis.details
        issued = details.get('document_date')
        if (issued and date.fromisoformat(issued) > document_calendar_date(as_of)) or not applies_at(details, as_of):
            continue
        if details['verification_status'] == 'VERIFIED_VALID':
            raise HTTPException(
                409, 'R1 противоречит подтверждённому основанию на эту дату; сначала разрешите противоречие'
            )
        if details['verification_status'] == 'PENDING':
            # An unresolved candidate cannot silently become proof of absence.
            raise HTTPException(409, 'Сначала проверьте или отклоните применимый документ основания на эту дату')


def validate_joint_r1_r2_date(db, prop, code, as_of, evidence_ids):
    """A red-zone pair must describe a documented payment offer at the absence instant."""
    if code not in {'R1', 'R2'}:
        return
    other = db.scalar(
        select(RiskFactor)
        .where(
            RiskFactor.property_id == prop.id,
            RiskFactor.code == ('R2' if code == 'R1' else 'R1'),
            RiskFactor.status == 'CONFIRMED',
        )
        .execution_options(populate_existing=True)
    )
    if not other:
        return
    absence_at = as_of if code == 'R1' else other.as_of
    payment_ids = other.evidence_ids if code == 'R1' else evidence_ids
    for evidence_id in payment_ids:
        evidence = db.get(Evidence, UUID(str(evidence_id)))
        if (
            not evidence
            or evidence.property_id != prop.id
            or evidence.details.get('kind') != 'ADVERTISEMENT_FRAGMENT'
            or not evidence.details.get('advertisement_id')
        ):
            continue
        ad = db.get(Advertisement, UUID(evidence.details['advertisement_id']))
        if ad and ad.is_demo == prop.is_demo and ad.confirmed_property_id == prop.id and ad.published_at == absence_at:
            return
    raise HTTPException(
        409,
        'Для совместного R1/R2 нужна известная дата публикации, точно совпадающая с датой проверки отсутствия. '
        'Сохраните проверку на дату публикации или снимите прежний R1 с подтверждения.',
    )
