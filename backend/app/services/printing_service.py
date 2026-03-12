import uuid
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.printing import PrintBalance, PrintHistory, PrintType
from app.models.user import User
from app.schemas.printing import PrintJobCreate
from app.core.config import settings
import app.services.users_service as users_svc


def normalize_student_identifier(student_identifier: str) -> str:
    return student_identifier.strip().lower()


def resolve_period(student: User | None, student_identifier: str) -> str:
    if student and student.period:
        return student.period
    # Matricula format: 4-digit year followed by 5 digits (e.g. 202612345)
    match = re.match(r"^(\d{4})\d{5}$", student_identifier)
    if match:
        return f"{match.group(1)}-1"
    return "sin-periodo"


async def get_or_create_balance(
    db: AsyncSession,
    student_identifier: str,
    cubiculo_id: uuid.UUID,
    period: str,
    student_id: uuid.UUID | None = None,
) -> PrintBalance:
    normalized_identifier = normalize_student_identifier(student_identifier)
    result = await db.execute(
        select(PrintBalance)
        .where(
            PrintBalance.student_identifier == normalized_identifier,
            PrintBalance.cubiculo_id == cubiculo_id,
            PrintBalance.period == period,
        )
        .with_for_update()
    )
    balance = result.scalar_one_or_none()
    if not balance:
        balance = PrintBalance(
            student_identifier=normalized_identifier,
            student_id=student_id,
            cubiculo_id=cubiculo_id,
            period=period,
            free_remaining=settings.FREE_PRINTS_PER_PERIOD,
        )
        db.add(balance)
        await db.flush()
    elif student_id and balance.student_id is None:
        balance.student_id = student_id
    return balance


async def register_print(
    db: AsyncSession, payload: PrintJobCreate, admin: User, cubiculo_id: uuid.UUID
) -> PrintHistory:
    student_identifier = normalize_student_identifier(payload.student_id)
    student: User | None = None
    try:
        student = await users_svc.get_by_student_id(db, student_identifier)
    except HTTPException as exc:
        if exc.status_code != 404:
            raise

    period = resolve_period(student, student_identifier)
    balance = await get_or_create_balance(
        db,
        student_identifier,
        cubiculo_id,
        period,
        student.id if student else None,
    )

    free_used = min(balance.free_remaining, payload.pages)
    paid_pages = payload.pages - free_used
    cost = round(paid_pages * (payload.unit_cost or settings.PAID_PRINT_PRICE), 2)
    print_type = PrintType.paid if paid_pages > 0 else PrintType.free

    balance.free_remaining -= free_used

    entry = PrintHistory(
        cubiculo_id=cubiculo_id,
        student_id=student.id if student else None,
        student_identifier=student_identifier,
        admin_id=admin.id,
        pages=payload.pages,
        type=print_type,
        cost=cost,
        period=period,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def get_student_history(
    db: AsyncSession, student_identifier: str
) -> list[PrintHistory]:
    normalized_identifier = normalize_student_identifier(student_identifier)
    result = await db.execute(
        select(PrintHistory)
        .where(PrintHistory.student_identifier == normalized_identifier)
        .order_by(PrintHistory.printed_at.desc())
    )
    return list(result.scalars().all())


async def get_balance_by_student_identifier(
    db: AsyncSession,
    student_identifier: str,
    cubiculo_id: uuid.UUID,
) -> tuple[PrintBalance, User | None]:
    normalized_identifier = normalize_student_identifier(student_identifier)
    student: User | None = None
    try:
        student = await users_svc.get_by_student_id(db, normalized_identifier)
    except HTTPException as exc:
        if exc.status_code != 404:
            raise
    period = resolve_period(student, normalized_identifier)
    balance = await get_or_create_balance(
        db,
        normalized_identifier,
        cubiculo_id,
        period,
        student.id if student else None,
    )
    return balance, student


async def get_all_history(db: AsyncSession, cubiculo_id: uuid.UUID, skip: int = 0, limit: int = 50) -> list[PrintHistory]:
    result = await db.execute(
        select(PrintHistory)
        .where(PrintHistory.cubiculo_id == cubiculo_id)
        .order_by(PrintHistory.printed_at.desc())
        .offset(skip)
        .limit(limit)
    )
    entries = list(result.scalars().all())

    if entries:
        admin_ids = list({e.admin_id for e in entries})
        admin_rows = await db.execute(select(User).where(User.id.in_(admin_ids)))
        admin_map = {u.id: u.name for u in admin_rows.scalars()}
        student_ids = list({e.student_id for e in entries if e.student_id})
        student_map: dict[uuid.UUID, str] = {}
        if student_ids:
            student_rows = await db.execute(select(User).where(User.id.in_(student_ids)))
            student_map = {u.id: u.name for u in student_rows.scalars()}
        for e in entries:
            e.__dict__["admin_name"] = admin_map.get(e.admin_id, "")
            e.__dict__["student_name"] = student_map.get(e.student_id, "") if e.student_id else ""

    return entries
