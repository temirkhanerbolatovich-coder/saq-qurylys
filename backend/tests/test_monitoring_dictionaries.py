from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import UUID, uuid4

import pytest
from conftest import mutation_headers
from sqlalchemy import func, select

from app.api import monitoring_dictionaries as api
from app.api import query_profiles, threads
from app.models import (
    Advertisement,
    AnalysisJob,
    AuditEvent,
    MonitoringDictionaryVersion,
    MonitoringRun,
    Property,
    RiskFactor,
    Signal,
    User,
)
from app.monitoring_dictionaries import stored_snapshot
from app.social_dictionary import load_dictionary

URL = '/api/v1/monitoring/dictionaries'
PROFILES = '/api/v1/monitoring/query-profiles'


def register(client, key=None):
    bundle = client.get(URL + '/bundled')
    assert bundle.status_code == 200, bundle.text
    return client.post(
        URL,
        json={'expected_sha256': bundle.json()['content_sha256'], 'reason': 'DEMO reviewed original dictionary'},
        headers=mutation_headers(client, key),
    )


def activate(client, dictionary_id, revision=None, key=None):
    if revision is None:
        revision = client.get(URL + '/activation').json()['revision']
    return client.post(
        URL + '/activations',
        json={'dictionary_id': dictionary_id, 'expected_revision': revision, 'reason': 'DEMO explicit activation'},
        headers=mutation_headers(client, key),
    )


def profile_body(dictionary_id, **changes):
    return {
        'name': 'DEMO V2 offline',
        'parameters': {'dictionary_version': '2.0', 'dictionary_id': dictionary_id, 'keyword': True, 'budget': 3},
        **changes,
    }


def test_registration_activation_history_replay_and_no_side_effects(signed, monkeypatch):
    monkeypatch.setattr(threads, 'search_threads', lambda *a, **kw: pytest.fail('No network during dictionary changes'))
    protected = [Advertisement, AnalysisJob, MonitoringRun, Property, RiskFactor, Signal]

    def counts():
        with signed.app.state.sessions() as db:
            return [db.scalar(select(func.count()).select_from(model)) for model in protected]

    before = counts()
    key = uuid4()
    response = register(signed, key)
    assert response.status_code == 201, response.text
    row = response.json()
    assert register(signed, key).json() == row
    assert register(signed).json() == row
    state = signed.get(URL + '/activation').json()
    revision = state['revision']
    activation_key = uuid4()
    enabled = activate(signed, row['id'], revision, activation_key)
    assert enabled.status_code == 200, enabled.text
    assert enabled.json()['revision'] == revision + 1
    disabled = activate(signed, None)
    assert disabled.status_code == 200 and disabled.json()['dictionary_id'] is None
    assert activate(signed, row['id'], revision, activation_key).json() == enabled.json()
    assert signed.get(URL + '/activation').json() == disabled.json()
    assert activate(signed, row['id'], revision).status_code == 409
    history = signed.get(URL + '/activations?page_size=100').json()['items']
    assert enabled.json() in history and disabled.json() in history
    assert counts() == before
    with signed.app.state.sessions() as db:
        stored = db.get(MonitoringDictionaryVersion, UUID(row['id']))
        assert stored_snapshot(stored).content_sha256 == row['content_sha256']
        assert (
            db.scalar(
                select(func.count())
                .select_from(AuditEvent)
                .where(AuditEvent.action == 'MONITORING_DICTIONARY_REGISTERED', AuditEvent.entity_id == stored.id)
            )
            == 1
        )


def test_v2_profile_freezes_preview_and_v1_list_is_unchanged(signed, monkeypatch):
    row = register(signed).json()
    assert activate(signed, None).status_code == 200
    body = profile_body(row['id'])
    assert signed.post(PROFILES, json=body, headers=mutation_headers(signed)).status_code == 409
    activation = activate(signed, row['id']).json()
    key = uuid4()
    response = signed.post(PROFILES, json=body, headers=mutation_headers(signed, key))
    assert response.status_code == 201, response.text
    first = response.json()
    assert len(first['compiled_queries']) == 3
    assert first['compiled_preview']['activation_revision'] == activation['revision']
    assert first['compiled_preview']['access_status'] == 'ACCESS_UNVERIFIED'
    assert first['dictionary_id'] == row['id']
    assert signed.get(PROFILES + '/' + first['id']).status_code == 404
    assert first['id'] not in [p['id'] for p in signed.get(PROFILES + '?page_size=100').json()['items']]
    assert first['id'] in [
        p['id'] for p in signed.get(PROFILES + '?dictionary_version=2.0&page_size=100').json()['items']
    ]
    second_body = profile_body(row['id'], expected_revision=1)
    second_body['parameters']['budget'] = 2
    second = signed.post(PROFILES + '/' + first['id'] + '/versions', json=second_body, headers=mutation_headers(signed))
    assert second.status_code == 200, second.text
    assert second.json()['revision'] == 2
    assert activate(signed, None).status_code == 200
    monkeypatch.setattr(query_profiles, 'compile_preview', lambda *a: pytest.fail('GET/replay must not recompile'))
    assert signed.post(PROFILES, json=body, headers=mutation_headers(signed, key)).json() == first
    old = signed.get(PROFILES + '/' + first['id'] + '?dictionary_version=2.0&revision=1').json()
    assert old['current_revision'] == 2
    assert {k: v for k, v in old.items() if k != 'current_revision'} == {
        k: v for k, v in first.items() if k != 'current_revision'
    }
    second_body['expected_revision'] = 2
    assert (
        signed.post(
            PROFILES + '/' + first['id'] + '/versions', json=second_body, headers=mutation_headers(signed)
        ).status_code
        == 409
    )


def test_unknown_id_sha_conflict_validation_and_csrf(signed):
    assert (
        signed.post(
            URL, json={'expected_sha256': '0' * 64, 'reason': 'DEMO'}, headers=mutation_headers(signed)
        ).status_code
        == 409
    )
    assert (
        signed.post(
            URL,
            json={'expected_sha256': '0' * 64, 'reason': 'DEMO'},
            headers={**mutation_headers(signed), 'X-CSRF-Token': 'x' * 64},
        ).status_code
        == 403
    )
    assert activate(signed, str(uuid4())).status_code == 404
    assert (
        signed.post(
            URL + '/activations',
            json={'dictionary_id': None, 'expected_revision': 0, 'reason': ' '},
            headers=mutation_headers(signed),
        ).status_code
        == 422
    )
    assert (
        signed.post(
            PROFILES,
            json=profile_body(
                str(uuid4()),
                parameters={'dictionary_version': '2.0', 'dictionary_id': str(uuid4()), 'source_code': 'THREADS'},
            ),
            headers=mutation_headers(signed),
        ).status_code
        == 422
    )


def test_viewer_can_read_but_cannot_register_activate_or_save(signed):
    user_id = UUID(signed.get('/api/v1/auth/me').json()['id'])
    headers = mutation_headers(signed)
    with signed.app.state.sessions.begin() as db:
        db.get(User, user_id).role = 'viewer'
    try:
        for path in ['', '/bundled', '/activation', '/activations']:
            assert signed.get(URL + path).status_code == 200
        assert (
            signed.post(URL, json={'expected_sha256': '0' * 64, 'reason': 'DEMO'}, headers=headers).status_code == 403
        )
        assert (
            signed.post(
                URL + '/activations',
                json={'dictionary_id': None, 'expected_revision': 0, 'reason': 'DEMO'},
                headers=headers,
            ).status_code
            == 403
        )
        assert signed.post(PROFILES, json=profile_body(str(uuid4())), headers=headers).status_code == 403
    finally:
        with signed.app.state.sessions.begin() as db:
            db.get(User, user_id).role = 'analyst'


def test_concurrent_activation_has_exactly_one_winner(signed):
    row = register(signed).json()
    revision = signed.get(URL + '/activation').json()['revision']
    headers = mutation_headers(signed)
    barrier = Barrier(2)

    def submit(index):
        barrier.wait(timeout=10)
        return signed.post(
            URL + '/activations',
            json={'dictionary_id': row['id'], 'expected_revision': revision, 'reason': f'DEMO {index}'},
            headers={**headers, 'Idempotency-Key': str(uuid4())},
        )

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(submit, [0, 1]))
    assert sorted(r.status_code for r in responses) == [200, 409]
    assert signed.get(URL + '/activation').json()['revision'] == revision + 1


def test_bundle_failure_is_safe_and_reads_never_register(signed, monkeypatch):
    def fail():
        raise ValueError('private-untrusted-input')

    monkeypatch.setattr(api, 'bundled_dictionary', fail)
    response = signed.get(URL + '/bundled')
    assert response.status_code == 503 and 'private-untrusted-input' not in response.text
    assert (
        signed.post(
            URL, json={'expected_sha256': '0' * 64, 'reason': 'DEMO'}, headers=mutation_headers(signed)
        ).status_code
        == 503
    )


def test_unauthenticated_dictionary_reads_are_rejected(client):
    for suffix in ['', '/bundled', '/activation', '/activations']:
        assert client.get(URL + suffix).status_code == 401


def test_dictionary_upgrade_does_not_rewrite_saved_profile(signed, monkeypatch):
    import json

    old = register(signed).json()
    activate(signed, old['id'])
    response = signed.post(PROFILES, json=profile_body(old['id']), headers=mutation_headers(signed))
    assert response.status_code == 201
    saved = response.json()
    original_snapshot, original_bytes = api.bundled_dictionary()
    document = json.loads(original_snapshot.raw)
    document['v2_additions']['extended_queries_ru'].append('DEMO updated query')
    raw = json.dumps(document, ensure_ascii=False).encode()
    new_snapshot = load_dictionary(raw, source='reviewed-next-version.json', original_raw=original_bytes)
    monkeypatch.setattr(api, 'bundled_dictionary', lambda: (new_snapshot, original_bytes))
    new = register(signed).json()
    assert new['id'] != old['id'] and new['content_sha256'] != old['content_sha256']
    activate(signed, new['id'])
    assert signed.get(PROFILES + '/' + saved['id'] + '?dictionary_version=2.0').json() == saved
    assert signed.post(PROFILES, json=profile_body(old['id']), headers=mutation_headers(signed)).status_code == 409
    updated = signed.post(
        PROFILES + '/' + saved['id'] + '/versions',
        json=profile_body(new['id'], expected_revision=1),
        headers=mutation_headers(signed),
    )
    assert updated.status_code == 200
    assert updated.json()['dictionary_sha256'] == new['content_sha256']
    assert updated.json()['compiled_preview']['queries'][0]['id'] != saved['compiled_preview']['queries'][0]['id']
    activate(signed, old['id'])
    with signed.app.state.sessions() as db:
        assert stored_snapshot(db.get(MonitoringDictionaryVersion, UUID(old['id']))).raw == original_snapshot.raw


def test_corrupt_stored_bytes_cannot_be_activated_or_used(signed):
    row = register(signed).json()
    activate(signed, row['id'])
    with signed.app.state.sessions.begin() as db:
        stored = db.get(MonitoringDictionaryVersion, UUID(row['id']))
        original = stored.raw
        stored.raw = b'invalid-private-payload'
    try:
        response = activate(signed, row['id'])
        assert response.status_code == 409 and 'invalid-private-payload' not in response.text
        assert signed.post(PROFILES, json=profile_body(row['id']), headers=mutation_headers(signed)).status_code == 409
    finally:
        with signed.app.state.sessions.begin() as db:
            db.get(MonitoringDictionaryVersion, UUID(row['id'])).raw = original


def test_schema_conversion_is_rejected_without_new_revision(signed):
    row = register(signed).json()
    activate(signed, row['id'])
    saved = signed.post(PROFILES, json=profile_body(row['id']), headers=mutation_headers(signed)).json()
    body = {
        'name': 'DEMO v1',
        'expected_revision': 1,
        'parameters': {'dictionary_version': '1.0', 'city': 'Өскемен', 'language': 'kk', 'topic': 'all'},
    }
    response = signed.post(PROFILES + '/' + saved['id'] + '/versions', json=body, headers=mutation_headers(signed))
    assert response.status_code == 409
    assert signed.get(PROFILES + '/' + saved['id'] + '?dictionary_version=2.0').json() == saved


def test_contract_matches_dictionary_routes_and_profile_schemas(client):
    import json

    from app.config import ROOT

    spec = json.loads((ROOT / 'contracts/openapi.yaml').read_text(encoding='utf-8'))
    live = client.app.openapi()
    for path, value in live['paths'].items():
        if path.startswith((URL, PROFILES)):
            assert spec['paths'][path] == value
    for name, value in live['components']['schemas'].items():
        if name.startswith(('Dictionary', 'SocialQuery', 'QueryProfile', 'Page_Dictionary', 'Page_QueryProfile')):
            assert spec['components']['schemas'][name] == value
