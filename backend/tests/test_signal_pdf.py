import subprocess
import sys
from uuid import UUID, uuid4

import pytest
from conftest import mutation_headers
from sqlalchemy import select
from test_signals import create, decide

from app.models import AnalysisJob, Asset, Signal
from app.ocr import AnalysisError
from app.pdf_render import render_pdf, signal_html
from app.signal_pdf import pdf_payload, process_pdf_job


def run_job(client, settings, job_id):
    with client.app.state.sessions.begin() as db:
        job = db.get(AnalysisJob, UUID(job_id))
        job.state, job.attempt, job.claim_token = 'RUNNING', job.attempt + 1, uuid4()
        token, attempt = job.claim_token, job.attempt
    return process_pdf_job(client.app.state.sessions, settings, UUID(job_id), token, attempt)


def queue_pdf(client, signal):
    return client.post(f'/api/v1/signals/{signal["id"]}/pdf', headers=mutation_headers(client))


def session_payload(client, signal):
    with client.app.state.sessions() as db:
        return pdf_payload(db.get(Signal, UUID(signal['id'])))


def test_pdf_get_is_read_only_and_queue_is_idempotent(signed):
    signal = create(signed).json()
    path = f'/api/v1/signals/{signal["id"]}/pdf'
    assert signed.get(path).status_code == 404
    assert signed.get(f'/api/v1/signals/{signal["id"]}').json()['signal']['pdf_state'] == 'NOT_REQUESTED'
    first = queue_pdf(signed, signal)
    assert first.status_code == 202
    assert first.json()['signal_id'] == signal['id']
    assert first.json()['advertisement_id'] is None
    assert queue_pdf(signed, signal).json()['id'] == first.json()['id']
    pending = signed.get(path)
    assert pending.status_code == 202 and pending.headers['Retry-After'] == '2'


def test_pdf_worker_failure_retry_integrity_and_historical_asset(signed, settings, monkeypatch):
    signal = create(signed).json()
    job = queue_pdf(signed, signal).json()
    monkeypatch.setattr(
        'app.signal_pdf.render_pdf',
        lambda *args: (_ for _ in ()).throw(AnalysisError('PDF_TEST', 'DEMO render failure')),
    )
    assert run_job(signed, settings, job['id'])
    assert signed.get(f'/api/v1/analysis-jobs/{job["id"]}').json()['state'] == 'FAILED'
    assert signed.get(f'/api/v1/signals/{signal["id"]}/pdf').status_code == 503
    next_job = queue_pdf(signed, signal).json()
    assert next_job['id'] != job['id']
    draft_bytes = b'%PDF-1.7 synthetic draft workflow test'
    monkeypatch.setattr('app.signal_pdf.render_pdf', lambda *args: draft_bytes)
    run_job(signed, settings, next_job['id'])
    first = signed.get(f'/api/v1/signals/{signal["id"]}/pdf')
    assert first.status_code == 200 and first.content == draft_bytes
    completed = signed.get(f'/api/v1/analysis-jobs/{next_job["id"]}').json()
    old_asset = completed['result_asset_id']
    assert queue_pdf(signed, signal).json()['id'] == next_job['id']
    decision = decide(signed, signal).json()['signal']
    assert decision['pdf_job_id'] != next_job['id'] and decision['pdf_state'] == 'QUEUED'
    monkeypatch.setattr('app.signal_pdf.render_pdf', lambda *args: b'%PDF-1.7 synthetic confirmed workflow test')
    run_job(signed, settings, decision['pdf_job_id'])
    assert signed.get(f'/api/v1/assets/{old_asset}').content == draft_bytes
    assert signed.get(f'/api/v1/signals/{signal["id"]}/pdf').content != draft_bytes
    with signed.app.state.sessions() as db:
        row = db.get(Signal, UUID(signal['id']))
        asset = db.get(Asset, row.pdf_asset_id)
        stored = settings.storage_root / asset.storage_key
    stored.write_bytes(b'corrupted')
    assert signed.get(f'/api/v1/signals/{signal["id"]}/pdf').status_code == 503
    assert queue_pdf(signed, signal).json()['id'] != decision['pdf_job_id']


def test_late_pdf_cannot_overwrite_new_decision(signed, settings, monkeypatch):
    signal = create(signed).json()
    old_job = queue_pdf(signed, signal).json()

    def change_decision(*args):
        assert decide(signed, signal, action='RETURN').status_code == 200
        return b'%PDF-1.7 synthetic late draft'

    monkeypatch.setattr('app.signal_pdf.render_pdf', change_decision)
    run_job(signed, settings, old_job['id'])
    current = signed.get(f'/api/v1/signals/{signal["id"]}').json()['signal']
    assert current['pdf_state'] == 'QUEUED' and current['pdf_job_id'] != old_job['id']
    job = signed.get(f'/api/v1/analysis-jobs/{old_job["id"]}').json()
    assert job['state'] == 'FAILED' and job['error']['error']['code'] == 'PDF_OBSOLETE'


def test_pdf_claim_token_fences_old_worker(signed, settings, monkeypatch):
    signal = create(signed).json()
    queued = queue_pdf(signed, signal).json()

    def replace_claim(*args):
        with signed.app.state.sessions.begin() as db:
            job = db.get(AnalysisJob, UUID(queued['id']))
            job.claim_token = uuid4()
        return b'%PDF-1.7 synthetic old worker'

    monkeypatch.setattr('app.signal_pdf.render_pdf', replace_claim)
    run_job(signed, settings, queued['id'])
    with signed.app.state.sessions() as db:
        assert db.get(Signal, UUID(signal['id'])).pdf_asset_id is None
        assert (
            db.scalar(
                select(Asset).where(
                    Asset.kind == 'SIGNAL_PDF', Asset.source_details['signal_id'].as_string() == signal['id']
                )
            )
            is None
        )


def test_pdf_template_escapes_text_and_never_uses_untrusted_resources(signed):
    signal = create(signed).json()
    payload = session_payload(signed, signal)
    hostile = '<img src="http://169.254.169.254/secret"><style>@import "file:///etc/passwd";</style>'
    payload['snapshot']['property']['name'] = hostile
    document = signal_html(payload)
    assert '<img' not in document and '&lt;img' in document
    assert '@import &quot;file:' in document
    assert '<strong>DEMO' in document
    assert payload['snapshot']['disclaimer'] in document


def test_pdf_subprocess_timeout_has_safe_failure(settings, monkeypatch):
    def timeout(*args, **kwargs):
        raise subprocess.TimeoutExpired('synthetic renderer', 1)

    monkeypatch.setattr('app.pdf_render.subprocess.run', timeout)
    with pytest.raises(AnalysisError, match='время ожидания') as error:
        render_pdf({}, settings)
    assert error.value.code == 'PDF_TIMEOUT'


@pytest.mark.skipif(sys.platform == 'win32', reason='Native Pango is verified in the Linux runtime container')
def test_real_weasyprint_renderer(signed, settings):
    signal = create(signed).json()
    payload = session_payload(signed, signal)
    payload['snapshot']['property']['name'] = 'DEMO Сақ құрылыс Ә Ғ Қ Ң Ө Ұ Ү Һ І'
    content = render_pdf(payload, settings)
    assert content.startswith(b'%PDF-') and len(content) > 5000
