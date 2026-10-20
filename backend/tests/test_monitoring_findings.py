import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from uuid import UUID, uuid4

import pytest
from conftest import mutation_headers
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import func, select

from app.api import threads
from app.models import (
    Advertisement,
    AnalysisJob,
    Asset,
    AuditEvent,
    MonitoringFinding,
    MonitoringFindingImport,
    MonitoringFindingObservation,
    MonitoringFindingVersion,
    MonitoringQueryProfileVersion,
    MonitoringRun,
    Property,
    RiskFactor,
    Signal,
    User,
    utcnow,
)
from app.threads_search import ThreadsError, parse_response

PREFIX = '/api/v1/monitoring'
TEXT = 'Өскемен. ЖК «Учебный». Строящийся дом. Внесите предоплату 500 000 тенге до ввода.'


def post(client, path, body, key=None):
    return client.post(PREFIX + path, json=body, headers=mutation_headers(client, key))


def count(client, model):
    with client.app.state.sessions() as db:
        return db.scalar(select(func.count()).select_from(model))


@pytest.fixture
def source(signed, monkeypatch):
    settings = signed.app.state.settings
    monkeypatch.setattr(settings, 'threads_search_enabled', True)
    monkeypatch.setattr(settings, 'threads_access_token', SecretStr('synthetic-access-token-12345'))
    monkeypatch.setattr(settings, 'threads_search_interval_seconds', 0)
    external_id = str(uuid4().int)[:38]
    data = {
        'data': [
            {
                'id': external_id,
                'text': TEXT,
                'timestamp': '2026-10-13T07:00:00Z',
                'permalink': f'https://www.threads.com/@demo/post/{uuid4().hex}',
                'media_type': 'TEXT_POST',
            }
        ]
    }
    calls = []

    def fetch(token, query):
        calls.append(query.model_dump())
        return parse_response(json.dumps(data).encode(), query, utcnow())

    monkeypatch.setattr(threads, 'search_threads', fetch)
    bundled = signed.get(PREFIX + '/dictionaries/bundled').json()
    dictionary = post(
        signed, '/dictionaries', {'expected_sha256': bundled['content_sha256'], 'reason': 'DEMO test'}
    ).json()
    activate(signed, dictionary['id'])
    profile = post(
        signed,
        '/query-profiles',
        {
            'name': 'DEMO finding test',
            'parameters': {
                'dictionary_version': '2.0',
                'dictionary_id': dictionary['id'],
                'keyword': True,
                'budget': 3,
            },
        },
    ).json()
    return {'profile': profile, 'data': data, 'calls': calls, 'dictionary': dictionary}


def activate(client, dictionary_id):
    revision = client.get(PREFIX + '/dictionaries/activation').json()['revision']
    response = post(
        client,
        '/dictionaries/activations',
        {'dictionary_id': dictionary_id, 'expected_revision': revision, 'reason': 'DEMO test activation'},
    )
    assert response.status_code == 200, response.text


def run(client, source, query_index=0, key=None, **changes):
    profile = source['profile']
    body = {
        'expected_revision': profile['revision'],
        'query_id': profile['compiled_preview']['queries'][query_index]['id'],
        'reason': 'DEMO explicit query run',
        **changes,
    }
    return post(client, '/query-profiles/' + profile['id'] + '/runs', body, key)


def capture(client, run_id, key=None):
    return post(client, '/findings/capture', {'run_id': run_id, 'reason': 'DEMO save verified page'}, key)


def import_body(observation, **changes):
    return {
        'version_id': observation['version_id'],
        'observation_id': observation['id'],
        'text_only_acknowledged': True,
        'reason': 'DEMO reviewed text-only import',
        **changes,
    }


def test_profile_search_capture_and_explicit_import_have_independent_effects(signed, source):
    protected = [Property, RiskFactor, Signal, AnalysisJob]
    before = [count(signed, model) for model in protected]
    ads, assets = count(signed, Advertisement), count(signed, Asset)
    response = run(signed, source)
    assert response.status_code == 200, response.text
    run_id = response.json()['run_id']
    assert source['calls'][0]['query'] == source['profile']['compiled_queries'][0]
    assert count(signed, MonitoringFindingObservation) == 0
    saved = capture(signed, run_id)
    assert saved.status_code == 200, saved.text
    assert saved.json()['new_findings'] == saved.json()['new_versions'] == 1
    item = saved.json()['observations'][0]
    detail = signed.get(PREFIX + '/findings/' + item['finding_id']).json()
    assert detail['priority'] == 'P1'
    assert detail['context']['matched_spans']
    assert detail['context']['geography_confirmed'] is False
    assert detail['registry_status'] == 'WAITING_REGISTRY'
    assert detail['is_demo'] is False
    assert detail['text'] == TEXT and detail['version'] == 1
    assert detail['advertisement_id'] is None
    assert count(signed, Advertisement) == ads and count(signed, Asset) == assets
    key = uuid4()
    path = '/findings/' + item['finding_id'] + '/imports'
    receipt = post(signed, path, import_body(item), key)
    assert receipt.status_code == 201, receipt.text
    assert post(signed, path, import_body(item), key).json() == receipt.json()
    assert post(signed, path, import_body(item)).json() == receipt.json()
    assert count(signed, Advertisement) == ads + 1 and count(signed, Asset) == assets + 1
    ad = signed.get('/api/v1/advertisements/' + receipt.json()['advertisement_id']).json()
    assert ad['original_text'] == TEXT and ad['published_at'] == '2026-10-13T07:00:00Z'
    assert ad['status'] == 'NEW' and ad['confirmed_property_id'] is None and ad['is_demo'] is False
    assert ad['captured_at'] == detail['captured_at']
    with signed.app.state.sessions() as db:
        asset = db.scalar(select(Asset).where(Asset.advertisement_id == UUID(ad['id'])))
        assert asset.source_details['query_id'] == item['query_id']
        assert asset.source_details['run_id'] == run_id
        assert (signed.app.state.settings.storage_root / asset.storage_key).read_text(encoding='utf-8') == TEXT
    assert [count(signed, model) for model in protected] == before
    assert signed.get(PREFIX + '/findings/' + item['finding_id']).json()['advertisement_id'] == ad['id']
    assert len(source['calls']) == 1


def test_replay_dedup_query_provenance_changes_and_reversions(signed, source):
    key = uuid4()
    first_run = run(signed, source, key=key).json()
    capture_key = uuid4()
    first = capture(signed, first_run['run_id'], capture_key).json()
    item = first['observations'][0]
    original = signed.get(PREFIX + '/findings/' + item['finding_id']).json()
    activate(signed, None)
    assert run(signed, source, key=key).json() == first_run
    assert capture(signed, first_run['run_id'], capture_key).json() == first
    assert capture(signed, first_run['run_id']).json()['new_versions'] == 0
    activate(signed, source['dictionary']['id'])
    second_run = run(signed, source, 1).json()
    second = capture(signed, second_run['run_id']).json()
    assert second['new_findings'] == second['new_versions'] == 0
    assert second['observations'][0]['version_id'] == item['version_id']
    observations = signed.get(PREFIX + '/findings/' + item['finding_id'] + '/observations').json()
    assert observations['total'] == 2
    with signed.app.state.sessions() as db:
        assert (
            db.scalar(
                select(func.count())
                .select_from(AuditEvent)
                .where(
                    AuditEvent.action == 'MONITORING_FINDING_OBSERVED',
                    AuditEvent.entity_id.in_([UUID(row['id']) for row in observations['items']]),
                )
            )
            == 2
        )
    assert {row['query_id'] for row in observations['items']} == {
        first['observations'][0]['query_id'],
        second['observations'][0]['query_id'],
    }
    source['data']['data'][0]['text'] = 'Өскемен. ЖК «Учебный». Бесплатная бронь без предоплаты.'
    changed_run = run(signed, source).json()
    third = capture(signed, changed_run['run_id']).json()
    assert third['new_findings'] == 0 and third['new_versions'] == 1
    assert signed.get(PREFIX + '/findings/' + item['finding_id']).json()['version'] == 2
    assert signed.get(PREFIX + '/findings/' + item['finding_id'] + '?version=1').json() == original
    historical_list = signed.get(PREFIX + '/findings?run_id=' + first_run['run_id']).json()['items']
    assert historical_list[0]['version_id'] == item['version_id']
    assert capture(signed, first_run['run_id']).json()['observations'][0]['version_id'] == item['version_id']
    source['data']['data'][0]['text'] = TEXT
    assert capture(signed, run(signed, source).json()['run_id']).json()['new_versions'] == 1
    assert signed.get(PREFIX + '/findings/' + item['finding_id']).json()['version'] == 3
    assert signed.get(PREFIX + '/findings/' + item['finding_id'] + '/versions?page_size=1').json()['total'] == 3
    assert len(source['calls']) == 4


def test_blocked_empty_failed_and_partial_outcomes(signed, source, monkeypatch):
    monkeypatch.setattr(signed.app.state.settings, 'threads_search_enabled', False)
    key = uuid4()
    assert run(signed, source, key=key).status_code == 503
    assert run(signed, source, key=key).status_code == 503
    row = signed.get(PREFIX + '/runs').json()['items'][0]
    assert row['state'] == 'BLOCKED'
    assert capture(signed, row['id']).status_code == 409
    assert source['calls'] == []
    monkeypatch.setattr(signed.app.state.settings, 'threads_search_enabled', True)
    source['data']['data'] = []
    empty = run(signed, source)
    assert empty.status_code == 200, empty.text
    result = capture(signed, empty.json()['run_id']).json()
    assert result['outcome'] == 'SUCCESS' and result['observations'] == []
    source['data']['data'] = [
        {
            'id': str(uuid4().int),
            'text': TEXT,
            'permalink': 'https://threads.net/@demo/post/Partial',
            'media_type': 'VIDEO',
        }
    ]
    source['data']['paging'] = {'next': 'https://graph.threads.net/secret?access_token=must-not-persist'}
    partial = run(signed, source)
    result = capture(signed, partial.json()['run_id']).json()
    assert result['outcome'] == 'PARTIAL'
    detail = signed.get(PREFIX + '/findings/' + result['observations'][0]['finding_id']).json()
    assert detail['published_at'] is None
    assert 'VIDEO_NOT_ANALYZED' in detail['context']['content_limits']
    assert 'must-not-persist' not in partial.text
    assert 'must-not-persist' not in json.dumps(signed.get(PREFIX + '/runs/' + partial.json()['run_id']).json())

    def failure(*args):
        raise ThreadsError('ACCESS_DENIED')

    monkeypatch.setattr(threads, 'search_threads', failure)
    assert run(signed, source).status_code == 502
    failed = signed.get(PREFIX + '/runs').json()['items'][0]
    assert capture(signed, failed['id']).status_code == 409


@pytest.mark.parametrize(
    'text', [None, '', ' ', 'Өскемен ЖК. ' + 'а' * 20001], ids=['no_text', 'empty', 'blank', 'over_context_limit']
)
def test_unanalyzed_text_retains_original_and_media_limits(signed, source, text):
    source['data']['data'][0]['text'] = text
    source['data']['data'][0]['media_type'] = 'VIDEO'
    response = capture(signed, run(signed, source).json()['run_id'])
    assert response.status_code == 200, response.text
    item = response.json()['observations'][0]
    detail = signed.get(PREFIX + '/findings/' + item['finding_id']).json()
    assert detail['text'] == text and detail['priority'] == 'NEEDS_CONTEXT'
    assert detail['context']['mode'] == 'NOT_ANALYZED'
    imported = post(signed, '/findings/' + item['finding_id'] + '/imports', import_body(item))
    assert imported.status_code == (201 if text and text.strip() else 409)


def test_old_unbound_runs_stale_profile_and_corrupt_provenance_fail_closed(signed, source):
    before = count(signed, MonitoringFindingObservation)
    old = post(signed, '/threads/search', {'query': 'Өскемен ЖК'}).json()
    assert capture(signed, old['run_id']).status_code == 409
    assert run(signed, source, query_id='f' * 64).status_code == 409
    assert run(signed, source, expected_revision=99).status_code == 409
    saved = run(signed, source).json()
    with signed.app.state.sessions.begin() as db:
        row = db.get(MonitoringRun, UUID(saved['run_id']))
        row.result = {**row.result, 'request': {**row.result['request'], 'query': 'different query'}}
    assert capture(signed, saved['run_id']).status_code == 409
    assert count(signed, MonitoringFindingObservation) == before


def test_auth_roles_validation_and_idempotency_conflicts(signed, source):
    key = uuid4()
    run_id = run(signed, source, key=key).json()['run_id']
    assert run(signed, source, key=key, reason='different payload').status_code == 409
    item = capture(signed, run_id).json()['observations'][0]
    url = '/findings/' + item['finding_id'] + '/imports'
    assert post(signed, url, import_body(item, text_only_acknowledged=1)).status_code == 422
    assert post(signed, url, import_body(item, reason=' ')).status_code == 422
    assert post(signed, url, import_body(item, observation_id=str(uuid4()))).status_code == 409
    assert signed.get(PREFIX + '/findings?page_size=101').status_code == 422
    assert signed.get(PREFIX + '/findings?priority=RED').status_code == 422
    assert signed.get(PREFIX + '/findings/' + str(uuid4())).status_code == 404
    assert capture(signed, str(uuid4())).status_code == 404
    assert (
        signed.post(
            PREFIX + '/findings/capture',
            json={'run_id': run_id, 'reason': 'DEMO'},
            headers={**mutation_headers(signed), 'Origin': 'https://wrong.example'},
        ).status_code
        == 403
    )
    actor_id = UUID(signed.get('/api/v1/auth/me').json()['id'])
    with signed.app.state.sessions.begin() as db:
        db.get(User, actor_id).role = 'viewer'
    try:
        assert signed.get(PREFIX + '/findings').status_code == 200
        assert signed.get(PREFIX + '/findings/' + item['finding_id']).status_code == 200
        assert signed.get(PREFIX + '/findings/' + item['finding_id'] + '/observations').status_code == 200
        assert run(signed, source).status_code == 403
        assert capture(signed, run_id).status_code == 403
        assert post(signed, url, import_body(item)).status_code == 403
    finally:
        with signed.app.state.sessions.begin() as db:
            db.get(User, actor_id).role = 'analyst'
    with TestClient(signed.app, base_url='http://localhost:3000') as anonymous:
        assert anonymous.get(PREFIX + '/findings').status_code == 401


def test_concurrent_capture_and_import_create_one_version_and_one_material(signed, source):
    run_id = run(signed, source).json()['run_id']
    headers = mutation_headers(signed)

    def capture_request(_):
        return signed.post(
            PREFIX + '/findings/capture',
            json={'run_id': run_id, 'reason': 'DEMO concurrency'},
            headers={**headers, 'Idempotency-Key': str(uuid4())},
        )

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(capture_request, range(2)))
    assert [response.status_code for response in results] == [200, 200]
    assert sum(response.json()['new_versions'] for response in results) == 1
    item = results[0].json()['observations'][0]
    path = PREFIX + '/findings/' + item['finding_id'] + '/imports'

    def import_request(_):
        return signed.post(path, json=import_body(item), headers={**headers, 'Idempotency-Key': str(uuid4())})

    with ThreadPoolExecutor(max_workers=2) as pool:
        imported = list(pool.map(import_request, range(2)))
    assert [response.status_code for response in imported] == [201, 201]
    assert imported[0].json() == imported[1].json()


def test_changed_finding_imports_new_material_without_rewriting_original(signed, source):
    first_run = run(signed, source).json()['run_id']
    first = capture(signed, first_run).json()['observations'][0]
    path = '/findings/' + first['finding_id'] + '/imports'
    original_import = post(signed, path, import_body(first)).json()
    original_ad = signed.get('/api/v1/advertisements/' + original_import['advertisement_id']).json()
    first_detail = signed.get(PREFIX + '/findings/' + first['finding_id']).json()
    source['data']['data'][0]['text'] = TEXT + ' Условия обновлены.'
    second_run = run(signed, source).json()['run_id']
    second = capture(signed, second_run).json()['observations'][0]
    assert first['version_id'] != second['version_id']
    assert signed.get(PREFIX + '/findings?run_id=' + second_run + '&imported=false').json()['total'] == 1
    updated = post(signed, path, import_body(second)).json()
    assert updated['advertisement_id'] != original_import['advertisement_id']
    assert signed.get(PREFIX + '/findings?run_id=' + second_run + '&imported=true').json()['total'] == 1
    assert signed.get(PREFIX + '/findings/' + first['finding_id'] + '?version=1').json() == first_detail
    assert signed.get('/api/v1/advertisements/' + original_import['advertisement_id']).json() == original_ad
    with signed.app.state.sessions() as db:
        first_asset = db.scalar(
            select(Asset).where(Asset.advertisement_id == UUID(original_import['advertisement_id']))
        )
        second_asset = db.scalar(select(Asset).where(Asset.advertisement_id == UUID(updated['advertisement_id'])))
        assert first_asset.sha256 != second_asset.sha256
        assert first_asset.source_details['finding_version_id'] == first['version_id']
        assert second_asset.source_details['finding_version_id'] == second['version_id']


def test_capture_old_profile_version_after_profile_update_and_dictionary_deactivation(signed, source):
    saved = run(signed, source).json()
    old_profile = source['profile']
    updated = post(
        signed,
        '/query-profiles/' + old_profile['id'] + '/versions',
        {
            'name': 'DEMO revised profile',
            'expected_revision': 1,
            'parameters': {**old_profile['parameters'], 'budget': 1},
        },
    )
    assert updated.status_code == 200
    assert run(signed, source).status_code == 409
    activate(signed, None)
    result = capture(signed, saved['run_id'])
    assert result.status_code == 200, result.text
    item = result.json()['observations'][0]
    history = signed.get(PREFIX + '/findings/' + item['finding_id'] + '/observations').json()['items']
    with signed.app.state.sessions() as db:
        version = db.get(MonitoringQueryProfileVersion, UUID(history[0]['profile_version_id']))
        assert version.profile_id == UUID(old_profile['id']) and version.revision == 1
    assert len(source['calls']) == 1


def test_no_source_or_business_mutation_on_finding_reads(signed, source, monkeypatch):
    saved = capture(signed, run(signed, source).json()['run_id']).json()['observations'][0]
    protected = [
        Advertisement,
        AnalysisJob,
        Asset,
        Property,
        RiskFactor,
        Signal,
        MonitoringFinding,
        MonitoringFindingVersion,
        MonitoringFindingObservation,
        MonitoringFindingImport,
        AuditEvent,
    ]
    before = [count(signed, model) for model in protected]
    monkeypatch.setattr(threads, 'search_threads', lambda *args: pytest.fail('GET must not contact source'))
    for suffix in [
        '',
        '/' + saved['finding_id'],
        '/' + saved['finding_id'] + '/versions',
        '/' + saved['finding_id'] + '/observations',
    ]:
        assert signed.get(PREFIX + '/findings' + suffix).status_code == 200
    assert before == [count(signed, model) for model in protected]


def test_late_capture_preserves_older_page_without_replacing_newest_observed_content(signed, source):
    newer_run = run(signed, source).json()['run_id']
    newer = capture(signed, newer_run).json()['observations'][0]
    original = signed.get(PREFIX + '/findings/' + newer['finding_id']).json()
    source['data']['data'][0]['text'] = 'DEMO older source page'
    older_run = run(signed, source).json()['run_id']
    with signed.app.state.sessions.begin() as db:
        row = db.get(MonitoringRun, UUID(older_run))
        row.result = {
            **row.result,
            'captured_at': (datetime.fromisoformat(original['captured_at']) - timedelta(days=1)).isoformat(),
        }
    older = capture(signed, older_run).json()['observations'][0]
    assert older['version_id'] != newer['version_id']
    assert signed.get(PREFIX + '/findings/' + newer['finding_id']).json() == original
    rows = signed.get(PREFIX + '/findings?run_id=' + older_run).json()['items']
    assert rows[0]['version_id'] == older['version_id']
    assert signed.get(PREFIX + '/findings?run_id=' + newer_run).json()['items'][0]['version_id'] == newer['version_id']
    assert (
        signed.get(PREFIX + '/findings/' + newer['finding_id'] + '?version=2').json()['text']
        == 'DEMO older source page'
    )


def test_request_cannot_supply_finding_payload_or_claim_hashtag_support(signed, source):
    run_id = run(signed, source).json()['run_id']
    assert post(signed, '/findings/capture', {'run_id': run_id, 'reason': 'DEMO', 'items': []}).status_code == 422
    old = source['profile']
    profile = post(
        signed,
        '/query-profiles',
        {
            'name': 'DEMO hashtag only',
            'parameters': {**old['parameters'], 'keyword': False, 'hashtag': True, 'budget': 1},
        },
    ).json()
    source['profile'] = profile
    calls = len(source['calls'])
    assert run(signed, source).status_code == 409
    assert len(source['calls']) == calls
