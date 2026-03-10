import uuid
import enum
from datetime import datetime

from sqlalchemy import (
    ForeignKey, Integer, String, Numeric, Boolean,
    Enum as SAEnum, DateTime, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PaymentMethod(str, enum.Enum):
    cash = "cash"
    card = "card"


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    cubiculo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cubiculos.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[str | None] = mapped_column(String(60))
    image_url: Mapped[str | None] = mapped_column(String(500))
    price: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    cubiculo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cubiculos.id"), nullable=False, index=True)
    admin_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    student_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    student_identifier: Mapped[str | None] = mapped_column(String(32), index=True)
    cash_register_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("cash_register.id"))
    total: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(
        SAEnum(PaymentMethod), default=PaymentMethod.cash, nullable=False, server_default="cash"
    )
    card_commission: Mapped[float] = mapped_column(Numeric(8, 4), nullable=False, default=0, server_default="0")
    sold_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    items: Mapped[list["SaleItem"]] = relationship("SaleItem", lazy="selectin")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    sale_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sales.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)


class CashRegisterStatus(str, enum.Enum):
    open = "open"
    closed = "closed"


class CashRegister(Base):
    __tablename__ = "cash_register"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    cubiculo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cubiculos.id"), nullable=False, index=True)
    admin_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    opening_balance: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    closing_balance: Mapped[float | None] = mapped_column(Numeric(10, 2))
    opened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[CashRegisterStatus] = mapped_column(
        SAEnum(CashRegisterStatus), default=CashRegisterStatus.open
    )
