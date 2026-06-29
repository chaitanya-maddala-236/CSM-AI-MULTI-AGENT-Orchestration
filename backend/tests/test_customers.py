"""Customer endpoint tests"""
import pytest
import uuid


@pytest.fixture
async def company_id(db_session) -> str:
    """Insert a bare Company row and return its ID."""
    from app.models.models import Company
    c = Company(id=str(uuid.uuid4()), name="Test Co", industry="Tech", size="smb")
    db_session.add(c)
    await db_session.commit()
    return c.id


@pytest.mark.asyncio
async def test_list_customers_empty(client, auth_headers):
    r = await client.get("/api/v1/customers", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_create_customer(client, auth_headers, company_id):
    r = await client.post("/api/v1/customers", headers=auth_headers, json={
        "name": "Alice Smith",
        "email": "alice@testco.com",
        "company_id": company_id,
        "plan": "professional",
        "mrr": 2500,
        "seats": 10,
    })
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Alice Smith"
    assert data["arr"] == 30000.0


@pytest.mark.asyncio
async def test_get_customer(client, auth_headers, company_id):
    create = await client.post("/api/v1/customers", headers=auth_headers, json={
        "name": "Bob Jones", "email": "bob@testco.com",
        "company_id": company_id, "mrr": 1000,
    })
    cid = create.json()["id"]
    r = await client.get(f"/api/v1/customers/{cid}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["id"] == cid


@pytest.mark.asyncio
async def test_get_customer_not_found(client, auth_headers):
    r = await client.get(f"/api/v1/customers/{uuid.uuid4()}", headers=auth_headers)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_update_customer(client, auth_headers, company_id):
    create = await client.post("/api/v1/customers", headers=auth_headers, json={
        "name": "Carol", "email": "carol@testco.com",
        "company_id": company_id, "mrr": 500,
    })
    cid = create.json()["id"]
    r = await client.patch(f"/api/v1/customers/{cid}", headers=auth_headers, json={"mrr": 1500})
    assert r.status_code == 200
    assert r.json()["mrr"] == 1500
    assert r.json()["arr"] == 18000.0


@pytest.mark.asyncio
async def test_dashboard_stats(client, auth_headers):
    r = await client.get("/api/v1/customers/stats", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    for key in ("total_customers", "healthy", "at_risk", "critical", "avg_health_score", "total_arr"):
        assert key in data


@pytest.mark.asyncio
async def test_list_customers_requires_auth(client):
    r = await client.get("/api/v1/customers")
    assert r.status_code == 403
