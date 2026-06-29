"""Recommendation Agent — the most critical agent; generates Next Best Actions."""
from typing import Dict, Any
from langchain_core.messages import HumanMessage, SystemMessage
from app.core.llm_factory import get_llm, invoke_with_token_tracking
from app.agents.prompts import RECOMMENDATION_SYSTEM
from app.agents.memory_agent import build_memory_prompt
import json, time, uuid


async def recommendation_node(state: Dict[str, Any]) -> Dict[str, Any]:
    start = time.time()
    ctx = state.get("customer_context", {})
    memory_ctx = state.get("memory_context")
    memory_section = build_memory_prompt(memory_ctx)

    prompt = f"""Customer Context:
- Name: {ctx.get('customer_name')} at {ctx.get('company_name')}
- Industry: {ctx.get('industry', 'Unknown')} | Plan: {ctx.get('plan')} | Seats: {ctx.get('seats')}
- Health Score: {state.get('health_score') or ctx.get('health_score')} / 100
- Churn Probability: {ctx.get('churn_probability')} ({_risk_label(ctx.get('churn_probability', 0))})
- MRR: ${ctx.get('mrr')} | ARR: ${ctx.get('arr', (ctx.get('mrr', 0) * 12))}
- Renewal Date: {ctx.get('renewal_date') or 'Not set'}
- Open Support Tickets: {ctx.get('open_tickets', 0)}
- Trigger: {ctx.get('trigger_reason', 'scheduled_analysis')}

Interaction Analysis:
{json.dumps(state.get('interaction_analysis', {}), indent=2)}

Usage Analysis:
{json.dumps(state.get('usage_analysis', {}), indent=2)}

Sentiment Analysis:
{json.dumps(state.get('sentiment_analysis', {}), indent=2)}

Deterministic Computed Signals (tool-computed, not estimated):
{json.dumps(state.get('computed_signals', {}) or {}, indent=2)}

Relevant Playbooks & Knowledge Base:
{chr(10).join(state.get('knowledge_context', []) or ['No knowledge articles available.'])}
{f'''
Historical Memory & CSM Feedback:
{memory_section}''' if memory_section else ''}

Generate 1–3 specific, actionable recommendations as a JSON array."""

    try:
        llm = get_llm()
        response, token_usage = await invoke_with_token_tracking(
            llm,
            [SystemMessage(content=RECOMMENDATION_SYSTEM), HumanMessage(content=prompt)],
            state, "recommendation"
        )
        raw = response.content.strip().replace("```json", "").replace("```", "")
        raw_recs = json.loads(raw)
        if not isinstance(raw_recs, list):
            raw_recs = [raw_recs]
    except Exception as e:
        # Intelligent fallback based on actual customer signals
        raw_recs = _build_fallback_recommendation(ctx, state, e)

    # Enrich with IDs
    enriched = []
    for rec in raw_recs:
        rec["id"] = str(uuid.uuid4())
        rec["workflow_id"] = state.get("workflow_id")
        enriched.append(rec)

    # Explainability (non-blocking)
    try:
        from app.services.explainability import enrich_recommendations
        enriched = await enrich_recommendations(enriched, state)
    except Exception:
        pass

    ms = int((time.time() - start) * 1000)
    _tu = locals().get("token_usage", state.get("token_usage", {}))
    return {
        "current_agent": "recommendation",
        "recommendations": enriched,
        "token_usage": _tu,
        "agent_logs": [
            f"[Recommendation] Generated {len(enriched)} recommendation(s) in {ms}ms. "
            f"Memory context: {'yes' if memory_section else 'none'}. "
            f"Provider: {_get_provider()}."
        ]
    }


def _risk_label(prob: float) -> str:
    if prob > 0.7: return "CRITICAL"
    if prob > 0.4: return "HIGH"
    if prob > 0.2: return "MODERATE"
    return "LOW"


def _get_provider() -> str:
    try:
        from app.core.config import settings
        return settings.active_provider
    except Exception:
        return "unknown"


def _build_fallback_recommendation(ctx: Dict, state: Dict, error: Exception) -> list:
    """Build a context-aware fallback when LLM call fails."""
    health = state.get("health_score") or ctx.get("health_score", 70)
    churn  = ctx.get("churn_probability", 0.3)

    if health < 40 or churn > 0.7:
        return [{
            "title": "Emergency Account Recovery Call",
            "description": "Critical health signals require immediate executive-level intervention to prevent churn.",
            "category": "churn_risk", "priority": "critical",
            "actions": [
                "Day 1: Escalate to VP Customer Success immediately",
                "Day 1: Call customer executive sponsor personally",
                "Day 2: Draft custom 90-day recovery plan with measurable milestones",
                "Day 3: Schedule weekly check-in for next 60 days",
                "Day 7: Share personalized ROI report and success roadmap",
            ],
            "evidence": [
                f"Health score: {health}/100 (critical threshold)",
                f"Churn probability: {round(churn * 100)}%",
                f"Error in AI analysis: {str(error)[:100]}",
            ],
            "reasoning": "Critical health/churn signals require immediate intervention regardless of AI availability.",
            "confidence_score": 0.75, "risk_score": 0.9,
        }]

    return [{
        "title": "Proactive Customer Health Check Call",
        "description": "A structured health check is the right first step to understand the customer's current experience and needs.",
        "category": "relationship", "priority": "medium",
        "actions": [
            "Day 1: Send agenda and schedule 30-min call within 5 business days",
            "Day 2: Prepare usage report, health metrics, and open items",
            "Day 5: Conduct health check — cover adoption, ROI, upcoming needs",
            "Day 6: Document outcomes and next steps in CRM",
            "Day 14: Follow-up on committed action items",
        ],
        "evidence": [
            f"Health score: {health}/100",
            f"Churn probability: {round(churn * 100)}%",
            f"Fallback recommendation (AI analysis error: {str(error)[:60]})",
        ],
        "reasoning": "Health check calls are universally valuable as a baseline touchpoint. Generated as fallback.",
        "confidence_score": 0.60, "risk_score": 0.3,
    }]
