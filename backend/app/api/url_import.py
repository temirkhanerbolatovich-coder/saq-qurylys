"""Explicit bounded URL import using the existing durable job queue."""

from fastapi import APIRouter, Depends, Request
from pydantic import Field
from starlette.exceptions import HTTPException

from app.analysis_dto import AnalysisJobOut
from app.api.analysis import Key, analyst
from app.commands import begin_command, finish_command
from app.dependencies import DB, Actor, check_csrf
from app.dto import DTO
from app.url_fetcher import FetchError
from app.url_import import ImportQueueFull, approved_url, enqueue_url_import

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
    try:
        job = enqueue_url_import(db, url, actor_id=actor.id, request_id=request.state.request_id)
    except ImportQueueFull:
        raise HTTPException(429, 'Очередь импорта заполнена. Дождитесь завершения текущих загрузок.') from None
    result = AnalysisJobOut.model_validate(job).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, digest, result)
    return result
