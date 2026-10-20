"""Add CSV receipt and material deduplication, preserving existing publications."""

import sqlalchemy as sa

from alembic import op

revision = 'fb45a723c916'
down_revision = 'ea34f612b805'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'csv_import_batches',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('batch_key', sa.String(64), nullable=False, unique=True),
        sa.Column('filename', sa.String(200), nullable=False),
        sa.Column('file_sha256', sa.String(64), nullable=False),
        sa.Column('format', sa.String(30), nullable=False),
        sa.Column('is_demo', sa.Boolean(), nullable=False),
        sa.Column('original_asset_id', sa.Uuid(), sa.ForeignKey('assets.id'), nullable=False),
        sa.Column('created_by', sa.Uuid(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('row_count', sa.Integer(), nullable=False),
        sa.Column('created_count', sa.Integer(), nullable=False),
        sa.Column('duplicate_count', sa.Integer(), nullable=False),
        sa.Column('entries', sa.JSON(), nullable=False),
    )
    op.create_index('ix_csv_import_batches_created_at', 'csv_import_batches', ['created_at'])
    op.create_table(
        'csv_imported_materials',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('fingerprint', sa.String(64), nullable=False, unique=True),
        sa.Column('identity_key', sa.String(64), nullable=False),
        sa.Column('advertisement_id', sa.Uuid(), sa.ForeignKey('advertisements.id'), nullable=False),
        sa.Column('batch_id', sa.Uuid(), sa.ForeignKey('csv_import_batches.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_csv_imported_materials_identity_key', 'csv_imported_materials', ['identity_key'])


def downgrade():
    op.drop_table('csv_imported_materials')
    op.drop_table('csv_import_batches')
