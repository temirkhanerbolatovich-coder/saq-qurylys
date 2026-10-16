"""Authenticated operator import of an attributed KHC register; no network fetching."""

import hashlib
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from sqlalchemy import func, select
from starlette.exceptions import HTTPException

from app.api.analysis import Key, analyst, audit
from app.commands import begin_command, finish_command
from app.dependencies import DB, Actor, check_csrf
from app.dto import Page
from app.models import Asset
from app.monitoring import advisory_lock
from app.open_registry import (
    MAX_INPUT_BYTES,
    PROVENANCE_NOTICE,
    PUBLISHER,
    SOURCE_PAGE_URL,
    OpenRegistryDocument,
    OpenRegistryDocumentOut,
    OpenRegistryImport,
    OpenRegistrySearchOut,
    extract_register,
    search_pages,
)
from app.storage import save_bytes

router = APIRouter(prefix='/api/v1/monitoring/open-registry', tags=['Monitoring'])


@router.post(
    '',
    response_model=OpenRegistryDocumentOut,
    status_code=201,
    operation_id='importOpenRegistryDocument',
    dependencies=[Depends(check_csrf)],
)
def import_document(
    request: Request,
    actor: Actor,
    db: DB,
    idempotency_key: Key,
    file: Annotated[UploadFile, File()],
    source_url: Annotated[str, Form(min_length=1, max_length=2048)],
):
    analyst(actor)
    try:
        metadata = OpenRegistryImport(source_url=source_url)
    except ValueError:
        raise HTTPException(422, 'Укажите HTTPS-ссылку на исходный PDF khc.kz/upload/…pdf') from None
    mime = (file.content_type or '').split(';', 1)[0].strip().lower()
    if mime not in {'application/pdf', 'application/octet-stream', ''}:
        raise HTTPException(415, 'Нужен исходный PDF реестра КЖК')
    settings = request.app.state.settings
    maximum = min(settings.max_upload_bytes, MAX_INPUT_BYTES)
    content = file.file.read(maximum + 1)
    if len(content) > maximum:
        raise HTTPException(413, 'Файл реестра превышает допустимый размер')
    sha = hashlib.sha256(content).hexdigest()
    operation = 'importOpenRegistryDocument'
    payload = metadata.model_dump() | {'sha256': sha}
    previous, body_hash = begin_command(db, actor.id, operation, idempotency_key, payload)
    if previous:
        return previous
    advisory_lock(db, f'open-registry:{sha}')
    row = db.scalar(select(OpenRegistryDocument).where(OpenRegistryDocument.sha256 == sha))
    if row is None:
        extracted = extract_register(content)
        key, stored_sha, size = save_bytes(settings.storage_root, content, 'pdf')
        asset = Asset(
            kind='DOCUMENT',
            mime_type='application/pdf',
            byte_size=size,
            sha256=stored_sha,
            storage_key=key,
            is_demo=False,
            source_details={
                'purpose': 'OPEN_KHC_REGISTER',
                'source_url': metadata.source_url,
                'source_page_url': SOURCE_PAGE_URL,
                'publisher': PUBLISHER,
                'as_of': extracted.as_of.isoformat(),
                'provenance_notice': PROVENANCE_NOTICE,
            },
        )
        db.add(asset)
        db.flush()
        row = OpenRegistryDocument(
            asset_id=asset.id,
            source_url=metadata.source_url,
            publisher=PUBLISHER,
            as_of=extracted.as_of,
            pages=[page.model_dump() for page in extracted.pages],
            sha256=sha,
            created_by=actor.id,
        )
        db.add(row)
        db.flush()
        audit(
            db,
            request,
            actor,
            row,
            'OPEN_KHC_REGISTER_IMPORTED',
            reason='Ручная загрузка открытого PDF; применимость документов не подтверждена',
            details={'sha256': sha, 'asset_id': str(asset.id), 'as_of': extracted.as_of.isoformat()},
        )
        db.flush()
    result = OpenRegistryDocumentOut.model_validate(row).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, body_hash, result)
    return result


@router.get('', response_model=Page[OpenRegistryDocumentOut], operation_id='listOpenRegistryDocuments')
def documents(actor: Actor, db: DB, page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100)):
    query = select(OpenRegistryDocument).order_by(OpenRegistryDocument.created_at.desc(), OpenRegistryDocument.id)
    return {
        'items': [
            OpenRegistryDocumentOut.model_validate(row)
            for row in db.scalars(query.offset((page - 1) * page_size).limit(page_size))
        ],
        'page': page,
        'page_size': page_size,
        'total': db.scalar(select(func.count()).select_from(OpenRegistryDocument)),
    }


@router.get('/search', response_model=OpenRegistrySearchOut, operation_id='searchOpenRegistryDocument')
def search(
    actor: Actor,
    db: DB,
    document_id: UUID,
    q: str = Query(min_length=2, max_length=100),
):
    row = db.get(OpenRegistryDocument, document_id)
    if row is None:
        raise HTTPException(404, 'Загруженный реестр не найден')
    hits = search_pages(row.pages, q)
    return {'document': row, 'query': q.strip(), 'items': hits, 'total': len(hits)}
