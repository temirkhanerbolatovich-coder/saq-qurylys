from uuid import UUID, uuid4

import pytest
from conftest import mutation_headers
from fastapi.testclient import TestClient
from test_candidate_links import link_payload, target_dossier
from test_monitoring import candidate, concurrent_posts, detail, dossier_payload, post
from test_monitoring import isolated_monitoring_rows as isolated_monitoring_rows

from app.api import monitoring as monitoring_api
from app.models import Property, User

PREFIX = '/api/v1/monitoring'


def linked_candidate(client):
    row, ad = candidate(client, name='DEMO correction ' + uuid4().hex)
    target = target_dossier(client)
    linked = post(client, f'/candidates/{row["id"]}/link-dossier', link_payload(row, target))
    assert linked.status_code == 200, linked.text
    return linked.json(), ad, target


def unlink_payload(row, target, **updates):
    return {
        'expected_revision': row['revision'],
        **target,
        'unlink_confirmed': True,
        'reason': 'DEMO ошибка идентификации: перепутана очередь',
    } | updates


def history(client, row, **params):
    response = client.get(PREFIX + f'/candidates/{row["id"]}/dossier-history', params=params)
    assert response.status_code == 200, response.text
    return response.json()


def test_unlink_then_separate_relink_preserves_history_and_dossier_facts(signed):
    row, ad, target = linked_candidate(signed)
    old = signed.get('/api/v1/properties/' + target['property_id']).json()
    ad_before = signed.get('/api/v1/advertisements/' + ad).json()
    original_link = history(signed, row)['items'][0]
    key = str(uuid4())
    body = unlink_payload(row, target)
    path = f'/candidates/{row["id"]}/unlink-dossier'
    response = post(signed, path, body, key)
    assert response.status_code == 200, response.text
    unlinked = response.json()
    assert unlinked['property_id'] is None and unlinked['property_link_kind'] is None
    assert unlinked['revision'] == row['revision'] + 1
    assert post(signed, path, body, key).json() == unlinked
    assert post(signed, path, body | {'reason': 'другое'}, key).status_code == 409
    assert post(signed, path, body).status_code == 409
    after = signed.get('/api/v1/properties/' + target['property_id']).json()
    assert after['linked_candidate_count'] == 0
    assert after['property']['revision'] == old['property']['revision']
    for field in ['factors', 'legal_bases', 'advertisement_ids', 'source_candidate_id']:
        assert after[field] == old[field]
    assert signed.get('/api/v1/advertisements/' + ad).json() == ad_before
    events = history(signed, row)
    assert events['total'] == 2
    cancelled = events['items'][0]
    assert cancelled['action'] == 'MONITORING_DOSSIER_UNLINKED'
    assert cancelled['details']['previous_link_event_id'] == original_link['id']
    assert cancelled['details']['before_property_id'] == target['property_id']
    assert cancelled['actor_display_name'] and cancelled['reason'] == body['reason']
    property_events = signed.get('/api/v1/properties/' + target['property_id'] + '/audit').json()['items']
    assert any(event['action'] == 'PROPERTY_CANDIDATE_UNLINKED' for event in property_events)
    next_target = target_dossier(signed)
    result = post(signed, f'/candidates/{row["id"]}/link-dossier', link_payload(unlinked, next_target))
    assert result.status_code == 200, result.text
    # A replay returns its historical answer and must not undo the later link.
    assert post(signed, path, body, key).json() == unlinked
    assert detail(signed, row)['candidate']['property_id'] == next_target['property_id']
    assert history(signed, row, page_size=1)['total'] == 3
    assert history(signed, row, page_size=1, page=3)['items'][0]['id'] == original_link['id']
    with signed.app.state.sessions.begin() as db:
        db.get(Property, UUID(target['property_id'])).name = 'DEMO переименованное досье'
    assert (
        history(signed, row, page_size=1, page=3)['items'][0]['details']['property_identity']['name']
        == old['property']['name']
    )


@pytest.mark.parametrize(
    ('updates', 'status'),
    [
        ({'expected_revision': 99}, 409),
        ({'expected_property_revision': 99}, 409),
        ({'property_id': str(uuid4())}, 409),
        ({'unlink_confirmed': False}, 422),
        ({'unlink_confirmed': 1}, 422),
        ({'reason': ' '}, 422),
    ],
)
def test_unlink_validation(signed, updates, status):
    row, _, target = linked_candidate(signed)
    response = post(signed, f'/candidates/{row["id"]}/unlink-dossier', unlink_payload(row, target, **updates))
    assert response.status_code == status, response.text
    assert detail(signed, row)['candidate']['property_id'] == target['property_id']


def test_unlink_keeps_created_origin_and_allows_current_scope_correction(signed):
    row, _ = candidate(signed, name='DEMO protected origin ' + uuid4().hex)
    created = post(signed, f'/candidates/{row["id"]}/dossier', dossier_payload(row)).json()
    target = {'property_id': created['property_id'], 'expected_property_revision': 1}
    assert post(signed, f'/candidates/{row["id"]}/unlink-dossier', unlink_payload(created, target)).status_code == 409
    assert history(signed, row)['items'][0]['action'] == 'MONITORING_DOSSIER_CREATED'
    linked, _, existing = linked_candidate(signed)
    # Even changed city metadata must not trap an incorrect relation.
    with signed.app.state.sessions.begin() as db:
        prop = db.get(Property, UUID(existing['property_id']))
        prop.city = 'DEMO другой город'
        prop.revision += 1
    response = post(
        signed,
        f'/candidates/{linked["id"]}/unlink-dossier',
        unlink_payload(linked, existing, expected_property_revision=2),
    )
    assert response.status_code == 200


def test_unlink_permissions_rollback_and_history_read(signed, monkeypatch):
    row, _, target = linked_candidate(signed)
    path = f'/candidates/{row["id"]}/unlink-dossier'
    body = unlink_payload(row, target)
    with TestClient(signed.app, base_url='http://localhost:3000') as anonymous:
        assert post(anonymous, path, body).status_code == 401
        assert anonymous.get(PREFIX + f'/candidates/{row["id"]}/dossier-history').status_code == 401
    assert signed.get(PREFIX + f'/candidates/{uuid4()}/dossier-history').status_code == 404
    assert post(signed, f'/candidates/{uuid4()}/unlink-dossier', body).status_code == 404
    headers = mutation_headers(signed) | {'X-CSRF-Token': 'x' * 64}
    assert signed.post(PREFIX + path, json=body, headers=headers).status_code == 403
    with signed.app.state.sessions.begin() as db:
        actor = db.get(User, UUID(history(signed, row)['items'][0]['actor_id']))
        actor_id = actor.id
        actor.role = 'viewer'
    try:
        assert history(signed, row)['total'] == 1
        assert post(signed, path, body).status_code == 403
    finally:
        with signed.app.state.sessions.begin() as db:
            db.get(User, actor_id).role = 'analyst'

    def fail(*args):
        raise RuntimeError('injected cancellation audit failure')

    monkeypatch.setattr(monitoring_api, 'audit', fail)
    assert post(signed, path, body).status_code == 500
    assert detail(signed, row)['candidate']['property_id'] == target['property_id']
    assert history(signed, row)['total'] == 1


def test_unlink_concurrency_and_aba_revision(signed):
    row, _, target = linked_candidate(signed)
    body = unlink_payload(row, target)
    path = f'/candidates/{row["id"]}/unlink-dossier'
    responses = concurrent_posts(signed, [(path, body), (path, body)])
    assert sorted(response.status_code for response in responses) == [200, 409]
    current = detail(signed, row)['candidate']
    assert post(signed, f'/candidates/{row["id"]}/link-dossier', link_payload(current, target)).status_code == 200
    assert post(signed, path, body).status_code == 409
