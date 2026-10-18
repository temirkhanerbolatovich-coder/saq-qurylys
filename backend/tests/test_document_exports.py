"""Read-only export invariants. Rendering fixtures here do not claim visual PDF acceptance."""

import subprocess
from datetime import date
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select
from starlette.exceptions import HTTPException
from test_signals import create
from test_supporting_pdf import pdf_bytes

from app import document_pdf_render
from app.document_exports import export_payload
from app.models import Asset, AuditEvent, Property, Signal, User
from app.open_registry import OpenRegistryDocument
from app.seed import demo_id
from app.storage import save_bytes


def asset(client, settings, content, mime='text/plain', key=None, sha=None):
    stored, digest, size = save_bytes(settings.storage_root, content, 'pdf' if mime == 'application/pdf' else 'txt')
    with client.app.state.sessions.begin() as db:
        row = Asset(
            id=uuid4(),
            kind='DOCUMENT',
            storage_key=key or stored,
            sha256=sha or digest,
            byte_size=size,
            mime_type=mime,
            is_demo=True,
            source_details={'source_label': 'DEMO экспорт'},
        )
        db.add(row)
        return row.id


def test_exports_require_auth_and_known_resource(client):
    assert client.get(f'/api/v1/exports/properties/{demo_id("orken")}/pdf').status_code == 401


def test_exports_validate_kind_id_and_missing_record(signed):
    assert signed.get(f'/api/v1/exports/no-such-kind/{uuid4()}/pdf').status_code == 422
    assert signed.get('/api/v1/exports/assets/not-a-uuid/pdf').status_code == 422
    assert signed.get(f'/api/v1/exports/assets/{uuid4()}/pdf').status_code == 404


def test_original_pdf_is_exact_and_not_rendered(signed, settings, monkeypatch):
    content = pdf_bytes()
    id = asset(signed, settings, content, 'application/pdf')
    monkeypatch.setattr('app.api.exports.render_document_pdf', lambda *_: pytest.fail('Original must not render'))
    response = signed.get(f'/api/v1/exports/assets/{id}/pdf')
    assert response.status_code == 200
    assert response.content == content
    assert response.headers['content-type'] == 'application/pdf'
    assert 'filename="saq-source-' in response.headers['content-disposition']
    assert "filename*=UTF-8''" in response.headers['content-disposition']
    assert response.headers['cache-control'] == 'no-store'


def test_open_registry_export_reuses_exact_saved_pdf(signed, settings):
    content = pdf_bytes()
    asset_id = asset(signed, settings, content, 'application/pdf')
    with signed.app.state.sessions.begin() as db:
        source = db.get(Asset, asset_id)
        actor = db.scalar(select(User).where(User.role == 'analyst'))
        row = OpenRegistryDocument(
            id=uuid4(),
            asset_id=asset_id,
            source_url='https://khc.kz/upload/demo-local.pdf',
            publisher='DEMO synthetic publisher',
            as_of=date(2026, 10, 18),
            pages=[{'page': 1, 'text': 'DEMO synthetic fixture'}],
            sha256=source.sha256,
            created_by=actor.id,
        )
        db.add(row)
        id = row.id
    response = signed.get(f'/api/v1/exports/open-registry/{id}/pdf')
    assert response.status_code == 200 and response.content == content


@pytest.mark.parametrize('mode', ['missing', 'corrupt', 'traversal'])
def test_missing_corrupt_and_escaped_sources_fail_without_fake_pdf(signed, settings, mode):
    id = asset(
        signed,
        settings,
        b'DEMO exported source',
        key='../../outside.txt' if mode == 'traversal' else None,
        sha='0' * 64 if mode == 'corrupt' else None,
    )
    if mode == 'missing':
        with signed.app.state.sessions() as db:
            (settings.storage_root / db.get(Asset, id).storage_key).unlink()
    response = signed.get(f'/api/v1/exports/assets/{id}/pdf')
    assert response.status_code == 409
    assert not response.content.startswith(b'%PDF')


def test_export_captures_text_and_escapes_untrusted_html(signed, settings):
    id = asset(
        signed,
        settings,
        '<p>DEMO Әділет</p><script>secret()</script><img src="http://127.0.0.1/">'.encode(),
        'text/html',
    )
    with signed.app.state.sessions() as db:
        payload, _ = export_payload(db, 'assets', id, settings)
    assert payload['texts'] == ['\nDEMO Әділет']
    payload['record'] = {'reason': '<img src="file:///private">'}
    html = document_pdf_render.document_html(payload)
    assert '&lt;img' in html and 'src="file:' not in html
    assert 'DEMO' in html and 'производная PDF-копия' in html


def test_export_has_no_writes_and_viewer_can_read(signed, settings, monkeypatch):
    captured = []
    monkeypatch.setattr(
        'app.api.exports.render_document_pdf', lambda value, _: captured.append(value) or b'%PDF-fixture'
    )
    with signed.app.state.sessions.begin() as db:
        actor = db.scalar(select(User).where(User.username == settings.bootstrap_analyst_username))
        actor.role = 'viewer'
        actor_id = actor.id
    try:
        with signed.app.state.sessions() as db:
            before = db.scalar(select(func.count()).select_from(AuditEvent))
            revision = db.get(Property, demo_id('orken')).revision
        response = signed.get(f'/api/v1/exports/properties/{demo_id("orken")}/pdf')
        assert response.status_code == 200
        assert captured[0]['record']['property']['id'] == str(demo_id('orken'))
        with signed.app.state.sessions() as db:
            assert db.scalar(select(func.count()).select_from(AuditEvent)) == before
            assert db.get(Property, demo_id('orken')).revision == revision
    finally:
        with signed.app.state.sessions.begin() as db:
            db.get(User, actor_id).role = 'analyst'


def test_signal_export_uses_frozen_snapshot_and_does_not_queue_pdf(signed, settings, monkeypatch):
    signal = create(signed).json()
    id = UUID(signal['id'])
    with signed.app.state.sessions() as db:
        old, old_name = export_payload(db, 'signals', id, settings)
    with signed.app.state.sessions.begin() as db:
        prop = db.get(Property, UUID(signal['property_id']))
        name = prop.name
        prop.name = 'DEMO Changed after snapshot'
    try:
        with signed.app.state.sessions() as db:
            new, new_name = export_payload(db, 'signals', id, settings)
            assert new['signal_payload'] == old['signal_payload']
            assert new_name == old_name
            assert 'Changed-after-snapshot' not in new_name
            assert db.get(Signal, id).pdf_state == 'NOT_REQUESTED'
    finally:
        with signed.app.state.sessions.begin() as db:
            db.get(Property, UUID(signal['property_id'])).name = name


def test_renderer_timeout_and_capacity_are_explicit(settings, monkeypatch):
    monkeypatch.setattr(document_pdf_render.sys, 'platform', 'linux')

    def timeout(*args, **kwargs):
        raise subprocess.TimeoutExpired('pdf', 12)

    monkeypatch.setattr(document_pdf_render.subprocess, 'run', timeout)
    with pytest.raises(HTTPException) as error:
        document_pdf_render.render_document_pdf({}, settings)
    assert error.value.status_code == 503
    assert document_pdf_render._SLOTS.acquire(blocking=False)
    assert document_pdf_render._SLOTS.acquire(blocking=False)
    try:
        with pytest.raises(HTTPException) as error:
            document_pdf_render.render_document_pdf({}, settings)
        assert error.value.status_code == 503 and error.value.headers['Retry-After'] == '2'
    finally:
        document_pdf_render._SLOTS.release()
        document_pdf_render._SLOTS.release()
