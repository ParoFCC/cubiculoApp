"""add_payment_method_to_sales

Revision ID: a1b2c3d4e5f6
Revises: c3f7f6a3d24b
Create Date: 2026-03-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'c3f7f6a3d24b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the enum type first (PostgreSQL requires it)
    payment_method_enum = sa.Enum('cash', 'card', name='paymentmethod')
    payment_method_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        'sales',
        sa.Column(
            'payment_method',
            sa.Enum('cash', 'card', name='paymentmethod'),
            nullable=False,
            server_default='cash',
        ),
    )
    op.add_column(
        'sales',
        sa.Column(
            'card_commission',
            sa.Numeric(8, 4),
            nullable=False,
            server_default='0',
        ),
    )


def downgrade() -> None:
    op.drop_column('sales', 'card_commission')
    op.drop_column('sales', 'payment_method')
    sa.Enum(name='paymentmethod').drop(op.get_bind(), checkfirst=True)
