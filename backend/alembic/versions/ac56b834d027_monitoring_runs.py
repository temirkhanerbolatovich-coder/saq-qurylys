"""Durable explicit search attempts, with no automatic replay of external calls."""

import sqlalchemy as sa

from alembic import op

revision = 'ac56b834d027'
down_revision = 'fb45a723c916'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'monitoring_runs',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('source_code', sa.String(40), nullable=False),
        sa.Column('created_by', sa.Uuid(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('command_key', sa.Uuid(), nullable=False),
        sa.Column('body_hash', sa.String(64), nullable=False),
        sa.Column('query', sa.JSON(), nullable=False),
        sa.Column('state', sa.String(25), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deadline_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('finished_at', sa.DateTime(timezone=True)),
        sa.Column('error_code', sa.String(60)),
        sa.Column('http_status', sa.Integer()),
        sa.Column('result', sa.JSON()),
        sa.UniqueConstraint('created_by', 'command_key', name='uq_monitoring_run_command'),
    )
    op.create_index('ix_monitoring_runs_source_code', 'monitoring_runs', ['source_code'])
    op.create_index('ix_monitoring_runs_started_at', 'monitoring_runs', ['started_at'])


def downgrade():
    op.drop_table('monitoring_runs')
