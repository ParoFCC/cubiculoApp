import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.schemas.printing import PrintJobCreate, PrintJobOut, PrintBalanceOut
from app.core.config import settings
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_admin
from app.dependencies.cubiculo import get_cubiculo_id
import app.services.printing_service as svc

router = APIRouter()


@router.get("/balance")
async def get_balance(
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_user),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    period = svc.resolve_period(student, student.student_id)
    balance = await svc.get_or_create_balance(
        db,
        student.student_id,
        cubiculo_id,
        period,
        student.id,
    )
    return PrintBalanceOut.from_orm_with_total(balance, settings.FREE_PRINTS_PER_PERIOD)


@router.get("/balance/{student_id}", response_model=PrintBalanceOut,
            dependencies=[Depends(require_admin)])
async def get_balance_by_student_id(
    student_id: str,
    db: AsyncSession = Depends(get_db),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    balance, _student = await svc.get_balance_by_student_identifier(
        db,
        student_id,
        cubiculo_id,
    )
    return PrintBalanceOut.from_orm_with_total(balance, settings.FREE_PRINTS_PER_PERIOD)


@router.get("/history", response_model=list[PrintJobOut])
async def get_my_history(
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_user),
):
    history = await svc.get_student_history(db, student.student_id)
    return [PrintJobOut.from_orm_with_names(item) for item in history]


@router.get("/history/all", response_model=list[PrintJobOut],
            dependencies=[Depends(require_admin)])
async def get_all_history(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    history = await svc.get_all_history(db, cubiculo_id, skip=skip, limit=limit)
    return [PrintJobOut.from_orm_with_names(item) for item in history]


@router.get("/user/{student_id}", response_model=list[PrintJobOut],
            dependencies=[Depends(require_admin)])
async def get_history_by_user(
    student_id: str,
    db: AsyncSession = Depends(get_db),
):
    history = await svc.get_student_history(db, student_id)
    return [PrintJobOut.from_orm_with_names(item) for item in history]


@router.post("", response_model=PrintJobOut, status_code=201)
async def register_print(
    payload: PrintJobCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    entry = await svc.register_print(db, payload, admin, cubiculo_id)
    return PrintJobOut.from_orm_with_names(entry)
