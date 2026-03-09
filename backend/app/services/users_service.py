import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.models.user import User, UserRole
from app.schemas.users import UserCreate, UserUpdate
from app.core.security import hash_password


async def get_all(
    db: AsyncSession,
    role: UserRole | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[User], int]:
    query = select(User)
    count_query = select(func.count()).select_from(User)
    if role:
        query = query.where(User.role == role)
        count_query = count_query.where(User.role == role)
    total = (await db.execute(count_query)).scalar_one()
    users = (await db.execute(query.offset(skip).limit(limit))).scalars().all()
    return list(users), total


async def get_by_id(db: AsyncSession, user_id: uuid.UUID) -> User:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


async def get_by_student_id(db: AsyncSession, student_id: str) -> User:
    """Look up a user by their institutional student ID string."""
    user = (
        await db.execute(select(User).where(User.student_id == student_id))
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró un estudiante con ID '{student_id}'",
        )
    return user


async def create(db: AsyncSession, payload: UserCreate) -> User:
    existing = (
        await db.execute(select(User).where(User.email == payload.email))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El email ya está registrado",
        )
    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        student_id=payload.student_id,
        period=payload.period,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update(
    db: AsyncSession, user_id: uuid.UUID, payload: UserUpdate
) -> User:
    user = await get_by_id(db, user_id)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


async def deactivate(db: AsyncSession, user_id: uuid.UUID) -> User:
    user = await get_by_id(db, user_id)
    user.is_active = False
    await db.commit()
    return user


async def assign_cubiculo(
    db: AsyncSession,
    user_id: uuid.UUID,
    cubiculo_id: uuid.UUID | None,
) -> "User":
    """Set or clear the cubículo managed by an admin."""
    from app.models.user import User  # avoid circular
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.managed_cubiculo_id = cubiculo_id
    await db.commit()
    await db.refresh(user)
    return user
