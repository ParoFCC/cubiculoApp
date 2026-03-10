from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import sqlalchemy as sa

from app.core.config import settings
from app.core.database import engine
from app.routers import auth, users, games, printing, products, cubiculos, upload, attendance, search

# Ensure all models are imported so SQLAlchemy can create their tables
import app.models.user  # noqa: F401
import app.models.email_verification  # noqa: F401
import app.models.cubiculo  # noqa: F401
import app.models.attendance  # noqa: F401

# ── Rate limiter ───────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

# ── Overdue loan cron ──────────────────────────────────────────────────────
async def _mark_overdue_loans() -> None:
    from app.core.database import AsyncSessionLocal
    from app.models.game_loan import GameLoan, LoanStatus
    from datetime import datetime, timezone
    from sqlalchemy import update

    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        await db.execute(
            update(GameLoan)
            .where(
                GameLoan.status == LoanStatus.active,
                GameLoan.due_at != None,  # noqa: E711
                GameLoan.due_at < now,
            )
            .values(status=LoanStatus.overdue)
        )
        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Add is_super_admin column if it doesn't exist yet
    async with engine.begin() as conn:
        await conn.execute(sa.text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
            "is_super_admin BOOLEAN NOT NULL DEFAULT FALSE"
        ))
        # Bootstrap: ensure the original super-admin keeps their flag
        await conn.execute(sa.text(
            "UPDATE users SET is_super_admin = TRUE "
            f"WHERE student_id = '{settings.SUPER_ADMIN_ID}' "
            "AND is_super_admin = FALSE"
        ))
    # Start cron scheduler
    scheduler = AsyncIOScheduler()
    scheduler.add_job(_mark_overdue_loans, "interval", hours=1, id="mark_overdue")
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(
    lifespan=lifespan,
    title="CubiculoApp API",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(cubiculos.router, prefix="/cubiculos", tags=["cubiculos"])
app.include_router(games.router, prefix="/games", tags=["games"])
app.include_router(printing.router, prefix="/print", tags=["printing"])
app.include_router(products.router, tags=["products"])
app.include_router(upload.router, prefix="/upload", tags=["upload"])
app.include_router(attendance.router)
app.include_router(search.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
