from uuid import UUID, uuid4

import pytest
from conftest import mutation_headers
from sqlalchemy import func, select

from app.api import query_profiles, threads
from app.models import (
    Advertisement,
    AnalysisJob,
    Asset,
    AuditEvent,
    MonitoringQueryProfile,
    MonitoringQueryProfileVersion,
    MonitoringRun,
    Property,
    RiskFactor,
    Signal,
    User,
)
from app.query_profiles import DICTIONARY, DICTIONARY_SHA256, QueryParameters, compile_queries

URL = '/api/v1/monitoring/query-profiles'


def payload(**changes):
    return {
        'name': 'DEMO профиль Өскемен',
        'parameters': {
            'dictionary_version': '1.0',
            'city': 'Өскемен',
            'language': 'kk',
            'topic': 'all',
            'project': 'DEMO Әділет',
        },
        **changes,
    }


def create(client, key=None, body=None):
    return client.post(URL, json=body or payload(), headers=mutation_headers(client, key))


def counts(client, models):
    with client.app.state.sessions() as db:
        return [db.scalar(select(func.count()).select_from(model)) for model in models]


def test_compile_every_city_language_and_topic_has_bounded_construction_context():
    for city in DICTIONARY['city_aliases']:
        for language in ['ru', 'kk']:
            for topic in ['all', *(item['id'] for item in DICTIONARY['topics'])]:
                p = QueryParameters(city=city, language=language, topic=topic, project='DEMO  ' + 'x' * 90)
                queries = compile_queries(p)
                assert queries and len(queries) == len(set(queries)) and max(map(len, queries)) <= 300
                assert all(city in q and ('ЖК' if language == 'ru' else 'тұрғын үй кешені') in q for q in queries)


def test_create_replay_history_conflict_and_reads_do_not_execute_search(signed, monkeypatch):
    monkeypatch.setattr(threads, 'search_threads', lambda *args: pytest.fail('Profiles must not search'))
    protected = [Advertisement, AnalysisJob, Asset, MonitoringRun, Property, RiskFactor, Signal]
    before = counts(signed, protected)
    key = uuid4()
    result = create(signed, key)
    assert result.status_code == 201, result.text
    first = result.json()
    assert first['revision'] == first['current_revision'] == 1
    assert first['dictionary_sha256'] == DICTIONARY_SHA256
    assert create(signed, key).json() == first
    different = payload(name='Другое имя')
    assert create(signed, key, different).status_code == 409
    body = payload(name='DEMO новая версия', expected_revision=1)
    body['parameters']['topic'] = 'installment'
    version_key = uuid4()
    update = signed.post(
        URL + '/' + first['id'] + '/versions', json=body, headers=mutation_headers(signed, version_key)
    )
    assert update.status_code == 200, update.text
    second = update.json()
    assert second['revision'] == second['current_revision'] == 2
    assert len(second['compiled_queries']) == 1
    assert (
        signed.post(
            URL + '/' + first['id'] + '/versions', json=body, headers=mutation_headers(signed, version_key)
        ).json()
        == second
    )
    assert (
        signed.post(URL + '/' + first['id'] + '/versions', json=body, headers=mutation_headers(signed)).status_code
        == 409
    )
    history = signed.get(URL + '/' + first['id'] + '?revision=1').json()
    assert history['current_revision'] == 2
    assert {k: v for k, v in history.items() if k != 'current_revision'} == {
        k: v for k, v in first.items() if k != 'current_revision'
    }
    assert signed.get(URL + '/' + first['id'] + '?revision=3').status_code == 404
    assert signed.get(URL + '/' + str(uuid4())).status_code == 404
    table_counts = counts(signed, [MonitoringQueryProfile, MonitoringQueryProfileVersion, AuditEvent])
    for _ in range(2):
        assert signed.get(URL + '?page_size=1').json()['total'] >= 1
        assert signed.get(URL + '/' + first['id']).json() == second
    assert counts(signed, [MonitoringQueryProfile, MonitoringQueryProfileVersion, AuditEvent]) == table_counts
    assert counts(signed, protected) == before


def test_saved_snapshot_does_not_recompile_on_read(signed, monkeypatch):
    old = create(signed).json()
    monkeypatch.setattr(query_profiles, 'compile_queries', lambda *args: ['DEMO changed generator'])
    assert signed.get(URL + '/' + old['id']).json()['compiled_queries'] == old['compiled_queries']
    body = payload(expected_revision=1)
    changed = signed.post(URL + '/' + old['id'] + '/versions', json=body, headers=mutation_headers(signed)).json()
    assert changed['compiled_queries'] == ['DEMO changed generator']
    assert signed.get(URL + '/' + old['id'] + '?revision=1').json()['compiled_queries'] == old['compiled_queries']


@pytest.mark.parametrize(
    'field,value',
    [
        ('city', 'Москва'),
        ('topic', 'unknown'),
        ('language', 'en'),
        ('project', 'x' * 101),
        ('dictionary_version', '2.0'),
        ('project', 'hello\u0000world'),
    ],
)
def test_invalid_parameters_do_not_persist(signed, field, value):
    before = counts(signed, [MonitoringQueryProfile, MonitoringQueryProfileVersion])
    body = payload()
    body['parameters'][field] = value
    assert create(signed, body=body).status_code == 422
    assert counts(signed, [MonitoringQueryProfile, MonitoringQueryProfileVersion]) == before


def test_auth_csrf_viewer_strict_fields_and_revision(signed):
    from fastapi.testclient import TestClient

    from app.main import create_app

    with TestClient(create_app(signed.app.state.settings), base_url='http://localhost:3000') as anonymous:
        assert anonymous.get(URL).status_code == 401
    assert (
        signed.post(
            URL,
            json=payload(),
            headers={
                'Idempotency-Key': str(uuid4()),
                'Origin': 'http://localhost:3000',
                'X-CSRF-Token': 'x' * 32,
            },
        ).status_code
        == 403
    )
    assert create(signed, body=payload(name='   ')).status_code == 422
    assert create(signed, body=payload(unexpected=True)).status_code == 422
    first = create(signed).json()
    for revision in [0, True, '1']:
        assert (
            signed.post(
                URL + '/' + first['id'] + '/versions',
                json=payload(expected_revision=revision),
                headers=mutation_headers(signed),
            ).status_code
            == 422
        )
    user_id = UUID(signed.get('/api/v1/auth/me').json()['id'])
    with signed.app.state.sessions.begin() as db:
        db.get(User, user_id).role = 'viewer'
    try:
        assert signed.get(URL).status_code == 200
        assert signed.get(URL + '/' + first['id'] + '?revision=1').status_code == 200
        assert create(signed).status_code == 403
        assert (
            signed.post(
                URL + '/' + first['id'] + '/versions',
                json=payload(expected_revision=1),
                headers=mutation_headers(signed),
            ).status_code
            == 403
        )
    finally:
        with signed.app.state.sessions.begin() as db:
            db.get(User, user_id).role = 'analyst'


def test_new_api_contract_matches_live(signed):
    import json

    from app.config import ROOT

    spec = json.loads((ROOT / 'contracts/openapi.yaml').read_text(encoding='utf-8'))
    live = signed.app.openapi()
    for path in [URL, URL + '/{id}', URL + '/{id}/versions']:
        assert spec['paths'][path] == live['paths'][path]


def test_concurrent_edits_append_exactly_one_version(signed):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier

    first = create(signed).json()
    first_headers = mutation_headers(signed)
    headers = [first_headers, {**first_headers, 'Idempotency-Key': str(uuid4())}]
    barrier = Barrier(2)

    def update(index):
        barrier.wait(timeout=10)
        return signed.post(
            URL + '/' + first['id'] + '/versions',
            json=payload(name=f'DEMO edit{index}', expected_revision=1),
            headers=headers[index],
        )

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(update, [0, 1]))
    assert sorted(r.status_code for r in responses) == [200, 409]
    current = signed.get(URL + '/' + first['id']).json()
    assert current['revision'] == 2
    with signed.app.state.sessions() as db:
        assert (
            db.scalar(
                select(func.count())
                .select_from(MonitoringQueryProfileVersion)
                .where(MonitoringQueryProfileVersion.profile_id == UUID(first['id']))
            )
            == 2
        )
