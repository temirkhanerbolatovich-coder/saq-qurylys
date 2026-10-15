"""Durable PDF jobs pinned to a signal decision revision."""

import logging
from copy import deepcopy
from uuid import uuid4

from sqlalchemy import select

from app.models import AnalysisJob, Asset, AuditEvent, Property, Signal, utcnow
from app.ocr import AnalysisError
from app.pdf_render import render_pdf
from app.storage import save_bytes

logger = logging.getLogger(__name__)


def enqueue_signal_pdf(db, row, actor, request_id):
    """Caller holds property then signal locks. Reuse an in-flight/current job."""
    previous = db.get(AnalysisJob, row.pdf_job_id) if row.pdf_job_id else None
    if (
        previous
        and previous.target_revision == row.revision
        and (previous.state in {'QUEUED', 'RUNNING'} or (previous.state == 'SUCCEEDED' and row.pdf_state == 'READY'))
    ):
        return previous
    job = AnalysisJob(
        id=uuid4(),
        signal_id=row.id,
        target_revision=row.revision,
        kind='RENDER_PDF',
        advertisement_id=None,
        advertisement_revision=None,
        state='QUEUED',
        stage='Ожидает генерации PDF',
        created_by=actor.id,
        request_id=request_id,
    )
    db.add(job)
    row.pdf_job_id, row.pdf_state, row.pdf_asset_id = job.id, 'QUEUED', None
    db.flush()
    db.add(
        AuditEvent(
            actor_id=actor.id,
            action='SIGNAL_PDF_QUEUED',
            entity_type='signals',
            entity_id=row.id,
            old_revision=row.revision,
            new_revision=row.revision,
            request_id=request_id,
            details={'job_id': str(job.id), 'decision_revision': row.revision},
        )
    )
    return job


def pdf_payload(row):
    """Only frozen facts, actor and the decision of the selected revision enter a PDF."""
    return {
        'snapshot': deepcopy(row.snapshot),
        'decisions': deepcopy(row.decisions),
        'signal': {
            'id': str(row.id),
            'version': row.version,
            'revision': row.revision,
            'state': row.state,
            'created_at': row.created_at.isoformat(),
            'created_by': deepcopy(row.created_by_details),
            'is_demo': row.snapshot['property']['is_demo'],
            'risk_snapshot': deepcopy(row.snapshot['property']['risk']),
            'previous_signal_id': str(row.previous_signal_id) if row.previous_signal_id else None,
        },
    }


def process_pdf_job(sessions, settings, job_id, token, attempt):
    failure, content, source = None, None, None
    with sessions() as db:
        job = db.get(AnalysisJob, job_id)
        row = db.get(Signal, job.signal_id)
        property_id = row.property_id
        if row.revision == job.target_revision and row.pdf_job_id == job.id:
            source = pdf_payload(row)
    try:
        if source is None:
            raise AnalysisError('PDF_OBSOLETE', 'Ревизия решения изменилась. Используйте PDF нового решения.')
        if attempt > settings.job_max_attempts:
            raise AnalysisError('LEASE_EXHAUSTED', 'Генерация прерывалась. Повторите запрос PDF.')
        content = render_pdf(source, settings)
    except AnalysisError as exc:
        failure = exc
    except Exception:
        logger.exception('PDF rendering failed; job_id=%s', job_id)
        failure = AnalysisError('PDF_FAILED', 'Не удалось создать PDF. Сигнал сохранён; генерацию можно повторить.')
    with sessions.begin() as db:
        # Same order as signal and factor commands. A late render cannot replace a newer decision PDF.
        db.scalar(select(Property).where(Property.id == property_id).with_for_update())
        row = db.scalar(select(Signal).where(Signal.id == job.signal_id).with_for_update())
        job = db.scalar(select(AnalysisJob).where(AnalysisJob.id == job_id).with_for_update())
        if job.state != 'RUNNING' or job.claim_token != token:
            return True
        current = row.revision == job.target_revision and row.pdf_job_id == job.id
        if not current:
            failure = AnalysisError('PDF_OBSOLETE', 'Ревизия решения изменилась. Используйте PDF нового решения.')
        if not failure:
            try:
                key, digest, size = save_bytes(settings.storage_root, content, 'pdf')
                asset = Asset(
                    id=uuid4(),
                    kind='SIGNAL_PDF',
                    mime_type='application/pdf',
                    byte_size=size,
                    sha256=digest,
                    storage_key=key,
                    is_demo=row.snapshot['property']['is_demo'],
                    source_details={'signal_id': str(row.id), 'decision_revision': row.revision},
                )
                db.add(asset)
                db.flush()
                job.result_asset_id = asset.id
                row.pdf_asset_id, row.pdf_state = asset.id, 'READY'
            except OSError:
                logger.exception('PDF storage failed; job_id=%s', job_id)
                failure = AnalysisError('PDF_STORAGE_FAILED', 'Не удалось сохранить PDF. Генерацию можно повторить.')
        job.updated_at, job.lease_until = utcnow(), None
        job.state = 'FAILED' if failure else 'SUCCEEDED'
        job.stage = 'PDF требует повторной генерации' if failure else 'PDF готов'
        if failure:
            job.error = {
                'error': {
                    'code': failure.code,
                    'message': str(failure),
                    'request_id': str(job.request_id),
                    'fields': [],
                }
            }
            if current:
                row.pdf_state = 'FAILED'
        db.add(
            AuditEvent(
                actor_id=job.created_by,
                action='SIGNAL_PDF_' + job.state,
                entity_type='signals',
                entity_id=row.id,
                old_revision=job.target_revision,
                new_revision=job.target_revision,
                request_id=job.request_id,
                details={'job_id': str(job.id), 'attempt': job.attempt, 'current_decision': current},
            )
        )
    return True
