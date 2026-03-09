import uuid
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User, UserRole
from app.schemas.users import UserCreate, UserUpdate, UserOut, UserList, UserCubiculoAssign
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_admin, require_super_admin
import app.services.users_service as svc

router = APIRouter()


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/lookup", response_model=UserOut, dependencies=[Depends(require_admin)])
async def lookup_user_by_student_id(
    student_id: str = Query(..., description="Institutional student ID"),
    db: AsyncSession = Depends(get_db),
):
    """Find a user by their institutional student ID (for QR scan lookup)."""
    return await svc.get_by_student_id(db, student_id)


@router.get("", response_model=UserList, dependencies=[Depends(require_admin)])
async def list_users(
    role: UserRole | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
):
    items, total = await svc.get_all(db, role=role, skip=skip, limit=limit)
    return UserList(items=items, total=total)


@router.get("/{user_id}", response_model=UserOut, dependencies=[Depends(require_admin)])
async def get_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await svc.get_by_id(db, user_id)


@router.post("", response_model=UserOut, status_code=201)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if payload.role == UserRole.admin and current_user.student_id != settings.SUPER_ADMIN_ID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el superadmin puede crear otros administradores",
        )
    return await svc.create(db, payload)


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    # Role changes are super-admin only
    if payload.role is not None and current_user.student_id != settings.SUPER_ADMIN_ID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el superadmin puede cambiar roles",
        )
    # Demoting an admin clears their cubiculo assignment
    if payload.role == UserRole.student:
        target = await svc.get_by_id(db, user_id)
        if target.managed_cubiculo_id is not None:
            await svc.assign_cubiculo(db, user_id, None)
    return await svc.update(db, user_id, payload)


@router.patch("/{user_id}/cubiculo", response_model=UserOut)
async def assign_cubiculo_to_admin(
    user_id: uuid.UUID,
    payload: UserCubiculoAssign,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    """Super-admin assigns (or removes) a cubículo from an admin user."""
    target = await svc.get_by_id(db, user_id)
    if target.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario debe tener rol de administrador",
        )
    return await svc.assign_cubiculo(db, user_id, payload.cubiculo_id)


@router.delete("/{user_id}", status_code=204,
               dependencies=[Depends(require_admin)])
async def deactivate_user(
    user_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    await svc.deactivate(db, user_id)
