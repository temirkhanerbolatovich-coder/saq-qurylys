"""Durable opt-in scheduling for reviewed URLs using the existing leased queue."""

from datetime import timedelta
from uuid import uuid4

from sqlalchemy import select

from app.models import AnalysisJob, AuditEvent, UrlSchedule, UrlScheduleRun, User, utcnow
from app.url_fetcher import FetchError
from app.url_import import ImportQueueFull, approved_url, enqueue_url_import, lock_import, source_for_url


def configuration(row):
    return dict(
        name=row.name,
        url=row.url,
        source_id=row.source_id,
        revision=row.revision,
        interval_minutes=row.interval_minutes,
    )


def pause(db, schedule, reason, now):
    schedule.enabled, schedule.next_run_at, schedule.pause_reason = False, None, reason
    old_revision = schedule.revision
    schedule.revision += 1
    schedule.updated_at = now
    db.add(
        AuditEvent(
            actor_id=schedule.updated_by,
            action='URL_SCHEDULE_PAUSED',
            entity_type='url_schedule',
            entity_id=schedule.id,
            old_revision=old_revision,
            new_revision=schedule.revision,
            details={'reason': reason, 'worker': True},
        )
    )


def settle_runs(db, now):
    # Single short scheduler transaction; network I/O is owned by the job worker.
    for run in db.scalars(select(UrlScheduleRun).where(UrlScheduleRun.state == 'QUEUED')):
        job = db.get(AnalysisJob, run.job_id)
        if job.state in {'QUEUED', 'RUNNING'}:
            continue
        row = db.scalar(select(UrlSchedule).where(UrlSchedule.id == run.schedule_id).with_for_update())
        run.state, run.finished_at = job.state, job.updated_at
        run.reason = (job.error or {}).get('error', {}).get('code')
        # An older attempt cannot alter a newly enabled configuration.
        if not row.enabled or row.revision != run.configuration['revision']:
            continue
        if job.state == 'SUCCEEDED':
            row.failure_count, row.pause_reason = 0, None
        else:
            row.failure_count += 1
            if job.state == 'BLOCKED' or row.failure_count >= 3:
                pause(db, row, run.reason or 'REPEATED_FAILURE', now)
            else:
                row.pause_reason = 'BACKOFF'
                delay = min(1440, row.interval_minutes * 2**row.failure_count)
                row.next_run_at = max(row.next_run_at, now + timedelta(minutes=delay))


def source_quota_until(db, source_id, settings, now):
    # Manual jobs also consume the scheduler's source allowance. This is an
    # admission budget; lease recovery can perform the existing bounded retries.
    starts = list(
        db.scalars(
            select(AnalysisJob.created_at)
            .where(
                AnalysisJob.kind == 'IMPORT_URL',
                AnalysisJob.input_payload['source_id'].as_string() == source_id,
                AnalysisJob.created_at > now - timedelta(hours=1),
            )
            .order_by(AnalysisJob.created_at.desc())
            .limit(settings.url_schedule_source_hourly_limit)
        )
    )
    limits = [now]
    if starts:
        limits.append(starts[0] + timedelta(seconds=settings.url_schedule_source_interval_seconds))
    if len(starts) >= settings.url_schedule_source_hourly_limit:
        limits.append(starts[settings.url_schedule_source_hourly_limit - 1] + timedelta(hours=1))
    return max(limits)


def tick_url_schedules(sessions, settings, *, now=None):
    """Settle outcomes and admit at most one due URL; safe across worker restarts.

    The shared transaction lock serializes workers; row locks serialize settings.
    Overdue intervals collapse into one attempt. No HTTP or risk decisions here.
    """
    now = now or utcnow()
    with sessions.begin() as db:
        lock_import(db, 'url-schedules')
        settle_runs(db, now)
        pending = select(UrlScheduleRun.schedule_id).where(UrlScheduleRun.state == 'QUEUED')
        row = db.scalar(
            select(UrlSchedule)
            .where(UrlSchedule.enabled.is_(True), UrlSchedule.next_run_at <= now, UrlSchedule.id.not_in(pending))
            .order_by(UrlSchedule.next_run_at, UrlSchedule.id)
            .with_for_update()
            .limit(1)
        )
        if row is None:
            return False
        run = UrlScheduleRun(
            schedule_id=row.id,
            configuration=configuration(row),
            due_at=row.next_run_at,
            created_at=now,
            state='QUEUED',
        )
        db.add(run)
        actor = db.get(User, row.updated_by)
        reason = None
        try:
            url = approved_url(row.url)
            if source_for_url(url).id != row.source_id:
                reason = 'SOURCE_NOT_APPROVED'
        except FetchError:
            reason = 'SOURCE_NOT_APPROVED'
        if actor is None or actor.role != 'analyst':
            reason = 'ACTOR_NOT_ANALYST'
        if reason:
            run.state, run.finished_at, run.reason = 'BLOCKED', now, reason
            pause(db, row, reason, now)
            return True
        lock_import(db, 'url-import-queue')
        active = db.scalar(
            select(AnalysisJob)
            .where(
                AnalysisJob.kind == 'IMPORT_URL',
                AnalysisJob.state.in_(['QUEUED', 'RUNNING']),
                AnalysisJob.input_payload['url'].as_string() == row.url,
            )
            .limit(1)
        )
        until = source_quota_until(db, row.source_id, settings, now)
        if active is None and until > now:
            run.state, run.finished_at, run.reason = 'DEFERRED', now, 'SOURCE_QUOTA'
            row.next_run_at, row.pause_reason = until, 'SOURCE_QUOTA'
            return True
        try:
            job = enqueue_url_import(db, row.url, actor_id=row.updated_by, request_id=uuid4())
        except ImportQueueFull:
            run.state, run.finished_at, run.reason = 'DEFERRED', now, 'QUEUE_FULL'
            row.next_run_at, row.pause_reason = now + timedelta(minutes=5), 'QUEUE_FULL'
            return True
        run.job_id, run.reused_job = job.id, active is not None
        row.next_run_at, row.pause_reason = now + timedelta(minutes=row.interval_minutes), None
        db.flush()
        db.add(
            AuditEvent(
                actor_id=row.updated_by,
                action='URL_SCHEDULE_QUEUED',
                entity_type='url_schedule',
                entity_id=row.id,
                details={
                    'run_id': str(run.id),
                    'job_id': str(job.id),
                    'revision': row.revision,
                    'reused_job': run.reused_job,
                    'worker': True,
                },
            )
        )
        return True
