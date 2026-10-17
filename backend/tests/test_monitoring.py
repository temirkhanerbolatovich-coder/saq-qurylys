from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from uuid import UUID, uuid4

import pytest
from conftest import mutation_headers
from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select
from test_analysis import contract

from app.models import (
    Advertisement,
    AuditEvent,
    Command,
    MonitoringCandidate,
    MonitoringComparison,
    MonitoringIncident,
    MonitoringIncidentComparison,
    MonitoringObservation,
    MonitoringRegistrySnapshot,
    RiskFactor,
    Signal,
    TelegramNotification,
    User,
    utcnow,
)

PREFIX = '/api/v1/monitoring'
IDENTITY = {'name': 'DEMO Новый ЖК', 'city': 'Өскемен', 'address': 'DEMO ул. Тестовая, 1', 'phase': '1'}


@pytest.fixture(autouse=True)
def isolated_monitoring_rows(signed):
    yield
    # Only the fixture's random test schema; no public data or pre-existing application rows.
    with signed.app.state.sessions.begin() as db:
        for model in (
            MonitoringIncidentComparison,
            MonitoringIncident,
            MonitoringComparison,
            MonitoringObservation,
            MonitoringRegistrySnapshot,
            MonitoringCandidate,
        ):
            db.execute(delete(model))


def post(client, path, payload, key=None):
    return client.post(PREFIX + path, json=payload, headers=mutation_headers(client, key))


def concurrent_posts(signed, jobs):
    headers = mutation_headers(signed)
    cookies = dict(signed.cookies)

    def send(job):
        path, body = job
        with TestClient(signed.app, base_url='http://localhost:3000') as client:
            client.cookies.update(cookies)
            return client.post(PREFIX + path, json=body, headers=headers | {'Idempotency-Key': str(uuid4())})

    with ThreadPoolExecutor(max_workers=len(jobs)) as pool:
        return list(pool.map(send, jobs))


def advertisement(client, *, is_demo=True, published=True):
    with client.app.state.sessions.begin() as db:
        actor = db.scalar(select(User).where(User.role == 'analyst'))
        row = Advertisement(
            source_label='DEMO monitoring test',
            original_text='DEMO Продажа квартиры',
            published_at=utcnow() - timedelta(days=2) if published else None,
            created_by=actor.id,
            is_demo=is_demo,
        )
        db.add(row)
        db.flush()
        return str(row.id)


def candidate(client, *, ad=None, is_demo=True, published=True, **identity):
    ad_id = ad or advertisement(client, is_demo=is_demo, published=published)
    response = post(
        client, '/candidates', IDENTITY | identity | {'advertisement_id': ad_id, 'reason': 'DEMO ручная идентификация'}
    )
    assert response.status_code == 201, response.text
    return response.json(), ad_id


def snapshot_payload(entries=None, **updates):
    now = utcnow()
    return {
        'label': 'DEMO проверенный список ' + uuid4().hex,
        'city': IDENTITY['city'],
        'is_demo': True,
        'coverage_from': (now - timedelta(days=10)).isoformat(),
        'coverage_until': now.isoformat(),
        'expires_at': (now + timedelta(days=3)).isoformat(),
        'complete': True,
        'entries': entries or [],
        'reason': 'DEMO фиктивные записи для теста',
    } | updates


def snapshot(client, entries=None, **updates):
    response = post(client, '/registry-snapshots', snapshot_payload(entries, **updates))
    assert response.status_code == 201, response.text
    return response.json()


def entry(**updates):
    return (
        IDENTITY
        | {
            'mechanism': 'GUARANTEE',
            'document_number': 'DEMO-001',
            'valid_from': (utcnow() - timedelta(days=20)).isoformat(),
            'valid_until': None,
            'status': 'ACTIVE',
        }
        | updates
    )


def compare(client, row, ad, registry=None, key=None, **updates):
    return post(
        client,
        f'/candidates/{row["id"]}/compare',
        {
            'expected_revision': row['revision'],
            'advertisement_id': ad,
            'snapshot_id': registry['id'] if registry else None,
            'reason': 'DEMO сверка',
        }
        | updates,
        key,
    )


def detail(client, row):
    response = client.get(PREFIX + '/candidates/' + row['id'])
    assert response.status_code == 200, response.text
    return response.json()


def test_candidate_without_property_and_safe_identity_dedup(signed):
    unique = 'DEMO Identity ' + uuid4().hex
    row, ad = candidate(signed, name=unique)
    repeated, _ = candidate(signed, ad=ad, name=unique.upper())
    assert repeated['id'] == row['id'] and repeated['revision'] == 1
    second, other_ad = candidate(signed, name=unique)
    assert second['id'] == row['id'] and second['revision'] == 2
    assert len(detail(signed, row)['advertisements']) == 2
    incomplete1, _ = candidate(signed, name=unique, phase=None)
    incomplete2, _ = candidate(signed, name=unique, phase=None)
    assert incomplete1['id'] != incomplete2['id']
    different_phase, _ = candidate(signed, name=unique, phase='2')
    assert different_phase['id'] != row['id']
    assert compare(signed, second, other_ad).json()['result'] == 'REGISTRY_UNAVAILABLE'


@pytest.mark.parametrize(
    ('identity', 'published', 'entries', 'registry_updates', 'expected'),
    [
        ({}, True, [entry()], {}, 'MATCHED_APPLICABLE_RECORD'),
        ({}, True, [], {}, 'NO_MATCH_IN_APPROVED_SNAPSHOT'),
        ({}, True, [entry(phase='2')], {}, 'RECORD_SCOPE_OR_STATUS_CONFLICT'),
        ({}, True, [entry(status='REVOKED')], {}, 'RECORD_SCOPE_OR_STATUS_CONFLICT'),
        (
            {},
            True,
            [entry(valid_until=(utcnow() - timedelta(days=3)).isoformat())],
            {},
            'RECORD_SCOPE_OR_STATUS_CONFLICT',
        ),
        ({}, True, [entry(city='Алматы')], {}, 'NO_MATCH_IN_APPROVED_SNAPSHOT'),
        ({'address': None}, True, [], {}, 'ENTITY_AMBIGUOUS'),
        ({}, False, [], {}, 'COVERAGE_OR_DATE_UNKNOWN'),
        ({}, True, [], {'complete': False}, 'COVERAGE_OR_DATE_UNKNOWN'),
        ({}, True, [], {'expires_at': (utcnow() - timedelta(seconds=1)).isoformat()}, 'COVERAGE_OR_DATE_UNKNOWN'),
        ({}, True, [], {'coverage_from': (utcnow() - timedelta(days=1)).isoformat()}, 'COVERAGE_OR_DATE_UNKNOWN'),
        ({}, True, [], {'city': 'Алматы'}, 'COVERAGE_OR_DATE_UNKNOWN'),
    ],
)
def test_conservative_comparison_outcomes(signed, identity, published, entries, registry_updates, expected):
    row, ad = candidate(signed, published=published, **identity)
    registry = snapshot(signed, entries, **registry_updates)
    response = compare(signed, row, ad, registry)
    assert response.status_code == 200, response.text
    assert response.json()['result'] == expected
    assert response.json()['identity_snapshot']['published_at'] is not None or not published
    cases = detail(signed, row)['incidents']
    assert bool(cases) == (expected in {'NO_MATCH_IN_APPROVED_SNAPSHOT', 'RECORD_SCOPE_OR_STATUS_CONFLICT'})


def test_real_candidate_never_uses_demo_registry(signed):
    row, ad = candidate(signed, is_demo=False, name='REAL Test ' + uuid4().hex)
    assert row['is_demo'] is False
    assert compare(signed, row, ad).json()['result'] == 'REGISTRY_UNAVAILABLE'
    response = compare(signed, row, ad, snapshot(signed))
    assert response.status_code == 422
    response = post(signed, '/registry-snapshots', snapshot_payload(is_demo=False))
    assert response.status_code == 422
    assert detail(signed, row)['incidents'] == []


def test_comparison_idempotency_incident_dedup_and_resnapshot(signed):
    row, ad = candidate(signed, name='DEMO resnapshot ' + uuid4().hex)
    registry = snapshot(signed)
    first = compare(signed, row, ad, registry)
    assert first.status_code == 200
    repeated = compare(signed, row, ad, registry)
    assert repeated.json()['id'] == first.json()['id']
    before = detail(signed, row)
    assert before['candidate']['revision'] == row['revision']
    assert len(before['comparisons']) == len(before['incidents']) == 1
    updated = snapshot(signed)
    another = compare(signed, row, ad, updated)
    after = detail(signed, row)
    assert another.json()['id'] != first.json()['id']
    assert len(after['incidents']) == 1 and after['incidents'][0]['revision'] == 2
    assert len(after['incidents'][0]['history']) == 2
    with signed.app.state.sessions() as db:
        assert (
            db.scalar(
                select(func.count())
                .select_from(MonitoringIncidentComparison)
                .where(MonitoringIncidentComparison.incident_id == UUID(after['incidents'][0]['id']))
            )
            == 2
        )


def test_review_stale_closed_and_no_reopen_from_same_observation(signed):
    row, ad = candidate(signed, name='DEMO closure ' + uuid4().hex)
    registry = snapshot(signed)
    compare(signed, row, ad, registry)
    case = detail(signed, row)['incidents'][0]
    body = {'expected_revision': case['revision'], 'state': 'IN_REVIEW', 'reason': 'DEMO взято в работу'}
    key = uuid4()
    reviewed = post(signed, f'/incidents/{case["id"]}/review', body, key)
    assert reviewed.status_code == 200
    assert post(signed, f'/incidents/{case["id"]}/review', body, key).json() == reviewed.json()
    assert post(signed, f'/incidents/{case["id"]}/review', body).status_code == 409
    closing = body | {'expected_revision': reviewed.json()['revision'], 'state': 'CLOSED'}
    assert post(signed, f'/incidents/{case["id"]}/review', closing).status_code == 422
    closed = post(signed, f'/incidents/{case["id"]}/review', closing | {'close_reason': 'NOT_APPLICABLE'})
    assert closed.status_code == 200
    assert (
        post(
            signed, f'/incidents/{case["id"]}/review', body | {'expected_revision': closed.json()['revision']}
        ).status_code
        == 409
    )
    compare(signed, row, ad, registry)
    assert len(detail(signed, row)['incidents']) == 1
    assert detail(signed, row)['incidents'][0]['state'] == 'CLOSED'
    compare(signed, row, ad, snapshot(signed))
    assert len(detail(signed, row)['incidents']) == 2


def test_new_matching_registry_never_silently_closes_case(signed):
    name = 'DEMO match later ' + uuid4().hex
    row, ad = candidate(signed, name=name)
    compare(signed, row, ad, snapshot(signed))
    original = detail(signed, row)['incidents'][0]
    registry = snapshot(signed, [entry(name=name)])
    result = compare(signed, row, ad, registry)
    assert result.json()['result'] == 'MATCHED_APPLICABLE_RECORD'
    assert detail(signed, row)['incidents'][0] == original


def test_expiry_requires_new_result_and_preserves_prior_snapshot(signed, monkeypatch):
    row, ad = candidate(signed, name='DEMO expiry ' + uuid4().hex)
    registry = snapshot(signed)
    first = compare(signed, row, ad, registry).json()
    from datetime import datetime

    later = datetime.fromisoformat(registry['expires_at']) + timedelta(seconds=1)
    monkeypatch.setattr('app.api.monitoring.utcnow', lambda: later)
    second = compare(signed, row, ad, registry).json()
    assert second['result'] == 'COVERAGE_OR_DATE_UNKNOWN' and second['id'] != first['id']
    assert len(detail(signed, row)['comparisons']) == 2
    with signed.app.state.sessions() as db:
        saved = db.get(MonitoringRegistrySnapshot, UUID(registry['id']))
        assert saved.sha256 == registry['sha256'] and saved.entries == registry['entries']


def test_csrf_auth_roles_and_validation(signed, settings):
    row, ad = candidate(signed)
    body = IDENTITY | {'advertisement_id': ad, 'reason': 'DEMO'}
    assert signed.post(PREFIX + '/candidates', json=body).status_code in {403, 422}
    assert post(signed, '/candidates', body | {'name': '  '}).status_code == 422
    assert post(signed, '/candidates', body | {'is_demo': True}).status_code == 422
    assert compare(signed, row, advertisement(signed)).status_code == 422
    assert compare(signed, row, ad, expected_revision=999).status_code == 409
    assert post(signed, '/registry-snapshots', snapshot_payload(coverage_from='2026-01-01T00:00:00')).status_code == 422
    with signed.app.state.sessions.begin() as db:
        actor = db.scalar(select(User).where(User.username == settings.bootstrap_analyst_username))
        actor.role = 'viewer'
    try:
        assert signed.get(PREFIX + '/candidates').status_code == 200
        assert post(signed, '/candidates', body).status_code == 403
        assert compare(signed, row, ad).status_code == 403
        assert post(signed, '/registry-snapshots', snapshot_payload()).status_code == 403
    finally:
        with signed.app.state.sessions.begin() as db:
            actor = db.scalar(select(User).where(User.username == settings.bootstrap_analyst_username))
            actor.role = 'analyst'


def test_command_payload_conflict_and_atomic_rollback(signed, monkeypatch):
    ad = advertisement(signed)
    body = IDENTITY | {'advertisement_id': ad, 'name': 'DEMO Atomic ' + uuid4().hex, 'reason': 'DEMO'}
    key = uuid4()
    first = post(signed, '/candidates', body, key)
    assert first.status_code == 201
    assert post(signed, '/candidates', body, key).json() == first.json()
    assert post(signed, '/candidates', body | {'reason': 'другая причина'}, key).status_code == 409
    row = first.json()
    registry = snapshot(signed)

    def fail(*_):
        raise RuntimeError('injected rollback')

    monkeypatch.setattr('app.api.monitoring.attach_incident', fail)
    response = compare(signed, row, ad, registry)
    assert response.status_code == 500
    with signed.app.state.sessions() as db:
        assert (
            db.scalar(
                select(func.count())
                .select_from(MonitoringComparison)
                .where(MonitoringComparison.candidate_id == UUID(row['id']))
            )
            == 0
        )


def test_no_risk_signal_telegram_mutation(signed):
    row, ad = candidate(signed, name='DEMO side effects ' + uuid4().hex)
    tables = (RiskFactor, Signal, TelegramNotification)
    with signed.app.state.sessions() as db:
        before = [db.scalar(select(func.count()).select_from(model)) for model in tables]
    compare(signed, row, ad, snapshot(signed))
    case = detail(signed, row)['incidents'][0]
    assert (
        post(
            signed,
            f'/incidents/{case["id"]}/review',
            {'expected_revision': 1, 'state': 'CLOSED', 'close_reason': 'NOT_APPLICABLE', 'reason': 'DEMO проверено'},
        ).status_code
        == 200
    )
    with signed.app.state.sessions() as db:
        assert before == [db.scalar(select(func.count()).select_from(model)) for model in tables]
        events = list(db.scalars(select(AuditEvent).where(AuditEvent.entity_id == UUID(case['id']))))
        assert len(events) == 2 and all(event.reason and event.actor_id and event.request_id for event in events)


def test_pagination_filters_escaped_and_concurrent_dedup(signed):
    name = 'DEMO Concurrent %_ ' + uuid4().hex
    ad = advertisement(signed)
    body = IDENTITY | {'advertisement_id': ad, 'name': name, 'reason': 'DEMO concurrent'}
    results = concurrent_posts(signed, [('/candidates', body), ('/candidates', body)])
    assert [result.status_code for result in results] == [201, 201], [result.text for result in results]
    assert results[0].json()['id'] == results[1].json()['id']
    listed = signed.get(PREFIX + '/candidates', params={'q': name, 'is_demo': True, 'page_size': 1}).json()
    assert listed['total'] == len(listed['items']) == 1
    assert signed.get(PREFIX + '/candidates', params={'q': name, 'is_demo': False}).json()['total'] == 0
    assert signed.get(PREFIX + '/candidates', params={'page_size': 101}).status_code == 422
    row = results[0].json()
    registry = snapshot(signed)
    compare_body = {'expected_revision': 1, 'advertisement_id': ad, 'snapshot_id': registry['id'], 'reason': 'DEMO'}
    path = f'/candidates/{row["id"]}/compare'
    comparisons = concurrent_posts(signed, [(path, compare_body), (path, compare_body)])
    assert all(response.status_code == 200 for response in comparisons)
    assert comparisons[0].json()['id'] == comparisons[1].json()['id']
    assert len(detail(signed, row)['incidents']) == 1


def test_attach_compare_and_review_concurrent_without_lock_cycle(signed):
    name = 'DEMO concurrent review ' + uuid4().hex
    row, ad = candidate(signed, name=name)
    registry = snapshot(signed)
    compare(signed, row, ad, registry)
    case = detail(signed, row)['incidents'][0]
    updated = snapshot(signed)
    comparing = {'expected_revision': 1, 'advertisement_id': ad, 'snapshot_id': updated['id'], 'reason': 'DEMO'}
    attaching = IDENTITY | {'name': name, 'advertisement_id': ad, 'reason': 'DEMO'}
    reviewing = {'expected_revision': case['revision'], 'state': 'IN_REVIEW', 'reason': 'DEMO'}
    responses = concurrent_posts(
        signed,
        [
            ('/candidates', attaching),
            (f'/candidates/{row["id"]}/compare', comparing),
            (f'/incidents/{case["id"]}/review', reviewing),
        ],
    )
    assert [responses[0].status_code, responses[1].status_code] == [201, 200]
    assert responses[2].status_code in {200, 409}
    saved = detail(signed, row)
    assert saved['candidate']['revision'] == 1 and len(saved['incidents']) == 1
    assert saved['incidents'][0]['revision'] in {2, 3}


def test_monitoring_contract_and_unauthenticated_read(signed):
    row, ad = candidate(signed, name='DEMO contract ' + uuid4().hex)
    registry = snapshot(signed)
    comparison = compare(signed, row, ad, registry).json()
    saved = detail(signed, row)
    for value, schema in [
        (row, 'CandidateOut'),
        (registry, 'RegistrySnapshotOut'),
        (comparison, 'ComparisonOut'),
        (saved, 'CandidateDetailOut'),
        (saved['incidents'][0], 'IncidentOut'),
    ]:
        contract(value, schema)
    assert saved['advertisement_total'] == len(saved['advertisements']) == 1
    with TestClient(signed.app, base_url='http://localhost:3000') as anonymous:
        assert anonymous.get(PREFIX + '/candidates').status_code == 401
        assert anonymous.get(PREFIX + '/registry-snapshots').status_code == 401
        assert anonymous.get(PREFIX + '/incidents').status_code == 401


def test_bounded_observations_have_explicit_total_and_stable_order(signed):
    row, _ = candidate(signed, name='DEMO bounded ' + uuid4().hex)
    with signed.app.state.sessions.begin() as db:
        candidate_row = db.get(MonitoringCandidate, UUID(row['id']))
        actor_id = candidate_row.created_by
        for offset in range(100):
            ad = Advertisement(
                source_label='DEMO bounded',
                original_text='DEMO',
                created_by=actor_id,
                is_demo=True,
                captured_at=utcnow() - timedelta(days=offset + 1),
            )
            db.add(ad)
            db.flush()
            db.add(
                MonitoringObservation(
                    candidate_id=candidate_row.id,
                    advertisement_id=ad.id,
                    advertisement_revision=ad.revision,
                    created_by=actor_id,
                    reason='DEMO bounded fixture',
                )
            )
        candidate_row.revision += 100
    saved = detail(signed, row)
    repeated = detail(signed, row)
    assert saved['advertisement_total'] == 101 and len(saved['advertisements']) == 100
    assert [ad['id'] for ad in saved['advertisements']] == [ad['id'] for ad in repeated['advertisements']]
    assert saved['advertisements'][-1]['captured_at'] > (utcnow() - timedelta(days=100)).isoformat()


def test_explicit_demo_strictness_snapshot_validation_and_alternative_basis(signed):
    for invalid in (False, 1, 'true', None):
        assert post(signed, '/registry-snapshots', snapshot_payload(is_demo=invalid)).status_code == 422
    assert post(signed, '/registry-snapshots', snapshot_payload([entry()] * 201)).status_code == 422
    assert post(signed, '/registry-snapshots', snapshot_payload([entry(document_number='   ')])).status_code == 422
    row, ad = candidate(signed)
    registry = snapshot(signed, [entry(), entry(mechanism='MIO_PERMIT', status='REVOKED')])
    comparison = compare(signed, row, ad, registry).json()
    assert comparison['result'] == 'MATCHED_APPLICABLE_RECORD'
    assert len(comparison['matched_entries']) == 1
    assert comparison['matched_entries'][0]['mechanism'] == 'GUARANTEE'
    # There is no update endpoint: new registry versions never rewrite the previous payload.
    assert signed.put(PREFIX + '/registry-snapshots/' + registry['id'], json={}).status_code == 404
    snapshot(signed, [entry(status='REVOKED')])
    with signed.app.state.sessions() as db:
        old_snapshot = db.get(MonitoringRegistrySnapshot, UUID(registry['id']))
        assert old_snapshot.entries == registry['entries'] and old_snapshot.sha256 == registry['sha256']


@pytest.mark.parametrize('statuses', [('ACTIVE', 'REVOKED'), ('REVOKED', 'ACTIVE'), ('ACTIVE', 'ACTIVE')])
def test_duplicate_document_identity_rejected_atomically(signed, statuses):
    first = entry(status=statuses[0])
    second = first | {
        'status': statuses[1],
        'document_number': '  demo-001  ',
        'name': IDENTITY['name'].upper(),
        'address': IDENTITY['address'].replace(' ', '  '),
    }
    if statuses == ('ACTIVE', 'ACTIVE'):
        second = first.copy()
    tables = (MonitoringRegistrySnapshot, Command, AuditEvent)
    with signed.app.state.sessions() as db:
        before = [db.scalar(select(func.count()).select_from(model)) for model in tables]
    response = post(signed, '/registry-snapshots', snapshot_payload([first, second]))
    assert response.status_code == 422, response.text
    with signed.app.state.sessions() as db:
        assert before == [db.scalar(select(func.count()).select_from(model)) for model in tables]
