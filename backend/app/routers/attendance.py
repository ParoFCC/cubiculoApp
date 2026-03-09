import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.dependencies.cubiculo import get_cubiculo_id
from app.dependencies.roles import require_admin
from app.models.user import User
from app.schemas.attendance import AttendanceOut, AttendanceStatusOut
from app.services import attendance_service

router = APIRouter(prefix="/attendance", tags=["attendance"])


class ClockIn(BaseModel):
    method: str = "button"


@router.get("/status", response_model=AttendanceStatusOut)
async def get_status(
    admin: User = Depends(require_admin),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
    db: AsyncSession = Depends(get_db),
):
    return await attendance_service.get_current_status(db, admin.id, cubiculo_id)


@router.post("/clock", response_model=AttendanceStatusOut)
async def clock(
    body: ClockIn,
    admin: User = Depends(require_admin),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
    db: AsyncSession = Depends(get_db),
):
    return await attendance_service.clock(db, admin.id, cubiculo_id, body.method)


@router.get("/history", response_model=list[AttendanceOut])
async def history(
    admin_id: uuid.UUID | None = Query(default=None),
    for_date: date | None = Query(default=None),
    _: User = Depends(require_admin),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
    db: AsyncSession = Depends(get_db),
):
    return await attendance_service.list_records(db, cubiculo_id, admin_id, for_date)
