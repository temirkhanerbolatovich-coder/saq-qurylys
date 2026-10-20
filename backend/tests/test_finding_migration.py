import runpy
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, text


def test_finding_migration_preserves_existing_rows_and_refuses_history_loss(settings):
    migration = runpy.run_path(
        str(Path(__file__).resolve().parents[1] / 'alembic/versions/ef90fc78b461_monitoring_findings.py')
    )
    engine = create_engine(settings.database_url)
    schema = 'test_findings_' + uuid4().hex
    with engine.connect() as connection:
        transaction = connection.begin()
        try:
            connection.execute(text(f'CREATE SCHEMA {schema}'))
            connection.execute(text(f'SET LOCAL search_path TO {schema}'))
            for table in [
                'users',
                'advertisements',
                'monitoring_runs',
                'monitoring_dictionary_versions',
                'monitoring_query_profile_versions',
            ]:
                connection.execute(text(f'CREATE TABLE {table} (id uuid PRIMARY KEY)'))
            original_id = str(uuid4())
            connection.execute(text('INSERT INTO monitoring_runs VALUES (:id)'), {'id': original_id})
            with Operations.context(MigrationContext.configure(connection)):
                migration['upgrade']()
                assert str(connection.scalar(text('SELECT id FROM monitoring_runs'))) == original_id
                migration['downgrade']()
                assert str(connection.scalar(text('SELECT id FROM monitoring_runs'))) == original_id
                migration['upgrade']()
                connection.execute(
                    text("INSERT INTO monitoring_findings VALUES (:id,'THREADS','123',false,now())"),
                    {'id': str(uuid4())},
                )
                with pytest.raises(RuntimeError, match='history exists'):
                    migration['downgrade']()
                assert connection.scalar(text('SELECT count(*) FROM monitoring_findings')) == 1
                assert str(connection.scalar(text('SELECT id FROM monitoring_runs'))) == original_id
        finally:
            transaction.rollback()
    engine.dispose()
