import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator


# ── Products ──────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str
    category: str | None = None
    image_url: str | None = None
    price: float
    stock: int = 0

    @field_validator("price")
    @classmethod
    def price_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("price debe ser mayor a 0")
        return v

    @field_validator("stock")
    @classmethod
    def stock_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("stock no puede ser negativo")
        return v


class ProductUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    image_url: str | None = None
    price: float | None = None
    stock: int | None = None
    is_active: bool | None = None


class ProductOut(BaseModel):
    id: uuid.UUID
    name: str
    category: str | None
    image_url: str | None
    price: float
    stock: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Sales ─────────────────────────────────────────────────────────────────

class SaleItemIn(BaseModel):
    product_id: uuid.UUID
    quantity: int

    @field_validator("quantity")
    @classmethod
    def qty_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("quantity debe ser al menos 1")
        return v


class SaleCreate(BaseModel):
    student_id: str | None = None  # Institutional student ID (optional)
    items: list[SaleItemIn]

    @field_validator("student_id")
    @classmethod
    def normalize_student_id(cls, v: str | None) -> str | None:
        if v is None:
            return None
        value = v.strip().lower()
        return value or None

    @field_validator("items")
    @classmethod
    def items_not_empty(cls, v: list) -> list:
        if not v:
            raise ValueError("La venta debe tener al menos un producto")
        return v


class SaleItemOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    unit_price: float

    model_config = {"from_attributes": True}


class SaleOut(BaseModel):
    id: uuid.UUID
    admin_id: uuid.UUID
    admin_name: str = ""
    student_id: str | None
    student_name: str = ""
    total: float
    sold_at: datetime
    items: list[SaleItemOut] = []

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_names(cls, obj):
        return cls(
            id=obj.id,
            admin_id=obj.admin_id,
            admin_name=getattr(obj, "admin_name", "") or "",
            student_id=getattr(obj, "student_identifier", None),
            student_name=getattr(obj, "student_name", "") or "",
            total=float(obj.total),
            sold_at=obj.sold_at,
            items=list(getattr(obj, "items", []) or []),
        )


# ── Cash Register ─────────────────────────────────────────────────────────

class CashOpenPayload(BaseModel):
    opening_balance: float

    @field_validator("opening_balance")
    @classmethod
    def balance_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("opening_balance no puede ser negativo")
        return v


class CashClosePayload(BaseModel):
    closing_balance: float

    @field_validator("closing_balance")
    @classmethod
    def balance_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("closing_balance no puede ser negativo")
        return v


class CashRegisterOut(BaseModel):
    id: uuid.UUID
    admin_id: uuid.UUID
    opening_balance: float
    closing_balance: float | None
    status: str
    opened_at: datetime
    closed_at: datetime | None
    sales_total: float = 0.0

    model_config = {"from_attributes": True}
