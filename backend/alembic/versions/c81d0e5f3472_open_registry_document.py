"""Immutable operator-uploaded public KHC PDF with bounded page text."""

import sqlalchemy as sa

from alembic import op

revision = 'c81d0e5f3472'
down_revision = 'c47a9d2e6f10'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'open_registry_documents',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('asset_id', sa.Uuid(), sa.ForeignKey('assets.id'), nullable=False, unique=True),
        sa.Column('source_url', sa.String(2048), nullable=False),
        sa.Column('publisher', sa.String(300), nullable=False),
        sa.Column('as_of', sa.Date(), nullable=False),
        sa.Column('pages', sa.JSON(), nullable=False),
        sa.Column('sha256', sa.String(64), nullable=False, unique=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.Uuid(), sa.ForeignKey('users.id'), nullable=False),
    )
    op.create_index('ix_open_registry_documents_created_at', 'open_registry_documents', ['created_at'])


def downgrade():
    op.drop_table('open_registry_documents')
