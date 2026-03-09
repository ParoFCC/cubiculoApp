import uuid
from datetime import datetime, timezone, date

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attendance import AttendanceRecord, AttendanceType, AttendanceMethod
from app.models.user import User
from app.schemas.attendance import AttendanceOut, AttendanceStatusOut


async def get_current_status(
    db: AsyncSession, admin_id: uuid.UUID, cubiculo_id: uuid.UUID
) -> AttendanceStatusOut:
    result = await db.execute(
        select(AttendanceRecord)
        .where(
            AttendanceRecord.admin_id == admin_id,
            AttendanceRecord.cubiculo_id == cubiculo_id,
        )
        .order_by(desc(AttendanceRecord.recorded_at))
        .limit(1)
    )
    last = result.scalar_one_or_none()

    if last is None:
        return AttendanceStatusOut(status="out", last_record=None)

    record_out = AttendanceOut.model_validate(last)
    record_out.admin_name = await _get_admin_name(db, admin_id)
    status = "in" if last.type == AttendanceType.entry else "out"
    return AttendanceStatusOut(status=status, last_record=record_out)


async def clock(
    db: AsyncSession,
    admin_id: uuid.UUID,
    cubiculo_id: uuid.UUID,
    method: str = "button",
) -> AttendanceStatusOut:
    # Determine next type based on last record
    result = await db.execute(
        select(AttendanceRecord)
        .where(
            AttendanceRecord.admin_id == admin_id,
            AttendanceRecord.cubiculo_id == cubiculo_id,
        )
        .order_by(desc(AttendanceRecord.recorded_at))
        .limit(1)
    )
    last = result.scalar_one_or_none()

    if last is None or last.type == AttendanceType.exit:
        next_type = AttendanceType.entry
    else:
        next_type = AttendanceType.exit

    safe_method = AttendanceMethod(method) if method in AttendanceMethod.__members__.values() else AttendanceMethod.button

    record = AttendanceRecord(
        admin_id=admin_id,
        cubiculo_id=cubiculo_id,
        type=next_type,
        method=safe_method,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    record_out = AttendanceOut.model_validate(record)
    record_out.admin_name = await _get_admin_name(db, admin_id)
    status = "in" if next_type == AttendanceType.entry else "out"
    return AttendanceStatusOut(status=status, last_record=record_out)


async def list_records(
    db: AsyncSession,
    cubiculo_id: uuid.UUID,
    admin_id: uuid.UUID | None = None,
    for_date: date | None = None,
) -> list[AttendanceOut]:
    stmt = (
        select(AttendanceRecord)
        .where(AttendanceRecord.cubiculo_id == cubiculo_id)
        .order_by(desc(AttendanceRecord.recorded_at))
    )
    if admin_id is not None:
        stmt = stmt.where(AttendanceRecord.admin_id == admin_id)
    if for_date is not None:
        # Filter by calendar date in UTC
        day_start = datetime(for_date.year, for_date.month, for_date.day, tzinfo=timezone.utc)
        day_end = datetime(for_date.year, for_date.month, for_date.day, 23, 59, 59, tzinfo=timezone.utc)
        stmt = stmt.where(
            AttendanceRecord.recorded_at >= day_start,
            AttendanceRecord.recorded_at <= day_end,
        )

    result = await db.execute(stmt.limit(500))
    records = list(result.scalars().all())

    # Batch-load admin names
    admin_ids = list({r.admin_id for r in records})
    name_map: dict[uuid.UUID, str] = {}
    if admin_ids:
        users_result = await db.execute(select(User).where(User.id.in_(admin_ids)))
        for u in users_result.scalars().all():
            name_map[u.id] = u.name

    out = []
    for r in records:
        r.__dict__["admin_name"] = name_map.get(r.admin_id, "")
        out.append(AttendanceOut.model_validate(r))
    return out


async def _get_admin_name(db: AsyncSession, admin_id: uuid.UUID) -> str:
    result = await db.execute(select(User).where(User.id == admin_id))
    user = result.scalar_one_or_none()
    return user.name if user else ""
