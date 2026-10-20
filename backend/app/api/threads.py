"""Explicit analyst search preview; not a collector, import or legal decision."""

import math
import threading
import time
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Request
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, ValidationError
from starlette.exceptions import HTTPException

from app.dependencies import DB, Actor, check_csrf
from app.monitoring_runs import begin_run, effective_state, finish_run
from app.threads_search import SearchPost, SearchRequest, ThreadsError, search_threads, validate_token

router = APIRouter(prefix='/api/v1/monitoring/threads', tags=['Monitoring'])


class ThreadsSearchInput(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    query: str = Field(min_length=2, max_length=300)
    search_type: Literal['RECENT', 'TOP'] = 'RECENT'
    limit: int = Field(default=20, ge=1, le=50)


class ThreadsConnectionStatus(BaseModel):
    state: Literal['DISABLED', 'TOKEN_MISSING', 'TOKEN_INVALID', 'CONFIGURED_UNVERIFIED', 'ACCESS_VERIFIED']
    busy: bool
    retry_after_seconds: int
    last_attempt: Literal['NOT_RUN', 'SUCCEEDED', 'FAILED']


class ThreadsSearchResult(BaseModel):
    run_id: UUID | None = None
    schema_version: Literal[1]
    source: Literal['THREADS_OFFICIAL_KEYWORD_SEARCH']
    is_demo: Literal[False]
    request: ThreadsSearchInput
    captured_at: AwareDatetime
    raw_response_sha256: str = Field(pattern=r'^[a-f0-9]{64}$')
    returned_count: int = Field(ge=0, le=50)
    duplicate_count: int = Field(ge=0, le=50)
    has_more: bool
    coverage: Literal['SINGLE_PAGE_NOT_EXHAUSTIVE']
    review_status: Literal['UNREVIEWED_SEARCH_RESULTS']
    registry_status: Literal['NOT_CHECKED']
    items: list[SearchPost] = Field(max_length=50)


class SearchGate:
    """One in-flight search/cooldown per API process, shared by all signed-in users.

    This matches the current single-process local deployment. Multiple API workers
    require a shared quota/lease before enabling the external source.
    """

    def __init__(self):
        self.lock = threading.Lock()
        self.busy = False
        self.next_allowed = 0.0
        self.last_attempt = 'NOT_RUN'

    def status(self):
        with self.lock:
            return self.busy, max(0, math.ceil(self.next_allowed - time.monotonic())), self.last_attempt

    def start(self, interval):
        with self.lock:
            if self.busy or self.next_allowed > time.monotonic():
                raise HTTPException(429, 'Поиск уже выполняется или ещё действует пауза. Обновите статус подключения.')
            self.busy = True
            self.next_allowed = time.monotonic() + interval

    def finish(self, succeeded, retry_after=0):
        with self.lock:
            self.busy = False
            self.last_attempt = 'SUCCEEDED' if succeeded else 'FAILED'
            self.next_allowed = max(self.next_allowed, time.monotonic() + retry_after)


def connection_state(settings, gate):
    if not settings.threads_search_enabled:
        return 'DISABLED'
    token = settings.threads_access_token.get_secret_value()
    try:
        validate_token(token)
    except ThreadsError as error:
        return error.code
    return 'ACCESS_VERIFIED' if gate.status()[2] == 'SUCCEEDED' else 'CONFIGURED_UNVERIFIED'


@router.get('/status', response_model=ThreadsConnectionStatus, operation_id='getThreadsSearchStatus')
def status(actor: Actor, request: Request):
    gate = request.app.state.threads_search_gate
    busy, retry_after, last_attempt = gate.status()
    return {
        'state': connection_state(request.app.state.settings, gate),
        'busy': busy,
        'retry_after_seconds': retry_after,
        'last_attempt': last_attempt,
    }


@router.post(
    '/search',
    response_model=ThreadsSearchResult,
    operation_id='searchThreadsPreview',
    dependencies=[Depends(check_csrf)],
)
def preview(
    body: ThreadsSearchInput,
    actor: Actor,
    request: Request,
    db: DB,
    idempotency_key: Annotated[UUID | None, Header(alias='Idempotency-Key')] = None,
):
    return execute_search(body, actor, request, db, idempotency_key)


def replay_result(run):
    if run.result is not None:
        return run.result
    if run.state == 'RUNNING':
        message = (
            'Исход предыдущего запроса неизвестен. Откройте историю; автоматического повтора нет.'
            if effective_state(run) == 'INTERRUPTED'
            else 'Запрос ещё выполняется. Обновите историю запусков.'
        )
        raise HTTPException(409, message)
    raise HTTPException(
        run.http_status or 500,
        f'{run.error_code}: сохранённый результат попытки. Новый поиск требует нового запуска.',
    )


def execute_search(body, actor, request, db, idempotency_key, *, query_metadata=None):
    """Use the same transport, access gate and durable outcome for explicit profile runs."""
    if actor.role != 'analyst':
        raise HTTPException(403, 'Запускать внешний поиск может только аналитик')
    settings, gate = request.app.state.settings, request.app.state.threads_search_gate
    try:
        query = SearchRequest(**body.model_dump(), timeout_seconds=settings.threads_search_timeout_seconds)
    except ValidationError:
        raise HTTPException(422, 'Проверьте поисковую фразу') from None
    run, replay = begin_run(db, request, actor, query_metadata or body.model_dump(mode='json'), idempotency_key)
    if replay:
        return replay_result(run)
    state = connection_state(settings, gate)
    if state not in {'CONFIGURED_UNVERIFIED', 'ACCESS_VERIFIED'}:
        finish_run(db, request, actor, run, 'BLOCKED', 503, error_code=state)
        raise HTTPException(503, 'Поиск Threads не подключён. Администратор должен настроить доступ.')
    try:
        gate.start(settings.threads_search_interval_seconds)
    except HTTPException:
        finish_run(db, request, actor, run, 'RATE_LIMITED', 429, error_code='LOCAL_COOLDOWN')
        raise
    succeeded, retry_after = False, 0
    try:
        result = ThreadsSearchResult.model_validate(
            search_threads(settings.threads_access_token.get_secret_value(), query)
        )
        result.run_id = run.id
        finish_run(
            db,
            request,
            actor,
            run,
            'SUCCEEDED' if result.items else 'EMPTY',
            200,
            result=result.model_dump(mode='json'),
        )
        succeeded = True
        return result
    except ThreadsError as error:
        retry_after = error.retry_after or 0
        code = 429 if error.code == 'RATE_LIMITED' else 502
        finish_run(db, request, actor, run, 'RATE_LIMITED' if code == 429 else 'ERROR', code, error_code=error.code)
        raise HTTPException(code, f'{error.code}: {error}') from None
    except ValidationError:
        finish_run(db, request, actor, run, 'ERROR', 502, error_code='RESPONSE_INVALID')
        raise HTTPException(502, 'Ответ источника не прошёл проверку. Результаты не показаны.') from None
    except Exception:
        db.rollback()
        # Save only a fixed code, never upstream exceptions or credentials.
        finish_run(db, request, actor, run, 'ERROR', 500, error_code='INTERNAL_ERROR')
        raise HTTPException(500, 'Поиск завершился внутренней ошибкой. Проверьте историю запусков.') from None
    finally:
        gate.finish(succeeded, retry_after)
