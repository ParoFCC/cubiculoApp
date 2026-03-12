"""Add unique index on users.student_id

Revision ID: 20260312_unique_student_id
Revises: 20260310_a1b2c3d4e5f6
Create Date: 2026-03-12
"""
from alembic import op

revision = "20260312_unique_student_id"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Partial unique index: only enforces uniqueness for non-NULL student_id values
    op.create_index(
        "ix_users_student_id_unique",
        "users",
        ["student_id"],
        unique=True,
        postgresql_where="student_id IS NOT NULL",
    )


def downgrade() -> None:
    op.drop_index("ix_users_student_id_unique", table_name="users")
