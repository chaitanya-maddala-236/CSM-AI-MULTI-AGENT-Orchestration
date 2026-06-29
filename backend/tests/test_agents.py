"""Agent monitoring endpoint tests"""
import pytest


@pytest.mark.asyncio
async def test_list_agents(client, auth_headers):
    r = await client.get("/api/v1/agents/list", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "agents" in data
    assert "llm_provider" in data
    agent_keys = {a["key"] for a in data["agents"]}
    # Verify all 8 expected agents are registered
    expected = {"planner", "interaction", "usage", "sentiment", "knowledge", "recommendation", "memory", "approval"}
    assert expected == agent_keys


@pytest.mark.asyncio
async def test_agent_runs_empty(client, auth_headers):
    r = await client.get("/api/v1/agents/runs", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_agent_stats(client, auth_headers):
    r = await client.get("/api/v1/agents/stats", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    for key in ("total_runs", "completed", "failed", "success_rate", "avg_execution_ms"):
        assert key in data


@pytest.mark.asyncio
async def test_agents_requires_auth(client):
    r = await client.get("/api/v1/agents/list")
    assert r.status_code == 403
