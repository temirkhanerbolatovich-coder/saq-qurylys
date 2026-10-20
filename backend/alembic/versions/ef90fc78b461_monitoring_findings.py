"""Versioned findings, source observations and explicit material imports."""

import sqlalchemy as sa

from alembic import op

revision = 'ef90fc78b461'
down_revision = 'df89eb67a350'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'monitoring_findings',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('platform', sa.String(30), nullable=False),
        sa.Column('external_id', sa.String(100), nullable=False),
        sa.Column('is_demo', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('platform', 'external_id', 'is_demo', name='uq_monitoring_finding_identity'),
    )
    op.create_table(
        'monitoring_finding_versions',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('finding_id', sa.Uuid(), sa.ForeignKey('monitoring_findings.id'), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('content_sha256', sa.String(64), nullable=False),
        sa.Column('dictionary_id', sa.Uuid(), sa.ForeignKey('monitoring_dictionary_versions.id'), nullable=False),
        sa.Column('dictionary_sha256', sa.String(64), nullable=False),
        sa.Column('rules_version', sa.String(50), nullable=False),
        sa.Column('source_url', sa.String(2048), nullable=False),
        sa.Column('published_at', sa.DateTime(timezone=True)),
        sa.Column('captured_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('text', sa.Text()),
        sa.Column('media_type', sa.String(40), nullable=False),
        sa.Column('priority', sa.String(30), nullable=False),
        sa.Column('context', sa.JSON(), nullable=False),
        sa.Column('created_by', sa.Uuid(), sa.ForeignKey('users.id'), nullable=False),
        sa.UniqueConstraint('finding_id', 'version', name='uq_monitoring_finding_version'),
    )
    op.create_index('ix_monitoring_finding_versions_finding_id', 'monitoring_finding_versions', ['finding_id'])
    op.create_index('ix_monitoring_finding_versions_priority', 'monitoring_finding_versions', ['priority'])
    op.create_table(
        'monitoring_finding_observations',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('finding_id', sa.Uuid(), sa.ForeignKey('monitoring_findings.id'), nullable=False),
        sa.Column('version_id', sa.Uuid(), sa.ForeignKey('monitoring_finding_versions.id'), nullable=False),
        sa.Column('run_id', sa.Uuid(), sa.ForeignKey('monitoring_runs.id'), nullable=False),
        sa.Column(
            'profile_version_id', sa.Uuid(), sa.ForeignKey('monitoring_query_profile_versions.id'), nullable=False
        ),
        sa.Column('query_id', sa.String(64), nullable=False),
        sa.Column('captured_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('raw_response_sha256', sa.String(64), nullable=False),
        sa.Column('has_more', sa.Boolean(), nullable=False),
        sa.UniqueConstraint('run_id', 'finding_id', name='uq_monitoring_finding_run'),
    )
    for column in ['finding_id', 'version_id', 'run_id']:
        op.create_index('ix_monitoring_finding_observations_' + column, 'monitoring_finding_observations', [column])
    op.create_table(
        'monitoring_finding_imports',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column(
            'version_id', sa.Uuid(), sa.ForeignKey('monitoring_finding_versions.id'), nullable=False, unique=True
        ),
        sa.Column('observation_id', sa.Uuid(), sa.ForeignKey('monitoring_finding_observations.id'), nullable=False),
        sa.Column('advertisement_id', sa.Uuid(), sa.ForeignKey('advertisements.id'), nullable=False, unique=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.Uuid(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
    )


def downgrade():
    if op.get_bind().scalar(sa.text('SELECT EXISTS (SELECT 1 FROM monitoring_findings)')):
        raise RuntimeError('Finding history exists; downgrade would discard source versions and import provenance')
    for table in [
        'monitoring_finding_imports',
        'monitoring_finding_observations',
        'monitoring_finding_versions',
        'monitoring_findings',
    ]:
        op.drop_table(table)
