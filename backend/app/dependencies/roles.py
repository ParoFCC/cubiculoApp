import uuid
from fastapi import Depends, HTTPException, status

from app.models.user import User, UserRole
from app.dependencies.auth import get_current_user
from app.dependencies.cubiculo import get_cubiculo_id


async def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de administrador",
        )
    return current_user


async def require_super_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Only super-admins (is_super_admin=True) can call this endpoint."""
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el superadmin puede realizar esta acción",
        )
    return current_user


async def require_cubiculo_admin(
    current_user: User = Depends(require_admin),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
) -> User:
    """Admin must be super-admin OR have this cubículo assigned."""
    if current_user.is_super_admin:
        return current_user
    if current_user.managed_cubiculo_id != cubiculo_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para administrar este cubículo",
        )
    return current_user


async def require_student(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de estudiante",
        )
    return current_user
