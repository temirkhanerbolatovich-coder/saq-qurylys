from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.dependencies import get_db
from app.models import Developer, Property


@pytest.fixture
def search_rows(signed):
    label = f'DEMO search {uuid4()}'
    with signed.app.state.sessions() as db:
        developer = Developer(name=f'{label} ТОО Өркен Құрылыс', bin='990000001017')
        other_developer = Developer(name=f'{label} Иной застройщик', bin=None)
        db.add_all([developer, other_developer])
        db.flush()

        def row(name, address, aliases, developer_id, is_demo=True):
            item = Property(
                name=name,
                city=label,
                address=address,
                aliases=aliases,
                developer_id=developer_id,
                is_demo=is_demo,
                last_reviewed_at=datetime(2026, 10, 18, tzinfo=timezone.utc),
            )
            db.add(item)
            db.flush()
            return item

        target = row(
            'DEMO Береговой корпус А',
            'DEMO Набережная 17',
            ['Таңғы Өскемен', 'Береговой', 'Повтор совпадения', 'Повтор совпадения', 'Знак%_\\литерал'],
            developer.id,
        )
        sibling = row('DEMO Береговой корпус Б', 'DEMO Улица 21', [], developer.id, is_demo=False)
        unrelated = row('DEMO Другой объект', 'DEMO Улица 35', ['alpha', 'beta'], other_developer.id)

        def test_db():
            yield db

        signed.app.dependency_overrides[get_db] = test_db
        try:
            yield {'city': label, 'target': target, 'sibling': sibling, 'unrelated': unrelated, 'developer': developer}
        finally:
            signed.app.dependency_overrides.pop(get_db)
            db.rollback()


@pytest.mark.parametrize(
    'query',
    ['корпус а', 'набережная 17', '  ТАҢҒЫ өскемен  ', 'Повтор совпадения', '%', '_', '\\'],
)
def test_search_matches_saved_fields_and_literal_special_characters(signed, search_rows, query):
    response = signed.get('/api/v1/properties', params={'city': search_rows['city'], 'q': query})
    assert response.status_code == 200, response.text
    data = response.json()
    assert data['total'] == 1
    assert [row['id'] for row in data['items']] == [str(search_rows['target'].id)]


@pytest.mark.parametrize('query', ['өркен құрылыс', '990000001017', '00001017', 'береговой'])
def test_search_developer_and_bin_keeps_pagination_and_demo_filter(signed, search_rows, query):
    params = {'city': search_rows['city'], 'q': query, 'page_size': 1}
    first = signed.get('/api/v1/properties', params=params).json()
    second = signed.get('/api/v1/properties', params={**params, 'page': 2}).json()
    assert first['total'] == second['total'] == 2
    assert {first['items'][0]['id'], second['items'][0]['id']} == {
        str(search_rows['target'].id),
        str(search_rows['sibling'].id),
    }
    demo = signed.get('/api/v1/properties', params={**params, 'is_demo': True}).json()
    assert demo['total'] == 1 and demo['items'][0]['id'] == str(search_rows['target'].id)


@pytest.mark.parametrize('query', ['ha", "be', "' OR 1=1 --", 'НЕСУЩЕСТВУЮЩЕЕ'])
def test_search_does_not_match_json_array_syntax_or_interpret_sql(signed, search_rows, query):
    response = signed.get('/api/v1/properties', params={'city': search_rows['city'], 'q': query})
    assert response.status_code == 200, response.text
    assert response.json()['total'] == 0


def test_search_preserves_filters_summary_and_property_state(signed, search_rows):
    params = {'city': search_rows['city'], 'q': 'Өркен Құрылыс', 'zone': 'GREEN', 'legal_status': 'UNKNOWN'}
    before = signed.get(f'/api/v1/properties/{search_rows["target"].id}').json()
    response = signed.get('/api/v1/properties', params=params)
    assert response.status_code == 200
    assert response.json()['total'] == 2
    summary = signed.get('/api/v1/dashboard/summary', params=params).json()
    assert summary['unknown_legal_bases'] == 2
    assert signed.get('/api/v1/properties', params={**params, 'zone': 'RED'}).json()['total'] == 0
    after = signed.get(f'/api/v1/properties/{search_rows["target"].id}').json()
    assert after == before
    assert signed.get('/api/v1/properties', params={'q': 'x' * 301}).status_code == 422


def test_whitespace_search_is_an_empty_filter(signed, search_rows):
    response = signed.get('/api/v1/properties', params={'city': search_rows['city'], 'q': '   '})
    assert response.status_code == 200
    assert response.json()['total'] == 3
