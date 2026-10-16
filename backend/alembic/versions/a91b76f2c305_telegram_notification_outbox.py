"""Transactional Telegram notifications, separate from OCR/PDF jobs."""

import sqlalchemy as sa

from alembic import op

revision = 'a91b76f2c305'
down_revision = 'e87f4d01a921'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'telegram_notifications',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('deduplication_key', sa.String(150), nullable=False),
        sa.Column('property_id', sa.Uuid(), nullable=False),
        sa.Column('factor_id', sa.Uuid(), nullable=False),
        sa.Column('factor_revision', sa.Integer(), nullable=False),
        sa.Column('bot_id', sa.String(20), nullable=False),
        sa.Column('chat_id', sa.String(20), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('state', sa.String(20), nullable=False),
        sa.Column('attempt', sa.Integer(), nullable=False),
        sa.Column('next_attempt_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('lease_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('claim_token', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('message_id', sa.BigInteger(), nullable=True),
        sa.Column('error_code', sa.String(60), nullable=True),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id']),
        sa.ForeignKeyConstraint(['factor_id'], ['risk_factors.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('deduplication_key'),
    )
    op.create_index('ix_telegram_notifications_property_id', 'telegram_notifications', ['property_id'])
    op.create_index('ix_telegram_notifications_state', 'telegram_notifications', ['state'])


def downgrade():
    op.drop_index('ix_telegram_notifications_state', table_name='telegram_notifications')
    op.drop_index('ix_telegram_notifications_property_id', table_name='telegram_notifications')
    op.drop_table('telegram_notifications')
