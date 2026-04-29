"""add_failed_attempts_and_revoked_tokens

Revision ID: eca08b19e62a
Revises: 20260429_cash_withdrawals
Create Date: 2026-04-29 16:24:50.904798

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'eca08b19e62a'
down_revision: Union[str, None] = '20260429_cash_withdrawals'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Track failed verification code attempts to lock after 5 tries
    op.add_column(
        'email_verifications',
        sa.Column('failed_attempts', sa.Integer(), nullable=False, server_default='0'),
    )

    # Revoked refresh token blacklist
    op.create_table(
        'revoked_tokens',
        sa.Column('jti', sa.String(36), primary_key=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('revoked_tokens')
    op.drop_column('email_verifications', 'failed_attempts')
