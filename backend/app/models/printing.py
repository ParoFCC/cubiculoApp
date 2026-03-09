import uuid
import enum
from datetime import datetime

from sqlalchemy import (
    ForeignKey, Integer, String, Numeric, Enum as SAEnum,
    DateTime, func, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.config import settings


class PrintBalance(Base):
    __tablename__ = "print_balance"
    __table_args__ = (
        UniqueConstraint("student_identifier", "cubiculo_id", "period"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    cubiculo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cubiculos.id"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    student_identifier: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    period: Mapped[str] = mapped_column(String(10), nullable=False)
    free_remaining: Mapped[int] = mapped_column(
        Integer, nullable=False, default=settings.FREE_PRINTS_PER_PERIOD
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class PrintType(str, enum.Enum):
    free = "free"
    paid = "paid"


class PrintHistory(Base):
    __tablename__ = "print_history"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    cubiculo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cubiculos.id"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    student_identifier: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    admin_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    pages: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[PrintType] = mapped_column(SAEnum(PrintType), nullable=False)
    cost: Mapped[float] = mapped_column(Numeric(8, 2), default=0.00)
    period: Mapped[str | None] = mapped_column(String(10))
    printed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
