"""Retain the explicit one-time candidate to dossier origin."""

import sqlalchemy as sa

from alembic import op

revision = 'd92e6a14f301'
down_revision = 'c81d0e5f3472'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('monitoring_candidates', sa.Column('property_id', sa.Uuid(), nullable=True))
    op.create_foreign_key('fk_candidate_property', 'monitoring_candidates', 'properties', ['property_id'], ['id'])
    op.create_unique_constraint('uq_candidate_property', 'monitoring_candidates', ['property_id'])


def downgrade():
    op.drop_constraint('uq_candidate_property', 'monitoring_candidates', type_='unique')
    op.drop_constraint('fk_candidate_property', 'monitoring_candidates', type_='foreignkey')
    op.drop_column('monitoring_candidates', 'property_id')
