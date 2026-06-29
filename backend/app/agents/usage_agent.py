"""Usage Agent — analyzes product usage and adoption patterns."""
from typing import Dict, Any
from langchain_core.messages import HumanMessage, SystemMessage
from app.core.llm_factory import get_fast_llm, invoke_with_token_tracking
from app.agents.prompts import USAGE_SYSTEM
import json, time


async def usage_node(state: Dict[str, Any]) -> Dict[str, Any]:
    if not state.get("usage_analysis", {}).get("should_run", True):
        return {"current_agent": "usage", "agent_logs": ["[Usage] Skipped by planner."]}

    start = time.time()
    ctx = state.get("customer_context", {})
    metrics = ctx.get("usage_metrics", [])

    prompt = (
        f"Customer: {ctx.get('customer_name')}\n"
        f"Plan: {ctx.get('plan')}, Total Seats: {ctx.get('seats')}\n"
        f"Current Health Score (raw): {ctx.get('health_score')}\n"
        f"MRR: ${ctx.get('mrr')}, Tenure months: {ctx.get('tenure_months', 'unknown')}\n\n"
        f"Usage Metrics (last 30 days):\n"
        f"{json.dumps(metrics, indent=2) if metrics else 'No usage metrics available — infer from plan/health/tenure.'}\n\n"
        f"Analyze and return JSON."
    )

    try:
        llm = get_fast_llm()
        response, token_usage = await invoke_with_token_tracking(
            llm,
            [SystemMessage(content=USAGE_SYSTEM), HumanMessage(content=prompt)],
            state, "usage"
        )
        raw = response.content.strip().replace("```json", "").replace("```", "")
        result = json.loads(raw)
    except Exception as e:
        result = {
            "health_score": ctx.get("health_score", 70),
            "adoption_level": "medium", "trend": "stable",
            "feature_utilization_pct": 0.5, "power_users_count": 0,
            "issues": [f"Analysis unavailable: {str(e)[:80]}"],
            "opportunities": [], "summary": "Usage analysis could not be completed.",
            "recommended_trainings": []
        }
        token_usage = state.get("token_usage", {})

    ms = int((time.time() - start) * 1000)
    return {
        "current_agent": "usage",
        "usage_analysis": result,
        "health_score": result.get("health_score"),
        "token_usage": token_usage,
        "agent_logs": [
            f"[Usage] Analyzed in {ms}ms. "
            f"Health: {result.get('health_score')}. "
            f"Adoption: {result.get('adoption_level')}. "
            f"Trend: {result.get('trend')}. "
            f"Issues: {len(result.get('issues', []))}."
        ]
    }
