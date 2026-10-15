"""Durable PostgreSQL queue. OCR runs outside a transaction; a lease fences late workers."""

import logging
import time
from datetime import timedelta
from uuid import uuid4

from sqlalchemy import and_, create_engine, or_, select
from sqlalchemy.orm import sessionmaker

from app.config import Settings
from app.extraction import extract, match_candidates
from app.models import Advertisement, AnalysisJob, Asset, AuditEvent, ExtractionResult, Property, PropertyMatch, utcnow
from app.ocr import AnalysisError, recognize
from app.storage import read_asset, save_text

logger = logging.getLogger(__name__)
PIPELINE_VERSION = 'tesseract-rus-kaz-eng+rules-1.2+rapidfuzz-1'


def create_extraction(db, ad, asset, text, words=None, *, job_id=None, parent=None, original_ocr=None):
    extraction_id = uuid4()
    properties = list(db.scalars(select(Property).where(Property.is_demo == ad.is_demo)))
    hypotheses, warnings = extract(text, asset.id, extraction_id, properties, words)
    row = ExtractionResult(
        id=extraction_id,
        job_id=job_id,
        advertisement_id=ad.id,
        source_asset_id=asset.id,
        parent_extraction_id=parent,
        pipeline_version=PIPELINE_VERSION if not parent else 'manual-transcription+rules-1.2+rapidfuzz-1',
        original_ocr_text=original_ocr,
        analysis_text=text,
        hypotheses=hypotheses,
        warnings=warnings,
    )
    db.add(row)
    db.flush()
    for candidate in match_candidates(text, hypotheses, properties):
        db.add(PropertyMatch(advertisement_id=ad.id, extraction_id=row.id, **candidate))
    return row


def claim_job(sessions, settings):
    now = utcnow()
    with sessions.begin() as db:
        job = db.scalar(
            select(AnalysisJob)
            .where(
                or_(AnalysisJob.state == 'QUEUED', and_(AnalysisJob.state == 'RUNNING', AnalysisJob.lease_until < now))
            )
            .order_by(AnalysisJob.created_at)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if not job:
            return None
        job.attempt += 1
        job.claim_token = uuid4()
        job.lease_until = now + timedelta(seconds=settings.job_lease_seconds)
        job.state, job.updated_at = 'RUNNING', now
        job.stage = 'Генерация PDF' if job.kind == 'RENDER_PDF' else 'Распознавание и извлечение условий'
        return job.id, job.claim_token, job.advertisement_id, job.attempt


def process_one(sessions, settings):
    claimed = claim_job(sessions, settings)
    if not claimed:
        return False
    job_id, token, ad_id, attempt = claimed
    with sessions() as db:
        kind = db.get(AnalysisJob, job_id).kind
    if kind == 'RENDER_PDF':
        from app.signal_pdf import process_pdf_job

        return process_pdf_job(sessions, settings, job_id, token, attempt)
    failure, result = None, None
    try:
        if attempt > settings.job_max_attempts:
            raise AnalysisError('LEASE_EXHAUSTED', 'Обработка прерывалась. Запустите новый анализ.')
        with sessions() as db:
            asset = db.scalar(
                select(Asset)
                .where(Asset.advertisement_id == ad_id, Asset.kind.in_(['TEXT', 'IMAGE']))
                .order_by(Asset.captured_at, Asset.id)
                .limit(1)
            )
            if not asset:
                raise AnalysisError('SOURCE_MISSING', 'Оригинал публикации недоступен')
            content = read_asset(settings.storage_root, asset.storage_key, asset.sha256, settings.max_upload_bytes)
            asset_id, image = asset.id, asset.kind == 'IMAGE'
        if image:
            result = recognize(content, settings)
        else:
            result = content.decode('utf-8'), []
    except AnalysisError as exc:
        failure = exc
    except Exception:
        logger.exception('Analysis failed; job_id=%s', job_id)
        failure = AnalysisError('ANALYSIS_FAILED', 'Не удалось обработать оригинал. Проверьте файл и повторите анализ.')
    with sessions.begin() as db:
        # All advertisement mutations take this lock before job/extraction locks.
        ad = db.scalar(select(Advertisement).where(Advertisement.id == ad_id).with_for_update())
        job = db.scalar(select(AnalysisJob).where(AnalysisJob.id == job_id).with_for_update())
        if job.state != 'RUNNING' or job.claim_token != token:
            return True
        job.updated_at, job.lease_until = utcnow(), None
        if failure:
            job.state = 'BLOCKED' if failure.blocked else 'FAILED'
            job.stage = 'Требуется действие аналитика'
            job.error = {
                'error': {
                    'code': failure.code,
                    'message': str(failure),
                    'request_id': str(job.request_id),
                    'fields': [],
                }
            }
        else:
            analysis_text, words = result
            source = db.get(Asset, asset_id)
            create_extraction(
                db, ad, source, analysis_text, words, job_id=job.id, original_ocr=analysis_text if image else None
            )
            if image:
                key, digest, size = save_text(settings.storage_root, analysis_text)
                output = Asset(
                    advertisement_id=ad.id,
                    kind='OCR_TEXT',
                    mime_type='text/plain',
                    byte_size=size,
                    sha256=digest,
                    storage_key=key,
                    is_demo=ad.is_demo,
                )
                db.add(output)
                db.flush()
                job.result_asset_id = output.id
            job.state, job.stage = 'SUCCEEDED', 'Готово к ручной проверке'
        old_revision = ad.revision
        if ad.latest_job_id == job.id:
            ad.status = 'FAILED' if failure else 'READY_FOR_REVIEW'
            ad.revision += 1
        db.add(
            AuditEvent(
                actor_id=job.created_by,
                action='ANALYSIS_' + job.state,
                entity_type='advertisement',
                entity_id=ad.id,
                old_revision=old_revision,
                new_revision=ad.revision,
                request_id=job.request_id,
                details={'job_id': str(job.id), 'worker': True, 'attempt': job.attempt},
            )
        )
    return True


def main():
    logging.basicConfig(level=logging.INFO)
    settings = Settings()
    engine = create_engine(settings.database_url, pool_pre_ping=True, hide_parameters=True)
    sessions = sessionmaker(engine, expire_on_commit=False)
    try:
        while True:
            try:
                if not process_one(sessions, settings):
                    time.sleep(settings.worker_poll_seconds)
            except Exception:
                logger.exception('Worker transaction failed; lease will recover the job')
                time.sleep(settings.worker_poll_seconds)
    finally:
        engine.dispose()


if __name__ == '__main__':
    main()
