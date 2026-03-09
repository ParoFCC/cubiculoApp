import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator
from app.models.game_loan import LoanStatus


# ── Games ─────────────────────────────────────────────────────────────────

class GameCreate(BaseModel):
    name: str
    description: str | None = None
    instructions: str | None = None
    instructions_url: str | None = None
    image_url: str | None = None
    quantity_total: int = 1

    @field_validator("quantity_total")
    @classmethod
    def qty_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("quantity_total debe ser al menos 1")
        return v


class GameUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    instructions: str | None = None
    instructions_url: str | None = None
    image_url: str | None = None
    quantity_total: int | None = None
    is_active: bool | None = None


class GameOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    instructions: str | None
    instructions_url: str | None
    image_url: str | None
    quantity_total: int
    quantity_avail: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Loans ─────────────────────────────────────────────────────────────────

class LoanCreate(BaseModel):
    student_id: str  # Institutional student ID (e.g. be202300001)
    game_id: uuid.UUID
    due_at: datetime | None = None
    notes: str | None = None
    pieces_complete: bool = True

    @field_validator("student_id")
    @classmethod
    def student_id_required(cls, v: str) -> str:
        value = v.strip().lower()
        if not value:
            raise ValueError("student_id es requerido")
        return value


class LoanRequest(BaseModel):
    """Used by students to self-request a loan."""
    game_id: uuid.UUID


class LoanOut(BaseModel):
    id: uuid.UUID
    game_id: uuid.UUID
    game_name: str = "—"
    student_id: str
    student_name: str = ""
    admin_id: uuid.UUID
    admin_name: str = ""
    status: LoanStatus
    borrowed_at: datetime
    due_at: datetime | None
    returned_at: datetime | None
    notes: str | None
    pieces_complete: bool = True

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_names(cls, obj):
        return cls(
            id=obj.id,
            game_id=obj.game_id,
            game_name=getattr(obj, "game_name", "—") or "—",
            student_id=getattr(obj, "student_identifier", None) or str(obj.student_id),
            student_name=getattr(obj, "student_name", "") or "",
            admin_id=obj.admin_id,
            admin_name=getattr(obj, "admin_name", "") or "",
            status=obj.status,
            borrowed_at=obj.borrowed_at,
            due_at=obj.due_at,
            returned_at=obj.returned_at,
            notes=obj.notes,
            pieces_complete=obj.pieces_complete,
        )
