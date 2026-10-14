from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from uuid import UUID, uuid4

import pytest
from conftest import mutation_headers
from fastapi.testclient import TestClient
from sqlalchemy import select
from test_analysis import contract

from app.models import Developer, Property, RiskFactor, User, utcnow


def post(client, path, body, key=None):
    return client.post('/api/v1' + path, json=body, headers=mutation_headers(client, key))


def property_id(client):
    with client.app.state.sessions.begin() as db:
        row = Property(
            id=uuid4(),
            name='DEMO legal ' + str(uuid4()),
            city='DEMO',
            address='DEMO legal scope',
            developer_id=db.scalar(select(Developer.id).limit(1)),
            stage='UNKNOWN',
            is_demo=True,
        )
        db.add(row)
        return str(row.id)


def document(client, prop, **changes):
    return client.post(
        '/api/v1/assets/upload',
        files={'file': ('basis.txt', 'DEMO: гарантия для отдельной очереди'.encode(), 'text/plain')},
        data={
            'property_id': prop,
            'source_label': 'DEMO legal source',
            'source_url': 'https://example.com/demo',
            'event_at': (utcnow() - timedelta(days=1)).isoformat(),
            'methodology': 'Сверено с учебным документом',
            'purpose': 'LEGAL_BASIS',
            'is_demo': 'true',
            **changes,
        },
        headers=mutation_headers(client),
    )


def create(client, prop, **changes):
    asset = document(client, prop)
    assert asset.status_code == 201, asset.text
    body = {
        'mechanism': 'KZHK_GUARANTEE',
        'document_number': 'DEMO-LEGAL-123',
        'document_date': (utcnow() - timedelta(days=2)).date().isoformat(),
        'issuer': 'DEMO issuer',
        'asset_id': asset.json()['id'],
        'scope_description': 'Только DEMO очередь/корпус',
        'is_demo': True,
        'applies_from': (utcnow() - timedelta(days=2)).isoformat(),
        **changes,
    }
    result = post(client, f'/properties/{prop}/legal-bases', body)
    assert result.status_code == 201, result.text
    return result.json(), body


def review_body(row, **changes):
    return {
        'expected_revision': row['revision'],
        'status': 'VERIFIED_VALID',
        'as_of': utcnow().isoformat(),
        'evidence_ids': row['evidence_ids'],
        'reason': 'Сверены документ, область и дата',
        **changes,
    }


def test_legal_basis_pending_confirm_reject_provenance_and_audit(signed):
    prop = property_id(signed)
    row, body = create(signed, prop, source_url='https://forged.example.com/')
    contract(row, 'LegalBasis')
    assert row['verification_status'] == 'PENDING' and row['source_url'] == 'https://example.com/demo'
    assert len(row['evidence_ids']) == 1
    detail = signed.get(f'/api/v1/properties/{prop}').json()
    assert detail['property']['legal_verification_status'] == 'PENDING' and detail['property']['risk']['score'] == 0
    assert signed.get(f'/api/v1/properties/{prop}/legal-bases').json()[0] == row
    assert post(signed, f'/properties/{prop}/legal-bases', body).status_code == 409
    key = uuid4()
    reviewed = post(signed, f'/legal-bases/{row["id"]}/review', review_body(row), key)
    assert reviewed.status_code == 200, reviewed.text
    contract(reviewed.json(), 'LegalBasis')
    replay = post(
        signed, f'/legal-bases/{row["id"]}/review', review_body(row, as_of=reviewed.json()['verification_as_of']), key
    )
    assert replay.status_code == 200 and replay.json() == reviewed.json()
    assert post(signed, f'/legal-bases/{row["id"]}/review', review_body(row)).status_code == 409
    detail = signed.get(f'/api/v1/properties/{prop}').json()
    assert detail['property']['legal_verification_status'] == 'VERIFIED_VALID'
    assert detail['property']['risk']['score'] == 0 and 'R1' not in detail['property']['risk']['confirmed_codes']
    rejected = post(signed, f'/legal-bases/{row["id"]}/review', review_body(reviewed.json(), status='REJECTED'))
    assert rejected.status_code == 200
    detail = signed.get(f'/api/v1/properties/{prop}').json()
    assert detail['property']['legal_verification_status'] == 'UNKNOWN' and detail['property']['risk']['score'] == 0
    audit = signed.get(f'/api/v1/properties/{prop}/audit').json()['items']
    events = [e for e in audit if e['action'] == 'LEGAL_BASIS_REVIEWED']
    assert len(events) == 2 and any(e['details']['before']['verification_status'] == 'VERIFIED_VALID' for e in events)
    assert all(e['actor_id'] == reviewed.json()['reviewed_by'] for e in events)
    assert {(e['old_revision'], e['new_revision']) for e in events} == {(1, 2), (2, 3)}


@pytest.mark.parametrize('mechanism', ['KZHK_GUARANTEE', 'BANK_WITH_MIO_PERMIT', 'FRAME_WITH_MIO_PERMIT'])
def test_all_three_project_mechanisms_can_be_reviewed(signed, mechanism):
    prop = property_id(signed)
    row, _ = create(signed, prop, mechanism=mechanism)
    response = post(signed, f'/legal-bases/{row["id"]}/review', review_body(row))
    assert response.status_code == 200 and response.json()['mechanism'] == mechanism


def test_period_applies_only_on_date_and_current_filter_is_fresh(signed):
    prop = property_id(signed)
    row, _ = create(signed, prop, applies_until=(utcnow() - timedelta(hours=1)).isoformat())
    assert post(signed, f'/legal-bases/{row["id"]}/review', review_body(row)).status_code == 422
    response = post(
        signed, f'/legal-bases/{row["id"]}/review', review_body(row, as_of=(utcnow() - timedelta(days=1)).isoformat())
    )
    assert response.status_code == 200
    assert signed.get(f'/api/v1/properties/{prop}').json()['property']['legal_verification_status'] == 'UNKNOWN'
    assert prop not in [
        p['id'] for p in signed.get('/api/v1/properties?legal_status=VERIFIED_VALID&page_size=100').json()['items']
    ]
    row2, _ = create(signed, prop)
    confirmed = post(signed, f'/legal-bases/{row2["id"]}/review', review_body(row2)).json()
    assert confirmed['verification_status'] == 'VERIFIED_VALID'
    # A previously valid stored aggregate must expire at read time without a background cron.
    with signed.app.state.sessions.begin() as db:
        from app.models import LegalBasis

        basis = db.get(LegalBasis, UUID(row2['id']))
        basis.details = basis.details | {'applies_until': (utcnow() - timedelta(seconds=1)).isoformat()}
    assert signed.get(f'/api/v1/properties/{prop}').json()['property']['legal_verification_status'] == 'UNKNOWN'
    assert prop not in [
        p['id'] for p in signed.get('/api/v1/properties?legal_status=VERIFIED_VALID&page_size=100').json()['items']
    ]


@pytest.mark.parametrize(
    'changes',
    [
        {'status': 'VERIFIED_ABSENT'},
        {'as_of': (utcnow() + timedelta(days=1)).isoformat()},
        {'reason': '  '},
        {'evidence_ids': []},
        {'evidence_ids': [str(uuid4())]},
    ],
    ids=['absence-not-implemented', 'future', 'blank', 'empty-evidence', 'foreign-evidence'],
)
def test_invalid_review_is_rejected(signed, changes):
    prop = property_id(signed)
    row, _ = create(signed, prop)
    response = post(signed, f'/legal-bases/{row["id"]}/review', review_body(row, **changes))
    assert response.status_code == 422


def test_incomplete_record_cannot_be_confirmed(signed):
    prop = property_id(signed)
    row, _ = create(signed, prop, document_number=None, document_date=None, applies_from=None)
    assert post(signed, f'/legal-bases/{row["id"]}/review', review_body(row)).status_code == 422
    assert post(signed, f'/legal-bases/{row["id"]}/review', review_body(row, status='REJECTED')).status_code == 200


def test_conflicting_r1_blocks_confirmation_for_same_scope_date(signed):
    prop = property_id(signed)
    row, _ = create(signed, prop)
    with signed.app.state.sessions.begin() as db:
        factor = RiskFactor(
            id=uuid4(), property_id=UUID(prop), code='R1', status='CONFIRMED', as_of=utcnow(), evidence_ids=[]
        )
        db.add(factor)
    assert post(signed, f'/legal-bases/{row["id"]}/review', review_body(row)).status_code == 409
    # Historical R1 outside the document period does not create a false same-date conflict.
    with signed.app.state.sessions.begin() as db:
        db.get(RiskFactor, factor.id).as_of = utcnow() - timedelta(days=30)
    assert post(signed, f'/legal-bases/{row["id"]}/review', review_body(row)).status_code == 200


def test_document_scope_purpose_and_ownership(signed):
    first, second = property_id(signed), property_id(signed)
    row, body = create(signed, first)
    assert post(signed, f'/properties/{second}/legal-bases', body).status_code == 422
    assert post(signed, f'/properties/{first}/legal-bases', body | {'is_demo': False}).status_code == 422
    appeal = document(signed, first, purpose='COLLECTIVE_APPEAL', signatory_count='2').json()
    assert post(signed, f'/properties/{first}/legal-bases', body | {'asset_id': appeal['id']}).status_code == 422
    assert document(signed, first, signatory_count='2').status_code == 422
    evidence = post(
        signed,
        '/evidence',
        {
            'property_id': first,
            'asset_id': body['asset_id'],
            'kind': 'COLLECTIVE_APPEAL',
            'description': 'not an appeal',
            'source_label': 'x',
            'event_at': None,
            'is_demo': True,
        },
    )
    assert evidence.status_code == 422
    row2, _ = create(signed, second)
    assert (
        post(
            signed, f'/legal-bases/{row["id"]}/review', review_body(row, evidence_ids=row2['evidence_ids'])
        ).status_code
        == 422
    )


def test_viewer_cannot_upload_attach_or_review_legal_basis(signed, settings):
    prop = property_id(signed)
    row, body = create(signed, prop)
    with signed.app.state.sessions.begin() as db:
        db.scalar(select(User).where(User.username == settings.bootstrap_analyst_username)).role = 'viewer'
    try:
        assert document(signed, prop).status_code == 403
        assert post(signed, f'/properties/{prop}/legal-bases', body).status_code == 403
        assert post(signed, f'/legal-bases/{row["id"]}/review', review_body(row)).status_code == 403
        assert signed.get(f'/api/v1/properties/{prop}/legal-bases').status_code == 200
    finally:
        with signed.app.state.sessions.begin() as db:
            db.scalar(select(User).where(User.username == settings.bootstrap_analyst_username)).role = 'analyst'


def test_concurrent_reviews_same_revision_are_fenced(signed, monkeypatch):
    import threading

    from app.api import legal_bases

    prop = property_id(signed)
    row, _ = create(signed, prop)
    original, barrier = legal_bases.property_locked, threading.Barrier(2)

    def locked(db, id):
        barrier.wait(timeout=10)
        return original(db, id)

    monkeypatch.setattr(legal_bases, 'property_locked', locked)
    headers = mutation_headers(signed)
    cookies = dict(signed.cookies)

    def send(status):
        with TestClient(signed.app, base_url='http://localhost:3000') as client:
            client.cookies.update(cookies)
            return client.post(
                f'/api/v1/legal-bases/{row["id"]}/review',
                json=review_body(row, status=status),
                headers=headers | {'Idempotency-Key': str(uuid4())},
            )

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(send, ['VERIFIED_VALID', 'REJECTED']))
    assert sorted(r.status_code for r in responses) == [200, 409]


def test_missing_original_blocks_confirmation_but_can_reject(signed, settings):
    from app.models import Asset

    prop = property_id(signed)
    row, _ = create(signed, prop)
    with signed.app.state.sessions.begin() as db:
        # A missing path exercises failure without damaging shared content-hash test files.
        db.get(Asset, UUID(row['asset_id'])).storage_key = 'missing/legal.txt'
    assert post(signed, f'/legal-bases/{row["id"]}/review', review_body(row)).status_code == 409
    assert post(signed, f'/legal-bases/{row["id"]}/review', review_body(row, status='REJECTED')).status_code == 200


def test_invalid_period_and_unknown_mechanism_do_not_create_basis(signed):
    prop = property_id(signed)
    asset = document(signed, prop).json()
    body = {
        'mechanism': 'KZHK_GUARANTEE',
        'document_number': 'DEMO',
        'document_date': '2026-10-01',
        'issuer': 'DEMO',
        'asset_id': asset['id'],
        'scope_description': 'DEMO scope',
        'is_demo': True,
    }
    for change in [
        {'mechanism': 'MORTGAGE'},
        {'scope_description': '  '},
        {'applies_from': '2026-10-10T00:00:00Z', 'applies_until': '2026-10-09T00:00:00Z'},
        {'applies_from': '2026-10-10T00:00:00'},
        {'company_id': str(uuid4())},
    ]:
        assert post(signed, f'/properties/{prop}/legal-bases', body | change).status_code == 422
    assert signed.get(f'/api/v1/properties/{prop}/legal-bases').json() == []


def test_confirm_one_of_multiple_bases_survives_other_rejection(signed):
    prop = property_id(signed)
    first, _ = create(signed, prop)
    second, _ = create(signed, prop, mechanism='BANK_WITH_MIO_PERMIT')
    assert post(signed, f'/legal-bases/{first["id"]}/review', review_body(first)).status_code == 200
    assert (
        post(signed, f'/legal-bases/{second["id"]}/review', review_body(second, status='REJECTED')).status_code == 200
    )
    assert signed.get(f'/api/v1/properties/{prop}').json()['property']['legal_verification_status'] == 'VERIFIED_VALID'


def test_upload_and_attach_commands_are_idempotent(signed):
    prop = property_id(signed)
    headers = mutation_headers(signed)
    data = {
        'property_id': prop,
        'source_label': 'DEMO legal source',
        'event_at': (utcnow() - timedelta(days=1)).isoformat(),
        'methodology': 'Сверка с оригиналом',
        'purpose': 'LEGAL_BASIS',
        'is_demo': 'true',
    }

    def upload():
        return signed.post(
            '/api/v1/assets/upload', files={'file': ('basis.txt', b'DEMO', 'text/plain')}, data=data, headers=headers
        )

    first, replay = upload(), upload()
    assert first.status_code == replay.status_code == 201 and first.json() == replay.json()
    body = {
        'mechanism': 'KZHK_GUARANTEE',
        'document_number': 'DEMO',
        'document_date': '2026-10-01',
        'issuer': 'DEMO',
        'asset_id': first.json()['id'],
        'scope_description': 'Only DEMO scope',
        'is_demo': True,
    }
    key = uuid4()
    created = post(signed, f'/properties/{prop}/legal-bases', body, key)
    assert created.status_code == 201
    assert post(signed, f'/properties/{prop}/legal-bases', body, key).json() == created.json()
    assert (
        post(signed, f'/properties/{prop}/legal-bases', body | {'document_number': 'changed'}, key).status_code == 409
    )


def test_document_calendar_date_uses_project_timezone_at_utc_day_boundary(signed, monkeypatch):
    from datetime import datetime, timezone

    from app.api import legal_bases

    prop = property_id(signed)
    asset = document(signed, prop).json()
    now = datetime(2026, 10, 14, 20, tzinfo=timezone.utc)
    monkeypatch.setattr(legal_bases, 'utcnow', lambda: now)
    body = {
        'mechanism': 'KZHK_GUARANTEE',
        'document_number': 'DEMO date boundary',
        'document_date': '2026-10-15',
        'issuer': 'DEMO',
        'asset_id': asset['id'],
        'scope_description': 'DEMO scope',
        'is_demo': True,
        'applies_from': '2026-10-15T00:00:00+05:00',
    }
    assert post(signed, f'/properties/{prop}/legal-bases', body | {'document_date': '2026-10-16'}).status_code == 422
    created = post(signed, f'/properties/{prop}/legal-bases', body)
    assert created.status_code == 201, created.text
    response = post(
        signed, f'/legal-bases/{created.json()["id"]}/review', review_body(created.json(), as_of=now.isoformat())
    )
    assert response.status_code == 200, response.text
