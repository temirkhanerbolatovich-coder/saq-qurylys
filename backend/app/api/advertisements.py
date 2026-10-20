import hashlib
import json
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import selectinload
from starlette.exceptions import HTTPException

from app import dto
from app.analysis_dto import AdvertisementReviewItem, AdvertisementReviewPage, PublicationComparison, ReviewAction
from app.dependencies import DB, Actor, check_csrf
from app.models import Advertisement, Asset, AuditEvent, Command, Evidence, utcnow
from app.publication_comparison import compare_publications
from app.review_queue import ACTIONS, review_work
from app.storage import save_text

router = APIRouter()

MATERIAL_SEARCH_DESCRIPTION = (
    'Case-insensitive literal substring in saved original_text or source_label. '
    'Whitespace-only query is ignored; OCR, hypotheses and external sources are not searched. '
    'Applied before counts and pagination, combined with other filters.'
)


def search_materials(query, q):
    """Share literal original/source search between the library and review queues."""
    if not q or not q.strip():
        return query
    escaped = q.strip().replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
    pattern = f'%{escaped}%'
    return query.where(
        or_(
            Advertisement.original_text.ilike(pattern, escape='\\'),
            Advertisement.source_label.ilike(pattern, escape='\\'),
        )
    )


@router.get(
    '/api/v1/advertisements/compare', response_model=PublicationComparison, operation_id='compareSavedPublications'
)
def compare(
    actor: Actor,
    db: DB,
    left_id: UUID,
    right_id: UUID,
    left_extraction_id: UUID | None = None,
    right_extraction_id: UUID | None = None,
):
    return compare_publications(db, left_id, right_id, left_extraction_id, right_extraction_id)


@router.get(
    '/api/v1/advertisements/review-queue',
    response_model=AdvertisementReviewPage,
    operation_id='listAdvertisementReviewQueue',
)
def review_queue(
    actor: Actor,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    q: str | None = Query(None, max_length=300, description=MATERIAL_SEARCH_DESCRIPTION),
    property_id: UUID | None = None,
    is_demo: bool | None = None,
    action: ReviewAction | None = None,
    date_from: Annotated[dto.AwareDatetime | None, Query(alias='from')] = None,
    date_to: Annotated[dto.AwareDatetime | None, Query(alias='to')] = None,
):
    query = search_materials(select(Advertisement), q)
    if property_id:
        query = query.where(Advertisement.confirmed_property_id == property_id)
    if is_demo is not None:
        query = query.where(Advertisement.is_demo == is_demo)
    if date_from:
        query = query.where(Advertisement.captured_at >= date_from)
    if date_to:
        query = query.where(Advertisement.captured_at < date_to)
    work = {
        id: item
        for id, item in review_work(db, query).items()
        if item.actions and (not action or action in item.actions)
    }
    rows = db.scalars(
        query.where(Advertisement.id.in_(work))
        .options(selectinload(Advertisement.assets))
        .order_by(Advertisement.captured_at.desc(), Advertisement.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return AdvertisementReviewPage(
        items=[
            AdvertisementReviewItem(**work[row.id].model_dump(), advertisement=dto.AdvertisementOut.model_validate(row))
            for row in rows
        ],
        page=page,
        page_size=page_size,
        total=len(work),
        action_totals={code: sum(code in item.actions for item in work.values()) for code in ACTIONS},
    )


@router.get('/api/v1/advertisements', response_model=dto.Page[dto.AdvertisementOut], operation_id='listAdvertisements')
def advertisements(
    actor: Actor,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    q: str | None = Query(None, max_length=300, description=MATERIAL_SEARCH_DESCRIPTION),
    property_id: UUID | None = None,
    is_demo: bool | None = None,
    status: Literal['NEW', 'ANALYZING', 'READY_FOR_REVIEW', 'REVIEWED', 'FAILED'] | None = None,
    date_from: Annotated[dto.AwareDatetime | None, Query(alias='from')] = None,
    date_to: Annotated[dto.AwareDatetime | None, Query(alias='to')] = None,
):
    query = search_materials(select(Advertisement), q)
    if property_id:
        query = query.where(Advertisement.confirmed_property_id == property_id)
    if is_demo is not None:
        query = query.where(Advertisement.is_demo == is_demo)
    if status:
        query = query.where(Advertisement.status == status)
    if date_from:
        query = query.where(Advertisement.captured_at >= date_from)
    if date_to:
        query = query.where(Advertisement.captured_at < date_to)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.scalars(
        query.order_by(Advertisement.captured_at.desc(), Advertisement.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return {
        'items': [dto.AdvertisementOut.model_validate(row) for row in rows],
        'page': page,
        'page_size': page_size,
        'total': total,
    }


@router.post(
    '/api/v1/advertisements',
    response_model=dto.AdvertisementOut,
    status_code=201,
    operation_id='createAdvertisement',
    dependencies=[Depends(check_csrf)],
)
def create_advertisement(
    body: dto.AdvertisementCreate,
    request: Request,
    actor: Actor,
    db: DB,
    idempotency_key: Annotated[UUID, Header()],
):
    settings = request.app.state.settings
    if actor.role != 'analyst':
        raise HTTPException(403, 'Добавлять материалы может аналитик')
    payload = body.model_dump(mode='json')
    body_hash = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    lock = int.from_bytes(
        hashlib.sha256(f'{actor.id}:createAdvertisement:{idempotency_key}'.encode()).digest()[:8], signed=True
    )
    db.execute(text('SELECT pg_advisory_xact_lock(:key)'), {'key': lock})
    command = db.scalar(
        select(Command).where(
            Command.actor_id == actor.id, Command.operation == 'createAdvertisement', Command.key == idempotency_key
        )
    )
    if command:
        if command.body_hash != body_hash:
            raise HTTPException(409, 'Этот ключ уже использован для другого содержимого')
        return command.response
    key, digest, size = save_text(settings.storage_root, body.text)
    row = Advertisement(
        id=uuid4(),
        source_label=body.source_label,
        source_url=str(body.source_url) if body.source_url else None,
        published_at=body.published_at,
        original_text=body.text,
        captured_at=utcnow(),
        is_demo=body.is_demo,
        created_by=actor.id,
    )
    db.add(row)
    db.flush()
    db.add(
        Asset(
            advertisement_id=row.id,
            kind='TEXT',
            mime_type='text/plain',
            byte_size=size,
            sha256=digest,
            storage_key=key,
            captured_at=row.captured_at,
            is_demo=row.is_demo,
        )
    )
    db.add(
        AuditEvent(
            actor_id=actor.id,
            action='ADVERTISEMENT_CREATED',
            entity_type='advertisement',
            entity_id=row.id,
            new_revision=1,
            request_id=request.state.request_id,
            reason='Ручное добавление текста',
        )
    )
    db.flush()
    db.expire(row, ['assets'])
    result = dto.AdvertisementOut.model_validate(row).model_dump(mode='json')
    db.add(
        Command(
            actor_id=actor.id,
            operation='createAdvertisement',
            key=idempotency_key,
            body_hash=body_hash,
            response=result,
        )
    )
    db.commit()
    return result


@router.get('/api/v1/advertisements/{id}', response_model=dto.AdvertisementOut, operation_id='getAdvertisement')
def advertisement_detail(id: UUID, actor: Actor, db: DB):
    row = db.get(Advertisement, id)
    if not row:
        raise HTTPException(404, 'Публикация не найдена')
    return dto.AdvertisementOut.model_validate(row)


@router.get('/api/v1/assets/{id}', operation_id='downloadAsset')
def asset_download(id: UUID, request: Request, actor: Actor, db: DB, inline: bool = False):
    settings = request.app.state.settings
    row = db.get(Asset, id)
    if not row:
        raise HTTPException(404, 'Материал не найден')
    path = (settings.storage_root / row.storage_key).resolve()
    if not path.is_relative_to(settings.storage_root.resolve()) or not path.is_file():
        raise HTTPException(404, 'Сохранённый файл недоступен')
    if hashlib.sha256(path.read_bytes()).hexdigest() != row.sha256:
        raise HTTPException(409, 'Контрольная сумма материала не совпадает')
    preview = inline and row.kind == 'IMAGE' and row.mime_type in {'image/png', 'image/jpeg'}
    return FileResponse(
        path,
        media_type=row.mime_type if preview else 'application/octet-stream',
        filename=f'{row.id}{".csv" if row.mime_type == "text/csv" else path.suffix}',
        content_disposition_type='inline' if preview else 'attachment',
        headers={'Content-Security-Policy': "default-src 'none'; sandbox"},
    )


@router.get('/api/v1/evidence/{id}', operation_id='getEvidence')
def evidence_detail(id: UUID, actor: Actor, db: DB):
    row = db.get(Evidence, id)
    if not row:
        raise HTTPException(404, 'Доказательство не найдено')
    return {'id': str(row.id), 'property_id': str(row.property_id), 'asset_id': str(row.asset_id), **row.details}
