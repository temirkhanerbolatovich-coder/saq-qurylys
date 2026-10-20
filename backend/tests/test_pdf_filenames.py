"""Download metadata tests require no database and never render or persist a PDF."""

import re
from datetime import date, datetime, timezone
from types import SimpleNamespace
from urllib.parse import unquote
from uuid import UUID

import pytest

from app import document_exports
from app.api import exports, signal_pdf
from app.models import Asset, Signal
from app.pdf_filenames import MAX_FILENAME_BYTES, pdf_content_disposition, pdf_filename, signal_pdf_filename

ID = UUID('bc1f90b3-f3a7-5e0e-9c18-b545cfeaa621')
SAVED_AT = datetime(2026, 10, 18, 17, 45, tzinfo=timezone.utc)


def attachment_names(header):
    fallback = re.search(r'filename="([^"]+)"', header).group(1)
    name = unquote(header.split("filename*=UTF-8''", 1)[1], errors='strict')
    return fallback, name


@pytest.mark.parametrize('context', ['ЖК Оркен', 'Әділет Құрылыс', 'DEMO Riverside', 'а' * 400, '🌿' * 400, ''])
def test_download_names_preserve_type_date_id_and_versions_with_bounded_unicode(context):
    filename = pdf_filename('signal', ID, context=context, saved_at=SAVED_AT, version=7, revision=3)
    fallback, decoded = attachment_names(pdf_content_disposition(filename))
    assert decoded == filename
    assert filename.startswith('saq-signal-')
    assert filename.endswith(f'-2026-10-18-{ID}-v7-r3.pdf')
    assert fallback.isascii()
    assert fallback.startswith('saq-signal-')
    assert fallback.endswith(f'-2026-10-18-{ID}-v7-r3.pdf')
    assert len(filename.encode('utf-8')) <= MAX_FILENAME_BYTES
    assert len(fallback.encode('utf-8')) <= MAX_FILENAME_BYTES
    assert len(pdf_content_disposition(filename)) < 1000
    if context in {'ЖК Оркен', 'Әділет Құрылыс'}:
        assert context.replace(' ', '-') in decoded


@pytest.mark.parametrize(
    'context',
    ['../..\\evil.pdf', 'quote"; filename="evil.exe', 'A\r\nX-Injected: yes', '\x00\x1f<>:|?*', '\u202eevil\u2066'],
)
def test_untrusted_context_cannot_create_path_header_or_extension(context):
    header = pdf_content_disposition(pdf_filename('properties', ID, context=context))
    assert header.isascii()
    assert '\r' not in header and '\n' not in header
    for name in attachment_names(header):
        assert name.endswith(f'-{ID}.pdf')
        assert not any(character in name for character in '\\/\r\n\x00<>:"|?*')
        assert '..' not in name
        assert '\u202e' not in name and '\u2066' not in name
        assert name.count('.pdf') == 1


@pytest.mark.parametrize('saved_at', [SAVED_AT, date(2026, 10, 18), '2026-10-18T17:45:00+00:00'])
def test_only_a_saved_metadata_date_is_used(saved_at):
    assert f'-2026-10-18-{ID}.pdf' in pdf_filename('source', ID, saved_at=saved_at)
    assert pdf_filename('source', ID, saved_at='unknown') == f'saq-source-{ID}.pdf'


def test_header_sanitizes_direct_input_as_well_as_generated_names():
    fallback, name = attachment_names(pdf_content_disposition('..\\DEMO\r\nInjected: yes.pdf'))
    assert fallback == name == 'DEMO-Injected-yes.pdf'


def signal_record(state):
    return SimpleNamespace(
        id=ID,
        snapshot={'property': {'name': 'DEMO ЖК Әділет', 'is_demo': True, 'risk': {'score': 0}}},
        created_at=SAVED_AT,
        created_by_details={'display_name': 'DEMO Analyst'},
        previous_signal_id=None,
        version=7,
        revision=3,
        state='DRAFT',
        decisions=[],
        pdf_state=state,
    )


@pytest.mark.parametrize('state', ['NOT_REQUESTED', 'READY'])
def test_signal_copy_and_saved_download_use_identical_frozen_name_without_current_property(state, monkeypatch):
    row = signal_record(state)
    lookups = []

    def get(model, id):
        lookups.append((model, id))
        assert model is Signal and id == ID
        return row

    db = SimpleNamespace(get=get)
    content = b'%PDF-frozen-signal'
    monkeypatch.setattr(document_exports, 'saved_pdf', lambda *_: content)
    monkeypatch.setattr(signal_pdf, 'saved_pdf', lambda *_: content)
    payload, name = document_exports.export_payload(db, 'signals', ID, None)
    assert name == signal_pdf_filename(row)
    assert 'DEMO-ЖК-Әділет-2026-10-18' in name
    assert str(ID) in name and name.endswith('-v7-r3.pdf')
    assert row.pdf_state == state
    if state == 'READY':
        assert payload == content
    else:
        assert payload['signal_payload']['snapshot'] == row.snapshot
    row.pdf_state = 'READY'
    response = signal_pdf.download_pdf(
        ID, SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(settings=None))), None, db
    )
    assert response.body == content
    assert attachment_names(response.headers['content-disposition'])[1] == name
    assert all(model is Signal for model, _ in lookups)


def test_original_pdf_keeps_exact_bytes_and_source_identity(monkeypatch):
    row = SimpleNamespace(
        id=ID, mime_type='application/pdf', source_details={'source_label': 'DEMO Әділет PDF'}, captured_at=SAVED_AT
    )

    def get(model, id):
        assert model is Asset and id == ID
        return row

    content = b'%PDF-original-exact-bytes'
    monkeypatch.setattr(document_exports, 'source_bytes', lambda *_: content)
    payload, name = document_exports.export_payload(SimpleNamespace(get=get), 'assets', ID, None)
    assert payload is content
    assert name.startswith('saq-source-DEMO-Әділет-PDF-2026-10-18-')
    assert name.endswith(f'{ID}.pdf')


def test_text_source_copy_uses_saved_label_and_date_without_changing_payload(monkeypatch):
    row = SimpleNamespace(
        id=ID,
        kind='DOCUMENT',
        mime_type='text/plain',
        advertisement_id=None,
        is_demo=True,
        sha256='f' * 64,
        source_details={'source_label': 'DEMO Әділет мәтіні'},
        captured_at=SAVED_AT,
    )
    monkeypatch.setattr(document_exports, 'source_bytes', lambda *_: b'DEMO original text')
    payload, name = document_exports.export_payload(SimpleNamespace(get=lambda *_: row), 'assets', ID, None)
    assert payload['texts'] == ['DEMO original text']
    assert name.startswith('saq-source-copy-DEMO-Әділет-мәтіні-2026-10-18-')
    assert name.endswith(f'{ID}.pdf')


def test_generic_export_header_does_not_render_existing_pdf_or_write_records(monkeypatch):
    content = b'%PDF-source'
    name = pdf_filename('source', ID, context='DEMO Әділет', saved_at=SAVED_AT)
    monkeypatch.setattr(exports, 'export_payload', lambda *_args, **_kwargs: (content, name))
    monkeypatch.setattr(exports, 'render_document_pdf', lambda *_: pytest.fail('Original PDF must not render'))
    response = exports.download_record_pdf(
        'assets',
        ID,
        SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(settings=None))),
        SimpleNamespace(role='viewer'),
        SimpleNamespace(),
    )
    assert response.body is content
    assert attachment_names(response.headers['content-disposition'])[1] == name
    assert response.headers['cache-control'] == 'no-store'
    assert response.headers['x-content-type-options'] == 'nosniff'
