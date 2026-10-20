import runpy
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError


def test_candidate_origin_survives_upgrade_and_linked_decisions_block_downgrade(settings):
    migration = runpy.run_path(
        str(Path(__file__).resolve().parents[1] / 'alembic/versions/ea34f612b805_candidate_links.py')
    )
    engine = create_engine(settings.database_url)
    schema = 'test_linkmig_' + uuid4().hex
    # Transactional DDL in a new random schema; no existing tables or data are altered.
    with engine.connect() as connection:
        transaction = connection.begin()
        try:
            connection.execute(text(f'CREATE SCHEMA {schema}'))
            connection.execute(text(f'SET LOCAL search_path TO {schema}'))
            connection.execute(text('CREATE TABLE properties (id uuid PRIMARY KEY)'))
            connection.execute(
                text(
                    'CREATE TABLE monitoring_candidates (id uuid PRIMARY KEY, property_id uuid REFERENCES properties(id), CONSTRAINT uq_candidate_property UNIQUE(property_id))'
                )
            )
            prop, origin, linked = [str(uuid4()) for _ in range(3)]
            connection.execute(text('INSERT INTO properties VALUES (:id)'), {'id': prop})
            connection.execute(
                text('INSERT INTO monitoring_candidates VALUES (:id, :prop)'), {'id': origin, 'prop': prop}
            )
            with Operations.context(MigrationContext.configure(connection)):
                migration['upgrade']()
                assert (
                    connection.scalar(
                        text('SELECT property_link_kind FROM monitoring_candidates WHERE id=:id'), {'id': origin}
                    )
                    == 'CREATED'
                )
                connection.execute(
                    text("INSERT INTO monitoring_candidates VALUES (:id, :prop, 'LINKED')"),
                    {'id': linked, 'prop': prop},
                )
                with pytest.raises(IntegrityError), connection.begin_nested():
                    connection.execute(
                        text("INSERT INTO monitoring_candidates VALUES (:id, :prop, 'CREATED')"),
                        {'id': str(uuid4()), 'prop': prop},
                    )
                with pytest.raises(IntegrityError), connection.begin_nested():
                    connection.execute(
                        text("INSERT INTO monitoring_candidates VALUES (:id, NULL, 'LINKED')"), {'id': str(uuid4())}
                    )
                with pytest.raises(RuntimeError, match='LINKED decisions exist'):
                    migration['downgrade']()
                assert connection.scalar(text('SELECT count(*) FROM monitoring_candidates')) == 2
                connection.execute(text('DELETE FROM monitoring_candidates WHERE id=:id'), {'id': linked})
                migration['downgrade']()
                assert (
                    connection.scalar(
                        text('SELECT property_id FROM monitoring_candidates WHERE id=:id'), {'id': origin}
                    )
                    is not None
                )
        finally:
            transaction.rollback()
    engine.dispose()
