from uuid import UUID, uuid4

import pytest
from conftest import mutation_headers
from fastapi.testclient import TestClient
from sqlalchemy import select
from test_monitoring import candidate, concurrent_posts, detail, dossier_payload, post
from test_monitoring import isolated_monitoring_rows as isolated_monitoring_rows

from app.api import monitoring as monitoring_api
from app.models import AuditEvent, Developer, Property, User

PREFIX = '/api/v1/monitoring'


def target_dossier(client, *, city='Өскемен', is_demo=True):
    with client.app.state.sessions.begin() as db:
        developer = Developer(name='DEMO link developer ' + uuid4().hex, is_demo=is_demo)
        db.add(developer)
        db.flush()
        prop = Property(
            name='DEMO link object ' + uuid4().hex,
            city=city,
            address='DEMO адрес 77',
            developer_id=developer.id,
            is_demo=is_demo,
            level='PHASE',
        )
        db.add(prop)
        db.flush()
        return {'property_id': str(prop.id), 'expected_property_revision': prop.revision}


def link_payload(row, target, **updates):
    return {
        'expected_revision': row['revision'],
        **target,
        'identity_checked': True,
        'reason': 'DEMO сверены адрес и очередь по источникам',
    } | updates


def test_link_many_to_one_preserves_origin_and_decisions(signed):
    origin, _ = candidate(signed, name='DEMO link origin ' + uuid4().hex)
    created = post(signed, f'/candidates/{origin["id"]}/dossier', dossier_payload(origin)).json()
    prop_id = created['property_id']
    before = signed.get('/api/v1/properties/' + prop_id).json()
    target = {'property_id': prop_id, 'expected_property_revision': before['property']['revision']}
    linked_ids = []
    for _ in range(2):
        row, ad = candidate(signed, name='DEMO linked ' + uuid4().hex)
        original_ad = signed.get('/api/v1/advertisements/' + ad).json()
        body = link_payload(row, target)
        path = f'/candidates/{row["id"]}/link-dossier'
        key = str(uuid4())
        response = post(signed, path, body, key)
        assert response.status_code == 200, response.text
        linked = response.json()
        assert linked['property_link_kind'] == 'LINKED' and linked['property_id'] == prop_id
        assert linked['revision'] == row['revision'] + 1
        assert post(signed, path, body, key).json() == linked
        assert post(signed, path, body | {'reason': 'другое'}, key).status_code == 409
        assert post(signed, path, body | {'expected_revision': linked['revision']}).status_code == 409
        assert post(signed, f'/candidates/{row["id"]}/dossier', dossier_payload(linked)).status_code == 409
        assert signed.get('/api/v1/advertisements/' + ad).json() == original_ad
        linked_ids.append(row['id'])
    after = signed.get('/api/v1/properties/' + prop_id).json()
    assert after['source_candidate_id'] == origin['id']
    assert after['linked_candidate_count'] == 2
    assert after['property']['revision'] == before['property']['revision']
    for key in ['factors', 'legal_bases', 'advertisement_ids']:
        assert after[key] == before[key]
    assert after['property']['risk']['confirmed_codes'] == []
    listed = signed.get(PREFIX + '/candidates', params={'property_id': prop_id, 'page_size': 1}).json()
    assert listed['total'] == 3 and len(listed['items']) == 1
    assert signed.get(PREFIX + '/candidates', params={'property_id': str(uuid4())}).json()['total'] == 0
    with signed.app.state.sessions() as db:
        events = list(db.scalars(select(AuditEvent).where(AuditEvent.entity_id == UUID(linked_ids[0]))))
        decision = next(event for event in events if event.action == 'MONITORING_DOSSIER_LINKED')
        assert decision.details['property_revision'] == target['expected_property_revision']
        assert decision.details['candidate_identity']['city'] == 'Өскемен'
        assert decision.details['observations'][0]['advertisement_revision'] >= 1


@pytest.mark.parametrize(
    ('updates', 'status'),
    [
        ({'expected_revision': 99}, 409),
        ({'expected_property_revision': 99}, 409),
        ({'identity_checked': False}, 422),
        ({'identity_checked': 1}, 422),
        ({'reason': '  '}, 422),
        ({'property_id': str(uuid4())}, 404),
    ],
)
def test_link_validation(signed, updates, status):
    row, _ = candidate(signed, name='DEMO link validation ' + uuid4().hex)
    response = post(
        signed, f'/candidates/{row["id"]}/link-dossier', link_payload(row, target_dossier(signed), **updates)
    )
    assert response.status_code == status, response.text
    assert detail(signed, row)['candidate']['property_id'] is None


def test_link_city_mode_role_csrf_and_rollback(signed, monkeypatch):
    row, _ = candidate(signed, name='DEMO link security ' + uuid4().hex)
    path = f'/candidates/{row["id"]}/link-dossier'
    for target in [target_dossier(signed, city='DEMO другой город'), target_dossier(signed, is_demo=False)]:
        assert post(signed, path, link_payload(row, target)).status_code == 422
    body = link_payload(row, target_dossier(signed))
    headers = mutation_headers(signed) | {'X-CSRF-Token': 'x' * 64}
    assert signed.post(PREFIX + path, json=body, headers=headers).status_code == 403
    with signed.app.state.sessions.begin() as db:
        actor = db.scalar(select(User).where(User.role == 'analyst'))
        actor_id = actor.id
        actor.role = 'viewer'
    try:
        assert post(signed, path, body).status_code == 403
    finally:
        with signed.app.state.sessions.begin() as db:
            db.get(User, actor_id).role = 'analyst'

    def fail(*args):
        raise RuntimeError('injected link audit failure')

    monkeypatch.setattr(monitoring_api, 'audit', fail)
    assert post(signed, path, body).status_code == 500
    result = detail(signed, row)['candidate']
    assert result['property_id'] is None and result['revision'] == row['revision']
    assert signed.get('/api/v1/properties/' + body['property_id']).json()['linked_candidate_count'] == 0


def test_link_concurrent_commands(signed):
    row, _ = candidate(signed, name='DEMO link race ' + uuid4().hex)
    results = concurrent_posts(
        signed, [(f'/candidates/{row["id"]}/link-dossier', link_payload(row, target_dossier(signed))) for _ in range(2)]
    )
    assert sorted(response.status_code for response in results) == [200, 409]
    target = target_dossier(signed)
    rows = [candidate(signed, name='DEMO shared ' + uuid4().hex)[0] for _ in range(2)]
    results = concurrent_posts(signed, [(f'/candidates/{r["id"]}/link-dossier', link_payload(r, target)) for r in rows])
    assert [response.status_code for response in results] == [200, 200]
    prop = signed.get('/api/v1/properties/' + target['property_id']).json()
    assert prop['linked_candidate_count'] == 2 and prop['source_candidate_id'] is None


def test_link_real_scope_missing_candidate_and_authentication(signed):
    row, _ = candidate(signed, name='DEMO real-scope test ' + uuid4().hex, is_demo=False)
    body = link_payload(row, target_dossier(signed, is_demo=False))
    with TestClient(signed.app, base_url='http://localhost:3000') as anonymous:
        assert post(anonymous, f'/candidates/{row["id"]}/link-dossier', body).status_code == 401
    assert post(signed, f'/candidates/{uuid4()}/link-dossier', body).status_code == 404
    response = post(signed, f'/candidates/{row["id"]}/link-dossier', body)
    assert response.status_code == 200 and response.json()['is_demo'] is False
