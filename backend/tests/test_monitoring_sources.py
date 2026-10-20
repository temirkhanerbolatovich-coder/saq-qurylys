import json
from datetime import timedelta
from uuid import UUID, uuid4

import pytest
from conftest import mutation_headers
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import func, select

from app.api import threads
from app.config import ROOT
from app.models import Advertisement, Asset, AuditEvent, MonitoringRun, Property, RiskFactor, Signal, User, utcnow
from app.threads_search import ThreadsError, parse_response

PREFIX = '/api/v1/monitoring'
TOKEN = 'synthetic-source-access-token-12345'


def search(client, key=None, query='Өскемен ЖК'):
    return client.post(PREFIX + '/threads/search', json={'query': query}, headers=mutation_headers(client, key))


def setup_source(signed, monkeypatch, *, data=None):
    signed.app.state.settings.threads_search_enabled = True
    signed.app.state.settings.threads_access_token = SecretStr(TOKEN)
    calls = []

    def fetch(token, query):
        assert token == TOKEN
        calls.append(query.query)
        return parse_response(json.dumps(data or {'data': []}).encode(), query, utcnow())

    monkeypatch.setattr(threads, 'search_threads', fetch)
    return calls


def count(client, model):
    with client.app.state.sessions() as db:
        return db.scalar(select(func.count()).select_from(model))


def test_disabled_attempt_saved_with_no_external_call_and_reads_do_not_write(signed, monkeypatch):
    signed.app.state.settings.threads_search_enabled = False
    monkeypatch.setattr(threads, 'search_threads', lambda *args: pytest.fail('Unexpected network'))
    before = count(signed, MonitoringRun)
    response = search(signed)
    assert response.status_code == 503
    assert count(signed, MonitoringRun) == before + 1
    sources = signed.get(PREFIX + '/sources').json()['items']
    threads_row = next(row for row in sources if row['code'] == 'THREADS')
    assert threads_row['state'] == 'DISABLED'
    assert threads_row['last_attempt']['state'] == 'BLOCKED'
    assert threads_row['last_attempt']['returned_count'] is None
    assert threads_row['last_attempt']['saved_count'] == 0
    assert next(row for row in sources if row['code'] == 'SOCIAL_MANUAL')['state'] == 'BLOCKED'
    db_counts = [count(signed, model) for model in [MonitoringRun, AuditEvent]]
    for _ in range(2):
        assert signed.get(PREFIX + '/sources').status_code == 200
        history = signed.get(PREFIX + '/runs?state=BLOCKED&page_size=1').json()
        assert history['total'] >= 1 and len(history['items']) == 1
        assert signed.get(PREFIX + '/runs/' + threads_row['last_attempt']['id']).status_code == 200
    assert db_counts == [count(signed, model) for model in [MonitoringRun, AuditEvent]]


def test_success_snapshot_replay_restart_and_no_analyst_decisions(signed, monkeypatch):
    post = dict(
        id='1234',
        text='DEMO Өскемен <script>bad</script>',
        timestamp='2026-10-19T10:00:00Z',
        permalink='https://www.threads.net/@demo/post/XYZ',
        media_type='TEXT_POST',
    )
    calls = setup_source(signed, monkeypatch, data={'data': [post, post], 'paging': {'next': '?access_token=' + TOKEN}})
    models = [Advertisement, Asset, Property, RiskFactor, Signal]
    before = [count(signed, m) for m in models]
    key = uuid4()
    response = search(signed, key)
    assert response.status_code == 200, response.text
    result = response.json()
    assert result['run_id']
    assert search(signed, key).json() == result and len(calls) == 1
    assert search(signed, key, 'другое ЖК').status_code == 409
    assert [count(signed, m) for m in models] == before
    detail = signed.get(PREFIX + '/runs/' + result['run_id']).json()
    assert detail['state'] == 'SUCCEEDED' and detail['returned_count'] == 2 and detail['duplicate_count'] == 1
    assert detail['result']['items'] == [post] and detail['saved_count'] == 0
    assert TOKEN not in json.dumps(detail) and 'access_token' not in json.dumps(detail)
    assert signed.get(PREFIX + '/runs?source_code=THREADS&state=SUCCEEDED').json()['total'] >= 1
    # A new API process reads history but cannot certify the current token from an older run.
    signed.app.state.threads_search_gate = threads.SearchGate()
    source = next(s for s in signed.get(PREFIX + '/sources').json()['items'] if s['code'] == 'THREADS')
    assert source['last_success_at'] and source['access_status'] == 'CONFIGURED_UNVERIFIED'
    assert search(signed, key).json() == result and len(calls) == 1


@pytest.mark.parametrize(
    ('code', 'state', 'http'),
    [('RATE_LIMITED', 'RATE_LIMITED', 429), ('AUTH_REQUIRED', 'ERROR', 502), ('TIMEOUT', 'ERROR', 502)],
)
def test_failures_saved_and_retry_key_never_reissues_request(signed, monkeypatch, code, state, http):
    calls = setup_source(signed, monkeypatch)

    def fail(*args):
        calls.append('failed')
        raise ThreadsError(code, 120 if code == 'RATE_LIMITED' else None)

    monkeypatch.setattr(threads, 'search_threads', fail)
    key = uuid4()
    assert search(signed, key).status_code == http
    assert search(signed, key).status_code == http and len(calls) == 1
    source = next(s for s in signed.get(PREFIX + '/sources').json()['items'] if s['code'] == 'THREADS')
    assert source['last_attempt']['state'] == state
    assert source['last_attempt']['error_code'] == code
    assert source['last_attempt']['returned_count'] is None


def test_empty_success_distinct_from_failure(signed, monkeypatch):
    setup_source(signed, monkeypatch)
    response = search(signed)
    assert response.status_code == 200
    detail = signed.get(PREFIX + '/runs/' + response.json()['run_id']).json()
    assert detail['state'] == 'EMPTY' and detail['returned_count'] == 0 and detail['error_code'] is None


def test_stale_running_is_unknown_without_read_mutation_or_replay(signed, monkeypatch):
    calls = setup_source(signed, monkeypatch)
    response = search(signed)
    run_id, key = UUID(response.json()['run_id']), uuid4()
    with signed.app.state.sessions.begin() as db:
        run = db.get(MonitoringRun, run_id)
        run.state, run.result, run.finished_at, run.command_key = 'RUNNING', None, None, key
        run.deadline_at = utcnow() - timedelta(seconds=1)
    detail = signed.get(PREFIX + '/runs/' + str(run_id)).json()
    assert detail['state'] == 'INTERRUPTED' and detail['error_code'] == 'OUTCOME_UNKNOWN'
    assert signed.get(PREFIX + '/runs?state=INTERRUPTED').json()['total'] >= 1
    assert search(signed, key).status_code == 409 and len(calls) == 1
    with signed.app.state.sessions() as db:
        assert db.get(MonitoringRun, run_id).state == 'RUNNING'


def test_auth_validation_and_viewer_history(signed, monkeypatch):
    calls = setup_source(signed, monkeypatch)
    assert signed.get(PREFIX + '/runs?page_size=101').status_code == 422
    assert signed.get(PREFIX + '/runs?state=MADE_UP').status_code == 422
    assert signed.get(PREFIX + '/runs/' + str(uuid4())).status_code == 404
    before = count(signed, MonitoringRun)
    assert search(signed, query='ЖК\ninvalid').status_code == 422
    assert count(signed, MonitoringRun) == before
    actor_id = signed.get('/api/v1/auth/me').json()['id']
    with signed.app.state.sessions.begin() as db:
        db.get(User, UUID(actor_id)).role = 'viewer'
    try:
        assert signed.get(PREFIX + '/sources').status_code == 200
        assert signed.get(PREFIX + '/runs').status_code == 200
        assert search(signed).status_code == 403
        assert count(signed, MonitoringRun) == before
    finally:
        with signed.app.state.sessions.begin() as db:
            db.get(User, UUID(actor_id)).role = 'analyst'
    with TestClient(signed.app, base_url='http://localhost:3000') as anonymous:
        assert anonymous.get(PREFIX + '/sources').status_code == 401
        assert anonymous.get(PREFIX + '/runs').status_code == 401
    assert calls == []


def test_catalogue_contract(client):
    spec = json.loads((ROOT / 'contracts/openapi.yaml').read_text(encoding='utf-8'))
    live = client.app.openapi()
    for path in ['/sources', '/runs', '/runs/{id}']:
        assert spec['paths'][PREFIX + path] == live['paths'][PREFIX + path]


def test_same_key_concurrent_request_never_calls_source_twice(signed, monkeypatch):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Event

    setup_source(signed, monkeypatch)
    entered, release = Event(), Event()
    calls = []

    def wait_for_source(token, query):
        calls.append(query.query)
        entered.set()
        assert release.wait(10)
        return parse_response(b'{"data":[]}', query, utcnow())

    monkeypatch.setattr(threads, 'search_threads', wait_for_source)
    key = uuid4()
    headers = mutation_headers(signed, key)
    cookies = dict(signed.cookies)

    def send():
        with TestClient(signed.app, base_url='http://localhost:3000') as client:
            client.cookies.update(cookies)
            return client.post(PREFIX + '/threads/search', json={'query': 'Өскемен ЖК'}, headers=headers)

    with ThreadPoolExecutor(max_workers=2) as pool:
        first = pool.submit(send)
        assert entered.wait(10)
        try:
            second = pool.submit(send).result(timeout=10)
            assert second.status_code == 409
        finally:
            release.set()
        result = first.result(timeout=10)
    assert result.status_code == 200 and len(calls) == 1
    assert search(signed, key).json() == result.json()


def test_failure_to_save_outcome_does_not_erase_intent_or_allow_replay(signed, monkeypatch):
    from app import monitoring_runs

    calls = setup_source(signed, monkeypatch)
    original = monitoring_runs.audit

    def audit(db, request, actor, run, action, **kwargs):
        if action == 'MONITORING_RUN_FINISHED':
            raise RuntimeError('Injected final audit failure')
        return original(db, request, actor, run, action, **kwargs)

    monkeypatch.setattr(monitoring_runs, 'audit', audit)
    key = uuid4()
    assert search(signed, key).status_code == 500
    assert search(signed, key).status_code == 409
    assert len(calls) == 1
    with signed.app.state.sessions() as db:
        run = db.scalar(select(MonitoringRun).where(MonitoringRun.command_key == key))
        assert run.state == 'RUNNING' and run.result is None
