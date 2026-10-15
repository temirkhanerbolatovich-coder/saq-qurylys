from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import timedelta
from uuid import UUID, uuid4

import pytest
from conftest import mutation_headers
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import func, select
from test_analysis import contract
from test_legal_bases import property_id

from app.models import Asset, AuditEvent, Evidence, LegalBasis, Property, RiskFactor, Signal, User, utcnow
from app.signal_dto import DISCLAIMER, SignalCreate, SignalDecisionRequest
from app.signals import comparable_snapshot
from app.storage import save_text


def post(client, path, body, key=None):
    return client.post('/api/v1' + path, json=body, headers=mutation_headers(client, key))


def risk_revision(client, prop):
    return client.get(f'/api/v1/properties/{prop}/risk').json()['summary']['revision']


def create(client, prop=None, previous=None, key=None, **changes):
    prop = prop or property_id(client)
    response = post(
        client,
        '/signals',
        {
            'property_id': prop,
            'expected_risk_revision': risk_revision(client, prop),
            'previous_signal_id': previous,
            **changes,
        },
        key,
    )
    return response


def decide(client, signal, action='CONFIRM', key=None, **changes):
    return post(
        client,
        f'/signals/{signal["id"]}/decision',
        {
            'expected_revision': signal['revision'],
            'expected_risk_revision': signal['risk_snapshot']['revision'],
            'action': action,
            'reason': 'DEMO: проверены источники, даты и ограничения снимка',
            **changes,
        },
        key,
    )


def source(client, settings, prop, *, factor=True):
    with client.app.state.sessions.begin() as db:
        actor = db.scalar(select(User).where(User.role == 'analyst'))
        key, sha, size = save_text(settings.storage_root, 'DEMO: документ коллективного обращения трёх лиц')
        asset = Asset(
            id=uuid4(),
            kind='DOCUMENT',
            mime_type='text/plain',
            byte_size=size,
            sha256=sha,
            storage_key=key,
            is_demo=True,
        )
        db.add(asset)
        db.flush()
        evidence = Evidence(
            id=uuid4(),
            property_id=UUID(prop),
            asset_id=asset.id,
            details={
                'kind': 'COLLECTIVE_APPEAL',
                'description': 'DEMO: три заявителя, отдельная очередь',
                'source_label': 'DEMO документ обращения',
                'source_url': 'https://example.com/demo-appeal',
                'event_at': utcnow().isoformat(),
                'captured_at': asset.captured_at.isoformat(),
                'is_demo': True,
                'created_by': str(actor.id),
                'signatory_count': 3,
                'methodology': 'DEMO: документ, область и коллективность проверены человеком',
            },
        )
        db.add(evidence)
        db.flush()
        if factor:
            db.add(
                RiskFactor(
                    property_id=UUID(prop),
                    code='R4',
                    status='CONFIRMED',
                    as_of=utcnow(),
                    evidence_ids=[str(evidence.id)],
                    reviewed_by=actor.id,
                    reviewed_at=utcnow(),
                    reason='DEMO: проверено коллективное обращение',
                )
            )
        return asset.id, evidence.id, actor.id


@pytest.mark.parametrize('reason', ['', '   ', '\n\t', 'x' * 2001])
def test_decision_requires_meaningful_bounded_reason(reason):
    with pytest.raises(ValidationError):
        SignalDecisionRequest(expected_revision=1, expected_risk_revision=1, action='RETURN', reason=reason)


def test_signal_input_cannot_supply_client_score_or_state():
    with pytest.raises(ValidationError):
        SignalCreate(property_id=uuid4(), expected_risk_revision=1, score=100, state='CONFIRMED')


def test_snapshot_comparison_ignores_only_ephemeral_risk_time():
    before = {'property': {'risk': {'as_of': 'old', 'revision': 1}, 'legal_verification_status': 'VERIFIED_VALID'}}
    after = deepcopy(before)
    after['property']['risk']['as_of'] = 'new'
    assert comparable_snapshot(before) == comparable_snapshot(after)
    assert before['property']['risk']['as_of'] == 'old'
    after['property']['legal_verification_status'] = 'UNKNOWN'
    assert comparable_snapshot(before) != comparable_snapshot(after)


def test_signal_creation_is_draft_server_score_and_read_only_get(signed):
    key = uuid4()
    prop = property_id(signed)
    response = create(signed, prop, key=key)
    assert response.status_code == 201, response.text
    signal = response.json()
    contract(signal, 'Signal')
    assert signal['state'] == 'DRAFT' and not signal['is_stale']
    assert signal['risk_snapshot']['score'] == 0
    assert signal['risk_snapshot']['unknown_codes'] == ['R1', 'R2', 'R3', 'R4', 'R5', 'R6']
    assert signal['pdf_state'] == 'NOT_REQUESTED' and signal['pdf_job_id'] is None
    assert create(signed, prop, key=key).json() == signal
    with signed.app.state.sessions() as db:
        audits = db.scalar(select(func.count()).select_from(AuditEvent))
    for _ in range(2):
        detail = signed.get(f'/api/v1/signals/{signal["id"]}').json()
        contract(detail, 'SignalDetail')
        assert not detail['signal']['is_stale']
        assert detail['snapshot']['disclaimer'] == DISCLAIMER
        assert detail['snapshot']['unknown_information'] and not detail['decisions']
    with signed.app.state.sessions() as db:
        assert db.scalar(select(func.count()).select_from(AuditEvent)) == audits
    reused = create(signed, prop, key=key, expected_risk_revision=99)
    assert reused.status_code == 409


def test_signal_captures_sources_hashes_and_remains_immutable(signed, settings):
    prop = property_id(signed)
    asset_id, evidence_id, actor_id = source(signed, settings, prop)
    response = create(signed, prop)
    assert response.status_code == 201, response.text
    signal = response.json()
    path = f'/api/v1/signals/{signal["id"]}'
    old = signed.get(path).json()
    assert old['snapshot']['property']['risk']['score'] == 15
    assert old['snapshot']['factors'][0]['code'] == 'R4'
    assert old['snapshot']['evidence'][0]['source_url'] == 'https://example.com/demo-appeal'
    assert old['snapshot']['assets'][0]['id'] == str(asset_id)
    assert len(old['snapshot']['assets'][0]['sha256']) == 64
    with signed.app.state.sessions.begin() as db:
        row = db.get(Property, UUID(prop))
        row.name = 'DEMO: новое название после снимка'
        row.revision += 1
        db.scalar(select(RiskFactor).where(RiskFactor.property_id == row.id)).status = 'REJECTED'
        evidence = db.get(Evidence, evidence_id)
        evidence.details = evidence.details | {'description': 'DEMO: более поздние сведения'}
        actor = db.get(User, actor_id)
        prior_name = actor.display_name
        actor.display_name = 'DEMO новое имя проверяющего'
    try:
        after = signed.get(path).json()
        assert after['snapshot'] == old['snapshot']
        assert after['signal']['created_by'] == old['signal']['created_by']
        assert after['signal']['is_stale']
        assert decide(signed, signal, expected_risk_revision=2).status_code == 409
        assert signed.get(path).json()['decisions'] == []
    finally:
        with signed.app.state.sessions.begin() as db:
            db.get(User, actor_id).display_name = prior_name


@pytest.mark.parametrize('action', ['CONFIRM', 'RETURN'])
def test_signal_single_human_decision_idempotency_and_pdf_revision(signed, action):
    signal = create(signed).json()
    key = uuid4()
    response = decide(signed, signal, action, key)
    assert response.status_code == 200, response.text
    detail = response.json()
    contract(detail, 'SignalDetail')
    assert detail['signal']['state'] == ('CONFIRMED' if action == 'CONFIRM' else 'RETURNED')
    assert detail['signal']['revision'] == 2
    assert detail['signal']['pdf_state'] == 'QUEUED' and detail['signal']['pdf_job_id']
    assert len(detail['decisions']) == 1 and detail['decisions'][0]['action'] == action
    assert detail['decisions'][0]['actor']['role'] == 'analyst'
    assert detail['decisions'][0]['decided_at']
    assert decide(signed, signal, action, key).json() == detail
    assert decide(signed, detail['signal'], 'RETURN').status_code == 409
    with signed.app.state.sessions() as db:
        event = db.scalar(
            select(AuditEvent).where(AuditEvent.entity_id == UUID(signal['id']), AuditEvent.old_revision == 1)
        )
        assert event.new_revision == 2 and event.details['decision_id'] == detail['decisions'][0]['id']


def test_signal_rejects_wrong_revisions_and_blank_reason(signed):
    prop = property_id(signed)
    assert create(signed, prop, expected_risk_revision=99).status_code == 409
    signal = create(signed, prop).json()
    assert decide(signed, signal, expected_revision=99).status_code == 409
    assert decide(signed, signal, expected_risk_revision=99).status_code == 409
    assert decide(signed, signal, 'RETURN', reason=' \n ').status_code == 422
    assert signed.get(f'/api/v1/signals/{signal["id"]}').json()['decisions'] == []


def test_signal_version_chain_prevents_forks_and_cross_property_predecessor(signed):
    prop = property_id(signed)
    first = create(signed, prop).json()
    assert create(signed, prop).status_code == 409
    assert create(signed, property_id(signed), previous=first['id']).status_code == 409
    second = create(signed, prop, previous=first['id'])
    assert second.status_code == 201, second.text
    second = second.json()
    assert second['version'] == 2 and second['previous_signal_id'] == first['id']
    assert create(signed, prop, previous=first['id']).status_code == 409
    assert signed.get(f'/api/v1/signals/{first["id"]}').json()['signal']['is_stale']
    assert decide(signed, first).status_code == 409
    latest = create(signed, prop, previous=second['id']).json()
    assert latest['version'] == 3 and not latest['is_stale']
    result = signed.get('/api/v1/signals', params={'property_id': prop, 'is_stale': True, 'page_size': 1}).json()
    contract(result, 'SignalPage')
    assert result['total'] == 2 and len(result['items']) == 1
    assert signed.get('/api/v1/signals', params={'property_id': prop, 'state': 'RETURNED'}).json()['total'] == 0


def test_time_dependent_legal_applicability_stales_signal_without_revision_change(signed, settings, monkeypatch):
    from app import legal

    prop = property_id(signed)
    asset_id, _, _ = source(signed, settings, prop, factor=False)
    now = utcnow()
    with signed.app.state.sessions.begin() as db:
        db.add(
            LegalBasis(
                property_id=UUID(prop),
                details={
                    'mechanism': 'KZHK_GUARANTEE',
                    'document_number': 'DEMO',
                    'document_date': now.date().isoformat(),
                    'issuer': 'DEMO',
                    'asset_id': str(asset_id),
                    'scope_description': 'DEMO точная очередь',
                    'is_demo': True,
                    'captured_at': now.isoformat(),
                    'verification_status': 'VERIFIED_VALID',
                    'revision': 1,
                    'reviewed_by': None,
                    'reviewed_at': now.isoformat(),
                    'applies_from': (now - timedelta(days=1)).isoformat(),
                    'applies_until': (now + timedelta(days=1)).isoformat(),
                },
            )
        )
    signal = create(signed, prop).json()
    assert not signal['is_stale']
    before = signed.get(f'/api/v1/signals/{signal["id"]}').json()['snapshot']
    monkeypatch.setattr(legal, 'utcnow', lambda: now + timedelta(days=2))
    after = signed.get(f'/api/v1/signals/{signal["id"]}').json()
    assert after['signal']['is_stale'] and risk_revision(signed, prop) == signal['risk_snapshot']['revision']
    assert after['snapshot'] == before
    assert decide(signed, signal).status_code == 409


def test_signal_rejects_missing_or_tampered_source(signed, settings):
    prop = property_id(signed)
    asset_id, _, _ = source(signed, settings, prop)
    with signed.app.state.sessions() as db:
        asset = db.get(Asset, asset_id)
        path = settings.storage_root / asset.storage_key
    original = path.read_bytes()
    path.write_bytes(b'DEMO tampered')
    try:
        assert create(signed, prop).status_code == 409
        with signed.app.state.sessions() as db:
            assert not db.scalar(select(Signal).where(Signal.property_id == UUID(prop)))
    finally:
        path.write_bytes(original)


def test_viewer_can_read_but_cannot_create_or_decide(signed, settings):
    signal = create(signed).json()
    with signed.app.state.sessions.begin() as db:
        actor = db.scalar(select(User).where(User.username == settings.bootstrap_analyst_username))
        actor_id = actor.id
        actor.role = 'viewer'
    try:
        assert signed.get('/api/v1/signals').status_code == 200
        assert signed.get(f'/api/v1/signals/{signal["id"]}').status_code == 200
        assert create(signed).status_code == 403
        assert decide(signed, signal).status_code == 403
    finally:
        with signed.app.state.sessions.begin() as db:
            db.get(User, actor_id).role = 'analyst'


def test_signal_mutations_require_login_and_csrf(client, signed):
    signal = create(signed).json()
    assert (
        signed.post(
            '/api/v1/signals', json={'property_id': signal['property_id'], 'expected_risk_revision': 1}
        ).status_code
        == 422
    )
    # A fresh client has no session; reading signal metadata is also protected.
    with TestClient(signed.app, base_url='http://localhost:3000') as anonymous:
        assert anonymous.get('/api/v1/signals').status_code == 401
        assert anonymous.get(f'/api/v1/signals/{signal["id"]}').status_code == 401


@pytest.mark.parametrize('command', ['decision', 'version'])
def test_concurrent_signal_commands_serialize_on_property(signed, monkeypatch, command):
    import threading

    from app.api import signals

    signal = create(signed).json()
    barrier, original = threading.Barrier(2), signals.property_locked

    def locked(db, id):
        barrier.wait(timeout=10)
        return original(db, id)

    monkeypatch.setattr(signals, 'property_locked', locked)
    headers = mutation_headers(signed)
    cookies = dict(signed.cookies)
    if command == 'decision':
        path = f'/signals/{signal["id"]}/decision'
        body = {
            'expected_revision': 1,
            'expected_risk_revision': 1,
            'action': 'CONFIRM',
            'reason': 'DEMO одновременное решение',
        }
    else:
        path = '/signals'
        body = {'property_id': signal['property_id'], 'expected_risk_revision': 1, 'previous_signal_id': signal['id']}

    def send(_):
        with TestClient(signed.app, base_url='http://localhost:3000') as client:
            client.cookies.update(cookies)
            return client.post('/api/v1' + path, json=body, headers=headers | {'Idempotency-Key': str(uuid4())})

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(send, range(2)))
    assert sorted(response.status_code for response in responses) == [200 if command == 'decision' else 201, 409]
