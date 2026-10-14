import hashlib
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

from conftest import mutation_headers
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.main import create_app
from app.models import Advertisement, AuditEvent, Property, User
from app.seed import demo_id, seed


def new_ad(**changes):
    return {
        'text': 'Новый текст: ақылы брондау 125 000 теңге.\nОригинал сақталсын.',
        'source_label': 'Собственный тестовый материал',
        'published_at': None,
        'is_demo': True,
        **changes,
    }


def test_private_endpoints_require_session(client):
    for path in ['/properties', '/advertisements', '/dashboard/summary']:
        assert client.get('/api/v1' + path).status_code == 401


def test_seed_is_additive_and_control_scenarios_are_real(signed, settings):
    with signed.app.state.sessions() as db:
        count = db.scalar(select(func.count()).select_from(Advertisement))
        assert seed(db, settings) == 0
        assert db.scalar(select(func.count()).select_from(Advertisement)) == count
        assert db.scalar(select(func.count()).select_from(Property)) == 8
    for key, expected in [('samal', (35, 'YELLOW')), ('baiterek', (70, 'RED')), ('orken', (10, 'GREEN'))]:
        response = signed.get(f'/api/v1/properties/{demo_id(key)}/risk')
        assert response.status_code == 200
        risk = response.json()['summary']
        assert (risk['score'], risk['zone']) == expected


def test_filter_and_pagination(signed):
    result = signed.get('/api/v1/properties?zone=RED&page_size=1').json()
    assert result['total'] == 1 and len(result['items']) == 1
    assert result['items'][0]['risk']['zone'] == 'RED'
    assert signed.get('/api/v1/properties?q=Самал').json()['total'] == 1
    assert signed.get('/api/v1/properties?q=%25').json()['total'] == 0
    assert signed.get('/api/v1/properties?page_size=101').status_code == 422
    assert signed.get('/api/v1/properties?zone=INVALID').status_code == 422


def test_csrf_and_origin_are_required(signed):
    assert signed.post('/api/v1/advertisements', json=new_ad()).status_code == 422
    headers = mutation_headers(signed)
    headers['Origin'] = 'https://untrusted.example'
    assert signed.post('/api/v1/advertisements', json=new_ad(), headers=headers).status_code == 403


def test_new_text_provenance_integrity_actor_and_idempotency(signed, settings):
    key = uuid4()
    headers = mutation_headers(signed, key)
    result = signed.post('/api/v1/advertisements', json=new_ad(), headers=headers)
    assert result.status_code == 201, result.text
    row = result.json()
    assert row['published_at'] is None and row['original_text'] == new_ad()['text']
    assert row['captured_at'] and row['status'] == 'NEW' and row['confirmed_property_id'] is None
    assert signed.post('/api/v1/advertisements', json=new_ad(), headers=headers).json() == row
    assert (
        signed.post('/api/v1/advertisements', json=new_ad(text='Другое содержимое'), headers=headers).status_code == 409
    )
    data = signed.get(f'/api/v1/assets/{row["assets"][0]["id"]}').content
    assert data.decode('utf-8') == new_ad()['text']
    assert hashlib.sha256(data).hexdigest() == row['assets'][0]['sha256']
    actor = signed.get('/api/v1/auth/me').json()
    with signed.app.state.sessions() as db:
        stored = db.get(Advertisement, row['id'])
        audit = db.scalar(select(AuditEvent).where(AuditEvent.entity_id == stored.id))
        assert str(stored.created_by) == actor['id'] == str(audit.actor_id)
    with TestClient(create_app(settings), base_url='http://localhost:3000') as restarted:
        restarted.cookies.update(signed.cookies)
        persisted = restarted.get(f'/api/v1/advertisements/{row["id"]}')
        assert persisted.status_code == 200 and persisted.json() == row
    assert signed.get(f'/api/v1/properties/{demo_id("samal")}/risk').json()['summary']['score'] == 35


def test_invalid_input_does_not_accept_author_or_naive_date(signed):
    for payload in [
        new_ad(text='   '),
        new_ad(source_label=' '),
        new_ad(actor_id=str(uuid4())),
        new_ad(published_at='2026-10-14T10:00:00'),
        new_ad(source_url='file:///private'),
    ]:
        assert signed.post('/api/v1/advertisements', json=payload, headers=mutation_headers(signed)).status_code == 422


def test_viewer_cannot_create_material(signed, settings):
    with signed.app.state.sessions() as db:
        user = db.scalar(select(User).where(User.username == settings.bootstrap_analyst_username))
        user.role = 'viewer'
        db.commit()
    try:
        assert signed.post('/api/v1/advertisements', json=new_ad(), headers=mutation_headers(signed)).status_code == 403
    finally:
        with signed.app.state.sessions() as db:
            user = db.scalar(select(User).where(User.username == settings.bootstrap_analyst_username))
            user.role = 'analyst'
            db.commit()


def test_logout_revokes_session(signed):
    assert signed.post('/api/v1/auth/logout', headers=mutation_headers(signed)).status_code == 204
    assert signed.get('/api/v1/auth/me').status_code == 401


def test_login_error_never_echoes_password(client, settings):
    csrf = client.get('/api/v1/auth/csrf').json()['csrf_token']
    secret = 'private-invalid-credential'
    result = client.post(
        '/api/v1/auth/login',
        json={'username': 'absent', 'password': secret},
        headers={'Origin': settings.app_origin, 'X-CSRF-Token': csrf},
    )
    assert result.status_code == 401 and secret not in result.text


def test_same_command_concurrent_requests_create_one_ad(signed):
    headers = mutation_headers(signed)
    cookies = dict(signed.cookies)

    def send():
        with TestClient(signed.app, base_url='http://localhost:3000') as client:
            client.cookies.update(cookies)
            return client.post('/api/v1/advertisements', json=new_ad(text='Concurrent input'), headers=headers)

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda _: send(), range(2)))
    assert [response.status_code for response in responses] == [201, 201]
    assert responses[0].json()['id'] == responses[1].json()['id']
