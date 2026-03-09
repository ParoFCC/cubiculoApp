import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator
from app.models.printing import PrintType


# ── Request ───────────────────────────────────────────────────────────────

class PrintJobCreate(BaseModel):
    student_id: uuid.UUID
    pages: int
    unit_cost: float = 0.50

    @field_validator("pages")
    @classmethod
    def pages_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("pages debe ser al menos 1")
        return v

    @field_validator("unit_cost")
    @classmethod
    def cost_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("unit_cost debe ser mayor a 0")
        return v


# ── Response ──────────────────────────────────────────────────────────────

class PrintBalanceOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    period: str
    free_remaining: int
    free_total: int

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_total(cls, obj, free_total: int):
        return cls(
            id=obj.id,
            student_id=obj.student_id,
            period=obj.period,
            free_remaining=obj.free_remaining,
            free_total=free_total,
        )


class PrintJobOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    admin_id: uuid.UUID
    pages: int
    type: PrintType
    cost: float
    printed_at: datetime
    period: str | None = None

    model_config = {"from_attributes": True}
