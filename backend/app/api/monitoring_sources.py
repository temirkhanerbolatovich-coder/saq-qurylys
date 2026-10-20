"""Read-only capability catalogue and durable explicit search history."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Query, Request
from sqlalchemy import case, func, select
from starlette.exceptions import HTTPException

from app.api.threads import connection_state
from app.dependencies import DB, Actor
from app.dto import DTO, Page
from app.models import AnalysisJob, CsvImportBatch, MonitoringRun, utcnow
from app.monitoring_runs import effective_state

router = APIRouter(prefix='/api/v1/monitoring')
RunState = Literal['RUNNING', 'SUCCEEDED', 'EMPTY', 'BLOCKED', 'RATE_LIMITED', 'ERROR', 'INTERRUPTED']


class MonitoringRunSummary(DTO):
    id: UUID
    source_code: Literal['THREADS']
    created_by: UUID
    query: dict
    state: RunState
    started_at: datetime
    finished_at: datetime | None
    error_code: str | None
    returned_count: int | None
    duplicate_count: int | None
    saved_count: Literal[0]
    coverage: Literal['SINGLE_PAGE_NOT_EXHAUSTIVE']


class MonitoringRunDetail(MonitoringRunSummary):
    result: dict | None


class MonitoringSource(DTO):
    code: Literal['CSV', 'THREADS', 'LICENSED_NEWS', 'OPEN_REGISTER', 'SOCIAL_MANUAL']
    method: str
    state: Literal['READY', 'DISABLED', 'BLOCKED', 'RUNNING', 'RATE_LIMITED', 'ERROR']
    access_status: str
    coverage: str
    action_href: str
    history_href: str | None
    last_attempt: MonitoringRunSummary | None = None
    last_received_at: datetime | None = None
    last_success_at: datetime | None = None
    token_configured: bool | None = None
    retry_after_seconds: int = 0


class MonitoringSourceList(DTO):
    items: list[MonitoringSource]


def summary(run):
    result = run.result
    return dict(
        id=run.id,
        source_code=run.source_code,
        created_by=run.created_by,
        query=run.query,
        state=effective_state(run),
        started_at=run.started_at,
        finished_at=run.finished_at,
        error_code='OUTCOME_UNKNOWN' if effective_state(run) == 'INTERRUPTED' else run.error_code,
        returned_count=result['returned_count'] if result else None,
        duplicate_count=result['duplicate_count'] if result else None,
        saved_count=0,
        coverage='SINGLE_PAGE_NOT_EXHAUSTIVE',
    )


@router.get('/runs', response_model=Page[MonitoringRunSummary], operation_id='listMonitoringRuns')
def runs(
    actor: Actor,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    source_code: Literal['THREADS'] | None = None,
    state: RunState | None = None,
):
    query = select(MonitoringRun)
    if source_code:
        query = query.where(MonitoringRun.source_code == source_code)
    if state:
        current_state = case(
            ((MonitoringRun.state == 'RUNNING') & (MonitoringRun.deadline_at < utcnow()), 'INTERRUPTED'),
            else_=MonitoringRun.state,
        )
        query = query.where(current_state == state)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.scalars(
        query.order_by(MonitoringRun.started_at.desc(), MonitoringRun.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return dict(items=[summary(row) for row in rows], page=page, page_size=page_size, total=total)


@router.get('/runs/{id}', response_model=MonitoringRunDetail, operation_id='getMonitoringRun')
def run_detail(id: UUID, actor: Actor, db: DB):
    row = db.get(MonitoringRun, id)
    if row is None:
        raise HTTPException(404, 'Запуск не найден')
    return summary(row) | {'result': row.result}


@router.get('/sources', response_model=MonitoringSourceList, operation_id='listMonitoringSources')
def sources(actor: Actor, db: DB, request: Request):
    gate = request.app.state.threads_search_gate
    settings = request.app.state.settings
    connection = connection_state(settings, gate)
    busy, cooldown, _ = gate.status()
    latest = db.scalar(select(MonitoringRun).order_by(MonitoringRun.started_at.desc(), MonitoringRun.id).limit(1))
    success = db.scalar(
        select(MonitoringRun.finished_at)
        .where(MonitoringRun.state.in_(['SUCCEEDED', 'EMPTY']))
        .order_by(MonitoringRun.finished_at.desc())
        .limit(1)
    )
    thread_state = 'READY'
    if connection == 'DISABLED':
        thread_state = 'DISABLED'
    elif connection in {'TOKEN_MISSING', 'TOKEN_INVALID'}:
        thread_state = 'BLOCKED'
    elif busy or (latest and effective_state(latest) == 'RUNNING'):
        thread_state = 'RUNNING'
    elif latest and effective_state(latest) in {'ERROR', 'INTERRUPTED'}:
        thread_state = 'ERROR'
    elif cooldown and latest and latest.state == 'RATE_LIMITED':
        thread_state = 'RATE_LIMITED'
    csv = db.scalar(
        select(CsvImportBatch)
        .where(CsvImportBatch.is_demo.is_(False))
        .order_by(CsvImportBatch.created_at.desc())
        .limit(1)
    )
    job = db.scalar(
        select(AnalysisJob).where(AnalysisJob.kind == 'IMPORT_URL').order_by(AnalysisJob.created_at.desc()).limit(1)
    )
    news_success = db.scalar(
        select(AnalysisJob.updated_at)
        .where(AnalysisJob.kind == 'IMPORT_URL', AnalysisJob.state == 'SUCCEEDED')
        .order_by(AnalysisJob.updated_at.desc())
        .limit(1)
    )
    news_state = {'QUEUED': 'RUNNING', 'RUNNING': 'RUNNING', 'FAILED': 'ERROR', 'BLOCKED': 'BLOCKED'}.get(
        job.state if job else '', 'READY'
    )
    return {
        'items': [
            dict(
                code='CSV',
                method='MANUAL_CSV',
                state='READY',
                access_status='USER_PROVIDED',
                coverage='SELECTED_FILE_ONLY',
                action_href='/monitoring?section=imports',
                history_href='/monitoring?section=imports',
                last_received_at=csv.created_at if csv else None,
                last_success_at=csv.created_at if csv else None,
            ),
            dict(
                code='THREADS',
                method='KEYWORD_PREVIEW',
                state=thread_state,
                access_status=connection,
                coverage='SINGLE_PAGE_NOT_EXHAUSTIVE',
                action_href='/monitoring?section=sources#monitoring-threads',
                history_href='/monitoring?section=runs&run_source=THREADS',
                last_attempt=summary(latest) if latest else None,
                last_success_at=success,
                token_configured=bool(settings.threads_access_token),
                retry_after_seconds=cooldown,
            ),
            dict(
                code='LICENSED_NEWS',
                method='PUBLIC_PAGE_URL',
                state=news_state,
                access_status='REVIEWED_PUBLIC_PAGES',
                coverage='EXACT_REVIEWED_URL_ONLY',
                action_href='/advertisements/import-url',
                history_href=None,
                last_received_at=job.created_at if job else None,
                last_success_at=news_success,
            ),
            dict(
                code='OPEN_REGISTER',
                method='MANUAL_PDF',
                state='READY',
                access_status='MANUAL_UPLOAD_ONLY',
                coverage='UPLOADED_DOCUMENT_ONLY',
                action_href='/monitoring?section=sources#open-register-title',
                history_href=None,
            ),
            dict(
                code='SOCIAL_MANUAL',
                method='MANUAL_LINK_TEXT_IMAGE',
                state='BLOCKED',
                access_status='NO_CONNECTOR',
                coverage='NO_AUTOMATIC_COLLECTION',
                action_href='/advertisements/new',
                history_href=None,
            ),
        ]
    }
