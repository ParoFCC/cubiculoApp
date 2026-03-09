import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.products import (
    Product, Sale, SaleItem, CashRegister, CashRegisterStatus,
)
from app.models.user import User
from app.schemas.products import ProductCreate, ProductUpdate, SaleCreate, CashOpenPayload, CashClosePayload
import app.services.users_service as users_svc


# ── Products ──────────────────────────────────────────────────────────────

async def list_products(db: AsyncSession, cubiculo_id: uuid.UUID) -> list[Product]:
    result = await db.execute(
        select(Product).where(Product.cubiculo_id == cubiculo_id, Product.is_active.is_(True))
    )
    return list(result.scalars().all())


async def create_product(db: AsyncSession, payload: ProductCreate, cubiculo_id: uuid.UUID) -> Product:
    product = Product(**payload.model_dump(), cubiculo_id=cubiculo_id)
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


async def update_product(
    db: AsyncSession, product_id: uuid.UUID, payload: ProductUpdate
) -> Product:
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(product, field, value)
    await db.commit()
    await db.refresh(product)
    return product


# ── Sales ─────────────────────────────────────────────────────────────────

async def register_sale(
    db: AsyncSession, payload: SaleCreate, admin: User, cubiculo_id: uuid.UUID
) -> Sale:
    # Get active cash register for this cubiculo
    cash_result = await db.execute(
        select(CashRegister).where(
            CashRegister.cubiculo_id == cubiculo_id,
            CashRegister.status == CashRegisterStatus.open,
        )
    )
    cash = cash_result.scalar_one_or_none()

    # Resolve institutional student_id → user UUID (optional)
    student_uuid: uuid.UUID | None = None
    if payload.student_id:
        student = await users_svc.get_by_student_id(db, payload.student_id)
        student_uuid = student.id

    sale = Sale(
        cubiculo_id=cubiculo_id,
        admin_id=admin.id,
        student_id=student_uuid,
        cash_register_id=cash.id if cash else None,
        total=0,
    )
    db.add(sale)
    await db.flush()

    total = 0.0
    for item_in in payload.items:
        product = await db.get(Product, item_in.product_id)
        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Producto {item_in.product_id} no encontrado",
            )
        if product.stock < item_in.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para '{product.name}' "
                       f"(disponible: {product.stock}, pedido: {item_in.quantity})",
            )
        product.stock -= item_in.quantity
        line_total = float(product.price) * item_in.quantity
        total += line_total
        db.add(SaleItem(
            sale_id=sale.id,
            product_id=item_in.product_id,
            quantity=item_in.quantity,
            unit_price=product.price,
        ))

    sale.total = round(total, 2)
    await db.commit()
    await db.refresh(sale)
    return sale


async def list_sales(
    db: AsyncSession,
    cubiculo_id: uuid.UUID,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> list[Sale]:
    query = select(Sale).where(Sale.cubiculo_id == cubiculo_id).order_by(Sale.sold_at.desc())
    if from_date:
        query = query.where(Sale.sold_at >= from_date)
    if to_date:
        query = query.where(Sale.sold_at <= to_date)
    result = await db.execute(query)
    return list(result.scalars().all())


# ── Cash Register ─────────────────────────────────────────────────────────

async def open_cash_register(
    db: AsyncSession, payload: CashOpenPayload, admin: User, cubiculo_id: uuid.UUID
) -> CashRegister:
    existing = (
        await db.execute(
            select(CashRegister).where(
                CashRegister.cubiculo_id == cubiculo_id,
                CashRegister.status == CashRegisterStatus.open,
            )
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Ya hay una caja abierta")

    cash = CashRegister(cubiculo_id=cubiculo_id, admin_id=admin.id, opening_balance=payload.opening_balance)
    db.add(cash)
    await db.commit()
    await db.refresh(cash)
    return cash


async def close_cash_register(
    db: AsyncSession, payload: CashClosePayload, cubiculo_id: uuid.UUID
) -> CashRegister:
    result = await db.execute(
        select(CashRegister).where(
            CashRegister.cubiculo_id == cubiculo_id,
            CashRegister.status == CashRegisterStatus.open,
        )
    )
    cash = result.scalar_one_or_none()
    if not cash:
        raise HTTPException(status_code=404, detail="No hay caja abierta")

    cash.closing_balance = payload.closing_balance
    cash.status = CashRegisterStatus.closed
    cash.closed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(cash)
    return cash


async def get_current_cash_register(db: AsyncSession, cubiculo_id: uuid.UUID) -> CashRegister:
    result = await db.execute(
        select(CashRegister)
        .where(CashRegister.cubiculo_id == cubiculo_id)
        .order_by(CashRegister.opened_at.desc())
        .limit(1)
    )
    cash = result.scalar_one_or_none()
    if not cash:
        raise HTTPException(status_code=404, detail="Sin registros de caja")
    return cash
