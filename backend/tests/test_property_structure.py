from datetime import datetime, timezone
from uuid import UUID, uuid4

import pytest

from app.dependencies import get_db
from app.models import Developer, Property, User


@pytest.fixture
def structure_rows(signed):
    with signed.app.state.sessions() as db:
        developer = Developer(name=f'DEMO structure {uuid4()}', bin=None, is_demo=True)
        db.add(developer)
        db.flush()

        def row(name, level, parent_id=None):
            item = Property(
                name=name,
                level=level,
                parent_id=parent_id,
                developer_id=developer.id,
                city='DEMO',
                address='DEMO адрес',
                is_demo=True,
                last_reviewed_at=datetime(2026, 10, 18, tzinfo=timezone.utc),
            )
            db.add(item)
            db.flush()
            return item

        root = row('DEMO ЖК', 'PROJECT')
        phase = row('DEMO Очередь', 'PHASE', root.id)
        buildings = [row(f'DEMO Корпус {index:03}', 'BUILDING', phase.id) for index in range(103)]
        # Similar names and shared developer/aliases are never a structural link.
        unrelated = row('DEMO Корпус 000', 'BUILDING')
        unrelated.aliases = [phase.name]
        db.flush()

        def test_db():
            yield db

        signed.app.dependency_overrides[get_db] = test_db
        try:
            yield db, root, phase, buildings, unrelated
        finally:
            signed.app.dependency_overrides.pop(get_db)
            db.rollback()


def test_structure_uses_saved_relationships_and_pages_all_children(signed, structure_rows):
    _, root, phase, buildings, unrelated = structure_rows
    first = signed.get(f'/api/v1/properties/{phase.id}/structure').json()
    assert [item['id'] for item in first['ancestors']] == [str(root.id)]
    assert first['siblings']['total'] == 0
    assert first['children']['total'] == 103
    last = signed.get(f'/api/v1/properties/{phase.id}/structure?children_page=11').json()
    assert last['children']['page'] == 11 and last['children']['page_size'] == 10
    assert [item['id'] for item in last['children']['items']] == [str(item.id) for item in buildings[100:]]
    assert str(unrelated.id) not in {item['id'] for item in last['children']['items']}
    assert set(first['children']['items'][0]) == {'id', 'parent_id', 'level', 'name', 'address', 'is_demo'}


def test_structure_breadcrumb_order_and_independent_sibling_page(signed, structure_rows):
    _, root, phase, buildings, _ = structure_rows
    result = signed.get(f'/api/v1/properties/{buildings[0].id}/structure?siblings_page=11').json()
    assert [item['id'] for item in result['ancestors']] == [str(root.id), str(phase.id)]
    assert result['children']['total'] == 0 and result['children']['page'] == 1
    assert result['siblings']['total'] == 102 and result['siblings']['page'] == 11
    assert [item['id'] for item in result['siblings']['items']] == [str(item.id) for item in buildings[101:]]


def test_root_has_no_inferred_siblings_and_reads_do_not_change_state(signed, structure_rows):
    _, root, _, _, unrelated = structure_rows
    before = signed.get(f'/api/v1/properties/{root.id}').json()
    result = signed.get(f'/api/v1/properties/{root.id}/structure').json()
    assert result['ancestors'] == [] and result['siblings']['total'] == 0
    assert result['children']['total'] == 1
    assert signed.get(f'/api/v1/properties/{root.id}').json() == before
    empty = signed.get(f'/api/v1/properties/{unrelated.id}/structure').json()
    assert empty['ancestors'] == [] and empty['children']['total'] == empty['siblings']['total'] == 0


@pytest.mark.parametrize('query', ['children_page=0', 'siblings_page=-1', 'page_size=101', 'page_size=0'])
def test_structure_validates_page_parameters(signed, structure_rows, query):
    assert signed.get(f'/api/v1/properties/{structure_rows[1].id}/structure?{query}').status_code == 422


def test_structure_fails_on_cycles_without_breaking_dossier(signed, structure_rows):
    db, root, phase, _, _ = structure_rows
    root.parent_id = phase.id
    db.flush()
    response = signed.get(f'/api/v1/properties/{phase.id}/structure')
    assert response.status_code == 409 and 'цикл' in response.json()['error']['message']
    assert signed.get(f'/api/v1/properties/{phase.id}').status_code == 200


def test_structure_bounds_malformed_ancestor_depth(signed, structure_rows):
    db, root, _, _, _ = structure_rows
    parent = root
    for index in range(17):
        row = Property(
            name=f'DEMO level {index}',
            level='PHASE',
            parent_id=parent.id,
            developer_id=root.developer_id,
            city='DEMO',
            address='DEMO',
            is_demo=True,
        )
        db.add(row)
        db.flush()
        parent = row
    response = signed.get(f'/api/v1/properties/{parent.id}/structure')
    assert response.status_code == 409 and '16 уровней' in response.json()['error']['message']


def test_viewer_can_read_structure(signed, structure_rows):
    db, root, _, _, _ = structure_rows
    user = db.get(User, UUID(signed.get('/api/v1/auth/me').json()['id']))
    user.role = 'viewer'
    db.flush()
    assert signed.get(f'/api/v1/properties/{root.id}/structure').status_code == 200


def test_structure_requires_authentication_and_existing_object(client):
    path = f'/api/v1/properties/{uuid4()}/structure'
    assert client.get(path).status_code == 401


def test_structure_missing_object_is_not_an_empty_family(signed):
    assert signed.get(f'/api/v1/properties/{uuid4()}/structure').status_code == 404
