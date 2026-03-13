import uuid
from fastapi import APIRouter, Body, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.schemas.games import (
    GameCreate, GameUpdate, GameOut,
    LoanCreate, LoanRequest, LoanOut, ReturnPayload,
)
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_admin
from app.dependencies.cubiculo import get_cubiculo_id
import app.services.games_service as svc

router = APIRouter()


# ── Catalog ───────────────────────────────────────────────────────────────

@router.get("", response_model=list[GameOut])
async def list_games(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    return await svc.list_games(db, cubiculo_id)


@router.get("/loans", response_model=list[LoanOut],
            dependencies=[Depends(require_admin)])
async def list_loans(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    loans = await svc.list_loans(db, cubiculo_id, skip=skip, limit=limit)
    return [LoanOut.from_orm_with_names(item) for item in loans]


@router.get("/{game_id}", response_model=GameOut)
async def get_game(
    game_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.get_game(db, game_id)


# ── Admin ─────────────────────────────────────────────────────────────────

@router.post("", response_model=GameOut, status_code=status.HTTP_201_CREATED)
async def create_game(
    payload: GameCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    return await svc.create_game(db, payload, cubiculo_id)


@router.patch("/{game_id}", response_model=GameOut)
async def update_game(
    game_id: uuid.UUID,
    payload: GameUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    return await svc.update_game(db, game_id, payload)


# ── Loans ─────────────────────────────────────────────────────────────────

@router.post("/loans", response_model=LoanOut, status_code=status.HTTP_201_CREATED)
async def register_loan(
    payload: LoanCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    loan = await svc.register_loan(db, payload, admin, cubiculo_id)
    return LoanOut.from_orm_with_names(loan)


@router.patch("/loans/{loan_id}/return", response_model=LoanOut)
async def register_return(
    loan_id: uuid.UUID,
    payload: ReturnPayload = Body(default=ReturnPayload()),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    loan = await svc.register_return(db, loan_id, payload)
    return LoanOut.from_orm_with_names(loan)


@router.post("/loans/request", status_code=status.HTTP_202_ACCEPTED)
async def request_loan(
    payload: LoanRequest,
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_user),
):
    """Student self-service: registers a loan request (admin confirms it)."""
    game = await svc.get_game(db, payload.game_id)
    if game.quantity_avail < 1:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Juego no disponible")
    return {"message": "Solicitud enviada", "game": game.name}


# ── Delete (soft) ──────────────────────────────────────────────────────────

@router.delete("/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_game(
    game_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    await svc.soft_delete_game(db, game_id)
