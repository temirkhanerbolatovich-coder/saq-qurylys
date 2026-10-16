"""Explicit analyst search preview; not a collector, import or legal decision."""

import math
import threading
import time
from typing import Literal

from fastapi import APIRouter, Depends, Request
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, ValidationError
from starlette.exceptions import HTTPException

from app.dependencies import Actor, check_csrf
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
def preview(body: ThreadsSearchInput, actor: Actor, request: Request):
    if actor.role != 'analyst':
        raise HTTPException(403, 'Запускать внешний поиск может только аналитик')
    settings, gate = request.app.state.settings, request.app.state.threads_search_gate
    state = connection_state(settings, gate)
    if state not in {'CONFIGURED_UNVERIFIED', 'ACCESS_VERIFIED'}:
        raise HTTPException(503, 'Поиск Threads не подключён. Администратор должен настроить доступ.')
    try:
        query = SearchRequest(**body.model_dump(), timeout_seconds=settings.threads_search_timeout_seconds)
    except ValidationError:
        raise HTTPException(422, 'Проверьте поисковую фразу') from None
    gate.start(settings.threads_search_interval_seconds)
    succeeded, retry_after = False, 0
    try:
        result = ThreadsSearchResult.model_validate(
            search_threads(settings.threads_access_token.get_secret_value(), query)
        )
        succeeded = True
        return result
    except ThreadsError as error:
        retry_after = error.retry_after or 0
        code = 429 if error.code == 'RATE_LIMITED' else 502
        raise HTTPException(code, f'{error.code}: {error}') from None
    except ValidationError:
        raise HTTPException(502, 'Ответ источника не прошёл проверку. Результаты не показаны.') from None
    finally:
        gate.finish(succeeded, retry_after)
