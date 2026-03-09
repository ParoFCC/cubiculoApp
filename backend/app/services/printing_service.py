import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.printing import PrintBalance, PrintHistory, PrintType
from app.models.user import User
from app.schemas.printing import PrintJobCreate
from app.core.config import settings


async def get_or_create_balance(
    db: AsyncSession, student_id: uuid.UUID, cubiculo_id: uuid.UUID, period: str
) -> PrintBalance:
    result = await db.execute(
        select(PrintBalance).where(
            PrintBalance.student_id == student_id,
            PrintBalance.cubiculo_id == cubiculo_id,
            PrintBalance.period == period,
        )
    )
    balance = result.scalar_one_or_none()
    if not balance:
        balance = PrintBalance(
            student_id=student_id,
            cubiculo_id=cubiculo_id,
            period=period,
            free_remaining=settings.FREE_PRINTS_PER_PERIOD,
        )
        db.add(balance)
        await db.flush()
    return balance


async def register_print(
    db: AsyncSession, payload: PrintJobCreate, admin: User, cubiculo_id: uuid.UUID
) -> PrintHistory:
    student = await db.get(User, payload.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    period = student.period or "sin-periodo"
    balance = await get_or_create_balance(db, payload.student_id, cubiculo_id, period)

    free_used = min(balance.free_remaining, payload.pages)
    paid_pages = payload.pages - free_used
    cost = round(paid_pages * (payload.unit_cost or settings.PAID_PRINT_PRICE), 2)
    print_type = PrintType.paid if paid_pages > 0 else PrintType.free

    balance.free_remaining -= free_used

    entry = PrintHistory(
        cubiculo_id=cubiculo_id,
        student_id=payload.student_id,
        admin_id=admin.id,
        pages=payload.pages,
        type=print_type,
        cost=cost,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def get_student_history(
    db: AsyncSession, student_id: uuid.UUID
) -> list[PrintHistory]:
    result = await db.execute(
        select(PrintHistory)
        .where(PrintHistory.student_id == student_id)
        .order_by(PrintHistory.printed_at.desc())
    )
    return list(result.scalars().all())


async def get_all_history(db: AsyncSession, cubiculo_id: uuid.UUID) -> list[PrintHistory]:
    result = await db.execute(
        select(PrintHistory)
        .where(PrintHistory.cubiculo_id == cubiculo_id)
        .order_by(PrintHistory.printed_at.desc())
    )
    return list(result.scalars().all())
