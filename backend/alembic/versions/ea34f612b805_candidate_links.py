"""Separate dossier origin from explicit candidate identity links."""

import sqlalchemy as sa

from alembic import op

revision = 'ea34f612b805'
down_revision = 'd92e6a14f301'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('monitoring_candidates', sa.Column('property_link_kind', sa.String(20), nullable=True))
    op.execute("UPDATE monitoring_candidates SET property_link_kind = 'CREATED' WHERE property_id IS NOT NULL")
    op.drop_constraint('uq_candidate_property', 'monitoring_candidates', type_='unique')
    op.create_index('ix_monitoring_candidates_property_id', 'monitoring_candidates', ['property_id'])
    op.create_index(
        'uq_candidate_property_created',
        'monitoring_candidates',
        ['property_id'],
        unique=True,
        postgresql_where=sa.text("property_link_kind = 'CREATED'"),
    )
    op.create_check_constraint(
        'ck_candidate_property_link',
        'monitoring_candidates',
        '(property_id IS NULL AND property_link_kind IS NULL) OR '
        "(property_id IS NOT NULL AND property_link_kind IS NOT NULL AND property_link_kind IN ('CREATED', 'LINKED'))",
    )


def downgrade():
    if op.get_bind().scalar(
        sa.text("SELECT EXISTS (SELECT 1 FROM monitoring_candidates WHERE property_link_kind = 'LINKED')")
    ):
        raise RuntimeError(
            'Cannot downgrade candidate links while LINKED decisions exist; preserve their audit history.'
        )
    op.drop_constraint('ck_candidate_property_link', 'monitoring_candidates', type_='check')
    op.drop_index('uq_candidate_property_created', table_name='monitoring_candidates')
    op.drop_index('ix_monitoring_candidates_property_id', table_name='monitoring_candidates')
    op.create_unique_constraint('uq_candidate_property', 'monitoring_candidates', ['property_id'])
    op.drop_column('monitoring_candidates', 'property_link_kind')
