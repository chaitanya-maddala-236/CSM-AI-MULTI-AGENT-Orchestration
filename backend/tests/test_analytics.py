"""Analytics endpoint tests"""
import pytest


@pytest.mark.asyncio
async def test_health_trend(client, auth_headers):
    r = await client.get("/api/v1/analytics/health-trend", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 8
    assert all("date" in d and "healthy" in d and "at_risk" in d and "critical" in d for d in data)


@pytest.mark.asyncio
async def test_recommendation_stats(client, auth_headers):
    r = await client.get("/api/v1/analytics/recommendation-stats", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    for key in ("total", "approved", "rejected", "pending", "acceptance_rate", "by_category"):
        assert key in data


@pytest.mark.asyncio
async def test_revenue_trend(client, auth_headers):
    r = await client.get("/api/v1/analytics/revenue-trend", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 6
    assert all("month" in d and "arr" in d and "mrr" in d for d in data)


@pytest.mark.asyncio
async def test_ai_performance(client, auth_headers):
    r = await client.get("/api/v1/analytics/ai-performance", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    for key in ("total_runs", "success_rate", "accuracy_rate", "avg_confidence_score"):
        assert key in data
