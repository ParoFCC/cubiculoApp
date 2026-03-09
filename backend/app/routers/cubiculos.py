import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.schemas.cubiculos import CubiculoCreate, CubiculoUpdate, CubiculoOut
from app.schemas.users import UserOut
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_admin, require_super_admin
from app.models.user import User, UserRole
import app.services.cubiculos_service as svc
import app.services.users_service as user_svc

router = APIRouter()


@router.get("", response_model=list[CubiculoOut])
async def list_cubiculos(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Any authenticated user can list active cubículos (for selection screen)."""
    return await svc.list_cubiculos(db, active_only=True)


@router.get("/all", response_model=list[CubiculoOut])
async def list_all_cubiculos(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    """Super-admin: list all cubículos including inactive."""
    return await svc.list_cubiculos(db, active_only=False)


@router.get("/{cubiculo_id}", response_model=CubiculoOut)
async def get_cubiculo(
    cubiculo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.get_cubiculo(db, cubiculo_id)


@router.post("", response_model=CubiculoOut, status_code=status.HTTP_201_CREATED)
async def create_cubiculo(
    payload: CubiculoCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    return await svc.create_cubiculo(db, payload)


@router.patch("/{cubiculo_id}", response_model=CubiculoOut)
async def update_cubiculo(
    cubiculo_id: uuid.UUID,
    payload: CubiculoUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    return await svc.update_cubiculo(db, cubiculo_id, payload)


# ── Admin assignment ──────────────────────────────────────────────────────

@router.get("/{cubiculo_id}/admins", response_model=list[UserOut])
async def list_cubiculo_admins(
    cubiculo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    """List all admins assigned to this cubículo."""
    result = await db.execute(
        select(User).where(
            User.managed_cubiculo_id == cubiculo_id,
            User.role == UserRole.admin,
        )
    )
    return result.scalars().all()


@router.post("/{cubiculo_id}/admins/{user_id}", response_model=UserOut, status_code=201)
async def assign_admin_to_cubiculo(
    cubiculo_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    """Assign an admin user to manage this cubículo."""
    return await user_svc.assign_cubiculo(db, user_id, cubiculo_id)


@router.delete("/{cubiculo_id}/admins/{user_id}", status_code=204)
async def remove_admin_from_cubiculo(
    cubiculo_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    """Remove an admin's cubículo assignment."""
    await user_svc.assign_cubiculo(db, user_id, None)
