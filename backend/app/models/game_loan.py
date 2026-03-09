import uuid
import enum
from datetime import datetime

from sqlalchemy import ForeignKey, Text, Enum as SAEnum, DateTime, func, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LoanStatus(str, enum.Enum):
    active = "active"
    returned = "returned"
    overdue = "overdue"


class GameLoan(Base):
    __tablename__ = "game_loans"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    cubiculo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cubiculos.id"), nullable=False, index=True)
    game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("games.id"), nullable=False)
    student_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    student_identifier: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    admin_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    borrowed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    returned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[LoanStatus] = mapped_column(
        SAEnum(LoanStatus), default=LoanStatus.active
    )
    pieces_complete: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
