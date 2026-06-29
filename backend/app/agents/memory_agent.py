"""Memory Agent — stores interaction outcomes and injects historical context into analysis.

This agent runs BEFORE the planner to hydrate the state with:
  - Past recommendations (approved/rejected) and their outcomes
  - Customer interaction history (meeting summaries, ticket patterns)
  - Feedback notes from CSMs on previous recommendations

It also runs AFTER the recommendation agent to persist the current run's
outcomes so future analyses can learn from them.
"""

from typing import Dict, Any, List, Optional
import time
import json


# ---------------------------------------------------------------------------
# Pre-analysis: load memory from DB (called before planner)
# ---------------------------------------------------------------------------

async def memory_load_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Load historical context for this customer from the database."""
    start = time.time()

    customer_id = state.get("customer_id")
    db = state.get("_db")  # injected by the orchestrator, may be None in tests

    memory_context: Dict[str, Any] = {
        "past_recommendations": [],
        "feedback_patterns": {},
        "historical_health_trend": [],
        "csm_notes": [],
    }

    if db and customer_id:
        try:
            from sqlalchemy import select, desc
            from app.models.models import Recommendation, Timeline, Customer

            # Last 10 recommendations with their outcomes
            result = await db.execute(
                select(Recommendation)
                .where(Recommendation.customer_id == customer_id)
                .where(Recommendation.status.in_(["approved", "rejected", "executed"]))
                .order_by(desc(Recommendation.created_at))
                .limit(10)
            )
            past_recs = result.scalars().all()

            for rec in past_recs:
                memory_context["past_recommendations"].append({
                    "title": rec.title,
                    "category": rec.category,
                    "priority": rec.priority,
                    "status": rec.status,
                    "outcome": rec.outcome,
                    "feedback_note": rec.feedback_note,
                    "confidence_score": rec.confidence_score,
                    "created_at": str(rec.created_at),
                })

            # Aggregate category-level acceptance rate
            feedback_patterns: Dict[str, Dict[str, int]] = {}
            for rec in past_recs:
                cat = rec.category or "general"
                if cat not in feedback_patterns:
                    feedback_patterns[cat] = {"approved": 0, "rejected": 0}
                if rec.status in ("approved", "executed"):
                    feedback_patterns[cat]["approved"] += 1
                elif rec.status == "rejected":
                    feedback_patterns[cat]["rejected"] += 1
            memory_context["feedback_patterns"] = feedback_patterns

            # Timeline health events
            tl_result = await db.execute(
                select(Timeline)
                .where(Timeline.customer_id == customer_id)
                .where(Timeline.event_type == "health_check")
                .order_by(desc(Timeline.occurred_at))
                .limit(6)
            )
            for tl in tl_result.scalars().all():
                meta = tl.event_metadata or {}
                memory_context["historical_health_trend"].append({
                    "date": str(tl.occurred_at),
                    "health_score": meta.get("health_score"),
                })

        except Exception as exc:
            # Non-fatal — analysis continues without memory
            pass

    ms = int((time.time() - start) * 1000)
    log_parts = [f"[Memory] Loaded in {ms}ms."]
    if memory_context["past_recommendations"]:
        log_parts.append(
            f"Past recs: {len(memory_context['past_recommendations'])}. "
            f"Patterns: {json.dumps(memory_context['feedback_patterns'])}"
        )
    else:
        log_parts.append("No prior recommendation history.")

    return {
        "current_agent": "memory_load",
        "memory_context": memory_context,
        "agent_logs": [" ".join(log_parts)],
    }


# ---------------------------------------------------------------------------
# Post-recommendation: persist memory signals
# ---------------------------------------------------------------------------

async def memory_save_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Persist a summary of this run so future analyses can reference it."""
    start = time.time()

    customer_id = state.get("customer_id")
    db = state.get("_db")
    recs = state.get("recommendations", [])

    if db and customer_id and recs:
        try:
            from app.models.models import Timeline
            import uuid

            # Record a lightweight memory checkpoint on the timeline
            summary = {
                "workflow_id": state.get("workflow_id"),
                "recommendations_generated": len(recs),
                "categories": list({r.get("category") for r in recs}),
                "avg_confidence": round(
                    sum(r.get("confidence_score", 0) for r in recs) / len(recs), 2
                ),
                "health_score": state.get("health_score"),
            }
            tl = Timeline(
                id=str(uuid.uuid4()),
                customer_id=customer_id,
                event_type="ai_analysis_complete",
                title=f"AI Analysis: {len(recs)} recommendation(s) generated",
                description=json.dumps(summary),
                event_metadata=summary,
            )
            db.add(tl)
            await db.flush()
        except Exception:
            pass

    ms = int((time.time() - start) * 1000)
    return {
        "current_agent": "memory_save",
        "agent_logs": [f"[Memory] Saved run summary in {ms}ms."],
    }


# ---------------------------------------------------------------------------
# Helper: build memory prompt fragment for recommendation agent
# ---------------------------------------------------------------------------

def build_memory_prompt(memory_context: Optional[Dict[str, Any]]) -> str:
    """Return a formatted string that the recommendation agent injects into its prompt."""
    if not memory_context:
        return ""

    lines = []

    past_recs = memory_context.get("past_recommendations", [])
    if past_recs:
        lines.append("PREVIOUS RECOMMENDATION OUTCOMES (use to avoid repeating rejected actions):")
        for r in past_recs[:5]:
            outcome_str = f" → outcome: {r['outcome']}" if r.get("outcome") else ""
            feedback = f" — CSM note: \"{r['feedback_note']}\"" if r.get("feedback_note") else ""
            lines.append(
                f"  [{r['status'].upper()}] {r['title']} (category: {r['category']}){outcome_str}{feedback}"
            )

    patterns = memory_context.get("feedback_patterns", {})
    if patterns:
        lines.append("CATEGORY ACCEPTANCE RATES:")
        for cat, counts in patterns.items():
            total = counts["approved"] + counts["rejected"]
            if total > 0:
                rate = round(counts["approved"] / total * 100)
                lines.append(f"  {cat}: {rate}% acceptance ({total} total)")

    trend = memory_context.get("historical_health_trend", [])
    if len(trend) >= 2:
        scores = [t["health_score"] for t in trend if t.get("health_score") is not None]
        if len(scores) >= 2:
            direction = "improving" if scores[0] > scores[-1] else "declining"
            lines.append(f"HEALTH TREND: {direction} (recent: {scores[0]}, older: {scores[-1]})")

    return "\n".join(lines) if lines else ""
