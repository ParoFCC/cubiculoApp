import uuid
import enum
from datetime import datetime

from sqlalchemy import ForeignKey, Enum as SAEnum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AttendanceType(str, enum.Enum):
    entry = "entry"
    exit = "exit"


class AttendanceMethod(str, enum.Enum):
    button = "button"
    qr = "qr"
    nfc = "nfc"


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    admin_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cubiculo_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("cubiculos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[AttendanceType] = mapped_column(SAEnum(AttendanceType), nullable=False)
    method: Mapped[AttendanceMethod] = mapped_column(
        SAEnum(AttendanceMethod), nullable=False, default=AttendanceMethod.button
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
