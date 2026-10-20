"""Shared query profiles and append-only parameter snapshots; no scheduler."""

import sqlalchemy as sa

from alembic import op

revision = 'bd67c945e138'
down_revision = 'ac56b834d027'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'monitoring_query_profiles',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('revision', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.Uuid(), sa.ForeignKey('users.id'), nullable=False),
    )
    op.create_table(
        'monitoring_query_profile_versions',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('profile_id', sa.Uuid(), sa.ForeignKey('monitoring_query_profiles.id'), nullable=False),
        sa.Column('revision', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('parameters', sa.JSON(), nullable=False),
        sa.Column('compiled_queries', sa.JSON(), nullable=False),
        sa.Column('dictionary_sha256', sa.String(64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.Uuid(), sa.ForeignKey('users.id'), nullable=False),
        sa.UniqueConstraint('profile_id', 'revision', name='uq_query_profile_revision'),
    )
    op.create_index(
        'ix_monitoring_query_profile_versions_profile_id', 'monitoring_query_profile_versions', ['profile_id']
    )


def downgrade():
    op.drop_table('monitoring_query_profile_versions')
    op.drop_table('monitoring_query_profiles')
