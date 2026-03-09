import pytest
from httpx import AsyncClient
from app.models.user import User
from tests.conftest import get_token


@pytest.mark.asyncio
async def test_admin_can_list_users(client: AsyncClient, admin_user: User):
    token = await get_token(client, "admin@test.com", "admin1234")
    resp = await client.get(
        "/users", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    assert "items" in resp.json()
    assert "total" in resp.json()


@pytest.mark.asyncio
async def test_student_cannot_list_users(client: AsyncClient, student_user: User):
    token = await get_token(client, "student@test.com", "student1234")
    resp = await client.get(
        "/users", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_create_user(client: AsyncClient, admin_user: User):
    token = await get_token(client, "admin@test.com", "admin1234")
    resp = await client.post(
        "/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "New Student",
            "email": "new@test.com",
            "password": "pass1234",
            "role": "student",
            "student_id": "B99999",
            "period": "2026-1",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["email"] == "new@test.com"


@pytest.mark.asyncio
async def test_duplicate_email_rejected(client: AsyncClient, admin_user: User):
    token = await get_token(client, "admin@test.com", "admin1234")
    payload = {
        "name": "Dup",
        "email": "admin@test.com",  # already exists
        "password": "pass1234",
        "role": "admin",
    }
    resp = await client.post(
        "/users", headers={"Authorization": f"Bearer {token}"}, json=payload
    )
    assert resp.status_code == 409
