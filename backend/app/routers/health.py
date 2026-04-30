"""
GET /health — liveness + readiness probe.
Returns 200 when DB and Cloudinary are reachable, 503 otherwise.
No auth required (used by load balancers and uptime monitors).
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
import cloudinary
import sqlalchemy as sa

from app.core.database import engine

router = APIRouter()


@router.get("/health", tags=["health"])
async def health_check():
    checks: dict[str, str] = {}

    # ── Database ────────────────────────────────────────────────────────────
    try:
        async with engine.connect() as conn:
            await conn.execute(sa.text("SELECT 1"))
        checks["db"] = "ok"
    except Exception as exc:
        checks["db"] = f"error: {exc}"

    # ── Cloudinary ──────────────────────────────────────────────────────────
    try:
        cfg = cloudinary.config()
        if not cfg.cloud_name or not cfg.api_key:
            raise ValueError("Cloudinary not configured")
        checks["cloudinary"] = "ok"
    except Exception as exc:
        checks["cloudinary"] = f"error: {exc}"

    all_ok = all(v == "ok" for v in checks.values())
    return JSONResponse(
        status_code=200 if all_ok else 503,
        content={"status": "ok" if all_ok else "degraded", "checks": checks},
    )
