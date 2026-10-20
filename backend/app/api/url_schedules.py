"""Read settings/history or explicitly save/enable reviewed URL schedules."""

from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import Field, field_validator
from sqlalchemy import func, select
from starlette.exceptions import HTTPException

from app.api.analysis import Key, analyst
from app.commands import begin_command, finish_command
from app.dependencies import DB, Actor, check_csrf
from app.dto import DTO, Page
from app.models import AnalysisJob, AuditEvent, UrlSchedule, UrlScheduleRun, utcnow
from app.url_fetcher import FetchError
from app.url_import import approved_url, lock_import, source_for_url

router = APIRouter(prefix='/api/v1/monitoring/url-schedules', tags=['Monitoring'])


class UrlScheduleSettings(DTO):
    name: str = Field(min_length=1, max_length=100)
    interval_minutes: int = Field(default=1440, ge=60, le=10080, strict=True)

    @field_validator('name')
    @classmethod
    def valid_name(cls, value):
        value = value.strip()
        if not value or any(ord(char) < 32 for char in value):
            raise ValueError('Укажите название без управляющих символов')
        return value


class UrlScheduleCreate(UrlScheduleSettings):
    url: str = Field(min_length=1, max_length=2048)


class UrlScheduleEdit(UrlScheduleSettings):
    expected_revision: int = Field(ge=1, strict=True)


class UrlScheduleState(DTO):
    expected_revision: int = Field(ge=1, strict=True)
    enabled: bool = Field(strict=True)


class UrlScheduleOut(DTO):
    id: UUID
    url: str
    source_id: str
    name: str
    interval_minutes: int
    enabled: bool
    revision: int
    next_run_at: datetime | None
    failure_count: int
    pause_reason: str | None
    created_at: datetime
    updated_at: datetime
    created_by: UUID
    updated_by: UUID


class UrlScheduleRunOut(DTO):
    id: UUID
    schedule_id: UUID
    configuration: dict
    due_at: datetime
    created_at: datetime
    finished_at: datetime | None
    state: str
    reason: str | None
    job_id: UUID | None
    reused_job: bool
    advertisement_id: UUID | None


class UrlSchedulePage(Page[UrlScheduleOut]):
    source_interval_seconds: int
    source_hourly_limit: int


def get_schedule(db, id, *, lock=False):
    query = select(UrlSchedule).where(UrlSchedule.id == id)
    row = db.scalar(query.with_for_update().execution_options(populate_existing=True) if lock else query)
    if row is None:
        raise HTTPException(404, 'Расписание не найдено')
    return row


def save_result(db, row, actor, request, operation, key, digest, old_revision):
    db.flush()
    db.add(
        AuditEvent(
            actor_id=actor.id,
            action=operation,
            entity_type='url_schedule',
            entity_id=row.id,
            old_revision=old_revision,
            new_revision=row.revision,
            request_id=request.state.request_id,
            details={'enabled': row.enabled, 'source_id': row.source_id},
        )
    )
    result = UrlScheduleOut.model_validate(row).model_dump(mode='json')
    finish_command(db, actor.id, operation, key, digest, result)
    return result


@router.get('', response_model=UrlSchedulePage, operation_id='listUrlSchedules')
def schedules(
    request: Request, actor: Actor, db: DB, page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100)
):
    rows = db.scalars(
        select(UrlSchedule)
        .order_by(UrlSchedule.created_at.desc(), UrlSchedule.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return dict(
        items=list(rows),
        total=db.scalar(select(func.count()).select_from(UrlSchedule)),
        page=page,
        page_size=page_size,
        source_interval_seconds=request.app.state.settings.url_schedule_source_interval_seconds,
        source_hourly_limit=request.app.state.settings.url_schedule_source_hourly_limit,
    )


@router.get('/{id}', response_model=UrlScheduleOut, operation_id='getUrlSchedule')
def schedule_detail(id: UUID, actor: Actor, db: DB):
    return get_schedule(db, id)


@router.get('/{id}/runs', response_model=Page[UrlScheduleRunOut], operation_id='listUrlScheduleRuns')
def schedule_runs(id: UUID, actor: Actor, db: DB, page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100)):
    get_schedule(db, id)
    rows = db.execute(
        select(UrlScheduleRun, AnalysisJob)
        .outerjoin(AnalysisJob, UrlScheduleRun.job_id == AnalysisJob.id)
        .where(UrlScheduleRun.schedule_id == id)
        .order_by(UrlScheduleRun.created_at.desc(), UrlScheduleRun.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = []
    for run, job in rows:
        item = dict(
            id=run.id,
            schedule_id=run.schedule_id,
            configuration=run.configuration,
            due_at=run.due_at,
            created_at=run.created_at,
            finished_at=run.finished_at,
            state=run.state,
            reason=run.reason,
            job_id=run.job_id,
            reused_job=run.reused_job,
            advertisement_id=job.advertisement_id if job else None,
        )
        # Display current job state without writes or requiring a scheduler tick.
        if run.state == 'QUEUED' and job:
            item['state'] = job.state
            if job.state not in {'QUEUED', 'RUNNING'}:
                item['finished_at'] = job.updated_at
                item['reason'] = (job.error or {}).get('error', {}).get('code')
        items.append(item)
    total = db.scalar(select(func.count()).select_from(UrlScheduleRun).where(UrlScheduleRun.schedule_id == id))
    return dict(items=items, total=total, page=page, page_size=page_size)


@router.post(
    '',
    response_model=UrlScheduleOut,
    status_code=201,
    operation_id='createUrlSchedule',
    dependencies=[Depends(check_csrf)],
)
def create_schedule(body: UrlScheduleCreate, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    try:
        url = approved_url(body.url)
    except FetchError:
        raise HTTPException(422, 'Укажите точный адрес подключённой открытой страницы.') from None
    operation = 'createUrlSchedule'
    previous, digest = begin_command(db, actor.id, operation, idempotency_key, body.model_dump())
    if previous:
        return previous
    lock_import(db, 'url-schedules-create')
    if db.scalar(select(UrlSchedule.id).where(UrlSchedule.url == url)):
        raise HTTPException(409, 'Для этого URL уже есть расписание. Выберите его в списке.')
    if db.scalar(select(func.count()).select_from(UrlSchedule)) >= 100:
        raise HTTPException(429, 'Достигнут предел 100 расписаний для локального пилота.')
    row = UrlSchedule(
        url=url,
        source_id=source_for_url(url).id,
        name=body.name,
        interval_minutes=body.interval_minutes,
        created_by=actor.id,
        updated_by=actor.id,
    )
    db.add(row)
    return save_result(db, row, actor, request, operation, idempotency_key, digest, None)


def begin_edit(db, id, body, actor, operation, key):
    previous, digest = begin_command(db, actor.id, operation, key, {'id': str(id), **body.model_dump()})
    if previous:
        return previous, digest, None
    row = get_schedule(db, id, lock=True)
    if row.revision != body.expected_revision:
        raise HTTPException(409, 'Расписание изменено. Обновите состояние; ваш ввод остаётся в форме.')
    return None, digest, row


@router.post(
    '/{id}/settings', response_model=UrlScheduleOut, operation_id='editUrlSchedule', dependencies=[Depends(check_csrf)]
)
def edit_schedule(id: UUID, body: UrlScheduleEdit, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    operation = 'editUrlSchedule'
    previous, digest, row = begin_edit(db, id, body, actor, operation, idempotency_key)
    if previous:
        return previous
    if row.enabled:
        raise HTTPException(409, 'Сначала выключите расписание, затем сохраните настройки.')
    old = row.revision
    row.name, row.interval_minutes = body.name, body.interval_minutes
    row.revision += 1
    row.updated_at, row.updated_by = utcnow(), actor.id
    return save_result(db, row, actor, request, operation, idempotency_key, digest, old)


@router.post(
    '/{id}/state', response_model=UrlScheduleOut, operation_id='setUrlScheduleState', dependencies=[Depends(check_csrf)]
)
def schedule_state(id: UUID, body: UrlScheduleState, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    operation = 'setUrlScheduleState'
    previous, digest, row = begin_edit(db, id, body, actor, operation, idempotency_key)
    if previous:
        return previous
    try:
        if body.enabled and source_for_url(approved_url(row.url)).id != row.source_id:
            raise FetchError('SOURCE_NOT_APPROVED')
    except FetchError:
        raise HTTPException(422, 'Источник больше не подключён. Включение недоступно.') from None
    old = row.revision
    row.revision += 1
    row.enabled, row.updated_at, row.updated_by = body.enabled, utcnow(), actor.id
    row.next_run_at = row.updated_at + timedelta(minutes=row.interval_minutes) if body.enabled else None
    row.failure_count, row.pause_reason = 0, None
    return save_result(db, row, actor, request, operation, idempotency_key, digest, old)
