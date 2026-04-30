import uuid
import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.schemas.products import (
    ProductCreate, ProductUpdate, ProductOut,
    SaleCreate, SaleOut,
    CashClosePayload, CashRegisterOut, CashWithdrawPayload,
)
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_admin
from app.dependencies.cubiculo import get_cubiculo_id
import app.services.products_service as svc

router = APIRouter()


# ── Products ──────────────────────────────────────────────────────────────

@router.get("/products", response_model=list[ProductOut])
async def list_products(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    return await svc.list_products(db, cubiculo_id)


@router.post("/products", response_model=ProductOut,
             status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    return await svc.create_product(db, payload, cubiculo_id)


@router.delete("/products", status_code=status.HTTP_200_OK,
               dependencies=[Depends(require_admin)])
async def delete_all_products(
    db: AsyncSession = Depends(get_db),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    count = await svc.delete_all_products(db, cubiculo_id)
    return {"deleted": count}


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require_admin)])
async def delete_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    await svc.delete_product(db, product_id, cubiculo_id)


@router.patch("/products/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: uuid.UUID,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    return await svc.update_product(db, product_id, payload)


# ── Sales ──────────────────────────────────────────────────────────────────

@router.post("/sales", response_model=SaleOut,
             status_code=status.HTTP_201_CREATED)
async def register_sale(
    payload: SaleCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    sale = await svc.register_sale(db, payload, admin, cubiculo_id)
    return SaleOut.from_orm_with_names(sale)


@router.get("/sales", response_model=list[SaleOut],
            dependencies=[Depends(require_admin)])
async def list_sales(
    from_date: datetime | None = Query(default=None, alias="from"),
    to_date: datetime | None = Query(default=None, alias="to"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    sales = await svc.list_sales(db, cubiculo_id, from_date, to_date, skip=skip, limit=limit)
    return [SaleOut.from_orm_with_names(item) for item in sales]


@router.get("/sales/export/csv", dependencies=[Depends(require_admin)])
async def export_sales_csv(
    db: AsyncSession = Depends(get_db),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    """Export all sales history as a CSV file."""
    sales = await svc.list_sales(db, cubiculo_id, None, None, skip=0, limit=100_000)
    sale_outs = [SaleOut.from_orm_with_names(s) for s in sales]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "fecha", "estudiante", "matricula", "admin",
        "total", "metodo_pago", "productos",
    ])
    for s in sale_outs:
        productos = "; ".join(
            f"{i.product_name or i.product_id} x{i.quantity} ${i.unit_price:.2f}"
            for i in (s.items or [])
        )
        writer.writerow([
            str(s.id),
            s.sold_at.strftime("%Y-%m-%d %H:%M") if s.sold_at else "",
            s.student_name or "",
            s.student_identifier or "",
            s.admin_name or "",
            f"{s.total:.2f}",
            s.payment_method,
            productos,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ventas.csv"},
    )


# ── Cash Register ──────────────────────────────────────────────────────────

@router.post("/cash-register/open", response_model=CashRegisterOut,
             status_code=status.HTTP_201_CREATED)
async def open_cash_register(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    return await svc.open_cash_register(db, admin, cubiculo_id)


@router.post("/cash-register/close", response_model=CashRegisterOut)
async def close_cash_register(
    payload: CashClosePayload,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    return await svc.close_cash_register(db, payload, cubiculo_id)


@router.post("/cash-register/withdraw", response_model=CashRegisterOut)
async def withdraw_cash_register(
    payload: CashWithdrawPayload,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    return await svc.withdraw_cash_register(db, payload, cubiculo_id)


@router.get("/cash-register/history", response_model=list[CashRegisterOut],
            dependencies=[Depends(require_admin)])
async def get_cash_register_history(
    db: AsyncSession = Depends(get_db),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    return await svc.get_cash_register_history(db, cubiculo_id)


@router.get("/cash-register", response_model=CashRegisterOut,
            dependencies=[Depends(require_admin)])
async def get_cash_register(
    db: AsyncSession = Depends(get_db),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    return await svc.get_current_cash_register(db, cubiculo_id)
