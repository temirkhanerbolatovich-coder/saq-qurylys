"""Explicit opt-in URL schedules and durable attempts; existing queue retained."""

import sqlalchemy as sa

from alembic import op

revision = 'ce78da56f249'
down_revision = 'bd67c945e138'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'url_schedules',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('url', sa.String(2048), nullable=False, unique=True),
        sa.Column('source_id', sa.String(100), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('interval_minutes', sa.Integer(), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False),
        sa.Column('revision', sa.Integer(), nullable=False),
        sa.Column('next_run_at', sa.DateTime(timezone=True)),
        sa.Column('failure_count', sa.Integer(), nullable=False),
        sa.Column('pause_reason', sa.String(100)),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.Uuid(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('updated_by', sa.Uuid(), sa.ForeignKey('users.id'), nullable=False),
    )
    op.create_index('ix_url_schedules_next_run_at', 'url_schedules', ['next_run_at'])
    op.create_table(
        'url_schedule_runs',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('schedule_id', sa.Uuid(), sa.ForeignKey('url_schedules.id'), nullable=False),
        sa.Column('configuration', sa.JSON(), nullable=False),
        sa.Column('due_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('finished_at', sa.DateTime(timezone=True)),
        sa.Column('state', sa.String(20), nullable=False),
        sa.Column('reason', sa.String(100)),
        sa.Column('job_id', sa.Uuid(), sa.ForeignKey('analysis_jobs.id')),
        sa.Column('reused_job', sa.Boolean(), nullable=False),
    )
    op.create_index('ix_url_schedule_runs_schedule_id', 'url_schedule_runs', ['schedule_id'])
    op.create_index('ix_url_schedule_runs_state', 'url_schedule_runs', ['state'])


def downgrade():
    op.drop_table('url_schedule_runs')
    op.drop_table('url_schedules')
