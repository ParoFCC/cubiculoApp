from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, users, games, printing, products, cubiculos, upload

# Ensure all models are imported so SQLAlchemy can create their tables
import app.models.user  # noqa: F401
import app.models.email_verification  # noqa: F401
import app.models.cubiculo  # noqa: F401

app = FastAPI(
    title="CubiculoApp API",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url=None,
)

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


@app.get("/health")
def health_check():
    return {"status": "ok"}
