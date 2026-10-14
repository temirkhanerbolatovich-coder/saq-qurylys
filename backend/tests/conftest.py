import os
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from alembic import command
from app.config import Settings
from app.main import create_app
from app.seed import seed


@pytest.fixture(scope='session')
def settings(tmp_path_factory):
    original = Settings()
    admin = create_engine(original.database_url)
    schema = f'test_{uuid4().hex}'
    with admin.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA {schema}'))
    url = make_url(original.database_url).update_query_dict({'options': f'-csearch_path={schema}'})
    test_settings = original.model_copy(
        update={
            'database_url': url.render_as_string(hide_password=False),
            'storage_root': tmp_path_factory.mktemp('assets'),
        }
    )
    old_url = os.environ.get('DATABASE_URL')
    os.environ['DATABASE_URL'] = test_settings.database_url
    try:
        command.upgrade(Config(str(Path(__file__).resolve().parents[1] / 'alembic.ini')), 'head')
        engine = create_engine(test_settings.database_url)
        with Session(engine) as db:
            seed(db, test_settings)
        engine.dispose()
        yield test_settings
    finally:
        if old_url is None:
            os.environ.pop('DATABASE_URL', None)
        else:
            os.environ['DATABASE_URL'] = old_url
        # Only this run's random schema is removed; public and existing data are untouched.
        assert schema.startswith('test_') and len(schema) == 37
        with admin.begin() as connection:
            connection.execute(text(f'DROP SCHEMA {schema} CASCADE'))
        admin.dispose()


@pytest.fixture
def client(settings):
    with TestClient(create_app(settings), base_url='http://localhost:3000') as value:
        yield value


@pytest.fixture
def signed(client, settings):
    csrf = client.get('/api/v1/auth/csrf').json()['csrf_token']
    result = client.post(
        '/api/v1/auth/login',
        json={'username': settings.bootstrap_analyst_username, 'password': settings.bootstrap_analyst_password},
        headers={'Origin': settings.app_origin, 'X-CSRF-Token': csrf},
    )
    assert result.status_code == 200
    return client


def mutation_headers(client, key=None):
    return {
        'Origin': 'http://localhost:3000',
        'X-CSRF-Token': client.get('/api/v1/auth/csrf').json()['csrf_token'],
        'Idempotency-Key': str(key or uuid4()),
    }
