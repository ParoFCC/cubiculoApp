"""
Pytest configuration and shared fixtures for CubiculoApp backend tests.

Uses an in-memory SQLite database (StaticPool) so tests never touch Neon.
Tables are created once per session; rows are truncated after each test so
each test starts with a clean state.
"""
import os
from typing import AsyncGenerator

# Provide required env vars BEFORE any app module is imported so
# pydantic-settings doesn't raise a ValidationError without a .env file.
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")

import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
)
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.security import hash_password
from app.models.user import User, UserRole

# ---------------------------------------------------------------------------
# Shared in-memory SQLite engine (StaticPool reuses ONE connection so the
# same in-memory DB is visible to all async sessions in the test suite).
# ---------------------------------------------------------------------------
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False,
)
TestingSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ---------------------------------------------------------------------------
# Session-scoped: create tables once for the whole test run.
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture(scope="session", loop_scope="session", autouse=True)
async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# ---------------------------------------------------------------------------
# Function-scoped: truncate every table after each test for isolation.
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture(autouse=True)
async def clean_tables(create_tables):  # noqa: F811 – depends on session fixture
    yield
    async with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())


# ---------------------------------------------------------------------------
# DB session and HTTP client
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture
async def db_session(clean_tables) -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Seed helpers
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(
        name="Admin Test",
        email="admin@test.com",
        password_hash=hash_password("admin1234"),
        role=UserRole.admin,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def student_user(db_session: AsyncSession) -> User:
    user = User(
        name="Student Test",
        email="student@test.com",
        password_hash=hash_password("student1234"),
        role=UserRole.student,
        student_id="A12345",
        period="2026-1",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def get_token(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    return resp.json()["access_token"]
