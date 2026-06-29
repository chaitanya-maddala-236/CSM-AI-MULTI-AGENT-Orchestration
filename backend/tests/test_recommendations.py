"""Recommendation endpoint tests"""
import pytest
import uuid
from unittest.mock import patch, AsyncMock


@pytest.fixture
async def seeded_customer(db_session) -> str:
    from app.models.models import Company, Customer
    comp = Company(id=str(uuid.uuid4()), name="Acme", industry="Tech")
    db_session.add(comp)
    await db_session.flush()
    cust = Customer(
        id=str(uuid.uuid4()), company_id=comp.id,
        name="Dave", email="dave@acme.com",
        health_score=35.0, churn_probability=0.8,
        health_status="critical", mrr=3000, arr=36000,
    )
    db_session.add(cust)
    await db_session.commit()
    return cust.id


@pytest.fixture
async def seeded_recommendation(db_session, seeded_customer) -> str:
    from app.models.models import Recommendation
    rec = Recommendation(
        id=str(uuid.uuid4()), customer_id=seeded_customer,
        title="Test Rec", category="churn_risk", priority="critical",
        status="pending", confidence_score=0.9, risk_score=0.8,
    )
    db_session.add(rec)
    await db_session.commit()
    return rec.id


@pytest.mark.asyncio
async def test_list_recommendations(client, auth_headers, seeded_recommendation):
    r = await client.get("/api/v1/recommendations", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1
    assert len(data["items"]) >= 1


@pytest.mark.asyncio
async def test_filter_by_status(client, auth_headers, seeded_recommendation):
    r = await client.get("/api/v1/recommendations?status=pending", headers=auth_headers)
    assert r.status_code == 200
    items = r.json()["items"]
    assert all(i["status"] == "pending" for i in items)


@pytest.mark.asyncio
async def test_approve_recommendation(client, auth_headers, seeded_recommendation):
    r = await client.post(
        f"/api/v1/recommendations/{seeded_recommendation}/approve",
        headers=auth_headers,
        json={"status": "approved", "feedback_note": "Looks good"},
    )
    assert r.status_code == 200
    assert r.json()["success"] is True


@pytest.mark.asyncio
async def test_reject_recommendation(client, auth_headers, seeded_recommendation):
    r = await client.post(
        f"/api/v1/recommendations/{seeded_recommendation}/approve",
        headers=auth_headers,
        json={"status": "rejected", "feedback_note": "Not relevant right now"},
    )
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_recommendations_by_customer(client, auth_headers, seeded_customer, seeded_recommendation):
    r = await client.get(f"/api/v1/recommendations/customer/{seeded_customer}", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert len(r.json()) >= 1


@pytest.mark.asyncio
async def test_trigger_analysis_customer_not_found(client, auth_headers):
    r = await client.post(
        "/api/v1/recommendations/trigger",
        headers=auth_headers,
        json={"customer_id": str(uuid.uuid4())},
    )
    # Trigger is async (background task) — always returns 200 message even if customer missing
    assert r.status_code == 200
