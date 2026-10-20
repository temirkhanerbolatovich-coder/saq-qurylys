import json
import runpy
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, text


def test_upgrade_preserves_v1_and_downgrade_refuses_retained_dictionary(settings):
    migration = runpy.run_path(
        str(Path(__file__).resolve().parents[1] / 'alembic/versions/df89eb67a350_monitoring_dictionaries.py')
    )
    engine = create_engine(settings.database_url)
    schema = 'test_dictionary_migration_' + uuid4().hex
    with engine.connect() as connection:
        transaction = connection.begin()
        try:
            connection.execute(text(f'CREATE SCHEMA {schema}'))
            connection.execute(text(f'SET LOCAL search_path TO {schema}'))
            connection.execute(text('CREATE TABLE users (id uuid PRIMARY KEY)'))
            connection.execute(text('CREATE TABLE monitoring_query_profiles (id uuid PRIMARY KEY, name text)'))
            connection.execute(
                text(
                    'CREATE TABLE monitoring_query_profile_versions (id uuid PRIMARY KEY, parameters json, compiled_queries json, dictionary_sha256 text)'
                )
            )
            identity = str(uuid4())
            connection.execute(
                text("INSERT INTO monitoring_query_profiles VALUES (:id,'retained v1')"), {'id': identity}
            )
            connection.execute(
                text(
                    "INSERT INTO monitoring_query_profile_versions VALUES (:id,CAST(:parameters AS json),CAST(:queries AS json),'original-sha')"
                ),
                {
                    'id': identity,
                    'parameters': json.dumps({'dictionary_version': '1.0', 'city': 'Өскемен'}),
                    'queries': json.dumps(['original query']),
                },
            )
            with Operations.context(MigrationContext.configure(connection)):
                migration['upgrade']()
                row = connection.execute(text('SELECT dictionary_version FROM monitoring_query_profiles')).scalar_one()
                assert row == '1.0'
                version = connection.execute(
                    text(
                        'SELECT parameters,compiled_queries,dictionary_sha256,dictionary_id,compiled_preview FROM monitoring_query_profile_versions'
                    )
                ).one()
                assert tuple(version) == (
                    {'dictionary_version': '1.0', 'city': 'Өскемен'},
                    ['original query'],
                    'original-sha',
                    None,
                    None,
                )
                migration['downgrade']()
                assert connection.scalar(text('SELECT name FROM monitoring_query_profiles')) == 'retained v1'
                migration['upgrade']()
                user_id, dictionary_id = str(uuid4()), str(uuid4())
                connection.execute(text('INSERT INTO users VALUES (:id)'), {'id': user_id})
                connection.execute(
                    text(
                        "INSERT INTO monitoring_dictionary_versions VALUES (:id,'2.0',:sha,'test',:raw,:original,now(),:actor)"
                    ),
                    {'id': dictionary_id, 'sha': 'a' * 64, 'raw': b'bytes', 'original': b'original', 'actor': user_id},
                )
                with pytest.raises(RuntimeError, match='history exists'):
                    migration['downgrade']()
                assert connection.scalar(text('SELECT raw FROM monitoring_dictionary_versions')) == b'bytes'
        finally:
            transaction.rollback()
    engine.dispose()
