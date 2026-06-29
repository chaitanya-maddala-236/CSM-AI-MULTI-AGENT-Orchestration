"""Reusable LangChain tools that agents can invoke.

These are structured as @tool decorated functions compatible with LangChain's
tool-calling interface and can be passed to any agent's LLM via bind_tools().
"""
from langchain_core.tools import tool


@tool
def get_customer_health_status(health_score: float) -> str:
    """Determine customer health status label from a numeric health score (0-100)."""
    if health_score >= 70:
        return "healthy"
    elif health_score >= 40:
        return "at_risk"
    return "critical"


@tool
def calculate_churn_risk_level(churn_probability: float) -> str:
    """Map churn probability (0-1) to a human-readable risk level."""
    if churn_probability >= 0.7:
        return "critical"
    elif churn_probability >= 0.4:
        return "high"
    elif churn_probability >= 0.2:
        return "medium"
    return "low"


@tool
def days_until_renewal(renewal_date_iso: str) -> int:
    """Calculate the number of days until a customer's renewal date."""
    from datetime import datetime, timezone
    try:
        renewal = datetime.fromisoformat(renewal_date_iso.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        return max(0, (renewal - now).days)
    except Exception:
        return -1


ALL_TOOLS = [get_customer_health_status, calculate_churn_risk_level, days_until_renewal]
TOOLS_BY_NAME = {t.name: t for t in ALL_TOOLS}


async def execute_tool_calls(ai_message) -> dict:
    """Execute the tool calls an LLM issued (via .bind_tools()) and return
    {tool_name: result}. This is the actual "agent uses tools" step — the LLM
    decides *which* tools to call and with what args, we just run them.

    Safe to call even if the message has no tool_calls (returns {}).
    """
    results = {}
    for call in getattr(ai_message, "tool_calls", None) or []:
        matched_tool = TOOLS_BY_NAME.get(call.get("name"))
        if not matched_tool:
            continue
        try:
            results[call["name"]] = matched_tool.invoke(call.get("args", {}))
        except Exception as e:
            results[call["name"]] = f"error: {e}"
    return results
