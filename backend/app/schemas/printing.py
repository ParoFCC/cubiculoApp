import uuid
from datetime import datetime
import enum
from pydantic import BaseModel, field_validator
from app.models.printing import PrintType


# ── Request ───────────────────────────────────────────────────────────────

class PrintJobKind(str, enum.Enum):
    bw = "bw"  # 50¢ B/N
    color_text = "color_text"  # $1 texto a color
    color_images_half = "color_images_half"  # $2.50 imágenes media hoja o menos


class PrintJobCreate(BaseModel):
    student_id: str
    pages: int
    kind: PrintJobKind = PrintJobKind.bw

    @field_validator("student_id")
    @classmethod
    def student_id_required(cls, v: str) -> str:
        value = v.strip().lower()
        if not value:
            raise ValueError("student_id es requerido")
        return value

    @field_validator("pages")
    @classmethod
    def pages_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("pages debe ser al menos 1")
        return v


# ── Response ──────────────────────────────────────────────────────────────

class PrintBalanceOut(BaseModel):
    id: uuid.UUID
    student_id: str
    period: str
    free_remaining: int
    free_total: int

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_total(cls, obj, free_total: int):
        return cls(
            id=obj.id,
            student_id=obj.student_identifier,
            period=obj.period,
            free_remaining=obj.free_remaining,
            free_total=free_total,
        )


class PrintJobOut(BaseModel):
    id: uuid.UUID
    student_id: str
    admin_id: uuid.UUID
    admin_name: str = ""
    student_name: str = ""
    pages: int
    type: PrintType
    cost: float
    printed_at: datetime
    period: str | None = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_names(cls, obj):
        return cls(
            id=obj.id,
            student_id=obj.student_identifier,
            admin_id=obj.admin_id,
            admin_name=getattr(obj, "admin_name", "") or "",
            student_name=getattr(obj, "student_name", "") or "",
            pages=obj.pages,
            type=obj.type,
            cost=float(obj.cost),
            printed_at=obj.printed_at,
            period=obj.period,
        )
