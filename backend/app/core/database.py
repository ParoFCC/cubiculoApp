from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


def _build_engine():
    url = settings.DATABASE_URL
    kwargs: dict = {}

    if url.startswith("sqlite"):
        pass  # no extra kwargs for SQLite
    else:
        kwargs = {"pool_pre_ping": True, "pool_size": 5, "max_overflow": 10}
        # asyncpg does not accept sslmode=; convert to ssl= instead
        if "sslmode=require" in url:
            url = url.replace("?sslmode=require", "").replace("&sslmode=require", "")
            kwargs["connect_args"] = {"ssl": True}

    return create_async_engine(url, **kwargs)


engine = _build_engine()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:  # type: ignore[override]
    async with AsyncSessionLocal() as session:
        yield session
