from datetime import datetime, timezone
from uuid import UUID, uuid4

import pytest

from app.dependencies import get_db
from app.models import Developer, Property, RiskFactor, User


@pytest.fixture
def priority_rows(signed):
    label = f'DEMO priority {uuid4()}'
    day = datetime(2026, 10, 18, tzinfo=timezone.utc)
    old = datetime(2026, 10, 10, tzinfo=timezone.utc)
    with signed.app.state.sessions() as db:
        developer = Developer(name=label, bin='990000001019', is_demo=True)
        db.add(developer)
        db.flush()

        def row(name, status='UNKNOWN', reviewed=day, codes=(), is_demo=True):
            item = Property(
                name=name,
                city=label,
                address='DEMO test address',
                developer_id=developer.id,
                legal_verification_status=status,
                last_reviewed_at=reviewed,
                is_demo=is_demo,
            )
            db.add(item)
            db.flush()
            for code in codes:
                db.add(RiskFactor(property_id=item.id, code=code, status='CONFIRMED', as_of=day, evidence_ids=[]))
            db.flush()
            return item

        fillers = [row(f'A DEMO filler {index:03}') for index in range(101)]
        missing = row('Z DEMO pending missing date', 'PENDING', None)
        older = row('Z DEMO pending older', 'PENDING', old)
        high = row('Z DEMO pending equal date high score', 'PENDING', day, ['R1'])
        tie = row('Z DEMO pending equal date high score', 'PENDING', day, ['R1'])
        low = row('Z DEMO pending equal date low score', 'PENDING', day, ['R6'])
        unknown = row('Z DEMO unknown high score', reviewed=None, codes=['R1', 'R2'])
        absent = row('Z DEMO legacy absence', 'VERIFIED_ABSENT', old)
        real = row('Z DEMO synthetic non-demo category', 'PENDING', None, is_demo=False)

        def test_db():
            yield db

        signed.app.dependency_overrides[get_db] = test_db
        try:
            yield {
                'db': db,
                'city': label,
                'missing': missing,
                'older': older,
                'high': high,
                'tie': tie,
                'low': low,
                'unknown': unknown,
                'absent': absent,
                'real': real,
                'fillers': fillers,
                'day': day,
            }
        finally:
            signed.app.dependency_overrides.pop(get_db)
            db.rollback()


def test_priority_covers_whole_filtered_registry_before_pagination(signed, priority_rows):
    rows = priority_rows
    params = {'city': rows['city'], 'is_demo': True, 'page_size': 5}
    default = signed.get('/api/v1/properties', params=params).json()
    assert all(item['name'].startswith('A ') for item in default['items'])
    ties = sorted([str(rows['high'].id), str(rows['tie'].id)])
    expected = [str(rows['missing'].id), str(rows['older'].id), *ties, str(rows['low'].id)]
    first = signed.get('/api/v1/properties', params={**params, 'order': 'work_priority'}).json()
    assert first['total'] == 108
    assert [item['id'] for item in first['items']] == expected
    assert [item['risk']['score'] for item in first['items']] == [0, 0, 35, 35, 5]
    second = signed.get('/api/v1/properties', params={**params, 'order': 'work_priority', 'page': 2}).json()
    assert second['items'][0]['id'] == str(rows['unknown'].id)
    assert second['items'][0]['risk']['score'] == 60
    last = signed.get('/api/v1/properties', params={**params, 'order': 'work_priority', 'page': 22}).json()
    assert last['items'][-1]['id'] == str(rows['absent'].id)
    assert last['total'] == first['total'] and last['page'] == 22
    repeat = signed.get('/api/v1/properties', params={**params, 'order': 'work_priority'}).json()
    assert [item['id'] for item in repeat['items']] == expected
    assert signed.get('/api/v1/properties', params={**params, 'order': 'name'}).json() == default


def test_priority_preserves_search_filters_and_empty_page_metadata(signed, priority_rows):
    rows = priority_rows
    params = {
        'city': rows['city'],
        'order': 'work_priority',
        'q': '990000001019',
        'legal_status': 'PENDING',
        'is_demo': False,
        'zone': 'GREEN',
        'page_size': 1,
    }
    data = signed.get('/api/v1/properties', params=params).json()
    assert data['total'] == 1 and data['items'][0]['id'] == str(rows['real'].id)
    empty = signed.get('/api/v1/properties', params={**params, 'page': 2}).json()
    assert empty == {'items': [], 'total': 1, 'page': 2, 'page_size': 1}
    absent = signed.get('/api/v1/properties', params={**params, 'q': 'no match'}).json()
    assert absent['total'] == 0 and absent['items'] == []
    assert signed.get('/api/v1/properties?order=score_desc').status_code == 422


def test_priority_uses_current_legal_view_and_never_changes_saved_state(signed, priority_rows):
    rows = priority_rows
    before = signed.get(f'/api/v1/properties/{rows["high"].id}').json()
    response = signed.get('/api/v1/properties', params={'city': rows['city'], 'order': 'work_priority'})
    assert response.status_code == 200
    assert signed.get(f'/api/v1/properties/{rows["high"].id}').json() == before
    # A stored valid status without an applicable document is exposed as UNKNOWN,
    # so it belongs to the missing-information group, not a separate raw-status order.
    row = rows['absent']
    row.legal_verification_status = 'VERIFIED_VALID'
    rows['db'].flush()
    result = signed.get(
        '/api/v1/properties', params={'city': rows['city'], 'order': 'work_priority', 'legal_status': 'UNKNOWN'}
    ).json()
    assert str(row.id) in {item['id'] for item in result['items']}
    assert all(item['legal_verification_status'] == 'UNKNOWN' for item in result['items'])


def test_priority_viewer_can_read_and_anonymous_cannot(signed, priority_rows):
    user = priority_rows['db'].get(User, UUID(signed.get('/api/v1/auth/me').json()['id']))
    user.role = 'viewer'
    priority_rows['db'].flush()
    assert signed.get('/api/v1/properties?order=work_priority').status_code == 200
    signed.cookies.clear()
    assert signed.get('/api/v1/properties?order=work_priority').status_code == 401
