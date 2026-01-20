"""Initial migration - create jobs table

Revision ID: 001
Revises:
Create Date: 2024-01-19 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create jobs table
    op.create_table(
        'jobs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('github_url', sa.String(), nullable=False),
        sa.Column('status', sa.Enum('pending', 'processing', 'completed', 'failed', name='jobstatus'), nullable=False),
        sa.Column('error_message', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # Create indexes
    op.create_index('ix_jobs_id', 'jobs', ['id'])
    op.create_index('ix_jobs_github_url', 'jobs', ['github_url'])

    # Create unique constraint
    op.create_unique_constraint('uq_jobs_github_url', 'jobs', ['github_url'])


def downgrade() -> None:
    op.drop_index('ix_jobs_github_url', table_name='jobs')
    op.drop_index('ix_jobs_id', table_name='jobs')
    op.drop_table('jobs')
    op.execute('DROP TYPE jobstatus')
