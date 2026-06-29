"""Sentiment Agent — holistic emotional health analysis."""
from typing import Dict, Any
from langchain_core.messages import HumanMessage, SystemMessage
from app.core.llm_factory import get_fast_llm, invoke_with_token_tracking
from app.agents.prompts import SENTIMENT_SYSTEM
import json, time


async def sentiment_node(state: Dict[str, Any]) -> Dict[str, Any]:
    if not state.get("sentiment_analysis", {}).get("should_run", True):
        return {"current_agent": "sentiment", "agent_logs": ["[Sentiment] Skipped by planner."]}

    start = time.time()
    ctx = state.get("customer_context", {})
    interaction = state.get("interaction_analysis", {})
    usage = state.get("usage_analysis", {})

    prompt = (
        f"Customer: {ctx.get('customer_name')} at {ctx.get('company_name')}\n"
        f"Health Score: {ctx.get('health_score')} | Churn Risk: {ctx.get('churn_probability')}\n"
        f"MRR: ${ctx.get('mrr')} | Plan: {ctx.get('plan')}\n"
        f"Open Tickets: {ctx.get('open_tickets', 0)}\n\n"
        f"Interaction Analysis:\n"
        f"  Sentiment: {interaction.get('sentiment', 'unknown')} ({interaction.get('sentiment_score', 'N/A')})\n"
        f"  Key Topics: {interaction.get('key_topics', [])}\n"
        f"  Risks: {interaction.get('risks', [])}\n"
        f"  Escalation Signals: {interaction.get('escalation_signals', [])}\n\n"
        f"Usage Analysis:\n"
        f"  Adoption Level: {usage.get('adoption_level', 'unknown')}\n"
        f"  Trend: {usage.get('trend', 'unknown')}\n"
        f"  Issues: {usage.get('issues', [])}\n\n"
        f"Synthesize all signals and return holistic sentiment JSON."
    )

    try:
        llm = get_fast_llm()
        response, token_usage = await invoke_with_token_tracking(
            llm,
            [SystemMessage(content=SENTIMENT_SYSTEM), HumanMessage(content=prompt)],
            state, "sentiment"
        )
        raw = response.content.strip().replace("```json", "").replace("```", "")
        result = json.loads(raw)
    except Exception as e:
        result = {
            "overall_sentiment": "neutral", "sentiment_score": 0.5,
            "confidence": 0.4, "trend": "stable",
            "key_signals": [f"Analysis unavailable: {str(e)[:80]}"],
            "emotional_risk_factors": [], "advocacy_potential": "medium",
            "summary": "Sentiment analysis could not be completed."
        }
        token_usage = state.get("token_usage", {})

    ms = int((time.time() - start) * 1000)
    return {
        "current_agent": "sentiment",
        "sentiment_analysis": result,
        "token_usage": token_usage,
        "agent_logs": [
            f"[Sentiment] Analyzed in {ms}ms. "
            f"Overall: {result.get('overall_sentiment')} ({result.get('sentiment_score', 0):.2f}). "
            f"Trend: {result.get('trend')}. "
            f"Advocacy potential: {result.get('advocacy_potential')}."
        ]
    }
