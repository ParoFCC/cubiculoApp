import pytest
from httpx import AsyncClient
from app.models.user import User
from tests.conftest import get_token


@pytest.mark.asyncio
async def test_student_balance_auto_created(
    client: AsyncClient, student_user: User
):
    token = await get_token(client, "student@test.com", "student1234")
    resp = await client.get(
        "/print/balance", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["free_remaining"] == 10


@pytest.mark.asyncio
async def test_admin_registers_free_print(
    client: AsyncClient, admin_user: User, student_user: User
):
    admin_token = await get_token(client, "admin@test.com", "admin1234")
    resp = await client.post(
        "/print",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "student_id": str(student_user.id),
            "pages": 5,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["type"] == "free"
    assert data["cost"] == 0.0


@pytest.mark.asyncio
async def test_print_overflow_creates_paid_job(
    client: AsyncClient, admin_user: User, student_user: User
):
    admin_token = await get_token(client, "admin@test.com", "admin1234")

    # Use up all 10 free pages in one job
    await client.post(
        "/print",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"student_id": str(student_user.id), "pages": 10},
    )

    # Next job should be fully paid
    resp = await client.post(
        "/print",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"student_id": str(student_user.id), "pages": 4},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["type"] == "paid"
    assert data["cost"] > 0


@pytest.mark.asyncio
async def test_student_can_view_history(
    client: AsyncClient, admin_user: User, student_user: User
):
    admin_token = await get_token(client, "admin@test.com", "admin1234")
    student_token = await get_token(client, "student@test.com", "student1234")

    # Register a print job
    await client.post(
        "/print",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"student_id": str(student_user.id), "pages": 2},
    )

    resp = await client.get(
        "/print/history", headers={"Authorization": f"Bearer {student_token}"}
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 1
