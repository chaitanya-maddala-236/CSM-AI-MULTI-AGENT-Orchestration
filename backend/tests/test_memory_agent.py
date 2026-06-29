"""Memory agent unit tests — no DB, no LLM needed."""
import pytest
from app.agents.memory_agent import build_memory_prompt, memory_load_node, memory_save_node


def test_build_memory_prompt_empty():
    result = build_memory_prompt(None)
    assert result == ""


def test_build_memory_prompt_with_rejections():
    ctx = {
        "past_recommendations": [
            {"title": "Schedule Call", "category": "relationship", "status": "rejected",
             "feedback_note": "Already done this week", "confidence_score": 0.8},
            {"title": "Upsell Enterprise", "category": "expansion", "status": "approved",
             "feedback_note": None, "confidence_score": 0.75},
        ],
        "feedback_patterns": {
            "relationship": {"approved": 1, "rejected": 3},
            "expansion": {"approved": 4, "rejected": 1},
        },
        "historical_health_trend": [
            {"date": "2024-01-10", "health_score": 45},
            {"date": "2024-01-03", "health_score": 60},
        ],
    }
    result = build_memory_prompt(ctx)
    assert "REJECTED" in result
    assert "relationship" in result
    assert "expansion" in result
    assert "declining" in result  # 45 < 60 so trend is declining


def test_build_memory_prompt_improving_trend():
    ctx = {
        "past_recommendations": [],
        "feedback_patterns": {},
        "historical_health_trend": [
            {"date": "2024-01-10", "health_score": 75},
            {"date": "2024-01-03", "health_score": 50},
        ],
    }
    result = build_memory_prompt(ctx)
    assert "improving" in result


@pytest.mark.asyncio
async def test_memory_load_node_no_db():
    """Memory load should succeed gracefully with no DB injected."""
    state = {
        "customer_id": "cust-123",
        "_db": None,
        "agent_logs": [],
    }
    result = await memory_load_node(state)
    assert result["current_agent"] == "memory_load"
    assert "memory_context" in result
    assert result["memory_context"]["past_recommendations"] == []
    assert len(result["agent_logs"]) == 1


@pytest.mark.asyncio
async def test_memory_save_node_no_db():
    """Memory save should succeed gracefully with no DB injected."""
    state = {
        "customer_id": "cust-123",
        "_db": None,
        "workflow_id": "wf-abc",
        "recommendations": [{"title": "Test", "category": "churn_risk", "confidence_score": 0.9}],
        "health_score": 42.0,
        "agent_logs": [],
    }
    result = await memory_save_node(state)
    assert result["current_agent"] == "memory_save"
    assert len(result["agent_logs"]) == 1
