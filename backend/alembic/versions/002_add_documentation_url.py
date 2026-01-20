"""Add documentation_url to jobs table

Revision ID: 002
Revises: 001
Create Date: 2024-01-19 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add documentation_url column to jobs table."""
    op.add_column('jobs', sa.Column('documentation_url', sa.String(), nullable=True))


def downgrade() -> None:
    """Remove documentation_url column from jobs table."""
    op.drop_column('jobs', 'documentation_url')
