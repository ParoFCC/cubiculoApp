import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.schemas.products import (
    ProductCreate, ProductUpdate, ProductOut,
    SaleCreate, SaleOut,
    CashOpenPayload, CashClosePayload, CashRegisterOut,
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


# ── Cash Register ──────────────────────────────────────────────────────────

@router.post("/cash-register/open", response_model=CashRegisterOut,
             status_code=status.HTTP_201_CREATED)
async def open_cash_register(
    payload: CashOpenPayload,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    return await svc.open_cash_register(db, payload, admin, cubiculo_id)


@router.post("/cash-register/close", response_model=CashRegisterOut)
async def close_cash_register(
    payload: CashClosePayload,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    return await svc.close_cash_register(db, payload, cubiculo_id)


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
