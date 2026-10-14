from datetime import timedelta

import pytest
from conftest import mutation_headers

from app.models import utcnow
from app.seed import demo_id


def post(client, path, body):
    return client.post('/api/v1' + path, json=body, headers=mutation_headers(client))


def upload(client, **changes):
    data = {
        'property_id': str(demo_id('ertis')),
        'source_label': 'DEMO own appeal',
        'event_at': (utcnow() - timedelta(days=1)).isoformat(),
        'methodology': 'Сверены два заявителя в учебном документе',
        'signatory_count': '2',
        'is_demo': 'true',
        **changes,
    }
    return client.post(
        '/api/v1/assets/upload',
        files={'file': ('appeal.txt', 'DEMO Коллективное обращение'.encode(), 'text/plain')},
        data=data,
        headers=mutation_headers(client),
    )


def test_appeal_document_pending_confirm_reject_and_audit(signed):
    asset = upload(signed)
    assert asset.status_code == 201, asset.text
    assert asset.json()['kind'] == 'DOCUMENT'
    assert (
        signed.get('/api/v1/assets/' + asset.json()['id'] + '?inline=true').headers['content-type']
        == 'application/octet-stream'
    )
    payload = {
        'property_id': str(demo_id('ertis')),
        'asset_id': asset.json()['id'],
        'kind': 'COLLECTIVE_APPEAL',
        'description': 'Проверка обращения',
        'source_label': 'forged',
        'event_at': None,
        'signatory_count': 99,
        'is_demo': True,
    }
    assert post(signed, '/evidence', payload | {'property_id': str(demo_id('altai'))}).status_code == 422
    evidence = post(signed, '/evidence', payload)
    assert evidence.status_code == 201, evidence.text
    assert evidence.json()['source_label'] == 'DEMO own appeal' and evidence.json()['signatory_count'] == 2
    factor = post(
        signed,
        f'/properties/{demo_id("ertis")}/risk-factors',
        {'code': 'R4', 'as_of': utcnow().isoformat(), 'evidence_ids': [evidence.json()['id']], 'reason': 'Сверено'},
    )
    assert factor.status_code == 201, factor.text
    assert factor.json()['factor']['status'] == 'PENDING' and factor.json()['risk']['score'] == 0
    row = factor.json()['factor']
    body = {
        'expected_revision': row['revision'],
        'status': 'CONFIRMED',
        'evidence_ids': [evidence.json()['id']],
        'reason': 'Коллективность проверена',
    }
    confirmed = post(signed, f'/risk-factors/{row["id"]}/review', body)
    assert confirmed.status_code == 200 and confirmed.json()['risk']['score'] == 15
    assert post(signed, f'/risk-factors/{row["id"]}/review', body).status_code == 409
    rejected = post(
        signed,
        f'/risk-factors/{row["id"]}/review',
        body | {'expected_revision': confirmed.json()['factor']['revision'], 'status': 'REJECTED'},
    )
    assert rejected.status_code == 200 and rejected.json()['risk']['score'] == 0
    assert any(
        e['action'] == 'SUPPORT_DOCUMENT_UPLOADED'
        for e in signed.get(f'/api/v1/properties/{demo_id("ertis")}/audit').json()['items']
    )
    assert (
        post(
            signed,
            f'/properties/{demo_id("altai")}/risk-factors',
            {'code': 'R4', 'as_of': utcnow().isoformat(), 'evidence_ids': [evidence.json()['id']], 'reason': 'x'},
        ).status_code
        == 422
    )


@pytest.mark.parametrize(
    'changes',
    [
        {'signatory_count': '1'},
        {'event_at': (utcnow() + timedelta(days=1)).isoformat()},
        {'methodology': ' '},
        {'is_demo': 'false'},
        {'source_url': 'javascript:alert(1)'},
    ],
    ids=['one-person', 'future', 'blank-method', 'mixed-demo', 'invalid-url'],
)
def test_appeal_invalid_source_is_rejected(signed, changes):
    assert upload(signed, **changes).status_code == 422


def test_appeal_upload_requires_analyst(signed, settings):
    from sqlalchemy import select

    from app.models import User

    with signed.app.state.sessions.begin() as db:
        user = db.scalar(select(User).where(User.username == settings.bootstrap_analyst_username))
        user.role = 'viewer'
    try:
        assert upload(signed).status_code == 403
    finally:
        with signed.app.state.sessions.begin() as db:
            db.scalar(select(User).where(User.username == settings.bootstrap_analyst_username)).role = 'analyst'
