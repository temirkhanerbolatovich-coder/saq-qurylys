"""CSV preview/commit and a paginated immutable receipt journal."""

import hashlib
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from fastapi.responses import Response
from sqlalchemy import func, select
from starlette.exceptions import HTTPException

from app.api.analysis import Key, analyst, audit
from app.commands import begin_command, finish_command
from app.csv_import import MAX_BYTES, VERSION, digest, parse_csv, preview_entries
from app.dependencies import DB, Actor, check_csrf
from app.dto import DTO, Page
from app.models import Advertisement, Asset, CsvImportBatch, CsvImportedMaterial
from app.monitoring import advisory_lock
from app.storage import save_bytes, save_text

router = APIRouter(prefix='/api/v1/monitoring/csv-imports')


class CsvCandidate(DTO):
    id: UUID
    name: str
    address: str


class CsvEntry(DTO):
    rows: list[int]
    kind: Literal['TEXT', 'RESEARCH', 'LINK']
    source_label: str
    source_url: str | None
    text: str
    project_name: str
    status: Literal['NEW', 'CHANGED', 'DUPLICATE', 'DUPLICATE_IN_FILE']
    advertisement_id: UUID | None
    previous_advertisement_id: UUID | None
    duplicate_of: int | None
    candidates: list[CsvCandidate]


class CsvPreview(DTO):
    file_sha256: str
    format: Literal['STANDARD', 'SOCIAL_AUDIT']
    row_count: int
    preview_digest: str
    existing_batch_id: UUID | None
    entries: list[CsvEntry]


class CsvBatchSummary(DTO):
    id: UUID
    filename: str
    file_sha256: str
    format: str
    is_demo: bool
    original_asset_id: UUID
    created_by: UUID
    created_at: datetime
    row_count: int
    created_count: int
    duplicate_count: int


class CsvBatchDetail(CsvBatchSummary):
    entries: list[CsvEntry]


async def input_file(file):
    raw = await file.read(MAX_BYTES + 1)
    await file.close()
    if not raw or len(raw) > MAX_BYTES:
        raise HTTPException(413, 'CSV должен содержать от 1 байта до 256 КиБ.')
    return raw


def inspect(db, raw, is_demo):
    format_name, count, materials = parse_csv(raw, is_demo)
    sha = hashlib.sha256(raw).hexdigest()
    batch_key = digest([VERSION, sha, is_demo])
    batch = db.scalar(select(CsvImportBatch).where(CsvImportBatch.batch_key == batch_key))
    entries = preview_entries(db, materials, is_demo)
    return (
        materials,
        batch_key,
        batch,
        CsvPreview(
            file_sha256=sha,
            format=format_name,
            row_count=count,
            preview_digest=digest([batch_key, entries]),
            existing_batch_id=batch.id if batch else None,
            entries=entries,
        ),
    )


@router.get(
    '/template',
    operation_id='downloadCsvImportTemplate',
    response_class=Response,
    responses={200: {'content': {'text/csv': {'schema': {'type': 'string'}}}}},
)
def template(actor: Actor):
    return Response(
        '\ufeffsource_label,source_url,text,published_at,platform,external_id,project_name,city\r\n',
        media_type='text/csv; charset=utf-8',
        headers={'Content-Disposition': 'attachment; filename="saq-materials.csv"'},
    )


@router.post('/preview', response_model=CsvPreview, operation_id='previewCsvImport', dependencies=[Depends(check_csrf)])
async def preview(actor: Actor, db: DB, file: Annotated[UploadFile, File()], is_demo: Annotated[bool, Form()]):
    analyst(actor)
    _, _, _, result = inspect(db, await input_file(file), is_demo)
    return result


@router.post('', response_model=CsvBatchDetail, operation_id='commitCsvImport', dependencies=[Depends(check_csrf)])
async def commit(
    request: Request,
    actor: Actor,
    db: DB,
    idempotency_key: Key,
    file: Annotated[UploadFile, File()],
    is_demo: Annotated[bool, Form()],
    preview_digest: Annotated[str, Form(min_length=64, max_length=64)],
):
    analyst(actor)
    filename = (file.filename or 'materials.csv').replace('\\', '/').rsplit('/', 1)[-1][:200]
    filename = ''.join(c for c in filename if ord(c) >= 32) or 'materials.csv'
    raw = await input_file(file)
    operation = 'commitCsvImport'
    payload = {'sha256': hashlib.sha256(raw).hexdigest(), 'is_demo': is_demo, 'preview_digest': preview_digest}
    previous, body_hash = begin_command(db, actor.id, operation, idempotency_key, payload)
    if previous:
        return previous
    # Serialize receipt creation and material identity across users and API workers.
    advisory_lock(db, 'csv-import-v1')
    materials, batch_key, batch, checked = inspect(db, raw, is_demo)
    if batch:
        result = CsvBatchDetail.model_validate(batch).model_dump(mode='json')
        finish_command(db, actor.id, operation, idempotency_key, body_hash, result)
        return result
    if checked.preview_digest != preview_digest:
        raise HTTPException(409, 'Данные изменились после предпросмотра. Повторите проверку файла.')
    root = request.app.state.settings.storage_root
    # The original CSV remains exact bytes under a TEXT asset; .txt is an internal
    # storage extension accepted by backup/restore, while MIME retains text/csv.
    key, sha, size = save_bytes(root, raw, 'txt')
    original = Asset(
        id=uuid4(),
        kind='TEXT',
        mime_type='text/csv',
        byte_size=size,
        sha256=sha,
        storage_key=key,
        is_demo=is_demo,
        source_details={'import_method': 'CSV', 'filename': filename},
    )
    db.add(original)
    db.flush()
    batch = CsvImportBatch(
        id=uuid4(),
        batch_key=batch_key,
        filename=filename,
        file_sha256=sha,
        format=checked.format,
        is_demo=is_demo,
        original_asset_id=original.id,
        created_by=actor.id,
        row_count=checked.row_count,
        created_count=0,
        duplicate_count=0,
        entries=[],
    )
    db.add(batch)
    db.flush()
    resolved, entries = {}, []
    for material, item in zip(materials, checked.entries, strict=True):
        entry = item.model_dump(mode='json')
        ad_id = item.advertisement_id or resolved.get(material.fingerprint)
        if ad_id:
            batch.duplicate_count += 1
        else:
            ad = Advertisement(
                id=uuid4(),
                source_label=material.source_label,
                source_url=material.source_url,
                original_text=material.text,
                published_at=material.published_at,
                is_demo=is_demo,
                created_by=actor.id,
            )
            db.add(ad)
            key, sha, size = save_text(root, material.text)
            db.flush()
            ad_id = ad.id
            db.add(
                Asset(
                    advertisement_id=ad_id,
                    kind='TEXT',
                    mime_type='text/plain',
                    storage_key=key,
                    sha256=sha,
                    byte_size=size,
                    is_demo=is_demo,
                    source_details={
                        'import_method': 'CSV',
                        'batch_id': str(batch.id),
                        'original_asset_id': str(original.id),
                        'kind': material.kind,
                        'rows': material.source_rows,
                        'previous_advertisement_id': entry['previous_advertisement_id'],
                        'identity_confirmed': False,
                    },
                )
            )
            audit(
                db,
                request,
                actor,
                ad,
                'ADVERTISEMENT_CSV_IMPORTED',
                reason='Явный импорт CSV после предпросмотра',
                details={
                    'batch_id': str(batch.id),
                    'kind': material.kind,
                    'source_rows': material.rows,
                    'previous_advertisement_id': entry['previous_advertisement_id'],
                },
            )
            batch.created_count += 1
        if material.fingerprint not in resolved and not db.scalar(
            select(CsvImportedMaterial.id).where(CsvImportedMaterial.fingerprint == material.fingerprint)
        ):
            db.add(
                CsvImportedMaterial(
                    fingerprint=material.fingerprint,
                    identity_key=material.identity_key,
                    advertisement_id=ad_id,
                    batch_id=batch.id,
                )
            )
        resolved[material.fingerprint] = ad_id
        entry['advertisement_id'] = str(ad_id)
        entries.append(entry)
    batch.entries = entries
    audit(
        db,
        request,
        actor,
        batch,
        'CSV_IMPORT_COMMITTED',
        reason='Сохранён пакет CSV и журнал поступления',
        details={
            'file_sha256': checked.file_sha256,
            'created_count': batch.created_count,
            'duplicate_count': batch.duplicate_count,
        },
    )
    db.flush()
    result = CsvBatchDetail.model_validate(batch).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, body_hash, result)
    return result


@router.get('', response_model=Page[CsvBatchSummary], operation_id='listCsvImports')
def batches(
    actor: Actor,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_demo: bool | None = None,
):
    query = select(CsvImportBatch)
    if is_demo is not None:
        query = query.where(CsvImportBatch.is_demo == is_demo)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.scalars(
        query.order_by(CsvImportBatch.created_at.desc(), CsvImportBatch.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return {'items': list(rows), 'page': page, 'page_size': page_size, 'total': total}


@router.get('/{id}', response_model=CsvBatchDetail, operation_id='getCsvImport')
def batch_detail(id: UUID, actor: Actor, db: DB):
    batch = db.get(CsvImportBatch, id)
    if not batch:
        raise HTTPException(404, 'Пакет CSV не найден')
    return batch
