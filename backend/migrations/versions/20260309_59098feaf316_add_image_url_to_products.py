"""add_image_url_to_products

Revision ID: 59098feaf316
Revises: c6cc6691a719
Create Date: 2026-03-09 00:45:16.407565

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '59098feaf316'
down_revision: Union[str, None] = 'c6cc6691a719'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('products', sa.Column('image_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('products', 'image_url')
