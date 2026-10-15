"""Versioned immutable signal snapshots and the shared durable PDF queue."""

import sqlalchemy as sa

from alembic import op

revision = 'e87f4d01a921'
down_revision = 'c4f1a903b812'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'signals',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('property_id', sa.Uuid(), nullable=False),
        sa.Column('previous_signal_id', sa.Uuid(), nullable=True),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('revision', sa.Integer(), nullable=False),
        sa.Column('state', sa.String(20), nullable=False),
        sa.Column('snapshot', sa.JSON(), nullable=False),
        sa.Column('decisions', sa.JSON(), nullable=False),
        sa.Column('created_by', sa.Uuid(), nullable=False),
        sa.Column('created_by_details', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('pdf_state', sa.String(20), nullable=False),
        sa.Column('pdf_asset_id', sa.Uuid(), nullable=True),
        sa.Column('pdf_job_id', sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id']),
        sa.ForeignKeyConstraint(['previous_signal_id'], ['signals.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.ForeignKeyConstraint(['pdf_asset_id'], ['assets.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('property_id', 'version', name='uq_property_signal_version'),
        sa.UniqueConstraint('previous_signal_id', name='uq_signal_previous'),
    )
    op.create_index('ix_signals_property_id', 'signals', ['property_id'])
    op.alter_column('analysis_jobs', 'advertisement_id', existing_type=sa.Uuid(), nullable=True)
    op.alter_column('analysis_jobs', 'advertisement_revision', existing_type=sa.Integer(), nullable=True)
    op.add_column('analysis_jobs', sa.Column('signal_id', sa.Uuid(), nullable=True))
    op.add_column('analysis_jobs', sa.Column('target_revision', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_analysis_job_signal', 'analysis_jobs', 'signals', ['signal_id'], ['id'])
    op.create_index('ix_analysis_jobs_signal_id', 'analysis_jobs', ['signal_id'])


def downgrade():
    # PDF jobs cannot be represented in the previous non-null advertisement queue.
    op.execute("DELETE FROM analysis_jobs WHERE kind = 'RENDER_PDF'")
    op.drop_index('ix_analysis_jobs_signal_id', table_name='analysis_jobs')
    op.drop_constraint('fk_analysis_job_signal', 'analysis_jobs', type_='foreignkey')
    op.drop_column('analysis_jobs', 'target_revision')
    op.drop_column('analysis_jobs', 'signal_id')
    op.alter_column('analysis_jobs', 'advertisement_id', existing_type=sa.Uuid(), nullable=False)
    op.alter_column('analysis_jobs', 'advertisement_revision', existing_type=sa.Integer(), nullable=False)
    op.drop_index('ix_signals_property_id', table_name='signals')
    op.drop_table('signals')
