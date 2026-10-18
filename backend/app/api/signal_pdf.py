from uuid import UUID

from fastapi import APIRouter, Depends, Request
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse, Response

from app.analysis_dto import AnalysisJobOut
from app.api.analysis import Key, analyst
from app.api.reviews import property_locked
from app.commands import begin_command, finish_command
from app.dependencies import DB, Actor, check_csrf
from app.models import AnalysisJob, Asset, Signal
from app.pdf_filenames import pdf_content_disposition, signal_pdf_filename
from app.signal_pdf import enqueue_signal_pdf
from app.signals import signal_locked
from app.storage import read_asset

router = APIRouter()


def saved_pdf(db, row, settings):
    asset = db.get(Asset, row.pdf_asset_id) if row.pdf_asset_id else None
    if (
        not asset
        or asset.kind != 'SIGNAL_PDF'
        or asset.source_details
        != {
            'signal_id': str(row.id),
            'decision_revision': row.revision,
        }
    ):
        raise OSError('PDF asset is unavailable')
    return read_asset(settings.storage_root, asset.storage_key, asset.sha256, settings.max_upload_bytes)


@router.get('/api/v1/signals/{id}/pdf', operation_id='downloadSignalPdf')
def download_pdf(id: UUID, request: Request, actor: Actor, db: DB):
    row = db.get(Signal, id)
    if not row:
        raise HTTPException(404, 'Сигнал не найден')
    if row.pdf_state == 'READY':
        try:
            content = saved_pdf(db, row, request.app.state.settings)
        except OSError:
            raise HTTPException(503, 'PDF недоступен или повреждён. Повторите генерацию.') from None
        return Response(
            content,
            media_type='application/pdf',
            headers={
                'Content-Disposition': pdf_content_disposition(signal_pdf_filename(row)),
            },
        )
    if row.pdf_state == 'QUEUED' and row.pdf_job_id:
        job = db.get(AnalysisJob, row.pdf_job_id)
        return JSONResponse(
            AnalysisJobOut.model_validate(job).model_dump(mode='json'), status_code=202, headers={'Retry-After': '2'}
        )
    if row.pdf_state == 'FAILED':
        raise HTTPException(503, 'Генерация PDF завершилась ошибкой. Сигнал сохранён; можно повторить.')
    raise HTTPException(404, 'PDF ещё не запрошен. Запустите генерацию отдельным действием.')


@router.post(
    '/api/v1/signals/{id}/pdf',
    response_model=AnalysisJobOut,
    status_code=202,
    operation_id='renderSignalPdf',
    dependencies=[Depends(check_csrf)],
)
def render_pdf(id: UUID, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    operation = f'renderSignalPdf:{id}'
    previous, digest = begin_command(db, actor.id, operation, idempotency_key, {})
    if previous:
        return previous
    initial = db.get(Signal, id)
    if not initial:
        raise HTTPException(404, 'Сигнал не найден')
    property_locked(db, initial.property_id)
    row = signal_locked(db, id)
    if row.pdf_state == 'READY':
        try:
            saved_pdf(db, row, request.app.state.settings)
        except OSError:
            row.pdf_state = 'FAILED'
    job = enqueue_signal_pdf(db, row, actor, request.state.request_id)
    result = AnalysisJobOut.model_validate(job).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, digest, result)
    return result
