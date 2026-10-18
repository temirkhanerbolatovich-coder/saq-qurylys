from copy import deepcopy
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select

from app.dependencies import get_db
from app.dto import UserOut
from app.models import AuditEvent, Developer, Property, Signal, User
from app.signals import build_snapshot


@pytest.fixture
def search_signals(signed):
    with signed.app.state.sessions() as db:
        actor = db.get(User, UUID(signed.get('/api/v1/auth/me').json()['id']))
        developer = Developer(name=f'DEMO signal search {uuid4()}', bin=None, is_demo=True)
        db.add(developer)
        db.flush()
        day = datetime(2026, 10, 18, tzinfo=timezone.utc)
        prop = Property(
            name='DEMO Сегодня Өскемен',
            city='DEMO',
            address='DEMO',
            developer_id=developer.id,
            is_demo=True,
            last_reviewed_at=day,
        )
        other = Property(
            name='DEMO Другой объект',
            city='DEMO',
            address='DEMO',
            developer_id=developer.id,
            is_demo=True,
            last_reviewed_at=day,
        )
        db.add_all([prop, other])
        db.flush()
        snapshot = build_snapshot(db, prop).model_dump(mode='json')
        snapshot['property']['name'] = 'DEMO Архив Өркен'
        rows = []
        for index in range(30):
            frozen = deepcopy(snapshot)
            if index == 0:
                frozen['property']['name'] += ' %_\\'
            row = Signal(
                property_id=prop.id,
                version=index + 1,
                previous_signal_id=rows[-1].id if rows else None,
                state='CONFIRMED' if index == 0 else 'RETURNED' if index == 1 else 'DRAFT',
                snapshot=frozen,
                decisions=[],
                created_by=actor.id,
                created_by_details=UserOut.model_validate(actor).model_dump(mode='json'),
                created_at=day + timedelta(minutes=index),
            )
            db.add(row)
            db.flush()
            rows.append(row)
        fresh = Signal(
            property_id=other.id,
            version=1,
            snapshot=build_snapshot(db, other).model_dump(mode='json'),
            decisions=[],
            created_by=actor.id,
            created_by_details=UserOut.model_validate(actor).model_dump(mode='json'),
            created_at=day + timedelta(hours=1),
        )
        db.add(fresh)
        db.flush()

        def test_db():
            yield db

        signed.app.dependency_overrides[get_db] = test_db
        try:
            yield {'db': db, 'property': prop, 'rows': rows, 'fresh': fresh, 'actor': actor}
        finally:
            signed.app.dependency_overrides.pop(get_db)
            db.rollback()


def test_search_finds_old_signal_beyond_first_page_by_id(signed, search_signals):
    rows = search_signals['rows']
    first = signed.get('/api/v1/signals', params={'property_id': rows[0].property_id}).json()
    assert len(first['items']) == 25 and str(rows[0].id) not in {item['id'] for item in first['items']}
    result = signed.get('/api/v1/signals', params={'q': str(rows[0].id)}).json()
    assert result['total'] == 1 and result['items'][0]['id'] == str(rows[0].id)


@pytest.mark.parametrize('query', ['  аРхИв ӨРКЕН  ', 'сегодня өскемен'])
def test_current_and_frozen_names_search_across_all_pages(signed, search_signals, query):
    first = signed.get('/api/v1/signals', params={'q': query, 'page_size': 25}).json()
    last = signed.get('/api/v1/signals', params={'q': query, 'page': 2, 'page_size': 25}).json()
    assert first['total'] == last['total'] == 30
    assert len(first['items']) == 25 and len(last['items']) == 5
    assert last['items'][-1]['id'] == str(search_signals['rows'][0].id)


@pytest.mark.parametrize(
    ('query', 'index'),
    [
        ('подтверждён аналитиком', 0),
        ('returned', 1),
        ('на доработку', 1),
        ('версия 30', 29),
        ('%', 0),
        ('_', 0),
        ('\\', 0),
    ],
)
def test_search_status_version_and_literal_special_characters(signed, search_signals, query, index):
    result = signed.get(
        '/api/v1/signals',
        params={'q': query, 'property_id': str(search_signals['property'].id)},
    ).json()
    assert result['total'] == 1 and result['items'][0]['id'] == str(search_signals['rows'][index].id)


def test_search_preserves_filters_counts_and_empty_page_metadata(signed, search_signals):
    params = {
        'q': 'Архив Өркен',
        'property_id': str(search_signals['property'].id),
        'state': 'CONFIRMED',
        'is_stale': True,
        'page_size': 1,
    }
    result = signed.get('/api/v1/signals', params=params).json()
    assert result['total'] == 1 and result['items'][0]['id'] == str(search_signals['rows'][0].id)
    empty = signed.get('/api/v1/signals', params={**params, 'page': 2}).json()
    assert empty == {'items': [], 'total': 1, 'page': 2, 'page_size': 1}
    assert signed.get('/api/v1/signals', params={**params, 'is_stale': False}).json()['total'] == 0
    fresh = signed.get('/api/v1/signals', params={'q': 'Другой объект', 'is_stale': False}).json()
    assert fresh['items'][0]['id'] == str(search_signals['fresh'].id)


@pytest.mark.parametrize('query', ['', '   ', "' OR 1=1 --", 'property', 'x' * 301])
def test_search_blank_literal_sql_json_and_length_validation(signed, search_signals, query):
    params = {'q': query, 'property_id': str(search_signals['property'].id)}
    response = signed.get('/api/v1/signals', params=params)
    if len(query) > 300:
        assert response.status_code == 422
    else:
        assert response.status_code == 200
        assert response.json()['total'] == (30 if not query.strip() else 0)


def test_search_does_not_rewrite_snapshots_decisions_or_audit(signed, search_signals):
    rows = search_signals
    target = rows['rows'][0]
    before = signed.get(f'/api/v1/signals/{target.id}').json()
    events = rows['db'].scalar(select(func.count()).select_from(AuditEvent))
    assert signed.get('/api/v1/signals', params={'q': 'Архив', 'is_stale': True}).status_code == 200
    assert signed.get(f'/api/v1/signals/{target.id}').json() == before
    assert rows['db'].scalar(select(func.count()).select_from(AuditEvent)) == events
    rows['actor'].role = 'viewer'
    rows['db'].flush()
    assert signed.get('/api/v1/signals?q=Архив').status_code == 200
    signed.cookies.clear()
    assert signed.get('/api/v1/signals?q=Архив').status_code == 401
