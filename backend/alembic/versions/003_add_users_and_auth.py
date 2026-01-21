"""add users and auth

Revision ID: 003
Revises: 002
Create Date: 2025-01-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('github_id', sa.String(), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('avatar_url', sa.String(), nullable=True),
        sa.Column('encrypted_access_token', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    
    # Create indexes
    op.create_index('ix_users_github_id', 'users', ['github_id'], unique=True)
    
    # Add new columns to jobs table
    op.add_column('jobs', sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('jobs', sa.Column('has_write_access', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('jobs', sa.Column('pull_request_url', sa.String(), nullable=True))
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_jobs_user_id',
        'jobs', 'users',
        ['user_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade():
    # Remove foreign key
    op.drop_constraint('fk_jobs_user_id', 'jobs', type_='foreignkey')
    
    # Remove columns from jobs
    op.drop_column('jobs', 'pull_request_url')
    op.drop_column('jobs', 'has_write_access')
    op.drop_column('jobs', 'user_id')
    
    # Drop users table
    op.drop_index('ix_users_github_id', table_name='users')
    op.drop_table('users')
