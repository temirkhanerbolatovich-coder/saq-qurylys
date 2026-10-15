from datetime import date
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Request
from pydantic import AwareDatetime, Field, HttpUrl, field_validator, model_validator
from sqlalchemy import select
from starlette.exceptions import HTTPException

from app.analysis_dto import ReviewInput
from app.api.analysis import Key, analyst, audit, revision
from app.api.reviews import property_locked
from app.commands import begin_command, finish_command
from app.dependencies import DB, Actor, check_csrf, get_property
from app.dto import LegalBasisOut, LegalMechanism
from app.legal import applies_at, document_calendar_date, legal_status_at
from app.models import Asset, Developer, Evidence, LegalBasis, RiskFactor, utcnow
from app.storage import read_asset
from app.views import legal_views

router = APIRouter()


class LegalBasisCreate(ReviewInput):
    mechanism: LegalMechanism
    document_number: str | None = Field(max_length=300)
    document_date: date | None
    issuer: str = Field(min_length=1, max_length=300)
    company_id: UUID | None = None
    asset_id: UUID
    source_url: HttpUrl | None = None
    applies_from: AwareDatetime | None = None
    applies_until: AwareDatetime | None = None
    scope_description: str = Field(min_length=1, max_length=2000)
    is_demo: bool

    @field_validator('issuer', 'scope_description', 'document_number')
    @classmethod
    def nonblank(cls, value):
        if value is not None and not value.strip():
            raise ValueError('Поле не может состоять из пробелов')
        return value

    @model_validator(mode='after')
    def period(self):
        if self.applies_until and (not self.applies_from or self.applies_until < self.applies_from):
            raise ValueError('Проверьте начало и конец периода применимости')
        return self


class LegalBasisReview(ReviewInput):
    expected_revision: int = Field(ge=1)
    status: Literal['VERIFIED_VALID', 'VERIFIED_ABSENT', 'REJECTED']
    as_of: AwareDatetime
    evidence_ids: list[UUID] = Field(min_length=1)
    reason: str = Field(min_length=1, max_length=2000)


def basis_view(db, row):
    evidence_ids = list(
        db.scalars(select(Evidence.id).where(Evidence.details['legal_basis_id'].as_string() == str(row.id)))
    )
    return LegalBasisOut(id=row.id, property_id=row.property_id, **row.details, evidence_ids=evidence_ids)


def verify_document(request, asset):
    if not asset:
        raise HTTPException(409, 'Сохранённый документ недоступен')
    try:
        read_asset(request.app.state.settings.storage_root, asset.storage_key, asset.sha256)
    except OSError:
        raise HTTPException(409, 'Документ недоступен или не совпадает контрольная сумма') from None


@router.get('/api/v1/properties/{id}/legal-bases', response_model=list[LegalBasisOut], operation_id='listLegalBases')
def list_bases(id: UUID, actor: Actor, db: DB):
    get_property(db, id)
    return legal_views(db, id)


@router.post(
    '/api/v1/properties/{id}/legal-bases',
    response_model=LegalBasisOut,
    status_code=201,
    operation_id='createLegalBasis',
    dependencies=[Depends(check_csrf)],
)
def create_basis(id: UUID, body: LegalBasisCreate, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    operation = f'createLegalBasis:{id}'
    previous, digest = begin_command(db, actor.id, operation, idempotency_key, body.model_dump(mode='json'))
    if previous:
        return previous
    prop = property_locked(db, id)
    asset = db.get(Asset, body.asset_id)
    source = asset.source_details if asset else None
    if (
        not asset
        or asset.kind != 'DOCUMENT'
        or not source
        or source.get('purpose') != 'LEGAL_BASIS'
        or source.get('property_id') != str(id)
    ):
        raise HTTPException(422, 'Загрузите документ правового основания для этого ЖК')
    if asset.is_demo != prop.is_demo or body.is_demo != prop.is_demo:
        raise HTTPException(422, 'Нельзя смешивать DEMO и реальные данные')
    if body.company_id:
        company = db.get(Developer, body.company_id)
        if not company or company.is_demo != prop.is_demo:
            raise HTTPException(422, 'Проверьте компанию и DEMO-область')
    if body.document_date and body.document_date > document_calendar_date(utcnow()):
        raise HTTPException(422, 'Дата документа не может быть в будущем')
    verify_document(request, asset)
    duplicate = db.scalar(
        select(LegalBasis.id).where(
            LegalBasis.property_id == id, LegalBasis.details['asset_id'].as_string() == str(asset.id)
        )
    )
    if duplicate:
        raise HTTPException(409, 'Этот документ уже прикреплён. Откройте его проверку.')
    row = LegalBasis(
        id=uuid4(),
        property_id=id,
        details=body.model_dump(mode='json')
        | {
            'source_url': source.get('source_url'),
            'captured_at': asset.captured_at.isoformat(),
            'verification_status': 'PENDING',
            'revision': 1,
            'reviewed_by': None,
            'reviewed_at': None,
            'verification_as_of': None,
        },
    )
    db.add(row)
    db.flush()
    evidence = Evidence(
        id=uuid4(),
        property_id=id,
        asset_id=asset.id,
        details={
            'kind': 'LEGAL_DOCUMENT',
            'legal_basis_id': str(row.id),
            'description': body.scope_description,
            'source_label': source['source_label'],
            'source_url': source.get('source_url'),
            'event_at': source['event_at'],
            'methodology': source['methodology'],
            'is_demo': body.is_demo,
            'captured_at': asset.captured_at.isoformat(),
            'created_by': str(actor.id),
        },
    )
    db.add(evidence)
    prop.revision += 1
    prop.legal_verification_status = legal_status_at(db, prop)
    audit(
        db,
        request,
        actor,
        row,
        'LEGAL_BASIS_CREATED',
        reason=source['methodology'],
        details={'property_id': str(id), 'evidence_id': str(evidence.id)},
    )
    audit(
        db,
        request,
        actor,
        evidence,
        'EVIDENCE_CREATED',
        reason=body.scope_description,
        details={'property_id': str(id), 'legal_basis_id': str(row.id)},
    )
    db.flush()
    result = basis_view(db, row).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, digest, result)
    return result


@router.post(
    '/api/v1/legal-bases/{id}/review',
    response_model=LegalBasisOut,
    operation_id='reviewLegalBasis',
    dependencies=[Depends(check_csrf)],
)
def review_basis(id: UUID, body: LegalBasisReview, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    operation = f'reviewLegalBasis:{id}'
    previous, digest = begin_command(db, actor.id, operation, idempotency_key, body.model_dump(mode='json'))
    if previous:
        return previous
    initial = db.get(LegalBasis, id)
    if not initial:
        raise HTTPException(404, 'Основание не найдено')
    prop = property_locked(db, initial.property_id)
    row = db.scalar(
        select(LegalBasis).where(LegalBasis.id == id).with_for_update().execution_options(populate_existing=True)
    )
    revision(row.details['revision'], body.expected_revision)
    if body.status == 'VERIFIED_ABSENT':
        raise HTTPException(
            422,
            'Отсутствие основания требует отдельной проверки всех механизмов; отклонение документа его не доказывает',
        )
    if body.as_of > utcnow():
        raise HTTPException(422, 'Дата проверки не может быть в будущем')
    for evidence_id in body.evidence_ids:
        evidence = db.get(Evidence, evidence_id)
        if (
            not evidence
            or evidence.property_id != prop.id
            or evidence.details.get('legal_basis_id') != str(id)
            or evidence.asset_id != UUID(row.details['asset_id'])
            or evidence.details.get('kind') != 'LEGAL_DOCUMENT'
            or evidence.details.get('is_demo') != prop.is_demo
        ):
            raise HTTPException(422, 'Используйте доказательство именно этого документа и ЖК')
    before = dict(row.details)
    if body.status == 'VERIFIED_VALID':
        if not all(row.details.get(k) for k in ['document_number', 'document_date', 'applies_from']):
            raise HTTPException(
                422,
                'Для подтверждения нужны номер, дата и начало применимости; создайте исправленную карточку документа',
            )
        if not applies_at(row.details, body.as_of) or date.fromisoformat(
            row.details['document_date']
        ) > document_calendar_date(body.as_of):
            raise HTTPException(422, 'Документ не применим на выбранную дату')
        asset = db.get(Asset, UUID(row.details['asset_id']))
        verify_document(request, asset)
        for factor in db.scalars(
            select(RiskFactor).where(
                RiskFactor.property_id == prop.id, RiskFactor.code == 'R1', RiskFactor.status == 'CONFIRMED'
            )
        ):
            if applies_at(row.details, factor.as_of) and (
                date.fromisoformat(row.details['document_date']) <= document_calendar_date(factor.as_of)
            ):
                raise HTTPException(
                    409, 'Подтверждённый R1 противоречит документу на ту же дату. Сначала разрешите противоречие.'
                )
    now = utcnow()
    row.details = before | {
        'verification_status': body.status,
        'revision': before['revision'] + 1,
        'reviewed_by': str(actor.id),
        'reviewed_at': now.isoformat(),
        'verification_as_of': body.as_of.isoformat(),
    }
    db.flush()
    old_status = prop.legal_verification_status
    prop.legal_verification_status = legal_status_at(db, prop)
    prop.last_reviewed_at, prop.revision = now, prop.revision + 1
    audit(
        db,
        request,
        actor,
        row,
        'LEGAL_BASIS_REVIEWED',
        before['revision'],
        body.reason,
        {
            'property_id': str(prop.id),
            'before': before,
            'after': row.details,
            'evidence_ids': [str(e) for e in body.evidence_ids],
            'before_property_status': old_status,
            'after_property_status': prop.legal_verification_status,
        },
    )
    result = basis_view(db, row).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, digest, result)
    return result
