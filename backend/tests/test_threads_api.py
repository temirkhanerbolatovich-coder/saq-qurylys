import json
from datetime import datetime, timezone

import pytest
from conftest import mutation_headers
from jsonschema import Draft202012Validator
from pydantic import SecretStr
from referencing import Registry, Resource
from sqlalchemy import func, select

from app.api import threads
from app.config import ROOT
from app.models import Advertisement, MonitoringIncident, RiskFactor, Signal, TelegramNotification, User
from app.threads_search import ThreadsError, parse_response

PREFIX = '/api/v1/monitoring/threads'
TOKEN = 'synthetic-access-token-for-api-tests'


@pytest.fixture(autouse=True)
def source_isolation(monkeypatch, signed):
    original = signed.app.state.settings
    signed.app.state.settings = original.model_copy(
        update={'threads_search_enabled': False, 'threads_access_token': SecretStr('')}
    )
    monkeypatch.setattr(threads, 'search_threads', lambda *a: pytest.fail('Unmocked external request'))
    yield
    signed.app.state.settings = original


def configure(client):
    client.app.state.settings.threads_search_enabled = True
    client.app.state.settings.threads_access_token = SecretStr(TOKEN)


def search(client, body=None):
    return client.post(PREFIX + '/search', json=body or {'query': 'Өскемен ЖК'}, headers=mutation_headers(client))


def report(request):
    return parse_response(b'{"data":[]}', request, datetime.now(timezone.utc))


def test_disabled_source_exposes_no_credentials_and_never_contacts_network(signed):
    status = signed.get(PREFIX + '/status')
    assert status.status_code == 200 and status.json()['state'] == 'DISABLED'
    assert search(signed).status_code == 503
    assert 'token' not in status.text.lower()


@pytest.mark.parametrize(
    ('token', 'state'), [('', 'TOKEN_MISSING'), ('short', 'TOKEN_INVALID'), (TOKEN, 'CONFIGURED_UNVERIFIED')]
)
def test_configured_does_not_claim_verified_access(signed, token, state):
    configure(signed)
    signed.app.state.settings.threads_access_token = SecretStr(token)
    status = signed.get(PREFIX + '/status')
    assert status.json()['state'] == state
    assert TOKEN not in status.text


def test_search_is_role_and_csrf_protected(signed):
    configure(signed)
    assert signed.post(PREFIX + '/search', json={'query': 'ЖК'}).status_code == 422
    headers = mutation_headers(signed)
    headers['X-CSRF-Token'] = 'invalid-csrf-token' * 3
    assert signed.post(PREFIX + '/search', json={'query': 'ЖК'}, headers=headers).status_code == 403
    with signed.app.state.sessions.begin() as db:
        user = db.scalar(select(User).where(User.role == 'analyst'))
        user_id = user.id
        user.role = 'viewer'
    try:
        assert signed.get(PREFIX + '/status').status_code == 200
        assert search(signed).status_code == 403
    finally:
        with signed.app.state.sessions.begin() as db:
            db.get(User, user_id).role = 'analyst'


def test_anonymous_cannot_read_status_or_search(client):
    client.cookies.clear()
    assert client.get(PREFIX + '/status').status_code == 401
    assert client.post(PREFIX + '/search', json={'query': 'ЖК'}).status_code in {401, 403}


@pytest.mark.parametrize(
    'body',
    [
        {'query': 'ЖК', 'limit': 51},
        {'query': 'ЖК', 'timeout_seconds': 60},
        {'query': 'ЖК\nтест'},
        {'query': 'ЖК', 'limit': True},
    ],
)
def test_invalid_search_never_contacts_source(signed, body):
    configure(signed)
    assert search(signed, body).status_code == 422


def test_success_is_preview_only_and_has_shared_cooldown(signed, monkeypatch):
    configure(signed)
    calls = []

    def fetch(token, request):
        assert token == TOKEN
        calls.append(request)
        return report(request)

    monkeypatch.setattr(threads, 'search_threads', fetch)
    models = (Advertisement, MonitoringIncident, RiskFactor, Signal, TelegramNotification)

    def counts():
        with signed.app.state.sessions() as db:
            return [db.scalar(select(func.count()).select_from(model)) for model in models]

    before = counts()
    response = search(signed)
    assert response.status_code == 200 and response.json()['items'] == []
    assert response.json()['registry_status'] == 'NOT_CHECKED'
    assert counts() == before
    assert signed.get(PREFIX + '/status').json()['state'] == 'ACCESS_VERIFIED'
    assert search(signed).status_code == 429 and len(calls) == 1


def test_nonempty_preview_preserves_source_fields_and_matches_contract(signed, monkeypatch):
    configure(signed)
    post = {
        'id': '123',
        'text': 'DEMO Өскемен <script>alert(1)</script>',
        'timestamp': '2026-10-16T10:00:00+05:00',
        'permalink': 'https://www.threads.net/@demo/post/ABC',
        'media_type': 'TEXT_POST',
    }
    raw = json.dumps({'data': [post, post], 'paging': {'next': 'https://example.invalid/?token=' + TOKEN}}).encode()
    monkeypatch.setattr(
        threads, 'search_threads', lambda token, request: parse_response(raw, request, datetime.now(timezone.utc))
    )
    response = search(signed, {'query': 'Өскемен ЖК', 'search_type': 'TOP', 'limit': 2})
    assert response.status_code == 200
    result = response.json()
    assert result['items'] == [post]
    assert result['returned_count'] == 2 and result['duplicate_count'] == 1 and result['has_more']
    assert result['request'] == {'query': 'Өскемен ЖК', 'search_type': 'TOP', 'limit': 2}
    assert TOKEN not in response.text and 'example.invalid' not in response.text
    spec = json.loads((ROOT / 'contracts/openapi.yaml').read_text(encoding='utf-8'))
    spec['$schema'] = 'https://json-schema.org/draft/2020-12/schema'
    registry = Registry().with_resource('urn:saq:contract', Resource.from_contents(spec))
    Draft202012Validator(
        {'$ref': 'urn:saq:contract#/components/schemas/ThreadsSearchResult'}, registry=registry
    ).validate(result)


def test_failed_refresh_clears_previous_verified_connection(signed, monkeypatch):
    configure(signed)
    monkeypatch.setattr(threads, 'search_threads', lambda token, request: report(request))
    assert search(signed).status_code == 200
    assert signed.get(PREFIX + '/status').json()['state'] == 'ACCESS_VERIFIED'
    signed.app.state.threads_search_gate.next_allowed = 0

    def rejected(*args):
        raise ThreadsError('AUTH_REQUIRED')

    monkeypatch.setattr(threads, 'search_threads', rejected)
    assert search(signed).status_code == 502
    status = signed.get(PREFIX + '/status').json()
    assert status['state'] == 'CONFIGURED_UNVERIFIED'
    assert status['last_attempt'] == 'FAILED' and not status['busy']


@pytest.mark.parametrize(
    ('code', 'retry', 'http'), [('ACCESS_DENIED', None, 502), ('RATE_LIMITED', 120, 429), ('TLS_FAILED', None, 502)]
)
def test_upstream_failure_keeps_gate_safe_and_does_not_return_old_results(signed, monkeypatch, code, retry, http):
    configure(signed)

    def fetch(*args):
        raise ThreadsError(code, retry)

    monkeypatch.setattr(threads, 'search_threads', fetch)
    response = search(signed)
    assert response.status_code == http and TOKEN not in response.text
    status = signed.get(PREFIX + '/status').json()
    assert not status['busy'] and status['last_attempt'] == 'FAILED'
    assert status['retry_after_seconds'] >= (retry or 29)


def test_malformed_adapter_result_does_not_mark_access_verified(signed, monkeypatch):
    configure(signed)
    monkeypatch.setattr(threads, 'search_threads', lambda *args: {'secret': TOKEN})
    response = search(signed)
    assert response.status_code == 502 and TOKEN not in response.text
    assert signed.get(PREFIX + '/status').json()['last_attempt'] == 'FAILED'


def test_busy_gate_blocks_other_requests_after_interval_expired():
    gate = threads.SearchGate()
    gate.start(30)
    gate.next_allowed = 0
    with pytest.raises(threads.HTTPException) as error:
        gate.start(30)
    assert error.value.status_code == 429
    gate.finish(False)
    gate.next_allowed = 0
    gate.start(30)
    assert gate.status()[0] is True
