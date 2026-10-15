import json
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from uuid import UUID, uuid4

import pytest
from conftest import mutation_headers
from fastapi.testclient import TestClient
from sqlalchemy import select
from test_analysis import contract, reviewed_evidence
from test_legal_bases import create as create_basis
from test_legal_bases import property_id, review_body

from app.models import Advertisement, Asset, User, utcnow
from app.seed import demo_id

TARGET = '2020-01-10T12:00:00+05:00'
DOCUMENT_AT = '2020-01-12T12:00:00+05:00'
SCOPE = 'DEMO: только указанная очередь, все три проектных механизма'
MECHANISMS = ('KZHK_GUARANTEE', 'BANK_WITH_MIO_PERMIT', 'FRAME_WITH_MIO_PERMIT')


def checks(result='DOCUMENTED_ABSENT'):
    return [
        {'mechanism': mechanism, 'result': result, 'reason': f'DEMO: проверены документы {mechanism}'}
        for mechanism in MECHANISMS
    ]


def post(client, path, body, key=None):
    return client.post('/api/v1' + path, json=body, headers=mutation_headers(client, key))


def upload(client, prop, *, legal_checks=None, key=None, content=b'DEMO absence review', **changes):
    return client.post(
        '/api/v1/assets/upload',
        files={'file': ('absence.txt', content, 'text/plain')},
        data={
            'property_id': prop,
            'purpose': 'LEGAL_ABSENCE_REVIEW',
            'source_label': 'DEMO проверка оснований',
            'source_url': 'https://example.com/absence',
            'event_at': DOCUMENT_AT,
            'absence_as_of': TARGET,
            'scope_description': SCOPE,
            'legal_checks': json.dumps(checks() if legal_checks is None else legal_checks, ensure_ascii=False),
            'methodology': 'DEMO: сверены документы по каждому механизму, области и дате',
            'is_demo': 'true',
            **changes,
        },
        headers=mutation_headers(client, key),
    )


def evidence_body(prop, asset, **changes):
    return {
        'property_id': prop,
        'kind': 'LEGAL_ABSENCE_REVIEW',
        'asset_id': asset['id'],
        'description': 'DEMO: документальная проверка применимых оснований на дату',
        'source_label': 'Клиентская подмена источника',
        'event_at': None,
        'is_demo': True,
        **changes,
    }


def evidence(client, prop, **changes):
    response = upload(client, prop, **changes)
    assert response.status_code == 201, response.text
    asset = response.json()
    response = post(client, '/evidence', evidence_body(prop, asset))
    assert response.status_code == 201, response.text
    contract(response.json(), 'Evidence')
    return asset, response.json()


def create_factor(client, prop, ids, *, key=None, **changes):
    return post(
        client,
        f'/properties/{prop}/risk-factors',
        {
            'code': 'R1',
            'as_of': TARGET,
            'evidence_ids': ids,
            'reason': 'DEMO: материалы всех механизмов переданы на ручную проверку',
            **changes,
        },
        key,
    )


def review(client, row, status='CONFIRMED', *, key=None, **changes):
    return post(
        client,
        f'/risk-factors/{row["id"]}/review',
        {
            'expected_revision': row['revision'],
            'status': status,
            'evidence_ids': row['evidence_ids'],
            'reason': 'DEMO: сверены все механизмы, точная область и дата',
            **changes,
        },
        key,
    )


def basis(client, prop, **changes):
    row, _ = create_basis(
        client,
        prop,
        **{
            'document_date': '2020-01-01',
            'applies_from': '2020-01-01T00:00:00+05:00',
            'applies_until': '2020-01-31T23:59:59+05:00',
            **changes,
        },
    )
    return row


def basis_review(client, row, status='VERIFIED_VALID', **changes):
    return post(
        client, f'/legal-bases/{row["id"]}/review', review_body(row, **{'status': status, 'as_of': TARGET, **changes})
    )


def test_r1_retrospective_pending_confirm_reject_without_sticky_legal_status(signed):
    prop = property_id(signed)
    detail = signed.get(f'/api/v1/properties/{prop}').json()
    assert detail['property']['legal_verification_status'] == 'UNKNOWN'
    assert detail['property']['risk']['score'] == 0 and not detail['factors']
    _, row = evidence(signed, prop)
    assert datetime.fromisoformat(row['event_at']) > datetime.fromisoformat(row['absence_as_of'])
    created = create_factor(signed, prop, [row['id']])
    assert created.status_code == 201, created.text
    contract(created.json(), 'RiskReviewResult')
    pending = created.json()['factor']
    assert pending['status'] == 'PENDING' and created.json()['risk']['score'] == 0
    assert create_factor(signed, prop, [row['id']]).status_code == 409
    key = uuid4()
    response = review(signed, pending, key=key)
    assert response.status_code == 200, response.text
    confirmed = response.json()
    assert confirmed['factor']['status'] == 'CONFIRMED'
    assert confirmed['risk']['score'] == 35 and confirmed['risk']['zone'] == 'YELLOW'
    assert datetime.fromisoformat(confirmed['factor']['as_of']) == datetime.fromisoformat(TARGET)
    assert datetime.fromisoformat(confirmed['factor']['reviewed_at']) > datetime.fromisoformat(DOCUMENT_AT)
    assert review(signed, pending, key=key).json() == confirmed
    assert review(signed, pending).status_code == 409
    detail = signed.get(f'/api/v1/properties/{prop}').json()
    assert detail['property']['legal_verification_status'] == 'UNKNOWN'
    assert datetime.fromisoformat(detail['property']['legal_absence_as_of']) == datetime.fromisoformat(TARGET)
    rejected = review(signed, confirmed['factor'], 'REJECTED')
    assert rejected.status_code == 200 and rejected.json()['risk']['score'] == 0
    assert signed.get(f'/api/v1/properties/{prop}').json()['property']['legal_verification_status'] == 'UNKNOWN'
    events = signed.get(f'/api/v1/properties/{prop}/audit').json()['items']
    decisions = [event for event in events if event['action'] == 'RISK_FACTOR_REVIEWED']
    assert len(decisions) == 2
    assert any(event['details']['before']['status'] == 'CONFIRMED' for event in decisions)


def test_explicit_review_retires_legacy_timeless_absence_without_reconfirming_seed_proof(signed):
    prop = str(demo_id('baiterek'))
    detail = signed.get(f'/api/v1/properties/{prop}').json()
    assert detail['property']['legal_verification_status'] == 'VERIFIED_ABSENT'
    row = next(factor for factor in detail['factors'] if factor['code'] == 'R1')
    response = review(signed, row, 'REJECTED')
    assert response.status_code == 200, response.text
    detail = signed.get(f'/api/v1/properties/{prop}').json()
    assert detail['property']['legal_verification_status'] == 'UNKNOWN'
    assert detail['property']['legal_absence_as_of'] is None
    assert review(signed, response.json()['factor']).status_code == 422
    events = signed.get(f'/api/v1/properties/{prop}/audit').json()['items']
    event = next(event for event in events if event['action'] == 'RISK_FACTOR_REVIEWED')
    assert event['details']['before_property_legal_status'] == 'VERIFIED_ABSENT'
    assert event['details']['after_property_legal_status'] == 'UNKNOWN'


@pytest.mark.parametrize('result', ['NOT_FOUND', 'UNAVAILABLE', 'UNKNOWN'])
def test_unknown_or_unavailable_mechanism_can_be_stored_but_does_not_prove_absence(signed, result):
    prop = property_id(signed)
    incomplete = checks()
    incomplete[1] |= {'result': result}
    _, row = evidence(signed, prop, legal_checks=incomplete)
    assert row['legal_checks'][1]['result'] == result
    assert create_factor(signed, prop, [row['id']]).status_code == 422
    assert signed.get(f'/api/v1/properties/{prop}').json()['property']['risk']['score'] == 0


@pytest.mark.parametrize('count', [1, 2])
def test_incomplete_mechanism_coverage_cannot_confirm_r1(signed, count):
    prop = property_id(signed)
    _, row = evidence(signed, prop, legal_checks=checks()[:count])
    assert create_factor(signed, prop, [row['id']]).status_code == 422


@pytest.mark.parametrize(
    'changes',
    [
        {'legal_checks': []},
        {'legal_checks': checks() + checks()[:1]},
        {'legal_checks': [checks()[0], checks()[0]]},
        {'legal_checks': [{'mechanism': 'MORTGAGE', 'result': 'DOCUMENTED_ABSENT', 'reason': 'x'}]},
        {'legal_checks': [{'mechanism': MECHANISMS[0], 'result': 'MISSING', 'reason': 'x'}]},
        {'legal_checks': [{'mechanism': MECHANISMS[0], 'result': 'UNKNOWN', 'reason': '  '}]},
        {'legal_checks': [{'mechanism': MECHANISMS[0], 'result': 'UNKNOWN', 'reason': 'x' * 2001}]},
        {'scope_description': '  '},
        {'scope_description': 'x' * 2001},
        {'methodology': '  '},
        {'absence_as_of': '2020-01-10T12:00:00'},
        {'absence_as_of': '2020-01-13T12:00:00+05:00'},
        {'event_at': (utcnow() + timedelta(days=1)).isoformat()},
    ],
    ids=[
        'empty',
        'over-three',
        'duplicate',
        'unsupported-mechanism',
        'unsupported-result',
        'blank-reason',
        'long-reason',
        'blank-scope',
        'long-scope',
        'blank-method',
        'naive-date',
        'target-after-document',
        'future-document',
    ],
)
def test_invalid_absence_material_is_rejected(signed, changes):
    response = upload(signed, property_id(signed), **changes)
    assert response.status_code == 422, response.text


def test_malformed_legal_checks_json_is_rejected(signed):
    prop = property_id(signed)
    for malformed in ['{not json', '{}', 'null', '"text"']:
        response = signed.post(
            '/api/v1/assets/upload',
            files={'file': ('absence.txt', b'DEMO absence', 'text/plain')},
            data={
                'property_id': prop,
                'purpose': 'LEGAL_ABSENCE_REVIEW',
                'source_label': 'DEMO',
                'event_at': DOCUMENT_AT,
                'absence_as_of': TARGET,
                'scope_description': SCOPE,
                'legal_checks': malformed,
                'methodology': 'DEMO verified',
                'is_demo': 'true',
            },
            headers=mutation_headers(signed),
        )
        assert response.status_code == 422, response.text


def test_absence_provenance_scope_and_cannot_launder_incomplete_checks(signed):
    prop, other = property_id(signed), property_id(signed)
    original_checks = checks('NOT_FOUND')
    asset = upload(signed, prop, legal_checks=original_checks).json()
    body = evidence_body(prop, asset)
    assert post(signed, '/evidence', body | {'property_id': other}).status_code == 422
    assert post(signed, '/evidence', body | {'is_demo': False}).status_code == 422
    forged = body | {
        'legal_checks': checks(),
        'absence_as_of': '2020-01-09T12:00:00+05:00',
        'scope_description': 'forged',
        'source_url': 'https://forged.example.com/',
        'methodology': 'forged',
    }
    response = post(signed, '/evidence', forged)
    assert response.status_code == 201, response.text
    row = response.json()
    assert row['legal_checks'] == original_checks and row['scope_description'] == SCOPE
    assert datetime.fromisoformat(row['absence_as_of']) == datetime.fromisoformat(TARGET)
    assert row['source_label'] == 'DEMO проверка оснований' and row['source_url'] == 'https://example.com/absence'
    assert row['methodology'] != 'forged'
    assert create_factor(signed, prop, [row['id']]).status_code == 422
    assert upload(signed, prop, is_demo='false').status_code == 422
    _, valid = evidence(signed, other)
    assert create_factor(signed, prop, [valid['id']]).status_code == 422
    legal = basis(signed, prop)
    assert post(signed, '/evidence', evidence_body(prop, {'id': legal['asset_id']})).status_code == 422


def test_exact_dated_scope_and_single_evidence_required(signed):
    prop = property_id(signed)
    _, first = evidence(signed, prop)
    _, second = evidence(signed, prop)
    ids = [first['id']]
    assert create_factor(signed, prop, ids, as_of='2020-01-10T12:00:01+05:00').status_code == 422
    assert create_factor(signed, prop, ids, as_of=(utcnow() + timedelta(days=1)).isoformat()).status_code == 422
    assert create_factor(signed, prop, [first['id'], second['id']]).status_code == 422
    assert create_factor(signed, prop, [first['id'], first['id']]).status_code == 422
    response = create_factor(signed, prop, ids, as_of='2020-01-10T07:00:00Z')
    assert response.status_code == 201, response.text
    assert review(signed, response.json()['factor'], as_of='2020-01-11T12:00:00+05:00').status_code == 422


@pytest.mark.parametrize('status', ['PENDING', 'VERIFIED_VALID'])
def test_applicable_basis_blocks_create_and_confirm_even_when_expired_today(signed, status):
    for operation in ['create', 'confirm']:
        prop = property_id(signed)
        _, row = evidence(signed, prop)
        pending = create_factor(signed, prop, [row['id']]).json()['factor'] if operation == 'confirm' else None
        legal = basis(signed, prop)
        if status == 'VERIFIED_VALID':
            response = basis_review(signed, legal)
            assert response.status_code == 200, response.text
        if pending:
            assert review(signed, pending).status_code == 409
            assert review(signed, pending, 'REJECTED').status_code == 200
        else:
            assert create_factor(signed, prop, [row['id']]).status_code == 409


def test_unresolved_basis_without_period_is_a_conservative_conflict(signed):
    prop = property_id(signed)
    _, row = evidence(signed, prop)
    basis(signed, prop, applies_from=None, applies_until=None)
    assert create_factor(signed, prop, [row['id']]).status_code == 409


def test_other_scope_or_period_and_later_document_do_not_create_false_conflict(signed):
    prop, other = property_id(signed), property_id(signed)
    _, row = evidence(signed, prop)
    elsewhere = basis(signed, other)
    assert basis_review(signed, elsewhere).status_code == 200
    basis(signed, prop, applies_from='2020-02-01T00:00:00+05:00', applies_until='2020-02-28T23:59:59+05:00')
    later = basis(signed, prop, document_date='2020-01-11')
    assert basis_review(signed, later, as_of='2020-01-12T12:00:00+05:00').status_code == 200
    response = create_factor(signed, prop, [row['id']])
    assert response.status_code == 201, response.text
    assert review(signed, response.json()['factor']).status_code == 200


@pytest.mark.parametrize('released_status', ['REJECTED', 'PENDING'])
def test_r1_blocks_overlapping_basis_until_explicitly_released(signed, released_status):
    prop = property_id(signed)
    _, row = evidence(signed, prop)
    pending = create_factor(signed, prop, [row['id']]).json()['factor']
    confirmed = review(signed, pending).json()['factor']
    legal = basis(signed, prop)
    assert basis_review(signed, legal).status_code == 409
    assert review(signed, confirmed, released_status).status_code == 200
    assert basis_review(signed, legal).status_code == 200


def test_rejected_basis_is_not_itself_absence_evidence(signed):
    prop = property_id(signed)
    legal = basis(signed, prop)
    response = basis_review(signed, legal, 'REJECTED')
    assert response.status_code == 200
    assert create_factor(signed, prop, legal['evidence_ids']).status_code == 422
    assert basis_review(signed, response.json(), 'VERIFIED_ABSENT').status_code == 422
    assert signed.get(f'/api/v1/properties/{prop}').json()['property']['risk']['score'] == 0


def test_all_three_commands_are_idempotent(signed):
    prop = property_id(signed)
    key = uuid4()
    first = upload(signed, prop, key=key)
    assert first.status_code == 201
    assert upload(signed, prop, key=key).json() == first.json()
    assert upload(signed, prop, key=key, scope_description='DEMO changed scope').status_code == 409
    body, key = evidence_body(prop, first.json()), uuid4()
    first = post(signed, '/evidence', body, key)
    assert first.status_code == 201, first.text
    assert post(signed, '/evidence', body, key).json() == first.json()
    key = uuid4()
    pending = create_factor(signed, prop, [first.json()['id']], key=key)
    assert pending.status_code == 201
    assert create_factor(signed, prop, [first.json()['id']], key=key).json() == pending.json()


@pytest.mark.parametrize('failure', ['missing', 'hash'])
def test_missing_original_blocks_confirmation_but_rejection_still_works(signed, failure):
    prop = property_id(signed)
    asset, row = evidence(signed, prop)
    pending = create_factor(signed, prop, [row['id']]).json()['factor']
    with signed.app.state.sessions.begin() as db:
        stored = db.get(Asset, UUID(asset['id']))
        if failure == 'missing':
            stored.storage_key = 'missing/legal-absence.txt'
        else:
            stored.sha256 = '0' * 64
    assert review(signed, pending).status_code == 409
    assert review(signed, pending, 'REJECTED').status_code == 200


def payment_factor(client, settings, prop, published_at):
    ad, _, _, payment, _ = reviewed_evidence(client, settings, prop)
    # This synthetic fixture assigns the event date before either factor is confirmed.
    with client.app.state.sessions.begin() as db:
        db.get(Advertisement, UUID(ad['id'])).published_at = (
            datetime.fromisoformat(published_at) if published_at else None
        )
    stored = client.get(f'/api/v1/advertisements/{ad["id"]}').json()['published_at']
    if published_at:
        assert datetime.fromisoformat(stored) == datetime.fromisoformat(published_at)
    else:
        assert stored is None
    response = post(
        client,
        f'/properties/{prop}/risk-factors',
        {'code': 'R2', 'as_of': utcnow().isoformat(), 'evidence_ids': [payment['id']], 'reason': 'DEMO direct payment'},
    )
    assert response.status_code == 201, response.text
    return response.json()['factor']


@pytest.mark.parametrize(
    ('first_code', 'published_at'),
    [('R1', TARGET), ('R2', '2020-01-10T07:00:00Z')],
    ids=['absence-first', 'payment-first-equivalent-timezone'],
)
def test_matching_absence_and_payment_are_red_in_either_order(signed, settings, first_code, published_at):
    prop = property_id(signed)
    _, row = evidence(signed, prop)
    factors = {'R1': create_factor(signed, prop, [row['id']]).json()['factor']}
    factors['R2'] = payment_factor(signed, settings, prop, published_at)
    order = [first_code, 'R2' if first_code == 'R1' else 'R1']
    for code in order:
        response = review(signed, factors[code])
        assert response.status_code == 200, response.text
    assert response.json()['risk']['score'] == 60 and response.json()['risk']['zone'] == 'RED'
    absence = next(
        factor for factor in signed.get(f'/api/v1/properties/{prop}/risk').json()['factors'] if factor['code'] == 'R1'
    )
    response = review(signed, absence, 'REJECTED')
    assert response.status_code == 200 and response.json()['risk']['score'] == 25
    assert response.json()['risk']['zone'] == 'YELLOW' and response.json()['risk']['confirmed_codes'] == ['R2']


@pytest.mark.parametrize('first_code', ['R1', 'R2'], ids=['absence-first', 'payment-first'])
@pytest.mark.parametrize(
    'published_at',
    [None, '2021-01-10T12:00:00+05:00', '2020-01-10T12:00:01+05:00'],
    ids=['unknown-publication', 'different-year', 'same-day-different-instant'],
)
def test_mixed_or_unknown_event_dates_cannot_confirm_a_red_pair(signed, settings, first_code, published_at):
    prop = property_id(signed)
    _, row = evidence(signed, prop)
    factors = {'R1': create_factor(signed, prop, [row['id']]).json()['factor']}
    factors['R2'] = payment_factor(signed, settings, prop, published_at)
    confirmed = review(signed, factors[first_code])
    assert confirmed.status_code == 200, confirmed.text
    before = signed.get(f'/api/v1/properties/{prop}/risk').json()
    second_code = 'R2' if first_code == 'R1' else 'R1'
    response = review(signed, factors[second_code])
    assert response.status_code == 409, response.text
    after = signed.get(f'/api/v1/properties/{prop}/risk').json()
    assert after == before
    assert after['summary']['score'] == (35 if first_code == 'R1' else 25)
    assert next(factor for factor in after['factors'] if factor['code'] == first_code)['status'] == 'CONFIRMED'
    assert next(factor for factor in after['factors'] if factor['code'] == second_code)['status'] == 'PENDING'


def test_concurrent_valid_basis_and_absence_confirmation_cannot_both_commit(signed, monkeypatch):
    from app.api import legal_bases, reviews

    prop = property_id(signed)
    legal = basis(signed, prop)
    rejected = basis_review(signed, legal, 'REJECTED')
    assert rejected.status_code == 200
    legal = rejected.json()
    _, row = evidence(signed, prop)
    absence = create_factor(signed, prop, [row['id']]).json()['factor']
    barrier, original = threading.Barrier(2), reviews.property_locked

    def locked(db, id):
        barrier.wait(timeout=10)
        return original(db, id)

    monkeypatch.setattr(reviews, 'property_locked', locked)
    monkeypatch.setattr(legal_bases, 'property_locked', locked)
    headers, cookies = mutation_headers(signed), dict(signed.cookies)
    commands = [
        (f'/legal-bases/{legal["id"]}/review', review_body(legal, as_of=TARGET)),
        (
            f'/risk-factors/{absence["id"]}/review',
            {
                'expected_revision': absence['revision'],
                'status': 'CONFIRMED',
                'evidence_ids': absence['evidence_ids'],
                'reason': 'DEMO concurrent review',
            },
        ),
    ]

    def send(command):
        path, body = command
        with TestClient(signed.app, base_url='http://localhost:3000') as client:
            client.cookies.update(cookies)
            return client.post('/api/v1' + path, json=body, headers=headers | {'Idempotency-Key': str(uuid4())})

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(send, commands))
    assert sorted(response.status_code for response in responses) == [200, 409]


def test_viewer_cannot_supply_or_confirm_absence(signed, settings):
    prop = property_id(signed)
    asset, row = evidence(signed, prop)
    pending = create_factor(signed, prop, [row['id']]).json()['factor']
    with signed.app.state.sessions.begin() as db:
        db.scalar(select(User).where(User.username == settings.bootstrap_analyst_username)).role = 'viewer'
    try:
        assert upload(signed, prop).status_code == 403
        assert post(signed, '/evidence', evidence_body(prop, asset)).status_code == 403
        assert create_factor(signed, prop, [row['id']]).status_code == 403
        assert review(signed, pending).status_code == 403
    finally:
        with signed.app.state.sessions.begin() as db:
            db.scalar(select(User).where(User.username == settings.bootstrap_analyst_username)).role = 'analyst'
