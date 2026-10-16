"""Manual candidates, immutable DEMO registry comparisons and preliminary cases."""

import sqlalchemy as sa

from alembic import op

revision = 'b26f105d7c41'
down_revision = 'a91b76f2c305'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'monitoring_candidates',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('identity_key', sa.String(64), nullable=False, unique=True),
        sa.Column('name', sa.String(300), nullable=False),
        sa.Column('city', sa.String(100), nullable=False),
        sa.Column('address', sa.String(300)),
        sa.Column('phase', sa.String(100)),
        sa.Column('is_demo', sa.Boolean(), nullable=False),
        sa.Column('revision', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.Uuid(), sa.ForeignKey('users.id'), nullable=False),
    )
    op.create_index('ix_monitoring_candidates_created_at', 'monitoring_candidates', ['created_at'])
    op.create_table(
        'monitoring_observations',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('candidate_id', sa.Uuid(), sa.ForeignKey('monitoring_candidates.id'), nullable=False),
        sa.Column('advertisement_id', sa.Uuid(), sa.ForeignKey('advertisements.id'), nullable=False),
        sa.Column('advertisement_revision', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.Uuid(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.UniqueConstraint('candidate_id', 'advertisement_id', name='uq_monitoring_observation'),
    )
    op.create_index('ix_monitoring_observations_candidate_id', 'monitoring_observations', ['candidate_id'])
    op.create_table(
        'monitoring_registry_snapshots',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('label', sa.String(300), nullable=False),
        sa.Column('city', sa.String(100), nullable=False),
        sa.Column('is_demo', sa.Boolean(), nullable=False),
        sa.Column('coverage_from', sa.DateTime(timezone=True), nullable=False),
        sa.Column('coverage_until', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('complete', sa.Boolean(), nullable=False),
        sa.Column('entries', sa.JSON(), nullable=False),
        sa.Column('sha256', sa.String(64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.Uuid(), sa.ForeignKey('users.id'), nullable=False),
    )
    op.create_index('ix_monitoring_registry_snapshots_created_at', 'monitoring_registry_snapshots', ['created_at'])
    op.create_table(
        'monitoring_comparisons',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('deduplication_key', sa.String(64), nullable=False, unique=True),
        sa.Column('candidate_id', sa.Uuid(), sa.ForeignKey('monitoring_candidates.id'), nullable=False),
        sa.Column('advertisement_id', sa.Uuid(), sa.ForeignKey('advertisements.id'), nullable=False),
        sa.Column('candidate_revision', sa.Integer(), nullable=False),
        sa.Column('advertisement_revision', sa.Integer(), nullable=False),
        sa.Column('snapshot_id', sa.Uuid(), sa.ForeignKey('monitoring_registry_snapshots.id')),
        sa.Column('result', sa.String(60), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('matched_entries', sa.JSON(), nullable=False),
        sa.Column('identity_snapshot', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.Uuid(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('algorithm_version', sa.String(100), nullable=False),
    )
    op.create_index('ix_monitoring_comparisons_candidate_id', 'monitoring_comparisons', ['candidate_id'])
    op.create_index('ix_monitoring_comparisons_created_at', 'monitoring_comparisons', ['created_at'])
    op.create_table(
        'monitoring_incidents',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('candidate_id', sa.Uuid(), sa.ForeignKey('monitoring_candidates.id'), nullable=False),
        sa.Column('candidate_name', sa.String(300), nullable=False),
        sa.Column('is_demo', sa.Boolean(), nullable=False),
        sa.Column('rule_code', sa.String(60), nullable=False),
        sa.Column('state', sa.String(20), nullable=False),
        sa.Column('revision', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('close_reason', sa.String(30)),
        sa.Column('latest_comparison_id', sa.Uuid(), sa.ForeignKey('monitoring_comparisons.id'), nullable=False),
        sa.Column('history', sa.JSON(), nullable=False),
    )
    op.create_index('ix_monitoring_incidents_candidate_id', 'monitoring_incidents', ['candidate_id'])
    op.create_index(
        'uq_monitoring_active_incident',
        'monitoring_incidents',
        ['candidate_id', 'rule_code'],
        unique=True,
        postgresql_where=sa.text("state <> 'CLOSED'"),
    )
    op.create_table(
        'monitoring_incident_comparisons',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('incident_id', sa.Uuid(), sa.ForeignKey('monitoring_incidents.id'), nullable=False),
        sa.Column('comparison_id', sa.Uuid(), sa.ForeignKey('monitoring_comparisons.id'), nullable=False),
        sa.UniqueConstraint('comparison_id', name='uq_monitoring_incident_comparison'),
    )
    op.create_index(
        'ix_monitoring_incident_comparisons_incident_id', 'monitoring_incident_comparisons', ['incident_id']
    )


def downgrade():
    for table in (
        'monitoring_incident_comparisons',
        'monitoring_incidents',
        'monitoring_comparisons',
        'monitoring_registry_snapshots',
        'monitoring_observations',
        'monitoring_candidates',
    ):
        op.drop_table(table)
