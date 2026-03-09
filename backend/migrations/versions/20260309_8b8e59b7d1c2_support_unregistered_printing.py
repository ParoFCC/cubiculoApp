"""support_unregistered_printing

Revision ID: 8b8e59b7d1c2
Revises: 59098feaf316
Create Date: 2026-03-09 02:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8b8e59b7d1c2"
down_revision: Union[str, None] = "59098feaf316"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "print_balance",
        sa.Column("student_identifier", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "print_history",
        sa.Column("student_identifier", sa.String(length=32), nullable=True),
    )

    op.execute(
        """
        UPDATE print_balance pb
        SET student_identifier = COALESCE(u.student_id, pb.student_id::text)
        FROM users u
        WHERE pb.student_id = u.id
        """
    )
    op.execute(
        """
        UPDATE print_balance
        SET student_identifier = COALESCE(student_identifier, student_id::text)
        WHERE student_identifier IS NULL
        """
    )

    op.execute(
        """
        UPDATE print_history ph
        SET student_identifier = COALESCE(u.student_id, ph.student_id::text)
        FROM users u
        WHERE ph.student_id = u.id
        """
    )
    op.execute(
        """
        UPDATE print_history
        SET student_identifier = COALESCE(student_identifier, student_id::text)
        WHERE student_identifier IS NULL
        """
    )

    op.alter_column("print_balance", "student_identifier", nullable=False)
    op.alter_column("print_history", "student_identifier", nullable=False)
    op.alter_column("print_balance", "student_id", nullable=True)
    op.alter_column("print_history", "student_id", nullable=True)

    op.create_index(
        "ix_print_balance_student_identifier",
        "print_balance",
        ["student_identifier"],
        unique=False,
    )
    op.create_index(
        "ix_print_history_student_identifier",
        "print_history",
        ["student_identifier"],
        unique=False,
    )

    op.execute(
        "ALTER TABLE print_balance DROP CONSTRAINT IF EXISTS print_balance_student_id_cubiculo_id_period_key"
    )
    op.create_unique_constraint(
        "uq_print_balance_identifier_cubiculo_period",
        "print_balance",
        ["student_identifier", "cubiculo_id", "period"],
    )


def downgrade() -> None:
    op.execute("DELETE FROM print_history WHERE student_id IS NULL")
    op.execute("DELETE FROM print_balance WHERE student_id IS NULL")

    op.drop_constraint(
        "uq_print_balance_identifier_cubiculo_period",
        "print_balance",
        type_="unique",
    )
    op.create_unique_constraint(
        "print_balance_student_id_cubiculo_id_period_key",
        "print_balance",
        ["student_id", "cubiculo_id", "period"],
    )

    op.drop_index("ix_print_history_student_identifier", table_name="print_history")
    op.drop_index("ix_print_balance_student_identifier", table_name="print_balance")

    op.alter_column("print_history", "student_id", nullable=False)
    op.alter_column("print_balance", "student_id", nullable=False)

    op.drop_column("print_history", "student_identifier")
    op.drop_column("print_balance", "student_identifier")