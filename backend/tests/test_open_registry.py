"""Source lookup safety and API boundaries; API extraction is explicitly mocked."""

import hashlib
import io
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from threading import BoundedSemaphore
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from conftest import mutation_headers
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from sqlalchemy import func, select
from starlette.exceptions import HTTPException

from app import open_registry as registry
from app.api import open_registry as api
from app.models import Asset, AuditEvent, RiskFactor, Signal, User
from app.pdf_validation import PdfRejected

PREFIX = '/api/v1/monitoring/open-registry'
SOURCE = 'https://khc.kz/upload/sprint.editor/example/register.pdf'
TITLE = 'РЕЕСТР ДОГОВОРОВ О ПРЕДОСТАВЛЕНИИ ГАРАНТИИ ПО СТРОЯЩИМСЯ ОБЪЕКТАМ'
linux = pytest.mark.skipif(sys.platform != 'linux', reason='PDF decoding requires Linux resource limits')


def pages(text='МЖК ASYLYM, Усть-Каменогорск, Арай. ДПГ-25-16-082/200'):
    return [{'page_number': 1, 'text': f'{TITLE}\nПо состоянию на 02.10.2026\n{text}'}]


def document_bytes():
    writer = PdfWriter()
    writer.add_blank_page(400, 300)
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


def test_metadata_preserves_page_evidence_and_stated_date():
    original = pages('Застройщик неизвестен. Срок завершения 2024 год. Всего договоров: 56')
    result = registry.register_metadata(original)
    assert result.as_of == date(2026, 10, 2)
    assert result.pages[0].text == original[0]['text']
    assert result.model_dump().keys() == {'as_of', 'pages'}


@pytest.mark.parametrize(
    'value',
    [
        'https://khc.kz.evil.example/upload/registry.pdf',
        'http://khc.kz/upload/registry.pdf',
        'https://khc.kz:444/upload/registry.pdf',
        'https://user:password@khc.kz/upload/registry.pdf',
        'https://khc.kz/upload/registry.pdf?token=private',
        'https://khc.kz/upload/registry.pdf#page=1',
        'https://khc.kz/other/registry.pdf',
        'https://khc.kz/upload/../private.pdf',
        'https://khc.kz/upload/a%2fb.pdf',
        'https://khc.kz/upload/a\nb.pdf',
    ],
)
def test_only_official_attribution_url_without_credentials_or_parameters(value):
    with pytest.raises(ValueError):
        registry.OpenRegistryImport(source_url=value)


def test_official_source_and_explicit_non_verified_provenance():
    assert registry.OpenRegistryImport(source_url=SOURCE).source_url == SOURCE
    assert 'не подтверждена' in registry.PROVENANCE_NOTICE
    assert 'не доказывает' in registry.LIMITATIONS


@pytest.mark.parametrize(
    'value',
    [
        'Произвольный PDF с датой 02.10.2026',
        TITLE,
        TITLE + '\nПо состоянию на 32.10.2026',
        TITLE + '\nПо состоянию на 02.10.2099',
    ],
)
def test_rejects_wrong_or_invalid_dated_document(value):
    with pytest.raises(PdfRejected) as error:
        registry.register_metadata([{'page_number': 1, 'text': value}])
    assert error.value.status == 415


@pytest.mark.parametrize('kind', ['pages', 'page_text', 'total_text'])
def test_extracted_document_limits(kind):
    if kind == 'pages':
        value = pages() * (registry.MAX_PAGES + 1)
    elif kind == 'page_text':
        value = pages('x' * registry.MAX_PAGE_TEXT)
    else:
        value = [{'page_number': i + 1, 'text': 'x' * registry.MAX_PAGE_TEXT} for i in range(10)]
    with pytest.raises(PdfRejected) as error:
        registry.register_metadata(value)
    assert error.value.status == 413


def test_page_search_preserves_original_snippet_and_requires_all_terms():
    source = pages('МЖК ASYLYM\nҚҰРЫЛЫС — Усть-Каменогорск. Отдельная запись МЖК PANORAMA')
    hit = registry.search_pages(source, 'asylym   құрылыс')[0]
    assert hit.page_number == 1
    assert hit.matched_terms == ['asylym', 'құрылыс']
    assert 'ҚҰРЫЛЫС' in hit.snippet and '\n' not in hit.snippet
    assert registry.search_pages(source, 'ASYLYM Астана') == []
    assert len(registry.search_pages(source, 'ASYLYM PANORAMA')) == 1
    # A page can contain different entities: the API reports page hits, not matches to records.
    assert 'разным записям' in registry.LIMITATIONS


def test_page_search_matches_nfc_and_never_combines_pages():
    source = [
        {'page_number': 1, 'text': 'И\u0306 КЖК'},
        {'page_number': 2, 'text': 'ASYLYM'},
    ]
    assert registry.search_pages(source, 'Й КЖК')[0].page_number == 1
    assert registry.search_pages(source, 'КЖК ASYLYM') == []


def test_snippet_and_query_limits():
    source = pages('a' * 2000 + ' ASYLYM ' + 'b' * 2000)
    assert len(registry.search_pages(source, 'ASYLYM')[0].snippet) <= registry.MAX_SNIPPET
    for query in ['a', '   ', '!!', 'x' * 101]:
        with pytest.raises(HTTPException) as error:
            registry.search_pages(source, query)
        assert error.value.status_code == 422


def test_envelope_rejected_before_any_parser_or_operating_system_check(monkeypatch):
    monkeypatch.setattr(registry.subprocess, 'run', lambda *a, **k: pytest.fail('Parser must not run'))
    for content in [b'not pdf', b'%PDF-1.7\ninvalid', document_bytes() + b'<script>']:
        with pytest.raises(HTTPException) as error:
            registry.extract_register(content)
        assert error.value.status_code == 415


def test_input_limit_without_parser():
    with pytest.raises(HTTPException) as error:
        registry.extract_register(b'x' * (registry.MAX_INPUT_BYTES + 1))
    assert error.value.status_code == 413


def mock_linux_worker(monkeypatch, run):
    monkeypatch.setattr(registry.sys, 'platform', 'linux')
    monkeypatch.setattr(registry, '_EXTRACTION_SLOTS', BoundedSemaphore(2))
    monkeypatch.setattr(registry.subprocess, 'run', run)


def test_worker_payload_validated_and_slots_released(monkeypatch):
    value = registry.register_metadata(pages())
    output = json.dumps({'status': 200, 'document': value.model_dump(mode='json')}).encode()

    def run(args, **kwargs):
        assert kwargs['timeout'] == 10 and kwargs['input'] == document_bytes()
        return SimpleNamespace(returncode=0, stdout=output)

    mock_linux_worker(monkeypatch, run)
    for _ in range(3):
        assert registry.extract_register(document_bytes()).as_of == date(2026, 10, 2)


@pytest.mark.parametrize(
    ('returncode', 'output', 'status'),
    [
        (0, b'{"status": 415}', 415),
        (0, b'{"status": 413}', 413),
        (0, b'{"status": 200, "document": {}}', 503),
        (0, b'{"status": true}', 503),
        (0, b'private parser failure', 503),
        (1, b'', 503),
        (-9, b'', 413),
    ],
)
def test_worker_failure_has_stable_public_error(monkeypatch, returncode, output, status):
    mock_linux_worker(monkeypatch, lambda *a, **k: SimpleNamespace(returncode=returncode, stdout=output))
    with pytest.raises(HTTPException) as error:
        registry.extract_register(document_bytes())
    assert error.value.status_code == status
    assert 'private' not in str(error.value.detail)


def test_worker_timeout_and_non_linux_fail_closed(monkeypatch):
    def timeout(*args, **kwargs):
        raise subprocess.TimeoutExpired('parser', 10)

    mock_linux_worker(monkeypatch, timeout)
    with pytest.raises(HTTPException) as error:
        registry.extract_register(document_bytes())
    assert error.value.status_code == 503
    monkeypatch.setattr(registry.sys, 'platform', 'win32')
    with pytest.raises(HTTPException) as error:
        registry.extract_register(document_bytes())
    assert error.value.status_code == 503


@linux
def test_real_subprocess_rejects_passive_but_non_register_pdf():
    with pytest.raises(HTTPException) as error:
        registry.extract_register(document_bytes())
    assert error.value.status_code == 415


@pytest.fixture
def registry_client(signed):
    if PREFIX not in signed.app.openapi()['paths']:
        signed.app.include_router(api.router)
    return signed


def upload(client, content=None, *, key=None, source_url=SOURCE, mime='application/pdf', headers=None):
    return client.post(
        PREFIX,
        files={'file': ('register.pdf', content if content is not None else document_bytes(), mime)},
        data={'source_url': source_url},
        headers=headers if headers is not None else mutation_headers(client, key),
    )


@pytest.fixture
def mock_extraction(monkeypatch):
    """DB/API scenarios intentionally bypass parsing; real parser has separate checks."""
    calls = []

    def extract(content):
        calls.append(content)
        return registry.register_metadata(pages('МЖК TEST ' + hashlib.sha256(content).hexdigest()[:12]))

    monkeypatch.setattr(api, 'extract_register', extract)
    return calls


def test_import_original_dedup_retries_and_authenticated_search(registry_client, settings, mock_extraction):
    client = registry_client
    content = document_bytes() + b'\n' + uuid4().hex.encode()
    key = uuid4()
    with client.app.state.sessions() as db:
        before_factors = db.scalar(select(func.count()).select_from(RiskFactor))
        before_signals = db.scalar(select(func.count()).select_from(Signal))
    response = upload(client, content, key=key)
    assert response.status_code == 201, response.text
    saved = response.json()
    assert saved['as_of'] == '2026-10-02' and saved['page_count'] == 1
    assert saved['is_demo'] is False and saved['sha256'] == hashlib.sha256(content).hexdigest()
    assert upload(client, content, key=key).json() == saved
    assert upload(client, content).json() == saved
    assert len(mock_extraction) == 1
    assert upload(client, content + b'changed', key=key).status_code == 409
    original = client.get(saved['original_url'])
    assert original.content == content
    assert original.headers['content-disposition'].startswith('attachment;')
    assert 'sandbox' in original.headers['content-security-policy']
    found = client.get(PREFIX + '/search', params={'document_id': saved['id'], 'q': 'TEST'}).json()
    assert found['total'] == 1 and found['items'][0]['page_number'] == 1
    assert (
        client.get(PREFIX + '/search', params={'document_id': saved['id'], 'q': 'НЕТСОВПАДЕНИЯ'}).json()['total'] == 0
    )
    assert saved['id'] in [item['id'] for item in client.get(PREFIX).json()['items']]
    with client.app.state.sessions() as db:
        row = db.get(registry.OpenRegistryDocument, UUID(saved['id']))
        asset = db.get(Asset, row.asset_id)
        assert asset.is_demo is False and asset.kind == 'DOCUMENT' and asset.advertisement_id is None
        assert asset.source_details['as_of'] == '2026-10-02'
        assert db.scalar(select(func.count()).select_from(AuditEvent).where(AuditEvent.entity_id == row.id)) == 1
        assert db.scalar(select(func.count()).select_from(RiskFactor)) == before_factors
        assert db.scalar(select(func.count()).select_from(Signal)) == before_signals
    with TestClient(client.app, base_url='http://localhost:3000') as anonymous:
        assert anonymous.get(PREFIX).status_code == 401
        assert anonymous.get(saved['original_url']).status_code == 401


def test_import_auth_csrf_role_and_source_validation(registry_client, settings, mock_extraction):
    client = registry_client
    assert upload(client, headers={}).status_code in {403, 422}
    assert upload(client, source_url='https://evil.example/upload/file.pdf').status_code == 422
    assert upload(client, mime='text/html').status_code == 415
    with client.app.state.sessions.begin() as db:
        actor = db.scalar(select(User).where(User.username == settings.bootstrap_analyst_username))
        actor.role = 'viewer'
    try:
        assert client.get(PREFIX).status_code == 200
        assert upload(client).status_code == 403
    finally:
        with client.app.state.sessions.begin() as db:
            actor = db.scalar(select(User).where(User.username == settings.bootstrap_analyst_username))
            actor.role = 'analyst'
    assert mock_extraction == []


def test_simultaneous_uploads_of_same_bytes_create_one_document(registry_client, mock_extraction):
    client = registry_client
    headers = mutation_headers(client)
    cookies = dict(client.cookies)
    content = b'API parser mock, concurrent unique content: ' + uuid4().hex.encode()

    def send(_):
        with TestClient(client.app, base_url='http://localhost:3000') as parallel:
            parallel.cookies.update(cookies)
            return upload(parallel, content, headers=headers | {'Idempotency-Key': str(uuid4())})

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(send, range(2)))
    assert [response.status_code for response in responses] == [201, 201]
    assert responses[0].json()['id'] == responses[1].json()['id']
    assert mock_extraction == [content]


def test_invalid_pdf_creates_no_document_or_asset(registry_client):
    client = registry_client
    with client.app.state.sessions() as db:
        before = db.scalar(select(func.count()).select_from(Asset))
    response = upload(client, b'not-a-pdf')
    assert response.status_code == 415
    with client.app.state.sessions() as db:
        assert db.scalar(select(func.count()).select_from(Asset)) == before


def test_search_invalid_queries_and_unknown_document(registry_client):
    client = registry_client
    assert client.get(PREFIX + '/search', params={'document_id': str(uuid4()), 'q': 'TEST'}).status_code == 404
    assert client.get(PREFIX + '/search', params={'document_id': 'bad', 'q': 'TEST'}).status_code == 422
    assert client.get(PREFIX + '/search', params={'document_id': str(uuid4()), 'q': 'a'}).status_code == 422
