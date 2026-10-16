from datetime import timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy import delete
from test_analysis import contract

from app.models import AuditEvent, Property, RiskFactor, User, utcnow
from app.seed import demo_id


@pytest.fixture
def history_property(signed):
    actor_id = UUID(signed.get('/api/v1/auth/me').json()['id'])
    with signed.app.state.sessions() as db:
        original = db.get(Property, demo_id('ertis'))
        prop = Property(
            name='DEMO История',
            city=original.city,
            address='DEMO',
            developer_id=original.developer_id,
            last_reviewed_at=utcnow(),
        )
        db.add(prop)
        db.flush()
        prop_id = prop.id
        factor = RiskFactor(property_id=prop_id, code='R2', status='PENDING', as_of=utcnow(), evidence_ids=[])
        db.add(factor)
        db.commit()
        factor_id = factor.id
    yield prop_id, factor_id, actor_id
    with signed.app.state.sessions() as db:
        db.execute(delete(AuditEvent).where(AuditEvent.details['property_id'].as_string() == str(prop_id)))
        db.execute(delete(RiskFactor).where(RiskFactor.property_id == prop_id))
        db.execute(delete(Property).where(Property.id == prop_id))
        db.commit()


def test_history_read_paginates_saved_transitions_and_enriches_without_mutation(signed, history_property):
    prop_id, factor_id, actor_id = history_property
    moment = utcnow()
    ids = [uuid4() for _ in range(3)]
    with signed.app.state.sessions() as db:
        actor_name = db.get(User, actor_id).display_name
        for index, event_id in enumerate(ids):
            db.add(
                AuditEvent(
                    id=event_id,
                    actor_id=actor_id,
                    occurred_at=moment - timedelta(seconds=1 if index == 2 else 0),
                    action='RISK_FACTOR_REVIEWED',
                    entity_type='risk_factors',
                    entity_id=factor_id,
                    old_revision=1,
                    new_revision=2,
                    reason='DEMO проверка истории',
                    details={
                        'property_id': str(prop_id),
                        'before': {'status': 'CONFIRMED'},
                        'after': {'status': 'PENDING'},
                    },
                )
            )
        db.commit()
    before = signed.get(f'/api/v1/properties/{prop_id}').json()
    path = f'/api/v1/properties/{prop_id}/audit'
    pages = [signed.get(f'{path}?page={page}&page_size=1').json() for page in (1, 2, 3)]
    expected = sorted(map(str, ids[:2])) + [str(ids[2])]
    assert [page['items'][0]['id'] for page in pages] == expected
    for page in pages:
        assert page['total'] == 3 and page['page_size'] == 1
        event = page['items'][0]
        contract(event, 'AuditEvent')
        assert event['actor_display_name'] == actor_name
        assert event['risk_code'] == 'R2'
        assert event['details']['before']['status'] == 'CONFIRMED'
        assert event['details']['after']['status'] == 'PENDING'
        assert 'password' not in event and 'password_hash' not in event
    assert signed.get(f'{path}?page=4&page_size=1').json()['items'] == []
    assert signed.get(f'{path}?page_size=101').status_code == 422
    assert signed.get(f'{path}?page=0').status_code == 422
    assert signed.get(f'/api/v1/properties/{prop_id}').json() == before
    with signed.app.state.sessions() as db:
        stored = db.get(AuditEvent, ids[0])
        assert stored.details == {
            'property_id': str(prop_id),
            'before': {'status': 'CONFIRMED'},
            'after': {'status': 'PENDING'},
        }


def test_history_empty_missing_and_authentication(signed, client, history_property):
    prop_id, _, _ = history_property
    result = signed.get(f'/api/v1/properties/{prop_id}/audit')
    assert result.status_code == 200
    assert result.json() == {'items': [], 'total': 0, 'page': 1, 'page_size': 25}
    assert signed.get(f'/api/v1/properties/{uuid4()}/audit').status_code == 404
    client.cookies.clear()
    assert client.get(f'/api/v1/properties/{prop_id}/audit').status_code == 401
