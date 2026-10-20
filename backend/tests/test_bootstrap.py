"""First startup without DEMO must permit login without resetting retained accounts."""

from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.main import create_app
from app.models import Base, User
from app.security import verify_password
from app.seed import seed


@pytest.fixture
def empty_installation(settings, tmp_path):
    schema = 'test_bootstrap_' + uuid4().hex
    admin = create_engine(settings.database_url)
    with admin.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA {schema}'))
    url = make_url(settings.database_url).update_query_dict({'options': f'-csearch_path={schema}'})
    config = settings.model_copy(
        update={'database_url': url.render_as_string(hide_password=False), 'storage_root': tmp_path / 'assets'}
    )
    engine = create_engine(config.database_url)
    try:
        Base.metadata.create_all(engine)
        yield config, engine
    finally:
        engine.dispose()
        assert schema.startswith('test_bootstrap_') and len(schema) == 47
        with admin.begin() as connection:
            connection.execute(text(f'DROP SCHEMA {schema} CASCADE'))
        admin.dispose()


def test_bootstrap_without_demo_needs_no_fixtures_and_permits_login(empty_installation, tmp_path, monkeypatch):
    config, engine = empty_installation
    monkeypatch.setattr('app.seed.ROOT', tmp_path / 'missing-fixtures')
    with Session(engine) as db:
        assert seed(db, config, include_demo=False) == 0
        for table in Base.metadata.sorted_tables:
            assert db.scalar(select(func.count()).select_from(table)) == (1 if table.name == 'users' else 0)
        user = db.scalar(select(User))
        assert user.username == config.bootstrap_analyst_username and user.role == 'analyst'
        assert verify_password(config.bootstrap_analyst_password, user.password_hash)
    assert not config.storage_root.exists()
    with TestClient(create_app(config), base_url=config.app_origin) as client:
        token = client.get('/api/v1/auth/csrf').json()['csrf_token']
        response = client.post(
            '/api/v1/auth/login',
            json={'username': config.bootstrap_analyst_username, 'password': config.bootstrap_analyst_password},
            headers={'Origin': config.app_origin, 'X-CSRF-Token': token},
        )
        assert response.status_code == 200
        assert client.get('/api/v1/auth/me').json()['role'] == 'analyst'
        assert client.get('/api/v1/properties').json()['total'] == 0


def test_bootstrap_is_idempotent_and_does_not_reset_existing_account(empty_installation):
    config, engine = empty_installation
    with Session(engine) as db:
        seed(db, config, include_demo=False)
        user = db.scalar(select(User))
        user.role = 'viewer'
        user.display_name = 'Сохранённый пользователь'
        db.commit()
        identity = user.id
        old_hash = user.password_hash
    changed = config.model_copy(update={'bootstrap_analyst_password': 'different-private-password'})
    for _ in range(2):
        with Session(engine) as db:
            assert seed(db, changed, include_demo=False) == 0
            assert db.scalar(select(func.count()).select_from(User)) == 1
            retained = db.scalar(select(User))
            assert retained.id == identity and retained.password_hash == old_hash
            assert retained.role == 'viewer' and retained.display_name == 'Сохранённый пользователь'
            assert verify_password(config.bootstrap_analyst_password, retained.password_hash)
            assert not verify_password(changed.bootstrap_analyst_password, retained.password_hash)


def test_parallel_first_start_creates_one_account(empty_installation):
    config, engine = empty_installation
    barrier = Barrier(2)

    def bootstrap(_):
        with Session(engine) as db:
            barrier.wait(timeout=10)
            return seed(db, config, include_demo=False)

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert list(pool.map(bootstrap, range(2))) == [0, 0]
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(User)) == 1
        assert verify_password(config.bootstrap_analyst_password, db.scalar(select(User)).password_hash)
