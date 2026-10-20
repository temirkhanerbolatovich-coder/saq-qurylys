"""Immutable dictionary bytes, explicit activation history and additive v2 profiles."""

import sqlalchemy as sa

from alembic import op

revision = 'df89eb67a350'
down_revision = 'ce78da56f249'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'monitoring_dictionary_versions',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('dictionary_version', sa.String(30), nullable=False),
        sa.Column('content_sha256', sa.String(64), nullable=False, unique=True),
        sa.Column('source', sa.String(200), nullable=False),
        sa.Column('raw', sa.LargeBinary(), nullable=False),
        sa.Column('original_raw', sa.LargeBinary(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.Uuid(), sa.ForeignKey('users.id'), nullable=False),
    )
    op.create_table(
        'monitoring_dictionary_activations',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('revision', sa.Integer(), nullable=False, unique=True),
        sa.Column('dictionary_id', sa.Uuid(), sa.ForeignKey('monitoring_dictionary_versions.id')),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.Uuid(), sa.ForeignKey('users.id'), nullable=False),
    )
    op.add_column(
        'monitoring_query_profiles',
        sa.Column('dictionary_version', sa.String(10), server_default='1.0', nullable=False),
    )
    op.add_column(
        'monitoring_query_profile_versions',
        sa.Column(
            'dictionary_id',
            sa.Uuid(),
            sa.ForeignKey('monitoring_dictionary_versions.id', name='fk_query_version_dictionary'),
        ),
    )
    op.add_column('monitoring_query_profile_versions', sa.Column('compiled_preview', sa.JSON()))


def downgrade():
    connection = op.get_bind()
    # Removing these columns would irreversibly discard V2 history.
    if connection.scalar(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM monitoring_dictionary_versions) OR EXISTS (SELECT 1 FROM monitoring_dictionary_activations) OR EXISTS (SELECT 1 FROM monitoring_query_profiles WHERE dictionary_version <> '1.0')"
        )
    ):
        raise RuntimeError('V2 dictionary history exists; downgrade would lose reviewed data')
    op.drop_column('monitoring_query_profile_versions', 'compiled_preview')
    op.drop_column('monitoring_query_profile_versions', 'dictionary_id')
    op.drop_column('monitoring_query_profiles', 'dictionary_version')
    op.drop_table('monitoring_dictionary_activations')
    op.drop_table('monitoring_dictionary_versions')
