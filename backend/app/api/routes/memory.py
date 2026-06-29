"""Memory routes — customer interaction history and learning store."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.auth.auth import get_current_user
from app.models.models import User, Recommendation, Timeline, Meeting
import uuid

router = APIRouter(prefix="/memory", tags=["memory"])


@router.get("/customer/{customer_id}")
async def get_customer_memory(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return structured memory timeline: what happened, what was tried, what worked."""
    # Past recommendations with outcomes
    recs = (await db.execute(
        select(Recommendation)
        .where(Recommendation.customer_id == customer_id)
        .where(Recommendation.status.in_(["approved", "rejected", "executed"]))
        .order_by(desc(Recommendation.created_at)).limit(20)
    )).scalars().all()

    # Timeline events
    events = (await db.execute(
        select(Timeline)
        .where(Timeline.customer_id == customer_id)
        .order_by(desc(Timeline.occurred_at)).limit(30)
    )).scalars().all()

    # Meetings
    meetings = (await db.execute(
        select(Meeting)
        .where(Meeting.customer_id == customer_id)
        .order_by(desc(Meeting.meeting_date)).limit(10)
    )).scalars().all()

    # Build memory entries
    memory_entries = []

    for r in recs:
        outcome = r.outcome   # dedicated column set by feedback endpoint
        memory_entries.append({
            "type": "recommendation",
            "date": str(r.created_at),
            "title": r.title,
            "category": r.category,
            "decision": r.status,
            "outcome": outcome,
            "feedback": r.feedback_note,
            "confidence": r.confidence_score,
        })

    for m in meetings:
        memory_entries.append({
            "type": "meeting",
            "date": str(m.meeting_date),
            "title": m.title,
            "sentiment": m.sentiment,
            "summary": m.summary,
            "action_items": m.action_items or [],
            "risks": m.risks_identified or [],
        })

    # Sort all by date desc
    memory_entries.sort(key=lambda x: x["date"] or "", reverse=True)

    # Learning summary
    approved = [r for r in recs if r.status in ("approved", "executed")]
    rejected = [r for r in recs if r.status == "rejected"]

    cat_rates = {}
    for r in recs:
        cat = r.category or "general"
        if cat not in cat_rates:
            cat_rates[cat] = {"approved": 0, "rejected": 0}
        if r.status in ("approved", "executed"):
            cat_rates[cat]["approved"] += 1
        else:
            cat_rates[cat]["rejected"] += 1

    what_works = [k for k, v in cat_rates.items() if v["approved"] > v["rejected"]]
    what_doesnt = [k for k, v in cat_rates.items() if v["rejected"] > v["approved"]]

    return {
        "customer_id": customer_id,
        "memory_entries": memory_entries,
        "learning_summary": {
            "total_recommendations": len(recs),
            "approved": len(approved),
            "rejected": len(rejected),
            "acceptance_rate": round(len(approved) / len(recs) * 100, 1) if recs else 0,
            "what_works": what_works,
            "what_to_avoid": what_doesnt,
            "category_rates": cat_rates,
        },
    }


@router.post("/store")
async def store_memory(
    data: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Manually store a memory/insight for a customer."""
    tl = Timeline(
        id=str(uuid.uuid4()),
        customer_id=data["customer_id"],
        event_type="memory_note",
        title=data.get("title", "CSM Note"),
        description=data.get("content", ""),
        event_metadata=data.get("metadata", {}) or data.get("event_metadata", {}),
    )
    db.add(tl)
    await db.commit()
    return {"message": "Memory stored", "id": str(tl.id)}
