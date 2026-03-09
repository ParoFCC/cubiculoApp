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


class LoanRequest(BaseModel):
    """Used by students to self-request a loan."""
    game_id: uuid.UUID


class LoanOut(BaseModel):
    id: uuid.UUID
    game_id: uuid.UUID
    student_id: uuid.UUID
    admin_id: uuid.UUID
    status: LoanStatus
    borrowed_at: datetime
    due_at: datetime | None
    returned_at: datetime | None
    notes: str | None

    model_config = {"from_attributes": True}
