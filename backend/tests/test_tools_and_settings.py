"""Tests for the tool-calling wiring (app/tools) and business-rule settings.

These don't depend on a real LLM: execute_tool_calls() just needs an object
with a `.tool_calls` attribute shaped like what LangChain's bind_tools()
produces, so we can test the actual execution path directly.
"""
import pytest
from types import SimpleNamespace
from app.tools import execute_tool_calls, ALL_TOOLS, TOOLS_BY_NAME


def test_all_tools_registered():
    names = {t.name for t in ALL_TOOLS}
    assert names == {
        "get_customer_health_status",
        "calculate_churn_risk_level",
        "days_until_renewal",
    }
    assert set(TOOLS_BY_NAME.keys()) == names


@pytest.mark.asyncio
async def test_execute_tool_calls_runs_real_tools():
    ai_message = SimpleNamespace(tool_calls=[
        {"name": "get_customer_health_status", "args": {"health_score": 35}},
        {"name": "calculate_churn_risk_level", "args": {"churn_probability": 0.8}},
    ])
    results = await execute_tool_calls(ai_message)
    assert results["get_customer_health_status"] == "critical"
    assert results["calculate_churn_risk_level"] == "critical"


@pytest.mark.asyncio
async def test_execute_tool_calls_handles_no_tool_calls():
    ai_message = SimpleNamespace(tool_calls=[])
    results = await execute_tool_calls(ai_message)
    assert results == {}


@pytest.mark.asyncio
async def test_execute_tool_calls_handles_unknown_tool():
    ai_message = SimpleNamespace(tool_calls=[{"name": "not_a_real_tool", "args": {}}])
    results = await execute_tool_calls(ai_message)
    assert results == {}


@pytest.mark.asyncio
async def test_business_rules_default_and_update(client, auth_headers):
    r = await client.get("/api/v1/settings/business-rules", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["auto_approve_enabled"] is False
    assert data["auto_approve_confidence_threshold"] == 75.0

    r2 = await client.put(
        "/api/v1/settings/business-rules",
        headers=auth_headers,
        json={"auto_approve_enabled": True, "auto_approve_confidence_threshold": 90},
    )
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2["auto_approve_enabled"] is True
    assert data2["auto_approve_confidence_threshold"] == 90.0

    # Confirm it persisted
    r3 = await client.get("/api/v1/settings/business-rules", headers=auth_headers)
    assert r3.json()["auto_approve_enabled"] is True
