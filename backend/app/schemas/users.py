import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator
from app.models.user import UserRole


# ── Request payloads ──────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.student
    student_id: str | None = None
    period: str | None = None

    @field_validator("email")
    @classmethod
    def email_domain(cls, v: str) -> str:
        if not v.lower().endswith("@alm.buap.mx"):
            raise ValueError("Solo se permiten correos @alm.buap.mx")
        return v.lower()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v

    @field_validator("student_id")
    @classmethod
    def student_id_required_for_student(cls, v: str | None, info) -> str | None:
        role = info.data.get("role")
        if role == UserRole.student and not v:
            raise ValueError("student_id es requerido para estudiantes")
        return v


class UserUpdate(BaseModel):
    name: str | None = None
    period: str | None = None
    is_active: bool | None = None
    role: UserRole | None = None


class UserCubiculoAssign(BaseModel):
    """Payload for assigning a cubículo to an admin (super-admin only)."""
    cubiculo_id: uuid.UUID | None = None  # None = remove assignment


# ── Response payloads ─────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: UserRole
    student_id: str | None
    period: str | None
    is_active: bool
    managed_cubiculo_id: uuid.UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserList(BaseModel):
    items: list[UserOut]
    total: int

class UserList(BaseModel):
    items: list[UserOut]
    total: int
