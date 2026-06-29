"""Interaction Agent — analyzes meetings, emails, support tickets."""
from typing import Dict, Any
from langchain_core.messages import HumanMessage, SystemMessage
from app.core.llm_factory import get_llm, invoke_with_token_tracking
from app.agents.prompts import INTERACTION_SYSTEM
import json, time


async def interaction_node(state: Dict[str, Any]) -> Dict[str, Any]:
    if not state.get("interaction_analysis", {}).get("should_run", True):
        return {"current_agent": "interaction", "agent_logs": ["[Interaction] Skipped by planner."]}

    start = time.time()
    ctx = state.get("customer_context", {})
    interactions = ctx.get("recent_interactions", [])

    prompt = (
        f"Customer: {ctx.get('customer_name')} ({ctx.get('company_name')})\n"
        f"Health Score: {ctx.get('health_score')}, Churn Risk: {ctx.get('churn_probability')}\n"
        f"Plan: {ctx.get('plan')}, MRR: ${ctx.get('mrr')}\n"
        f"Open Support Tickets: {ctx.get('open_tickets', 0)}\n\n"
        f"Recent Interactions:\n"
        f"{json.dumps(interactions, indent=2) if interactions else 'No recent interactions available — infer from health/usage signals only.'}\n\n"
        f"Analyze and return JSON."
    )

    try:
        llm = get_llm()
        response, token_usage = await invoke_with_token_tracking(
            llm,
            [SystemMessage(content=INTERACTION_SYSTEM), HumanMessage(content=prompt)],
            state, "interaction"
        )
        raw = response.content.strip().replace("```json", "").replace("```", "")
        result = json.loads(raw)
    except Exception as e:
        result = {
            "sentiment": "neutral", "sentiment_score": 0.5, "confidence": 0.4,
            "key_topics": [], "risks": [f"Analysis unavailable: {str(e)[:80]}"],
            "opportunities": [], "summary": "Interaction analysis could not be completed.",
            "last_meaningful_contact_days": None, "escalation_signals": []
        }
        token_usage = state.get("token_usage", {})

    ms = int((time.time() - start) * 1000)
    return {
        "current_agent": "interaction",
        "interaction_analysis": result,
        "token_usage": token_usage,
        "agent_logs": [
            f"[Interaction] Analyzed {len(interactions)} events in {ms}ms. "
            f"Sentiment: {result.get('sentiment')} ({result.get('sentiment_score', 0):.2f}). "
            f"Risks: {len(result.get('risks', []))}. Opportunities: {len(result.get('opportunities', []))}."
        ]
    }
