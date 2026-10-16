"""Explicit bounded URL import using the existing durable job queue."""

from uuid import uuid4

from fastapi import APIRouter, Depends, Request
from pydantic import Field
from sqlalchemy import func, select
from starlette.exceptions import HTTPException

from app.analysis_dto import AnalysisJobOut
from app.api.analysis import Key, analyst
from app.commands import begin_command, finish_command
from app.dependencies import DB, Actor, check_csrf
from app.dto import DTO
from app.models import AnalysisJob, AuditEvent
from app.url_fetcher import FetchError
from app.url_import import SOURCE_ID, approved_url, lock_import

router = APIRouter()


class ImportUrlRequest(DTO):
    url: str = Field(min_length=1, max_length=2048)
    is_demo: bool


@router.post(
    '/api/v1/advertisements/import-url',
    response_model=AnalysisJobOut,
    status_code=202,
    operation_id='importAdvertisementUrl',
    dependencies=[Depends(check_csrf)],
)
def import_url(body: ImportUrlRequest, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    if body.is_demo:
        raise HTTPException(422, 'Открытая публикация является реальным источником; отметка DEMO неприменима.')
    try:
        url = approved_url(body.url)
    except FetchError as exc:
        raise HTTPException(422, str(exc)) from None
    operation = 'importAdvertisementUrl'
    previous, digest = begin_command(db, actor.id, operation, idempotency_key, body.model_dump(mode='json'))
    if previous:
        return previous
    # Bound the queue globally and reuse an already active URL across clients.
    lock_import(db, 'url-import-queue')
    job = db.scalar(
        select(AnalysisJob)
        .where(
            AnalysisJob.kind == 'IMPORT_URL',
            AnalysisJob.state.in_(['QUEUED', 'RUNNING']),
            AnalysisJob.input_payload['url'].as_string() == url,
        )
        .order_by(AnalysisJob.created_at)
        .limit(1)
    )
    if not job:
        active = db.scalar(
            select(func.count())
            .select_from(AnalysisJob)
            .where(
                AnalysisJob.kind == 'IMPORT_URL',
                AnalysisJob.state.in_(['QUEUED', 'RUNNING']),
            )
        )
        if active >= 10:
            raise HTTPException(429, 'Очередь импорта заполнена. Дождитесь завершения текущих загрузок.')
        job = AnalysisJob(
            id=uuid4(),
            kind='IMPORT_URL',
            input_payload={'url': url, 'source_id': SOURCE_ID},
            created_by=actor.id,
            request_id=request.state.request_id,
            stage='Ожидает загрузки открытой публикации',
        )
        db.add(job)
        db.flush()
        db.add(
            AuditEvent(
                actor_id=actor.id,
                action='URL_IMPORT_QUEUED',
                entity_type='analysis_job',
                entity_id=job.id,
                request_id=request.state.request_id,
                details={'source_id': SOURCE_ID},
            )
        )
    result = AnalysisJobOut.model_validate(job).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, digest, result)
    return result
