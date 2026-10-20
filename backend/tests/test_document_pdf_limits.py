"""Read-only PDF wall time can grow on throttled hosts without growing child budgets."""

import io
import subprocess
import sys
from threading import BoundedSemaphore
from types import ModuleType, SimpleNamespace

import pytest
from pydantic import ValidationError
from starlette.exceptions import HTTPException

from app import document_pdf_render
from app.config import Settings


def configuration(**values):
    return Settings(
        _env_file=None,
        database_url='postgresql+psycopg://test:test@localhost/test',
        session_secret='test-session-secret-which-is-long-enough',
        bootstrap_analyst_password='test-password-long-enough',
        telegram_enabled=False,
        **values,
    )


@pytest.mark.parametrize('wall_time,pdf_time,expected', [(None, 60, 12), (45, 60, 45), (60, 90, 60), (45, 5, 5)])
def test_document_renderer_uses_bounded_configured_wall_time(monkeypatch, wall_time, pdf_time, expected):
    values = {'pdf_timeout_seconds': pdf_time}
    if wall_time is not None:
        values['document_pdf_timeout_seconds'] = wall_time
    settings = configuration(**values)
    monkeypatch.setattr(document_pdf_render.sys, 'platform', 'linux')
    calls = []

    def render(command, **kwargs):
        calls.append(kwargs)
        return SimpleNamespace(returncode=0, stdout=b'%PDF-test')

    monkeypatch.setattr(document_pdf_render.subprocess, 'run', render)
    assert document_pdf_render.render_document_pdf({}, settings) == b'%PDF-test'
    assert calls[0]['timeout'] == expected
    assert calls[0]['capture_output'] is True


@pytest.mark.parametrize('value', [0, 61])
def test_document_wall_time_configuration_rejects_values_outside_bounds(value):
    with pytest.raises(ValidationError):
        configuration(document_pdf_timeout_seconds=value)


def test_document_timeout_releases_renderer_slot(monkeypatch):
    settings = configuration(document_pdf_timeout_seconds=45)
    slots = BoundedSemaphore(1)
    monkeypatch.setattr(document_pdf_render, '_SLOTS', slots)
    monkeypatch.setattr(document_pdf_render.sys, 'platform', 'linux')

    def timeout(*args, **kwargs):
        raise subprocess.TimeoutExpired('pdf', kwargs['timeout'])

    monkeypatch.setattr(document_pdf_render.subprocess, 'run', timeout)
    with pytest.raises(HTTPException) as error:
        document_pdf_render.render_document_pdf({}, settings)
    assert error.value.status_code == 503
    assert slots.acquire(blocking=False)
    slots.release()


def test_document_child_keeps_cpu_and_address_limits(monkeypatch):
    limits = []
    resource = ModuleType('resource')
    resource.RLIMIT_AS, resource.RLIMIT_CPU = 1, 2
    resource.setrlimit = lambda kind, bound: limits.append((kind, bound))
    monkeypatch.setitem(sys.modules, 'resource', resource)
    renderer = ModuleType('weasyprint')

    class FakeHTML:
        def __init__(self, **kwargs):
            assert limits == [(resource.RLIMIT_AS, (1_073_741_824, 1_073_741_824)), (resource.RLIMIT_CPU, (12, 12))]

        def write_pdf(self):
            return b'%PDF-test'

    renderer.HTML = FakeHTML
    urls = ModuleType('weasyprint.urls')
    urls.FatalURLFetchingError, urls.URLFetcher = ValueError, object
    monkeypatch.setitem(sys.modules, 'weasyprint', renderer)
    monkeypatch.setitem(sys.modules, 'weasyprint.urls', urls)
    monkeypatch.setattr(document_pdf_render, 'document_html', lambda _: '<p>DEMO</p>')
    monkeypatch.setattr(sys, 'stdin', io.StringIO('{}'))
    output = io.BytesIO()
    monkeypatch.setattr(sys, 'stdout', SimpleNamespace(buffer=output))
    document_pdf_render.main()
    assert output.getvalue() == b'%PDF-test'
