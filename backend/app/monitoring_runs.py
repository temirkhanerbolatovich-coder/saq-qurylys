"""Persist intent before external I/O. Reads and retries never repeat a source call."""

from datetime import timedelta
from uuid import uuid4

from sqlalchemy import select
from starlette.exceptions import HTTPException

from app.api.analysis import audit
from app.csv_import import digest
from app.models import MonitoringRun, utcnow
from app.monitoring import advisory_lock


def effective_state(run):
    if run.state == 'RUNNING' and run.deadline_at < utcnow():
        return 'INTERRUPTED'
    return run.state


def begin_run(db, request, actor, query, key):
    key = key or uuid4()
    advisory_lock(db, f'monitoring-run:{actor.id}:{key}')
    previous = db.scalar(
        select(MonitoringRun).where(MonitoringRun.created_by == actor.id, MonitoringRun.command_key == key)
    )
    body_hash = digest(query)
    if previous:
        if previous.body_hash != body_hash:
            raise HTTPException(409, 'Этот ключ уже использован для другого поискового запроса.')
        return previous, True
    run = MonitoringRun(
        id=uuid4(),
        source_code='THREADS',
        created_by=actor.id,
        command_key=key,
        body_hash=body_hash,
        query=query,
        deadline_at=utcnow() + timedelta(seconds=30),
    )
    db.add(run)
    db.flush()
    audit(db, request, actor, run, 'MONITORING_RUN_STARTED', details={'source_code': 'THREADS'})
    db.commit()
    return run, False


def finish_run(db, request, actor, run, state, http_status, *, error_code=None, result=None):
    db.refresh(run, with_for_update=True)
    if run.state != 'RUNNING':
        # A lost commit acknowledgement must not replace an already saved outcome.
        return
    run.state, run.http_status, run.error_code = state, http_status, error_code
    run.result, run.finished_at = result, utcnow()
    audit(
        db,
        request,
        actor,
        run,
        'MONITORING_RUN_FINISHED',
        details={
            'source_code': run.source_code,
            'state': state,
            'error_code': error_code,
            'returned_count': result['returned_count'] if result else None,
            'saved_count': 0,
        },
    )
    db.commit()
