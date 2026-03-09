import pytest
from httpx import AsyncClient
from app.models.user import User
from tests.conftest import get_token


@pytest.mark.asyncio
async def test_list_games(client: AsyncClient, student_user: User):
    token = await get_token(client, "student@test.com", "student1234")
    resp = await client.get("/games", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_admin_create_game(client: AsyncClient, admin_user: User):
    token = await get_token(client, "admin@test.com", "admin1234")
    resp = await client.post(
        "/games",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Chess",
            "description": "Classic board game",
            "quantity_total": 3,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Chess"
    assert data["quantity_avail"] == 3


@pytest.mark.asyncio
async def test_student_cannot_create_game(client: AsyncClient, student_user: User):
    token = await get_token(client, "student@test.com", "student1234")
    resp = await client.post(
        "/games",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Chess", "quantity_total": 1},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_register_and_return_loan(
    client: AsyncClient, admin_user: User, student_user: User
):
    admin_token = await get_token(client, "admin@test.com", "admin1234")

    # Create a game first
    game_resp = await client.post(
        "/games",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Jenga", "quantity_total": 2},
    )
    assert game_resp.status_code == 201
    game_id = game_resp.json()["id"]

    # Register a loan
    loan_resp = await client.post(
        "/games/loans",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"game_id": game_id, "student_id": str(student_user.id)},
    )
    assert loan_resp.status_code == 201
    loan_id = loan_resp.json()["id"]

    # Verify quantity decreased
    game_detail = await client.get(
        f"/games/{game_id}", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert game_detail.json()["quantity_avail"] == 1

    # Return the game
    return_resp = await client.patch(
        f"/games/loans/{loan_id}/return",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert return_resp.status_code == 200
    assert return_resp.json()["status"] == "returned"
