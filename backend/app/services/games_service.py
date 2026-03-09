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
    loans = list(result.scalars().all())

    if loans:
        admin_ids = list({l.admin_id for l in loans})
        game_ids = list({l.game_id for l in loans})
        student_ids = list({l.student_id for l in loans if l.student_id})

        admin_rows = await db.execute(select(User).where(User.id.in_(admin_ids)))
        admin_map = {u.id: u.name for u in admin_rows.scalars()}

        game_rows = await db.execute(select(Game).where(Game.id.in_(game_ids)))
        game_map = {g.id: g.name for g in game_rows.scalars()}

        student_map: dict[uuid.UUID, str] = {}
        if student_ids:
            student_rows = await db.execute(select(User).where(User.id.in_(student_ids)))
            student_map = {u.id: u.name for u in student_rows.scalars()}

        for loan in loans:
            loan.__dict__["admin_name"] = admin_map.get(loan.admin_id, "")
            loan.__dict__["game_name"] = game_map.get(loan.game_id, "—")
            loan.__dict__["student_name"] = student_map.get(loan.student_id, "") if loan.student_id else ""

    return loans


async def register_loan(
    db: AsyncSession, payload: LoanCreate, admin: User, cubiculo_id: uuid.UUID
) -> GameLoan:
    game = await get_game(db, payload.game_id)
    if game.quantity_avail < 1:
        raise HTTPException(status_code=400, detail="No hay unidades disponibles del juego")

    student_identifier = payload.student_id.strip().lower()
    student: User | None = None
    try:
        student = await users_svc.get_by_student_id(db, student_identifier)
    except HTTPException as exc:
        if exc.status_code != 404:
            raise

    loan = GameLoan(
        cubiculo_id=cubiculo_id,
        game_id=payload.game_id,
        student_id=student.id if student else None,
        student_identifier=student_identifier,
        admin_id=admin.id,
        due_at=payload.due_at,
        notes=payload.notes,
        pieces_complete=payload.pieces_complete,
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
