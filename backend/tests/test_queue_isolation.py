"""Run the actual formerly order-dependent cases in fresh pytest sessions."""

import os
import subprocess
import sys
from pathlib import Path

import pytest
from conftest import finish_test_jobs, mutation_headers
from test_signals import create

from app.worker import process_one

PDF = 'tests/test_signal_pdf.py::test_pdf_get_is_read_only_and_queue_is_idempotent'
LEGAL = 'tests/test_legal_absence.py::test_matching_absence_and_payment_are_red_in_either_order[absence-first]'


def test_case_keeps_fifo_for_pdf_then_analysis(signed, settings, monkeypatch):
    signal = create(signed).json()
    queued_pdf = signed.post(f'/api/v1/signals/{signal["id"]}/pdf', headers=mutation_headers(signed))
    assert queued_pdf.status_code == 202
    ad = signed.post(
        '/api/v1/advertisements',
        json={'text': 'DEMO: первый этап 2 млн тенге', 'source_label': 'FIFO regression', 'is_demo': True},
        headers=mutation_headers(signed),
    ).json()
    queued_analysis = signed.post(
        f'/api/v1/advertisements/{ad["id"]}/analyze',
        json={'expected_advertisement_revision': ad['revision']},
        headers=mutation_headers(signed),
    )
    assert queued_analysis.status_code == 202
    monkeypatch.setattr('app.signal_pdf.render_pdf', lambda *args: b'%PDF-1.7 synthetic FIFO test')
    assert process_one(signed.app.state.sessions, settings)
    assert signed.get(f'/api/v1/analysis-jobs/{queued_pdf.json()["id"]}').json()['state'] == 'SUCCEEDED'
    path = f'/api/v1/analysis-jobs/{queued_analysis.json()["id"]}'
    assert signed.get(path).json()['state'] == 'QUEUED'
    assert process_one(signed.app.state.sessions, settings)
    assert signed.get(path).json()['state'] == 'SUCCEEDED'


def test_finished_case_keeps_readable_job_and_snapshot(signed):
    signal = create(signed).json()
    path = f'/api/v1/signals/{signal["id"]}'
    before = signed.get(path).json()
    response = signed.post(path + '/pdf', headers=mutation_headers(signed))
    assert response.status_code == 202
    job_id = response.json()['id']
    finish_test_jobs(signed.app.state.sessions)
    job = signed.get(f'/api/v1/analysis-jobs/{job_id}')
    assert job.status_code == 200
    assert job.json()['state'] == 'FAILED'
    assert job.json()['error']['error']['code'] == 'TEST_TEARDOWN'
    assert job.json()['error']['error']['request_id']
    after = signed.get(path).json()
    assert after['snapshot'] == before['snapshot']
    assert after['decisions'] == before['decisions']


@pytest.mark.parametrize(
    'cases', [(PDF, LEGAL), (LEGAL, PDF), (PDF,), (LEGAL,)], ids=['pdf-legal', 'legal-pdf', 'pdf', 'legal']
)
def test_queue_cases_are_order_independent(cases, tmp_path):
    env = {**os.environ, 'PYTHONIOENCODING': 'utf-8'}
    result = subprocess.run(
        [
            sys.executable,
            '-B',
            '-m',
            'pytest',
            '-q',
            '-p',
            'no:cacheprovider',
            '--basetemp',
            str(tmp_path / 'nested'),
            *cases,
        ],
        cwd=Path(__file__).resolve().parents[1],
        env=env,
        capture_output=True,
        text=True,
        encoding='utf-8',
        timeout=120,
    )
    assert result.returncode == 0, result.stdout + result.stderr
