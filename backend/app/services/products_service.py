import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.models.products import (
    Product, Sale, SaleItem, CashRegister, CashRegisterStatus, PaymentMethod,
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


async def delete_all_products(db: AsyncSession, cubiculo_id: uuid.UUID) -> int:
    result = await db.execute(
        delete(Product).where(Product.cubiculo_id == cubiculo_id)
    )
    await db.commit()
    return result.rowcount


async def delete_product(db: AsyncSession, product_id: uuid.UUID, cubiculo_id: uuid.UUID) -> None:
    product = await db.get(Product, product_id)
    if not product or product.cubiculo_id != cubiculo_id:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    await db.delete(product)
    await db.commit()


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
    if not cash:
        raise HTTPException(
            status_code=400,
            detail="No hay caja abierta. Abre la caja antes de registrar ventas.",
        )

    # Resolve institutional student_id → user UUID (optional)
    student_uuid: uuid.UUID | None = None
    student_name = ""
    if payload.student_id:
        try:
            student = await users_svc.get_by_student_id(db, payload.student_id)
            student_uuid = student.id
            student_name = student.name
        except HTTPException as exc:
            if exc.status_code != 404:
                raise

    sale = Sale(
        cubiculo_id=cubiculo_id,
        admin_id=admin.id,
        student_id=student_uuid,
        student_identifier=payload.student_id,
        cash_register_id=cash.id if cash else None,
        payment_method=PaymentMethod(payload.payment_method) if payload.payment_method in ("cash", "card") else PaymentMethod.cash,
        total=0,
        card_commission=0,
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
    if sale.payment_method == PaymentMethod.card:
        sale.card_commission = round(total * 0.04176, 2)
    else:
        sale.card_commission = 0.0
    await db.commit()
    # Re-fetch with items loaded
    refreshed = await db.execute(
        select(Sale).options(selectinload(Sale.items)).where(Sale.id == sale.id)
    )
    result = refreshed.scalar_one()
    result.__dict__["admin_name"] = admin.name
    result.__dict__["student_name"] = student_name
    return result


async def list_sales(
    db: AsyncSession,
    cubiculo_id: uuid.UUID,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[Sale]:
    query = (
        select(Sale)
        .options(selectinload(Sale.items))
        .where(Sale.cubiculo_id == cubiculo_id)
        .order_by(Sale.sold_at.desc())
        .offset(skip)
        .limit(limit)
    )
    if from_date:
        query = query.where(Sale.sold_at >= from_date)
    if to_date:
        query = query.where(Sale.sold_at <= to_date)
    result = await db.execute(query)
    sales = list(result.scalars().all())

    if sales:
        admin_ids = list({s.admin_id for s in sales})
        admin_rows = await db.execute(select(User).where(User.id.in_(admin_ids)))
        admin_map = {u.id: u.name for u in admin_rows.scalars()}
        student_ids = list({s.student_id for s in sales if s.student_id})
        student_map: dict[uuid.UUID, str] = {}
        if student_ids:
            student_rows = await db.execute(select(User).where(User.id.in_(student_ids)))
            student_map = {u.id: u.name for u in student_rows.scalars()}
        for s in sales:
            s.__dict__["admin_name"] = admin_map.get(s.admin_id, "")
            s.__dict__["student_name"] = student_map.get(s.student_id, "") if s.student_id else ""

    return sales


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
    total_result = await db.execute(
        select(func.coalesce(func.sum(Sale.total), 0))
        .where(Sale.cash_register_id == cash.id)
    )
    cash.sales_total = float(total_result.scalar())
    return cash


async def get_cash_register_history(db: AsyncSession, cubiculo_id: uuid.UUID) -> list[CashRegister]:
    result = await db.execute(
        select(CashRegister)
        .where(CashRegister.cubiculo_id == cubiculo_id)
        .order_by(CashRegister.opened_at.desc())
        .limit(20)
    )
    registers = list(result.scalars().all())
    if not registers:
        return registers
    totals_result = await db.execute(
        select(Sale.cash_register_id, func.coalesce(func.sum(Sale.total), 0).label("sales_total"))
        .where(Sale.cash_register_id.in_([r.id for r in registers]))
        .group_by(Sale.cash_register_id)
    )
    totals_map = {row.cash_register_id: float(row.sales_total) for row in totals_result}
    for reg in registers:
        reg.sales_total = totals_map.get(reg.id, 0.0)
    return registers
