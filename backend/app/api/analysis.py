import copy
import hashlib
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, Header, Request, UploadFile
from pydantic import AwareDatetime, TypeAdapter, ValidationError
from sqlalchemy import select
from starlette.exceptions import HTTPException

from app import analysis_dto as dto
from app.commands import begin_command, finish_command
from app.dependencies import DB, Actor, check_csrf
from app.dto import AdvertisementOut, UserOut
from app.models import Advertisement, AnalysisJob, Asset, AuditEvent, ExtractionResult, Property, PropertyMatch, utcnow
from app.storage import read_asset, save_bytes
from app.uploads import validate_image, validate_text
from app.worker import create_extraction

router = APIRouter()
Key = Annotated[UUID, Header(alias='Idempotency-Key')]


def analyst(actor):
    if actor.role != 'analyst':
        raise HTTPException(403, 'Действие доступно аналитику')


def ad_locked(db, id):
    row = db.scalar(
        select(Advertisement).where(Advertisement.id == id).with_for_update().execution_options(populate_existing=True)
    )
    if not row:
        raise HTTPException(404, 'Публикация не найдена')
    return row


def revision(actual, expected):
    if actual != expected:
        raise HTTPException(409, 'Запись изменилась. Обновите данные перед проверкой.')


def audit(db, request, actor, entity, action, old=None, reason=None, details=None):
    db.add(
        AuditEvent(
            actor_id=actor.id,
            action=action,
            entity_type=entity.__tablename__,
            entity_id=entity.id,
            old_revision=old,
            new_revision=getattr(entity, 'revision', None),
            reason=reason,
            request_id=request.state.request_id,
            details=details or {},
        )
    )


def latest_extraction(db, ad_id):
    return db.scalar(
        select(ExtractionResult)
        .where(ExtractionResult.advertisement_id == ad_id)
        .order_by(ExtractionResult.created_at.desc(), ExtractionResult.id)
        .limit(1)
    )


def validate_manual_proposal(db, extraction, hypothesis):
    """Require exact immutable source text and an authenticated proposal audit."""
    try:
        proposed = dto.Hypothesis.model_validate(hypothesis)
    except ValidationError:
        raise HTTPException(422, 'Метаданные ручного предложения повреждены') from None
    fragment = proposed.fragment
    if (
        proposed.origin != 'MANUAL'
        or proposed.field != 'PAYMENT_TERM'
        or not proposed.proposed_by
        or proposed.proposed_by.role != 'analyst'
        or not proposed.proposed_at
        or not proposed.proposal_reason
        or not proposed.proposal_reason.strip()
        or fragment.asset_id != extraction.source_asset_id
        or fragment.text_version_id != extraction.id
        or extraction.analysis_text[fragment.start_offset : fragment.end_offset] != fragment.quote
        or proposed.value.model_dump() != {'text': fragment.quote, 'money': None, 'percent': None}
        or proposed.reviewed_value is not None
    ):
        raise HTTPException(422, 'Ручное предложение должно сохранять точную цитату и автора')
    immutable_fields = ('id', 'field', 'value', 'fragment', 'origin', 'proposed_by', 'proposed_at', 'proposal_reason')
    events = db.scalars(
        select(AuditEvent).where(
            AuditEvent.entity_type == 'extraction_results',
            AuditEvent.entity_id == extraction.id,
            AuditEvent.action == 'MANUAL_ANNOTATION_PROPOSED',
            AuditEvent.actor_id == proposed.proposed_by.id,
        )
    )
    if not any(
        event.reason == proposed.proposal_reason
        and event.details.get('advertisement_id') == str(extraction.advertisement_id)
        and all(event.details.get('hypothesis', {}).get(key) == hypothesis.get(key) for key in immutable_fields)
        for event in events
    ):
        raise HTTPException(422, 'Ручное предложение не подтверждено журналом автора')
    return proposed


def independently_confirmed_manual_payment(db, extraction, hypothesis):
    proposed = validate_manual_proposal(db, extraction, hypothesis)
    if (
        proposed.review_status != 'CONFIRMED'
        or not proposed.reviewed_by
        or proposed.reviewed_by.role != 'analyst'
        or proposed.reviewed_by.id == proposed.proposed_by.id
        or not proposed.reviewed_at
        or not proposed.review_reason
        or not proposed.review_reason.strip()
    ):
        raise HTTPException(422, 'Ручное предложение должен отдельно подтвердить другой аналитик')
    events = db.scalars(
        select(AuditEvent)
        .where(
            AuditEvent.entity_type == 'extraction_results',
            AuditEvent.entity_id == extraction.id,
            AuditEvent.action == 'HYPOTHESIS_REVIEWED',
        )
        .order_by(AuditEvent.occurred_at.desc(), AuditEvent.id.desc())
    )
    latest = next((event for event in events if event.details.get('after', {}).get('id') == str(proposed.id)), None)
    if (
        not latest
        or latest.actor_id != proposed.reviewed_by.id
        or latest.reason != proposed.review_reason
        or latest.details.get('after') != hypothesis
    ):
        raise HTTPException(422, 'Независимое подтверждение не совпадает с последним решением в журнале')


@router.post(
    '/api/v1/advertisements/upload',
    response_model=AdvertisementOut,
    status_code=201,
    operation_id='uploadAdvertisement',
    dependencies=[Depends(check_csrf)],
)
async def upload_advertisement(
    request: Request,
    actor: Actor,
    db: DB,
    idempotency_key: Key,
    file: Annotated[UploadFile, File()],
    source_label: Annotated[str, Form(min_length=1, max_length=300)],
    is_demo: Annotated[bool, Form()],
    source_url: Annotated[str | None, Form()] = None,
    published_at: Annotated[str | None, Form()] = None,
):
    analyst(actor)
    if not source_label.strip():
        raise HTTPException(422, 'Укажите источник')
    from app.dto import AdvertisementCreate

    try:
        metadata = AdvertisementCreate(
            text='image',
            source_label=source_label,
            source_url=source_url or None,
            published_at=TypeAdapter(AwareDatetime).validate_python(published_at) if published_at else None,
            is_demo=is_demo,
        )
    except ValueError:
        raise HTTPException(422, 'Проверьте URL и дату публикации') from None
    settings = request.app.state.settings
    content = await file.read(settings.max_upload_bytes + 1)
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(413, 'Файл превышает допустимый размер')
    declared_mime = (file.content_type or '').split(';', 1)[0].strip().lower()
    is_text = declared_mime == 'text/plain' or (file.filename or '').lower().endswith('.txt')
    original_text = ''
    if is_text:
        if declared_mime not in {'text/plain', 'application/octet-stream', ''}:
            raise HTTPException(415, 'Содержимое TXT не соответствует указанному типу')
        original_text = validate_text(content)
        mime, extension, kind = 'text/plain', 'txt', 'TEXT'
    else:
        mime, extension = validate_image(content, file.content_type, settings.max_image_pixels)
        kind = 'IMAGE'
    payload = metadata.model_dump(mode='json') | {'sha256': hashlib.sha256(content).hexdigest()}
    previous, digest = begin_command(db, actor.id, 'uploadAdvertisement', idempotency_key, payload)
    if previous:
        return previous
    key, sha, size = save_bytes(settings.storage_root, content, extension)
    ad = Advertisement(
        id=uuid4(),
        source_label=metadata.source_label,
        source_url=str(metadata.source_url) if metadata.source_url else None,
        published_at=metadata.published_at,
        original_text=original_text,
        is_demo=is_demo,
        created_by=actor.id,
    )
    db.add(ad)
    db.flush()
    db.add(
        Asset(
            advertisement_id=ad.id,
            kind=kind,
            mime_type=mime,
            byte_size=size,
            sha256=sha,
            storage_key=key,
            is_demo=is_demo,
        )
    )
    audit(db, request, actor, ad, 'ADVERTISEMENT_UPLOADED', reason='Ручная загрузка файла', details={'kind': kind})
    db.flush()
    db.expire(ad, ['assets'])
    result = AdvertisementOut.model_validate(ad).model_dump(mode='json')
    finish_command(db, actor.id, 'uploadAdvertisement', idempotency_key, digest, result)
    return result


@router.post(
    '/api/v1/advertisements/{id}/analyze',
    response_model=dto.AnalysisJobOut,
    status_code=202,
    operation_id='analyzeAdvertisement',
    dependencies=[Depends(check_csrf)],
)
def analyze(id: UUID, body: dto.AnalysisRequest, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    operation = f'analyzeAdvertisement:{id}'
    previous, digest = begin_command(db, actor.id, operation, idempotency_key, body.model_dump(mode='json'))
    if previous:
        return previous
    ad = ad_locked(db, id)
    revision(ad.revision, body.expected_advertisement_revision)
    if ad.status == 'ANALYZING':
        raise HTTPException(409, 'Анализ уже запущен')
    old = ad.revision
    ad.revision += 1
    job = AnalysisJob(
        id=uuid4(),
        advertisement_id=id,
        advertisement_revision=ad.revision,
        created_by=actor.id,
        request_id=request.state.request_id,
    )
    db.add(job)
    ad.latest_job_id, ad.status = job.id, 'ANALYZING'
    audit(db, request, actor, ad, 'ANALYSIS_QUEUED', old)
    db.flush()
    result = dto.AnalysisJobOut.model_validate(job).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, digest, result)
    return result


@router.get('/api/v1/analysis-jobs/{id}', response_model=dto.AnalysisJobOut, operation_id='getAnalysisJob')
def job_detail(id: UUID, actor: Actor, db: DB):
    row = db.get(AnalysisJob, id)
    if not row:
        raise HTTPException(404, 'Задание не найдено')
    return row


@router.get(
    '/api/v1/advertisements/{id}/extractions', response_model=list[dto.ExtractionOut], operation_id='listExtractions'
)
def extractions(id: UUID, actor: Actor, db: DB):
    if not db.get(Advertisement, id):
        raise HTTPException(404, 'Публикация не найдена')
    return list(
        db.scalars(
            select(ExtractionResult)
            .where(ExtractionResult.advertisement_id == id)
            .order_by(ExtractionResult.created_at.desc(), ExtractionResult.id)
        )
    )


@router.get(
    '/api/v1/advertisements/{id}/matches', response_model=list[dto.PropertyMatchOut], operation_id='listMatches'
)
def matches(id: UUID, actor: Actor, db: DB):
    latest = latest_extraction(db, id)
    if not db.get(Advertisement, id):
        raise HTTPException(404, 'Публикация не найдена')
    return (
        list(
            db.scalars(
                select(PropertyMatch)
                .where(PropertyMatch.extraction_id == latest.id)
                .order_by(PropertyMatch.similarity.desc(), PropertyMatch.id)
            )
        )
        if latest
        else []
    )


@router.post(
    '/api/v1/extractions/{id}/manual-annotations',
    response_model=dto.ExtractionOut,
    status_code=201,
    operation_id='proposeManualAnnotation',
    dependencies=[Depends(check_csrf)],
)
def propose_manual_annotation(
    id: UUID, body: dto.ManualAnnotationCreate, request: Request, actor: Actor, db: DB, idempotency_key: Key
):
    analyst(actor)
    operation = f'proposeManualAnnotation:{id}'
    previous, digest = begin_command(db, actor.id, operation, idempotency_key, body.model_dump(mode='json'))
    if previous:
        return previous
    original = db.get(ExtractionResult, id)
    if not original:
        raise HTTPException(404, 'Результат не найден')
    ad = ad_locked(db, original.advertisement_id)
    row = db.scalar(
        select(ExtractionResult)
        .where(ExtractionResult.id == id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    revision(row.revision, body.expected_revision)
    if ad.status == 'ANALYZING' or latest_extraction(db, ad.id).id != row.id:
        raise HTTPException(409, 'Предложите фрагмент в последней завершённой версии анализа')
    if body.end_offset > len(row.analysis_text) or row.analysis_text[body.start_offset : body.end_offset] != body.quote:
        raise HTTPException(422, 'Цитата и границы должны точно совпадать с сохранённым текстом')
    if sum(item.get('origin') == 'MANUAL' for item in row.hypotheses) >= 100:
        raise HTTPException(422, 'В одной версии допускается не более 100 ручных предложений')
    if any(
        item['field'] == body.field
        and item['fragment']['start_offset'] == body.start_offset
        and item['fragment']['end_offset'] == body.end_offset
        for item in row.hypotheses
    ):
        raise HTTPException(409, 'Этот фрагмент уже предложен; используйте существующую гипотезу')
    asset = db.get(Asset, row.source_asset_id)
    if not asset or asset.advertisement_id != ad.id or asset.is_demo != ad.is_demo:
        raise HTTPException(422, 'Исходный файл версии недоступен или не соответствует публикации')
    try:
        read_asset(request.app.state.settings.storage_root, asset.storage_key, asset.sha256)
    except OSError:
        raise HTTPException(409, 'Исходник недоступен или нарушена контрольная сумма') from None
    hypothesis = dto.Hypothesis(
        id=uuid4(),
        field=body.field,
        value=dto.HypothesisValue(text=body.quote, money=None, percent=None),
        fragment=dto.Fragment(
            asset_id=row.source_asset_id,
            text_version_id=row.id,
            quote=body.quote,
            start_offset=body.start_offset,
            end_offset=body.end_offset,
            bbox=None,
        ),
        confidence=None,
        review_status='PENDING',
        reviewed_value=None,
        origin='MANUAL',
        proposed_by=UserOut.model_validate(actor),
        proposed_at=utcnow(),
        proposal_reason=body.reason,
    ).model_dump(mode='json')
    old = row.revision
    row.hypotheses = [*copy.deepcopy(row.hypotheses), hypothesis]
    row.revision += 1
    audit(
        db,
        request,
        actor,
        row,
        'MANUAL_ANNOTATION_PROPOSED',
        old,
        body.reason,
        {'advertisement_id': str(ad.id), 'hypothesis': hypothesis},
    )
    result = dto.ExtractionOut.model_validate(row).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, digest, result)
    return result


@router.post(
    '/api/v1/extractions/{id}/review',
    response_model=dto.ExtractionOut,
    operation_id='reviewExtraction',
    dependencies=[Depends(check_csrf)],
)
def review_extraction(
    id: UUID, body: dto.ExtractionReview, request: Request, actor: Actor, db: DB, idempotency_key: Key
):
    from app.api.reviews import invalidate_ad_factors

    analyst(actor)
    operation = f'reviewExtraction:{id}'
    previous, digest = begin_command(db, actor.id, operation, idempotency_key, body.model_dump(mode='json'))
    if previous:
        return previous
    original = db.get(ExtractionResult, id)
    if not original:
        raise HTTPException(404, 'Результат не найден')
    ad = ad_locked(db, original.advertisement_id)
    # Property precedes extraction in the common lock order.
    invalidate_ad_factors(db, ad.id, request, actor, 'Перепроверка гипотезы', hypothesis_id=body.hypothesis_id)
    row = db.scalar(
        select(ExtractionResult)
        .where(ExtractionResult.id == id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    revision(row.revision, body.expected_revision)
    values = copy.deepcopy(row.hypotheses)
    hypothesis = next((h for h in values if h['id'] == str(body.hypothesis_id)), None)
    if not hypothesis:
        raise HTTPException(404, 'Гипотеза не найдена в этой версии')
    before = copy.deepcopy(hypothesis)
    if hypothesis.get('origin') == 'MANUAL':
        proposed = validate_manual_proposal(db, row, hypothesis)
        if proposed.proposed_by.id == actor.id:
            raise HTTPException(403, 'Собственное предложение должен проверить другой аналитик')
        if body.action == 'CORRECT':
            raise HTTPException(422, 'Ручная цитата неизменяема: предложите другой точный фрагмент')
        if ad.status == 'ANALYZING' or latest_extraction(db, ad.id).id != row.id:
            raise HTTPException(409, 'Проверьте ручное предложение в последней завершённой версии анализа')
        hypothesis |= {
            'reviewed_by': UserOut.model_validate(actor).model_dump(mode='json'),
            'reviewed_at': utcnow().isoformat(),
            'review_reason': body.reason,
        }
    hypothesis['review_status'] = {'CONFIRM': 'CONFIRMED', 'CORRECT': 'CORRECTED', 'REJECT': 'REJECTED'}[body.action]
    hypothesis['reviewed_value'] = (
        body.corrected_value.model_dump(mode='json') if body.corrected_value else before.get('reviewed_value')
    )
    old, row.hypotheses = row.revision, values
    row.revision += 1
    audit(
        db,
        request,
        actor,
        row,
        'HYPOTHESIS_REVIEWED',
        old,
        body.reason,
        {'advertisement_id': str(ad.id), 'before': before, 'after': hypothesis},
    )
    result = dto.ExtractionOut.model_validate(row).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, digest, result)
    return result


@router.post(
    '/api/v1/extractions/{id}/transcription',
    response_model=dto.ExtractionOut,
    status_code=201,
    operation_id='correctTranscription',
    dependencies=[Depends(check_csrf)],
)
def transcription(
    id: UUID, body: dto.TranscriptionRequest, request: Request, actor: Actor, db: DB, idempotency_key: Key
):
    analyst(actor)
    operation = f'correctTranscription:{id}'
    previous, digest = begin_command(db, actor.id, operation, idempotency_key, body.model_dump(mode='json'))
    if previous:
        return previous
    row = db.get(ExtractionResult, id)
    if not row:
        raise HTTPException(404, 'Результат не найден')
    ad = ad_locked(db, row.advertisement_id)
    db.refresh(row)
    revision(row.revision, body.expected_revision)
    if ad.status == 'ANALYZING' or latest_extraction(db, ad.id).id != row.id:
        raise HTTPException(409, 'Дождитесь анализа и исправьте последнюю версию')
    from app.api.reviews import invalidate_ad_factors

    invalidate_ad_factors(db, ad.id, request, actor, 'Исправлена расшифровка источника')
    new = create_extraction(
        db, ad, db.get(Asset, row.source_asset_id), body.text, parent=row.id, original_ocr=row.original_ocr_text
    )
    audit(
        db,
        request,
        actor,
        new,
        'TRANSCRIPTION_CREATED',
        reason=body.reason,
        details={'advertisement_id': str(ad.id), 'parent_extraction_id': str(row.id)},
    )
    result = dto.ExtractionOut.model_validate(new).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, digest, result)
    return result


@router.post(
    '/api/v1/advertisements/{id}/matches',
    response_model=AdvertisementOut,
    operation_id='reviewMatch',
    dependencies=[Depends(check_csrf)],
)
def match(id: UUID, body: dto.MatchReview, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    from app.api.reviews import invalidate_ad_factors

    analyst(actor)
    operation = f'reviewPropertyMatch:{id}'
    previous, digest = begin_command(db, actor.id, operation, idempotency_key, body.model_dump(mode='json'))
    if previous:
        return previous
    ad = ad_locked(db, id)
    revision(ad.revision, body.expected_advertisement_revision)
    property_row = db.get(Property, body.property_id)
    if not property_row or property_row.is_demo != ad.is_demo:
        raise HTTPException(422, 'ЖК должен существовать и относиться к той же зоне DEMO/реальных данных')
    latest = latest_extraction(db, id)
    if not latest or ad.status == 'ANALYZING':
        raise HTTPException(409, 'Сначала завершите анализ')
    candidate = (
        db.get(PropertyMatch, body.candidate_id)
        if body.candidate_id
        else db.scalar(
            select(PropertyMatch).where(
                PropertyMatch.extraction_id == latest.id, PropertyMatch.property_id == body.property_id
            )
        )
    )
    if body.candidate_id and (
        not candidate or candidate.extraction_id != latest.id or candidate.property_id != body.property_id
    ):
        raise HTTPException(422, 'Кандидат не относится к этой публикации и версии')
    if body.action == 'REJECT' and not candidate:
        raise HTTPException(404, 'Кандидат не найден')
    before = ad.confirmed_property_id
    if body.action == 'CONFIRM' or ad.confirmed_property_id == body.property_id:
        invalidate_ad_factors(db, ad.id, request, actor, 'Изменена привязка публикации')
    if not candidate:
        candidate = PropertyMatch(
            advertisement_id=id,
            extraction_id=latest.id,
            property_id=body.property_id,
            similarity=0,
            reasons=['Ручной выбор аналитика; сходство не рассчитано.'],
            status='PENDING',
            revision=1,
        )
        db.add(candidate)
    if body.action == 'CONFIRM':
        for other in db.scalars(
            select(PropertyMatch).where(PropertyMatch.advertisement_id == id, PropertyMatch.status == 'CONFIRMED')
        ):
            other.status, other.revision = 'REJECTED', other.revision + 1
        ad.confirmed_property_id = body.property_id
    elif ad.confirmed_property_id == body.property_id:
        ad.confirmed_property_id = None
    candidate.status = 'CONFIRMED' if body.action == 'CONFIRM' else 'REJECTED'
    candidate.revision += 1
    old, ad.revision = ad.revision, ad.revision + 1
    audit(
        db,
        request,
        actor,
        ad,
        'PROPERTY_MATCH_REVIEWED',
        old,
        body.reason,
        {
            'before_property_id': str(before) if before else None,
            'property_id': str(body.property_id),
            'action': body.action,
            'candidate_id': str(candidate.id) if candidate.id else None,
        },
    )
    db.flush()
    result = AdvertisementOut.model_validate(ad).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, digest, result)
    return result
