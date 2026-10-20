"""Authenticated, read-only PDF downloads. No evidence, risk or snapshot mutations."""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Query, Request
from sqlalchemy import text
from starlette.exceptions import HTTPException
from starlette.responses import Response

from app.dependencies import DB, Actor
from app.document_exports import export_payload
from app.document_pdf_render import render_document_pdf
from app.dossier_report import DEFAULT_SECTIONS, dossier_report, selected_sections
from app.pdf_filenames import pdf_content_disposition, pdf_filename

router = APIRouter()
ExportKind = Literal[
    'assets',
    'evidence',
    'legal-bases',
    'risk-factors',
    'advertisements',
    'extractions',
    'properties',
    'signals',
    'comparisons',
    'registry-snapshots',
    'open-registry',
    'audit',
    'incidents',
    'candidates',
    'publication-comparison',
]


@router.get(
    '/api/v1/properties/{id}/report.pdf',
    operation_id='downloadDossierReport',
    response_class=Response,
    description=(
        'Authenticated read-only current dossier report. Summary is mandatory; sections are a comma-separated '
        'whitelist: summary,documents,risk,publications,evidence,history,signals,sources. '
        'Default includes all sections. At most 100 rows per section, with explicit partial scope. '
        'No jobs, audit writes, evidence or decisions are created; historical signal PDFs remain unchanged.'
    ),
    responses={
        200: {
            'description': 'Current dossier PDF, RU or KK',
            'content': {'application/pdf': {'schema': {'type': 'string', 'format': 'binary'}}},
        },
        401: {'description': 'Authentication required'},
        403: {'description': 'Read role required'},
        404: {'description': 'Property not found'},
        413: {'description': 'Selected report exceeds bounded payload or PDF size'},
        422: {'description': 'Invalid sections, language or property ID'},
        503: {'description': 'Offline PDF renderer unavailable, busy or timed out; retry is read-only'},
    },
)
def download_dossier_report(
    id: UUID,
    request: Request,
    actor: Actor,
    sections: str = Query(DEFAULT_SECTIONS, max_length=120),
    language: Literal['ru', 'kk'] = 'ru',
):
    if actor.role not in {'analyst', 'viewer'}:
        raise HTTPException(403, 'Нет права чтения материалов')
    chosen = selected_sections(sections)
    # Authentication has already read its own transaction. Capture the report independently,
    # in one consistent, explicitly read-only PostgreSQL snapshot before rendering.
    with request.app.state.sessions() as report_db:
        report_db.connection(execution_options={'isolation_level': 'REPEATABLE READ'})
        report_db.execute(text('SET TRANSACTION READ ONLY'))
        payload = dossier_report(report_db, id, chosen, language)
    content = render_document_pdf({'dossier_report': payload}, request.app.state.settings)
    filename = pdf_filename(
        'dossier-report',
        id,
        context=payload['property']['name'],
        saved_at=payload['generated_at'],
        revision=payload['property']['revision'],
    )
    return Response(
        content,
        media_type='application/pdf',
        headers={
            'Content-Disposition': pdf_content_disposition(filename),
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': "default-src 'none'; sandbox",
        },
    )


@router.get(
    '/api/v1/exports/{kind}/{id}/pdf',
    operation_id='downloadRecordPdf',
    response_class=Response,
    responses={
        200: {
            'description': 'Original PDF or explicitly labelled derived PDF copy',
            'content': {'application/pdf': {'schema': {'type': 'string', 'format': 'binary'}}},
        },
        409: {'description': 'Saved source is missing or fails integrity verification'},
        413: {'description': 'Export exceeds bounded size'},
        503: {'description': 'Renderer unavailable, busy or timed out; retry is safe'},
    },
)
def download_record_pdf(
    kind: ExportKind,
    id: UUID,
    request: Request,
    actor: Actor,
    db: DB,
    right_id: UUID | None = None,
    left_extraction_id: UUID | None = None,
    right_extraction_id: UUID | None = None,
):
    if actor.role not in {'analyst', 'viewer'}:
        raise HTTPException(403, 'Нет права чтения материалов')
    settings = request.app.state.settings
    payload, filename = export_payload(
        db,
        kind,
        id,
        settings,
        right_id=right_id,
        left_extraction_id=left_extraction_id,
        right_extraction_id=right_extraction_id,
    )
    content = payload if isinstance(payload, bytes) else render_document_pdf(payload, settings)
    return Response(
        content,
        media_type='application/pdf',
        headers={
            'Content-Disposition': pdf_content_disposition(filename),
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': "default-src 'none'; sandbox",
        },
    )
