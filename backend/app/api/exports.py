"""Authenticated, read-only PDF downloads. No evidence, risk or snapshot mutations."""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Request
from starlette.exceptions import HTTPException
from starlette.responses import Response

from app.dependencies import DB, Actor
from app.document_exports import export_payload
from app.document_pdf_render import render_document_pdf
from app.pdf_filenames import pdf_content_disposition

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
