"""Keep provenance of manually uploaded supporting documents."""

import sqlalchemy as sa

from alembic import op

revision = 'c4f1a903b812'
down_revision = '996510abee9b'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('assets', sa.Column('source_details', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('assets', 'source_details')
