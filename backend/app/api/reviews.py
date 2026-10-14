import hashlib
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from pydantic import AwareDatetime, HttpUrl, TypeAdapter, ValidationError
from sqlalchemy import or_, select
from starlette.exceptions import HTTPException

from app import analysis_dto as dto
from app.api.analysis import Key, analyst, audit, latest_extraction, revision
from app.commands import begin_command, finish_command
from app.construction import (
    CONSTRUCTION_KINDS,
    FACT_FIELDS,
    DocumentFacts,
    DocumentPurpose,
    document_source,
    publication_source,
    validate_construction_factor,
)
from app.dependencies import DB, Actor, check_csrf
from app.dto import AssetOut, Page
from app.extraction import payment_offer
from app.models import (
    Advertisement,
    Asset,
    AuditEvent,
    Evidence,
    ExtractionResult,
    Property,
    PropertyMatch,
    RiskFactor,
    utcnow,
)
from app.storage import save_bytes
from app.uploads import validate_image, validate_text
from app.views import factor_views, property_view

router = APIRouter()


@router.post(
    '/api/v1/assets/upload',
    response_model=AssetOut,
    status_code=201,
    operation_id='uploadEvidenceAsset',
    dependencies=[Depends(check_csrf)],
)
async def upload_document(
    request: Request,
    actor: Actor,
    db: DB,
    idempotency_key: Key,
    file: Annotated[UploadFile, File()],
    property_id: Annotated[UUID, Form()],
    source_label: Annotated[str, Form(min_length=1, max_length=300)],
    event_at: Annotated[AwareDatetime, Form()],
    methodology: Annotated[str, Form(min_length=1, max_length=2000)],
    is_demo: Annotated[bool, Form()],
    signatory_count: Annotated[int | None, Form(ge=2, le=100000)] = None,
    purpose: Annotated[DocumentPurpose, Form()] = 'COLLECTIVE_APPEAL',
    source_url: Annotated[str | None, Form()] = None,
    construction_stage: Annotated[Literal['UNDER_CONSTRUCTION', 'COMPLETED'] | None, Form()] = None,
    measurement_percent: Annotated[float | None, Form(ge=0, le=100)] = None,
    measurement_role: Annotated[Literal['DECLARED', 'VERIFIED'] | None, Form()] = None,
    comparison_key: Annotated[str | None, Form(min_length=1, max_length=300)] = None,
    planned_completion_at: Annotated[AwareDatetime | None, Form()] = None,
    actual_completion_at: Annotated[AwareDatetime | None, Form()] = None,
    delay_status: Annotated[Literal['NOT_COMPLETED', 'COMPLETED_LATE'] | None, Form()] = None,
):
    analyst(actor)
    if purpose == 'COLLECTIVE_APPEAL' and signatory_count is None:
        raise HTTPException(422, 'Укажите число заявителей коллективного обращения')
    if purpose != 'COLLECTIVE_APPEAL' and signatory_count is not None:
        raise HTTPException(422, 'Число заявителей относится только к коллективному обращению')
    try:
        facts = DocumentFacts(
            purpose=purpose,
            event_at=event_at,
            construction_stage=construction_stage,
            measurement_percent=measurement_percent,
            measurement_role=measurement_role,
            comparison_key=comparison_key,
            planned_completion_at=planned_completion_at,
            actual_completion_at=actual_completion_at,
            delay_status=delay_status,
        )
    except ValidationError as exc:
        raise HTTPException(422, exc.errors()[0]['msg']) from None
    if not source_label.strip() or not methodology.strip() or event_at > utcnow():
        raise HTTPException(422, 'Нужны источник, основание проверки и дата не в будущем')
    try:
        url = str(TypeAdapter(HttpUrl).validate_python(source_url)) if source_url else None
    except ValueError:
        raise HTTPException(422, 'Проверьте URL источника') from None
    settings = request.app.state.settings
    content = await file.read(settings.max_upload_bytes + 1)
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(413, 'Файл превышает допустимый размер')
    mime = (file.content_type or '').split(';', 1)[0].lower().strip()
    if mime == 'text/plain' or (file.filename or '').lower().endswith('.txt'):
        if mime not in {'text/plain', 'application/octet-stream', ''}:
            raise HTTPException(415, 'Недопустимый MIME для TXT')
        validate_text(content)
        mime, extension = 'text/plain', 'txt'
    else:
        mime, extension = validate_image(content, file.content_type, settings.max_image_pixels)
    metadata = {
        'property_id': str(property_id),
        'source_label': source_label,
        'source_url': url,
        'event_at': event_at.isoformat(),
        'methodology': methodology,
        'signatory_count': signatory_count,
        'created_by': str(actor.id),
        'purpose': purpose,
    }
    metadata |= facts.model_dump(mode='json', exclude={'purpose', 'event_at'}, exclude_none=True)
    previous, digest = begin_command(
        db,
        actor.id,
        'uploadEvidenceAsset',
        idempotency_key,
        metadata | {'sha256': hashlib.sha256(content).hexdigest(), 'is_demo': is_demo},
    )
    if previous:
        return previous
    prop = property_locked(db, property_id)
    if prop.is_demo != is_demo:
        raise HTTPException(422, 'Нельзя смешивать DEMO и реальные документы')
    key, sha, size = save_bytes(settings.storage_root, content, extension)
    row = Asset(
        kind='DOCUMENT',
        mime_type=mime,
        byte_size=size,
        sha256=sha,
        storage_key=key,
        is_demo=is_demo,
        source_details=metadata,
    )
    db.add(row)
    db.flush()
    audit(db, request, actor, row, 'SUPPORT_DOCUMENT_UPLOADED', reason=methodology, details=metadata)
    result = AssetOut.model_validate(row).model_dump(mode='json')
    finish_command(db, actor.id, 'uploadEvidenceAsset', idempotency_key, digest, result)
    return result


def appeal_evidence(body, request, actor, db, idempotency_key, digest):
    prop = property_locked(db, body.property_id)
    asset = db.get(Asset, body.asset_id)
    source = asset.source_details if asset else None
    if (
        not asset
        or asset.kind != 'DOCUMENT'
        or asset.advertisement_id
        or not source
        or source.get('property_id') != str(prop.id)
        or source.get('purpose', 'COLLECTIVE_APPEAL') != 'COLLECTIVE_APPEAL'
    ):
        raise HTTPException(422, 'Загрузите документ обращения для этого ЖК')
    if asset.is_demo != prop.is_demo or body.is_demo != prop.is_demo:
        raise HTTPException(422, 'Нельзя смешивать DEMO и реальные документы')
    if (
        any([body.advertisement_id, body.extraction_id, body.hypothesis_id, body.fragment, body.legal_basis_id])
        or body.measurement_percent is not None
    ):
        raise HTTPException(422, 'Обращение подтверждается отдельным документом')
    details = body.model_dump(mode='json', exclude={'property_id', 'asset_id'}) | {
        key: source[key] for key in ['source_label', 'source_url', 'event_at', 'methodology', 'signatory_count']
    }
    details |= {'captured_at': asset.captured_at.isoformat(), 'created_by': str(actor.id)}
    row = Evidence(id=uuid4(), property_id=prop.id, asset_id=asset.id, details=details)
    db.add(row)
    audit(
        db,
        request,
        actor,
        row,
        'EVIDENCE_CREATED',
        reason=body.description,
        details={'property_id': str(prop.id), 'kind': body.kind},
    )
    result = dto.EvidenceOut(id=row.id, property_id=prop.id, asset_id=asset.id, **details).model_dump(mode='json')
    finish_command(db, actor.id, 'createEvidence', idempotency_key, digest, result)
    return result


def property_locked(db, id):
    row = db.scalar(
        select(Property).where(Property.id == id).with_for_update().execution_options(populate_existing=True)
    )
    if not row:
        raise HTTPException(404, 'ЖК не найден')
    return row


def construction_evidence(body, request, actor, db, idempotency_key, digest):
    ad = None
    if body.kind == 'ADVERTISEMENT_PUBLICATION' and body.advertisement_id:
        ad = db.scalar(
            select(Advertisement)
            .where(Advertisement.id == body.advertisement_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    prop = property_locked(db, body.property_id)
    if body.is_demo != prop.is_demo:
        raise HTTPException(422, 'Нельзя смешивать DEMO и реальные материалы')
    details = body.model_dump(mode='json', exclude={'property_id', 'asset_id'})
    # All typed facts and provenance are copied from the immutable source, never client replacements.
    details |= {field: None for field in (*FACT_FIELDS, 'signatory_count')}
    row = Evidence(id=uuid4(), property_id=prop.id, asset_id=body.asset_id, details=details)
    root = request.app.state.settings.storage_root
    if body.kind == 'ADVERTISEMENT_PUBLICATION':
        latest = latest_extraction(db, ad.id) if ad else None
        if not latest or latest.id != body.extraction_id or body.hypothesis_id or body.fragment or body.legal_basis_id:
            raise HTTPException(422, 'Для новой рекламы подтвердите последнюю версию без подмены фрагментов')
        ad = publication_source(db, prop, row, root)
        details |= {
            'source_label': ad.source_label,
            'source_url': ad.source_url,
            'event_at': ad.published_at.isoformat(),
            'captured_at': ad.captured_at.isoformat(),
            'methodology': None,
        }
    else:
        if any([body.advertisement_id, body.extraction_id, body.hypothesis_id, body.fragment, body.legal_basis_id]):
            raise HTTPException(422, 'Используйте самостоятельный документ, без рекламных/правовых ссылок')
        asset, source, _ = document_source(db, prop, body.asset_id, body.kind, root)
        details |= {field: source.get(field) for field in FACT_FIELDS}
        details |= {field: source.get(field) for field in ('source_label', 'source_url', 'event_at', 'methodology')}
        details['captured_at'] = asset.captured_at.isoformat()
    details['created_by'] = str(actor.id)
    row.details = details
    db.add(row)
    audit(
        db,
        request,
        actor,
        row,
        'EVIDENCE_CREATED',
        reason=body.description,
        details={'property_id': str(prop.id), 'kind': body.kind, 'advertisement_id': str(ad.id) if ad else None},
    )
    result = dto.EvidenceOut(id=row.id, property_id=prop.id, asset_id=row.asset_id, **details).model_dump(mode='json')
    finish_command(db, actor.id, 'createEvidence', idempotency_key, digest, result)
    return result


def invalidate_ad_factors(db, ad_id, request, actor, reason, hypothesis_id=None):
    """A changed human decision requires dependent R2/R3 factors to be reviewed again."""
    evidence = list(db.scalars(select(Evidence).where(Evidence.details['advertisement_id'].as_string() == str(ad_id))))
    affected = {
        str(e.id) for e in evidence if not hypothesis_id or e.details.get('hypothesis_id') == str(hypothesis_id)
    }
    property_ids = sorted({e.property_id for e in evidence if str(e.id) in affected}, key=str)
    for property_id in property_ids:
        prop = property_locked(db, property_id)
        for factor in db.scalars(
            select(RiskFactor)
            .where(
                RiskFactor.property_id == property_id,
                RiskFactor.code.in_(['R2', 'R3']),
                RiskFactor.status == 'CONFIRMED',
            )
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
    if body.kind not in CONSTRUCTION_KINDS | {'ADVERTISEMENT_PUBLICATION'} and any(
        getattr(body, field) is not None for field in FACT_FIELDS
    ):
        raise HTTPException(422, 'Факты строительства относятся только к документам соответствующего назначения')
    if body.kind == 'COLLECTIVE_APPEAL':
        return appeal_evidence(body, request, actor, db, idempotency_key, digest)
    if body.kind in CONSTRUCTION_KINDS | {'ADVERTISEMENT_PUBLICATION'}:
        return construction_evidence(body, request, actor, db, idempotency_key, digest)
    if body.kind != 'ADVERTISEMENT_FRAGMENT' or not body.advertisement_id:
        raise HTTPException(422, 'Для этого вида доказательства нужен отдельный поддерживаемый сценарий')
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


def validate_evidence(db, prop, ids, as_of=None, code='R2', storage_root=None):
    if not ids:
        raise HTTPException(422, 'Нужно хотя бы одно доказательство')
    if code in {'R3', 'R5', 'R6'}:
        return validate_construction_factor(db, prop, ids, as_of or utcnow(), code, storage_root)
    for id in set(ids):
        evidence = db.get(Evidence, id)
        if code == 'R4':
            if not evidence or evidence.property_id != prop.id or evidence.details.get('kind') != 'COLLECTIVE_APPEAL':
                raise HTTPException(422, 'R4 требует документа коллективного обращения этого ЖК')
            asset = db.get(Asset, evidence.asset_id)
            source = asset.source_details if asset else None
            if (
                not source
                or source.get('property_id') != str(prop.id)
                or (source.get('signatory_count') or 0) < 2
                or source.get('purpose', 'COLLECTIVE_APPEAL') != 'COLLECTIVE_APPEAL'
                or not source.get('methodology')
                or asset.is_demo != prop.is_demo
            ):
                raise HTTPException(422, 'Не подтверждены происхождение и коллективность обращения')
            date = TypeAdapter(AwareDatetime).validate_python(source['event_at'])
            if date > (as_of or utcnow()):
                raise HTTPException(422, 'Дата фактора предшествует документу')
            continue
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
    if body.code not in {'R2', 'R3', 'R4', 'R5', 'R6'}:
        raise HTTPException(
            422,
            'R1 требует отдельной проверки отсутствия всех применимых оснований; этот сценарий ещё не реализован',
        )
    if db.scalar(select(RiskFactor.id).where(RiskFactor.property_id == id, RiskFactor.code == body.code)):
        raise HTTPException(409, 'Фактор уже существует. Откройте его ручную проверку.')
    validate_evidence(db, prop, body.evidence_ids, body.as_of, body.code, request.app.state.settings.storage_root)
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
    if row.code not in {'R2', 'R3', 'R4', 'R5', 'R6'}:
        raise HTTPException(422, 'R1 требует отдельной проверки всех механизмов')
    assessment_at = body.as_of or (row.as_of if row.code in {'R3', 'R5', 'R6'} else utcnow())
    if assessment_at > utcnow():
        raise HTTPException(422, 'Дата оценки не может быть в будущем')
    if body.status == 'CONFIRMED':
        validate_evidence(db, prop, body.evidence_ids, assessment_at, row.code, request.app.state.settings.storage_root)
    elif any(not db.get(Evidence, id) or db.get(Evidence, id).property_id != prop.id for id in body.evidence_ids):
        raise HTTPException(422, 'Доказательства должны относиться к этому ЖК')
    before = {'status': row.status, 'evidence_ids': row.evidence_ids, 'as_of': row.as_of.isoformat()}
    old = row.revision
    row.status, row.revision = body.status, row.revision + 1
    row.evidence_ids = [str(value) for value in body.evidence_ids]
    row.reviewed_by, row.reviewed_at, row.reason = actor.id, utcnow(), body.reason
    row.as_of = assessment_at
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
            'after': {'status': row.status, 'evidence_ids': row.evidence_ids, 'as_of': row.as_of.isoformat()},
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
