"""Recommendation routes"""
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.auth.auth import get_current_user
from app.models.models import User
from app.services.recommendation_service import RecommendationService
from app.schemas.schemas import RecommendationOut, ApprovalRequest, TriggerAgentRequest, MessageResponse

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.get("")
async def list_recommendations(
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None, priority: Optional[str] = None,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
):
    svc = RecommendationService(db)
    items, total = await svc.get_all(page, page_size, status, priority)
    return {"total": total, "items": items, "page": page, "page_size": page_size}

@router.get("/customer/{customer_id}")
async def get_by_customer(customer_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    svc = RecommendationService(db)
    return await svc.get_by_customer(customer_id)

@router.post("/{rec_id}/approve", response_model=MessageResponse)
async def approve_recommendation(rec_id: str, data: ApprovalRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    svc = RecommendationService(db)
    rec = await svc.approve_or_reject(rec_id, data, current_user.id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    await db.commit()
    return MessageResponse(message=f"Recommendation {data.status}")

@router.post("/trigger", response_model=MessageResponse)
async def trigger_analysis(data: TriggerAgentRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    svc = RecommendationService(db)
    background_tasks.add_task(_run_analysis, data.customer_id)
    return MessageResponse(message="Analysis triggered successfully")

async def _run_analysis(customer_id: str):
    # BUGFIX: don't reuse the request-scoped session — get_db() closes it via its
    # `finally` block as soon as the endpoint returns, which happens *before*
    # BackgroundTasks run. Using it here raised "session is closed" errors and
    # silently failed (swallowed by the except below), so triggered analyses
    # never actually ran. Open a brand-new session scoped to this task instead.
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        svc = RecommendationService(db)
        try:
            await svc.trigger_analysis(customer_id, "manual")
            await db.commit()
        except Exception as e:
            await db.rollback()


# ─── Feedback Loop ─────────────────────────────────────────────────────────────
from app.schemas.schemas import MessageResponse as _Msg

@router.post("/{rec_id}/feedback", response_model=_Msg)
async def submit_feedback(
    rec_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Store outcome feedback after a recommendation is executed."""
    from sqlalchemy import select, update
    from app.models.models import Recommendation, Timeline
    import uuid

    rec = (await db.execute(
        select(Recommendation).where(Recommendation.id == rec_id)
    )).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    outcome = data.get("outcome", "success")
    outcome_notes = data.get("outcome_notes", "")

    rec.status = "executed"
    rec.outcome = outcome                          # store cleanly in dedicated column
    rec.feedback_note = outcome_notes              # store CSM notes separately

    # Log to timeline
    db.add(Timeline(
        id=str(uuid.uuid4()),
        customer_id=rec.customer_id,
        event_type="recommendation_executed",
        title=f"Action Executed: {rec.title}",
        description=f"Outcome: {outcome}. {outcome_notes}",
        event_metadata={"rec_id": rec_id, "outcome": outcome, "executed_by": str(current_user.id)},
    ))

    await db.commit()
    return _Msg(message="Feedback stored. Memory updated for future recommendations.")


# ─── Simulation endpoint ──────────────────────────────────────────────────────
@router.get("/simulate/{customer_id}")
async def simulate_outcomes(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Predict success probability for each action category based on memory."""
    from sqlalchemy import select
    from app.models.models import Recommendation

    result = await db.execute(
        select(Recommendation)
        .where(Recommendation.customer_id == customer_id)
        .where(Recommendation.status.in_(["approved", "rejected", "executed"]))
    )
    past = result.scalars().all()

    # Base success rates from research data
    base_rates = {
        "executive_call": 0.89, "training": 0.72, "discount": 0.41,
        "onsite_workshop": 0.81, "churn_risk": 0.74, "adoption": 0.68,
        "renewal": 0.83, "expansion": 0.65, "support": 0.77, "relationship": 0.80,
    }

    # Adjust based on this customer's history
    category_outcomes: dict = {}
    for r in past:
        cat = r.category or "relationship"
        if cat not in category_outcomes:
            category_outcomes[cat] = {"success": 0, "total": 0}
        category_outcomes[cat]["total"] += 1
        if r.status in ("approved", "executed"):
            outcome = r.outcome or "success"   # use the dedicated outcome column
            if outcome != "failed":
                category_outcomes[cat]["success"] += 1

    simulations = []
    for action, base in base_rates.items():
        cat = action if action in category_outcomes else action
        adjusted = base
        if cat in category_outcomes and category_outcomes[cat]["total"] > 0:
            hist_rate = category_outcomes[cat]["success"] / category_outcomes[cat]["total"]
            adjusted = round((base * 0.6) + (hist_rate * 0.4), 2)
        simulations.append({
            "action": action.replace("_", " ").title(),
            "category": cat,
            "predicted_success_rate": adjusted,
            "data_points": category_outcomes.get(cat, {}).get("total", 0),
            "source": "historical" if cat in category_outcomes else "baseline",
        })

    simulations.sort(key=lambda x: x["predicted_success_rate"], reverse=True)
    return {"customer_id": customer_id, "simulations": simulations}


# ─── Priority engine ──────────────────────────────────────────────────────────
@router.get("/priority/{customer_id}")
async def get_priority_queue(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return recommendations sorted by P0/P1/P2/P3 urgency."""
    from sqlalchemy import select
    from app.models.models import Recommendation

    result = await db.execute(
        select(Recommendation)
        .where(Recommendation.customer_id == customer_id)
        .where(Recommendation.status == "pending")
    )
    recs = result.scalars().all()

    def classify(r):
        if r.priority == "critical" or (r.risk_score or 0) >= 0.8:
            return "P0"
        if r.priority == "high" or (r.risk_score or 0) >= 0.6:
            return "P1"
        if r.priority == "medium":
            return "P2"
        return "P3"

    buckets = {"P0": [], "P1": [], "P2": [], "P3": []}
    for r in recs:
        level = classify(r)
        buckets[level].append({
            "id": str(r.id), "title": r.title, "category": r.category,
            "priority_level": level, "risk_score": r.risk_score,
            "confidence_score": r.confidence_score, "evidence": r.evidence or [],
        })

    return {"customer_id": customer_id, "priority_queue": buckets}


# ── Explainability endpoint ───────────────────────────────────────────────────
@router.get("/{rec_id}/explain")
async def explain_recommendation(
    rec_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return full explainability breakdown for a recommendation."""
    from sqlalchemy import select
    from app.models.models import Recommendation, AgentRun
    import json

    rec = (await db.execute(
        select(Recommendation).where(Recommendation.id == rec_id)
    )).scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    # Get last agent run state for this customer
    run = (await db.execute(
        select(AgentRun)
        .where(AgentRun.customer_id == rec.customer_id)
        .order_by(AgentRun.started_at.desc()).limit(1)
    )).scalar_one_or_none()

    agent_state = {}
    if run and run.output_data:
        agent_state = run.output_data

    from app.services.explainability import ExplainabilityEngine
    engine = ExplainabilityEngine()
    explanation = await engine.explain(
        recommendation_title=rec.title,
        category=rec.category or "general",
        risk_score=rec.risk_score or 0.5,
        agent_state=agent_state,
    )

    return {
        "recommendation_id": rec_id,
        "title": rec.title,
        "category": rec.category,
        "priority": rec.priority,
        "confidence_score": rec.confidence_score,
        "existing_evidence": rec.evidence or [],
        "explanation": explanation,
    }
