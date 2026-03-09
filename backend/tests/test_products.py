import pytest
from httpx import AsyncClient
from app.models.user import User
from tests.conftest import get_token


@pytest.mark.asyncio
async def test_list_products_authenticated(
    client: AsyncClient, student_user: User
):
    token = await get_token(client, "student@test.com", "student1234")
    resp = await client.get(
        "/products", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_admin_create_product(client: AsyncClient, admin_user: User):
    token = await get_token(client, "admin@test.com", "admin1234")
    resp = await client.post(
        "/products",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Coffee",
            "price": 1.50,
            "stock": 20,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Coffee"
    assert data["stock"] == 20


@pytest.mark.asyncio
async def test_register_sale_with_cash_register(
    client: AsyncClient, admin_user: User
):
    token = await get_token(client, "admin@test.com", "admin1234")

    # Open cash register
    cr_resp = await client.post(
        "/cash-register/open",
        headers={"Authorization": f"Bearer {token}"},
        json={"opening_amount": 50.0},
    )
    assert cr_resp.status_code == 201

    # Create product
    prod_resp = await client.post(
        "/products",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Tea", "price": 1.00, "stock": 10},
    )
    assert prod_resp.status_code == 201
    product_id = prod_resp.json()["id"]

    # Register sale
    sale_resp = await client.post(
        "/sales",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "items": [{"product_id": product_id, "quantity": 2}],
            "payment_method": "cash",
        },
    )
    assert sale_resp.status_code == 201
    data = sale_resp.json()
    assert data["total"] == 2.0

    # Verify stock decreased
    prod_detail = await client.get(
        f"/products", headers={"Authorization": f"Bearer {token}"}
    )
    tea = next(
        (p for p in prod_detail.json() if p["id"] == product_id), None
    )
    assert tea is not None
    assert tea["stock"] == 8


@pytest.mark.asyncio
async def test_sale_rejected_when_no_cash_register(
    client: AsyncClient, admin_user: User
):
    token = await get_token(client, "admin@test.com", "admin1234")

    # Create product (no cash register open here in fresh DB)
    prod_resp = await client.post(
        "/products",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Juice", "price": 2.00, "stock": 5},
    )
    product_id = prod_resp.json()["id"]

    sale_resp = await client.post(
        "/sales",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "items": [{"product_id": product_id, "quantity": 1}],
            "payment_method": "cash",
        },
    )
    # Should fail because no open cash register
    assert sale_resp.status_code == 409


@pytest.mark.asyncio
async def test_close_cash_register(client: AsyncClient, admin_user: User):
    token = await get_token(client, "admin@test.com", "admin1234")

    # Open
    await client.post(
        "/cash-register/open",
        headers={"Authorization": f"Bearer {token}"},
        json={"opening_amount": 100.0},
    )

    # Close
    close_resp = await client.post(
        "/cash-register/close",
        headers={"Authorization": f"Bearer {token}"},
        json={"closing_amount": 105.0, "notes": "End of day"},
    )
    assert close_resp.status_code == 200
    assert close_resp.json()["status"] == "closed"
