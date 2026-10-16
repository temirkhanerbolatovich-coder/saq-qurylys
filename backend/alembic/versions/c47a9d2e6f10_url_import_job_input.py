"""Persist URL-import input in the existing leased queue."""

import sqlalchemy as sa

from alembic import op

revision = 'c47a9d2e6f10'
down_revision = 'b26f105d7c41'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('analysis_jobs', sa.Column('input_payload', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('analysis_jobs', 'input_payload')
