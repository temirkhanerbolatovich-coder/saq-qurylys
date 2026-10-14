from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import or_, select
from starlette.exceptions import HTTPException

from app import analysis_dto as dto
from app.api.analysis import Key, analyst, audit, latest_extraction, revision
from app.commands import begin_command, finish_command
from app.dependencies import DB, Actor, check_csrf
from app.dto import Page
from app.extraction import payment_offer
from app.models import (
    Advertisement,
    AuditEvent,
    Evidence,
    ExtractionResult,
    Property,
    PropertyMatch,
    RiskFactor,
    utcnow,
)
from app.views import factor_views, property_view

router = APIRouter()


def property_locked(db, id):
    row = db.scalar(
        select(Property).where(Property.id == id).with_for_update().execution_options(populate_existing=True)
    )
    if not row:
        raise HTTPException(404, 'ЖК не найден')
    return row


def invalidate_ad_factors(db, ad_id, request, actor, reason, hypothesis_id=None):
    """A changed human decision requires dependent R2 factors to be reviewed again."""
    evidence = list(db.scalars(select(Evidence).where(Evidence.details['advertisement_id'].as_string() == str(ad_id))))
    affected = {
        str(e.id) for e in evidence if not hypothesis_id or e.details.get('hypothesis_id') == str(hypothesis_id)
    }
    property_ids = sorted({e.property_id for e in evidence if str(e.id) in affected}, key=str)
    for property_id in property_ids:
        prop = property_locked(db, property_id)
        for factor in db.scalars(
            select(RiskFactor)
            .where(RiskFactor.property_id == property_id, RiskFactor.code == 'R2', RiskFactor.status == 'CONFIRMED')
            .with_for_update()
            .execution_options(populate_existing=True)
        ):
            if affected.intersection(factor.evidence_ids):
                before = factor.revision
                factor.status, factor.revision = 'PENDING', factor.revision + 1
                factor.reviewed_by, factor.reviewed_at, factor.reason = actor.id, utcnow(), reason
                prop.revision += 1
                prop.last_reviewed_at = utcnow()
                audit(
                    db,
                    request,
                    actor,
                    factor,
                    'RISK_INVALIDATED',
                    before,
                    reason,
                    {'property_id': str(prop.id), 'before_status': 'CONFIRMED', 'after_status': 'PENDING'},
                )


def payment_hypothesis(db, evidence):
    details = evidence.details
    ad = db.get(Advertisement, UUID(details['advertisement_id'])) if details.get('advertisement_id') else None
    extraction = db.get(ExtractionResult, UUID(details['extraction_id'])) if details.get('extraction_id') else None
    if (
        not ad
        or ad.confirmed_property_id != evidence.property_id
        or not extraction
        or extraction.advertisement_id != ad.id
    ):
        raise HTTPException(422, 'Доказательству нужна подтверждённая привязка публикации к этому ЖК')
    match = db.scalar(
        select(PropertyMatch.id).where(
            PropertyMatch.advertisement_id == ad.id,
            PropertyMatch.extraction_id == extraction.id,
            PropertyMatch.property_id == evidence.property_id,
            PropertyMatch.status == 'CONFIRMED',
        )
    )
    if not match:
        raise HTTPException(422, 'Подтвердите привязку для этой версии текста')
    corrected = db.scalar(
        select(ExtractionResult.created_at)
        .where(ExtractionResult.advertisement_id == ad.id, ExtractionResult.parent_extraction_id.is_not(None))
        .order_by(ExtractionResult.created_at.desc())
        .limit(1)
    )
    if corrected and extraction.created_at < corrected:
        raise HTTPException(
            422, 'Расшифровка источника исправлена. Проверьте новую версию и сохраните новое доказательство.'
        )
    hypothesis = next((h for h in extraction.hypotheses if h['id'] == details.get('hypothesis_id')), None)
    if (
        not hypothesis
        or hypothesis['field'] != 'PAYMENT_TERM'
        or hypothesis['review_status'] not in {'CONFIRMED', 'CORRECTED'}
    ):
        raise HTTPException(422, 'Сначала подтвердите гипотезу об условиях оплаты')
    value = hypothesis['reviewed_value'] or hypothesis['value']
    # A correction cannot turn an arbitrary amount/free booking into an R2 offer.
    if not value.get('text') or not payment_offer(value['text']):
        raise HTTPException(422, 'Исправленное условие не содержит прямого предложения платежа')
    if details.get('fragment') != hypothesis['fragment'] or evidence.asset_id != extraction.source_asset_id:
        raise HTTPException(422, 'Фрагмент должен точно соответствовать сохранённой версии оригинала')
    return ad, extraction, hypothesis


@router.post(
    '/api/v1/evidence',
    response_model=dto.EvidenceOut,
    status_code=201,
    operation_id='createEvidence',
    dependencies=[Depends(check_csrf)],
)
def create_evidence(body: dto.EvidenceCreate, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    previous, digest = begin_command(db, actor.id, 'createEvidence', idempotency_key, body.model_dump(mode='json'))
    if previous:
        return previous
    if body.kind != 'ADVERTISEMENT_FRAGMENT' or not body.advertisement_id:
        raise HTTPException(422, 'На этом этапе поддерживается доказательство условия оплаты из рекламы')
    ad = db.scalar(
        select(Advertisement)
        .where(Advertisement.id == body.advertisement_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    prop = property_locked(db, body.property_id)
    if not ad or ad.is_demo != prop.is_demo or body.is_demo != prop.is_demo:
        raise HTTPException(422, 'Нельзя смешивать DEMO и реальные материалы')
    latest = latest_extraction(db, ad.id)
    if not latest or latest.id != body.extraction_id:
        raise HTTPException(422, 'Новое доказательство создаётся по последней версии текста')
    row = Evidence(
        id=uuid4(),
        property_id=prop.id,
        asset_id=body.asset_id,
        details=body.model_dump(mode='json', exclude={'property_id', 'asset_id'}),
    )
    payment_hypothesis(db, row)
    row.details |= {
        'source_label': ad.source_label,
        'source_url': ad.source_url,
        'event_at': (ad.published_at or ad.captured_at).isoformat(),
        'captured_at': ad.captured_at.isoformat(),
        'created_by': str(actor.id),
    }
    db.add(row)
    audit(
        db,
        request,
        actor,
        row,
        'EVIDENCE_CREATED',
        reason=body.description,
        details={'property_id': str(prop.id), 'advertisement_id': str(ad.id)},
    )
    result = dto.EvidenceOut(id=row.id, property_id=prop.id, asset_id=row.asset_id, **row.details).model_dump(
        mode='json'
    )
    finish_command(db, actor.id, 'createEvidence', idempotency_key, digest, result)
    return result


def validate_evidence(db, prop, ids, as_of=None):
    if not ids:
        raise HTTPException(422, 'Нужно хотя бы одно доказательство')
    for id in set(ids):
        evidence = db.get(Evidence, id)
        if not evidence or evidence.property_id != prop.id or evidence.details.get('kind') != 'ADVERTISEMENT_FRAGMENT':
            raise HTTPException(422, 'Доказательство должно относиться к этому ЖК и условию оплаты')
        ad, _, _ = payment_hypothesis(db, evidence)
        if as_of and (ad.published_at or ad.captured_at) > as_of:
            raise HTTPException(422, 'Дата фактора не может предшествовать источнику')


@router.post(
    '/api/v1/properties/{id}/risk-factors',
    response_model=dto.RiskReviewOut,
    status_code=201,
    operation_id='createRiskFactor',
    dependencies=[Depends(check_csrf)],
)
def create_factor(id: UUID, body: dto.RiskFactorCreate, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    operation = f'createRiskFactor:{id}'
    previous, digest = begin_command(db, actor.id, operation, idempotency_key, body.model_dump(mode='json'))
    if previous:
        return previous
    prop = property_locked(db, id)
    if body.as_of > utcnow():
        raise HTTPException(422, 'Дата проверки не может быть в будущем')
    if body.code != 'R2':
        raise HTTPException(
            422,
            'В этом этапе ручная проверка реализована для R2; остальные факторы требуют отдельного сценария доказательств',
        )
    if db.scalar(select(RiskFactor.id).where(RiskFactor.property_id == id, RiskFactor.code == body.code)):
        raise HTTPException(409, 'Фактор уже существует. Откройте его ручную проверку.')
    validate_evidence(db, prop, body.evidence_ids, body.as_of)
    factor = RiskFactor(
        property_id=id,
        code=body.code,
        status='PENDING',
        as_of=body.as_of,
        evidence_ids=[str(value) for value in body.evidence_ids],
        reason=body.reason,
    )
    db.add(factor)
    prop.revision += 1
    prop.last_reviewed_at = utcnow()
    db.flush()
    audit(
        db,
        request,
        actor,
        factor,
        'RISK_FACTOR_CREATED',
        reason=body.reason,
        details={'property_id': str(id), 'after_status': 'PENDING'},
    )
    factors = factor_views(db, id)
    result = dto.RiskReviewOut(
        factor=next(f for f in factors if f.id == factor.id), risk=property_view(prop, factors).risk
    ).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, digest, result)
    return result


@router.post(
    '/api/v1/risk-factors/{id}/review',
    response_model=dto.RiskReviewOut,
    operation_id='reviewRiskFactor',
    dependencies=[Depends(check_csrf)],
)
def review_factor(id: UUID, body: dto.RiskFactorReview, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    operation = f'reviewRiskFactor:{id}'
    previous, digest = begin_command(db, actor.id, operation, idempotency_key, body.model_dump(mode='json'))
    if previous:
        return previous
    initial = db.get(RiskFactor, id)
    if not initial:
        raise HTTPException(404, 'Фактор не найден')
    prop = property_locked(db, initial.property_id)
    row = db.scalar(
        select(RiskFactor).where(RiskFactor.id == id).with_for_update().execution_options(populate_existing=True)
    )
    revision(row.revision, body.expected_revision)
    if row.code != 'R2':
        raise HTTPException(422, 'Этот этап поддерживает ручную проверку R2')
    if body.status == 'CONFIRMED':
        validate_evidence(db, prop, body.evidence_ids, utcnow())
    elif any(not db.get(Evidence, id) or db.get(Evidence, id).property_id != prop.id for id in body.evidence_ids):
        raise HTTPException(422, 'Доказательства должны относиться к этому ЖК')
    before = {'status': row.status, 'evidence_ids': row.evidence_ids, 'as_of': row.as_of.isoformat()}
    old = row.revision
    row.status, row.revision = body.status, row.revision + 1
    row.evidence_ids = [str(value) for value in body.evidence_ids]
    row.reviewed_by, row.reviewed_at, row.reason = actor.id, utcnow(), body.reason
    row.as_of = row.reviewed_at
    prop.revision += 1
    prop.last_reviewed_at = utcnow()
    audit(
        db,
        request,
        actor,
        row,
        'RISK_FACTOR_REVIEWED',
        old,
        body.reason,
        {
            'property_id': str(prop.id),
            'before': before,
            'after': {'status': row.status, 'evidence_ids': row.evidence_ids},
        },
    )
    db.flush()
    factors = factor_views(db, prop.id)
    result = dto.RiskReviewOut(
        factor=next(f for f in factors if f.id == row.id), risk=property_view(prop, factors).risk
    ).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, digest, result)
    return result


@router.get('/api/v1/properties/{id}/audit', response_model=Page[dto.AuditEventOut], operation_id='listPropertyAudit')
def property_audit(
    id: UUID, actor: Actor, db: DB, page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100)
):
    if not db.get(Property, id):
        raise HTTPException(404, 'ЖК не найден')
    # Include current linked publication history and explicitly scoped evidence/risk events.
    ad_ids = select(Advertisement.id).where(Advertisement.confirmed_property_id == id)
    ad_strings = [str(value) for value in db.scalars(ad_ids)]
    query = (
        select(AuditEvent)
        .where(
            or_(
                AuditEvent.entity_id == id,
                AuditEvent.entity_id.in_(ad_ids),
                AuditEvent.details['advertisement_id'].as_string().in_(ad_strings),
                AuditEvent.details['property_id'].as_string() == str(id),
                AuditEvent.details['before_property_id'].as_string() == str(id),
            )
        )
        .order_by(AuditEvent.occurred_at.desc(), AuditEvent.id)
    )
    from sqlalchemy import func

    total = db.scalar(select(func.count()).select_from(query.subquery()))
    return {
        'items': list(db.scalars(query.offset((page - 1) * page_size).limit(page_size))),
        'total': total,
        'page': page,
        'page_size': page_size,
    }
