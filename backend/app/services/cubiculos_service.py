import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.cubiculo import Cubiculo
from app.schemas.cubiculos import CubiculoCreate, CubiculoUpdate


async def list_cubiculos(db: AsyncSession, active_only: bool = True) -> list[Cubiculo]:
    query = select(Cubiculo)
    if active_only:
        query = query.where(Cubiculo.is_active.is_(True))
    result = await db.execute(query.order_by(Cubiculo.name))
    return list(result.scalars().all())


async def get_cubiculo(db: AsyncSession, cubiculo_id: uuid.UUID) -> Cubiculo:
    cubiculo = await db.get(Cubiculo, cubiculo_id)
    if not cubiculo:
        raise HTTPException(status_code=404, detail="Cubículo no encontrado")
    return cubiculo


async def get_by_slug(db: AsyncSession, slug: str) -> Cubiculo:
    result = await db.execute(select(Cubiculo).where(Cubiculo.slug == slug))
    cubiculo = result.scalar_one_or_none()
    if not cubiculo:
        raise HTTPException(status_code=404, detail="Cubículo no encontrado")
    return cubiculo


async def create_cubiculo(db: AsyncSession, payload: CubiculoCreate) -> Cubiculo:
    existing = (await db.execute(
        select(Cubiculo).where(Cubiculo.slug == payload.slug)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe un cubículo con ese slug")
    cubiculo = Cubiculo(**payload.model_dump())
    db.add(cubiculo)
    await db.commit()
    await db.refresh(cubiculo)
    return cubiculo


async def update_cubiculo(
    db: AsyncSession, cubiculo_id: uuid.UUID, payload: CubiculoUpdate
) -> Cubiculo:
    cubiculo = await get_cubiculo(db, cubiculo_id)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(cubiculo, field, value)
    await db.commit()
    await db.refresh(cubiculo)
    return cubiculo
