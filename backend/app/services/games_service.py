import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.game import Game
from app.models.game_loan import GameLoan, LoanStatus
from app.models.user import User
from app.schemas.games import GameCreate, GameUpdate, LoanCreate
import app.services.users_service as users_svc


# ── Catalog ───────────────────────────────────────────────────────────────

async def list_games(db: AsyncSession, cubiculo_id: uuid.UUID) -> list[Game]:
    result = await db.execute(
        select(Game).where(Game.cubiculo_id == cubiculo_id, Game.is_active.is_(True))
    )
    return list(result.scalars().all())


async def get_game(db: AsyncSession, game_id: uuid.UUID) -> Game:
    game = await db.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Juego no encontrado")
    return game


async def create_game(db: AsyncSession, payload: GameCreate, cubiculo_id: uuid.UUID) -> Game:
    game = Game(
        **payload.model_dump(),
        cubiculo_id=cubiculo_id,
        quantity_avail=payload.quantity_total,
    )
    db.add(game)
    await db.commit()
    await db.refresh(game)
    return game


async def update_game(
    db: AsyncSession, game_id: uuid.UUID, payload: GameUpdate
) -> Game:
    game = await get_game(db, game_id)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(game, field, value)
    await db.commit()
    await db.refresh(game)
    return game


# ── Loans ─────────────────────────────────────────────────────────────────

async def list_loans(db: AsyncSession, cubiculo_id: uuid.UUID) -> list[GameLoan]:
    result = await db.execute(
        select(GameLoan)
        .where(GameLoan.cubiculo_id == cubiculo_id)
        .order_by(GameLoan.borrowed_at.desc())
    )
    return list(result.scalars().all())


async def register_loan(
    db: AsyncSession, payload: LoanCreate, admin: User, cubiculo_id: uuid.UUID
) -> GameLoan:
    game = await get_game(db, payload.game_id)
    if game.quantity_avail < 1:
        raise HTTPException(status_code=400, detail="No hay unidades disponibles del juego")

    # Resolve institutional student_id → user UUID
    student = await users_svc.get_by_student_id(db, payload.student_id)

    loan = GameLoan(
        cubiculo_id=cubiculo_id,
        game_id=payload.game_id,
        student_id=student.id,
        admin_id=admin.id,
        due_at=payload.due_at,
        notes=payload.notes,
    )
    game.quantity_avail -= 1
    db.add(loan)
    await db.commit()
    await db.refresh(loan)
    return loan


async def register_return(
    db: AsyncSession, loan_id: uuid.UUID
) -> GameLoan:
    loan = await db.get(GameLoan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    if loan.status == LoanStatus.returned:
        raise HTTPException(status_code=400, detail="El juego ya fue devuelto")

    game = await db.get(Game, loan.game_id)
    loan.status = LoanStatus.returned
    loan.returned_at = datetime.now(timezone.utc)
    if game:
        game.quantity_avail += 1
    await db.commit()
    await db.refresh(loan)
    return loan
