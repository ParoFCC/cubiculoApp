"""Add withdrawals_total column to cash_register

Revision ID: 20260429_cash_withdrawals
Revises: 20260312_unique_student_id
Create Date: 2026-04-29
"""
from alembic import op
import sqlalchemy as sa

revision = "20260429_cash_withdrawals"
down_revision = "20260312_unique_student_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "cash_register",
        sa.Column(
            "withdrawals_total",
            sa.Numeric(10, 2),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("cash_register", "withdrawals_total")
