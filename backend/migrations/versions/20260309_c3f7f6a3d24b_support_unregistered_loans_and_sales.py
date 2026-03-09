"""support_unregistered_loans_and_sales

Revision ID: c3f7f6a3d24b
Revises: 8b8e59b7d1c2
Create Date: 2026-03-09 03:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3f7f6a3d24b"
down_revision: Union[str, None] = "8b8e59b7d1c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "game_loans",
        sa.Column("student_identifier", sa.Text(), nullable=True),
    )
    op.add_column(
        "sales",
        sa.Column("student_identifier", sa.String(length=32), nullable=True),
    )

    op.execute(
        """
        UPDATE game_loans gl
        SET student_identifier = COALESCE(u.student_id, gl.student_id::text)
        FROM users u
        WHERE gl.student_id = u.id
        """
    )
    op.execute(
        """
        UPDATE game_loans
        SET student_identifier = COALESCE(student_identifier, student_id::text)
        WHERE student_identifier IS NULL
        """
    )
    op.execute(
        """
        UPDATE sales s
        SET student_identifier = u.student_id
        FROM users u
        WHERE s.student_id = u.id AND s.student_identifier IS NULL
        """
    )

    op.alter_column("game_loans", "student_identifier", nullable=False)
    op.alter_column("game_loans", "student_id", nullable=True)

    op.create_index(
        "ix_game_loans_student_identifier",
        "game_loans",
        ["student_identifier"],
        unique=False,
    )
    op.create_index(
        "ix_sales_student_identifier",
        "sales",
        ["student_identifier"],
        unique=False,
    )


def downgrade() -> None:
    op.execute("DELETE FROM game_loans WHERE student_id IS NULL")

    op.drop_index("ix_sales_student_identifier", table_name="sales")
    op.drop_index("ix_game_loans_student_identifier", table_name="game_loans")

    op.alter_column("game_loans", "student_id", nullable=False)

    op.drop_column("sales", "student_identifier")
    op.drop_column("game_loans", "student_identifier")