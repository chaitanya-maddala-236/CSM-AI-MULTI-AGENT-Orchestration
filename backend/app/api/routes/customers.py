"""Customer routes — includes /analyze endpoint for CustomerDetail page"""
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.auth.auth import get_current_user
from app.models.models import User
from app.services.customer_service import CustomerService
from app.services.recommendation_service import RecommendationService
from app.schemas.schemas import (
    CustomerCreate, CustomerUpdate, CustomerOut, CustomerListOut,
    DashboardStats, TriggerAgentRequest, MessageResponse,
)

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    svc = CustomerService(db)
    return await svc.get_dashboard_stats()


@router.get("", response_model=CustomerListOut)
async def list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    health_status: Optional[str] = None,
    search: Optional[str] = None,
    mine: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = CustomerService(db)
    csm_id = current_user.id if mine else None
    items, total = await svc.get_all(page, page_size, health_status, search, csm_id)
    return CustomerListOut(total=total, items=items, page=page, page_size=page_size)


@router.get("/csm-list")
async def list_csm_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return list of users with csm/manager roles for the assignment dropdown.

    NOTE: this must be declared before GET /{customer_id} — FastAPI matches
    routes in declaration order, and a route registered after a path-param
    route (like /{customer_id}) is permanently shadowed by it.
    """
    from sqlalchemy import select as _select, and_
    from app.models.models import User as UserModel
    result = await db.execute(
        _select(UserModel).where(
            and_(UserModel.is_active == True, UserModel.role.in_(["csm", "manager", "admin"]))
        ).order_by(UserModel.full_name)
    )
    users = result.scalars().all()
    return [{"id": u.id, "full_name": u.full_name, "email": u.email, "role": u.role} for u in users]


@router.get("/{customer_id}", response_model=CustomerOut)
async def get_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    svc = CustomerService(db)
    c = await svc.get_by_id(customer_id)
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return c


@router.post("", response_model=CustomerOut, status_code=201)
async def create_customer(
    data: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    svc = CustomerService(db)
    return await svc.create(data)


@router.patch("/{customer_id}", response_model=CustomerOut)
async def update_customer(
    customer_id: str,
    data: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    svc = CustomerService(db)
    c = await svc.update(customer_id, data)
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return c


@router.post("/{customer_id}/analyze", response_model=MessageResponse)
async def trigger_customer_analysis(
    customer_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Trigger AI analysis for a specific customer (used by CustomerDetail page)."""
    svc = CustomerService(db)
    c = await svc.get_by_id(customer_id)
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")

    background_tasks.add_task(_run_analysis_bg, customer_id)
    return MessageResponse(message="AI analysis triggered. Results will appear shortly.")


async def _run_analysis_bg(customer_id: str):
    # BUGFIX: same issue as recommendations.py's _run_analysis — the request-scoped
    # `db` session is already closed by the time a BackgroundTask runs, so reusing
    # it here silently failed every "Trigger AI analysis" click. Use a fresh session.
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        svc = RecommendationService(db)
        try:
            await svc.trigger_analysis(customer_id, "manual_customer_detail")
            await db.commit()
        except Exception as e:
            await db.rollback()


from app.schemas.schemas import CSMAssignRequest

@router.patch("/{customer_id}/assign-csm", response_model=CustomerOut)
async def assign_csm(
    customer_id: str,
    data: CSMAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """FIX P2 — Assign or unassign a CSM to a customer account."""
    from sqlalchemy import select as _select
    svc = CustomerService(db)
    c = await svc.get_by_id(customer_id)
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Verify target CSM exists if provided
    if data.csm_id:
        from app.models.models import User as UserModel
        target = (await db.execute(_select(UserModel).where(UserModel.id == data.csm_id))).scalar_one_or_none()
        if not target:
            raise HTTPException(status_code=404, detail="CSM user not found")

    c.csm_id = data.csm_id
    await db.commit()
    return await svc.get_by_id(customer_id)


# ─── Customer 360 Endpoint ────────────────────────────────────────────────────
@router.get("/{customer_id}/360")
async def get_customer_360(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Full Customer 360 view: scores, timeline, AI insights, recommendations, memory."""
    from sqlalchemy import select, desc
    from app.models.models import (
        Customer, Recommendation, Timeline, Meeting,
        AgentRun, UsageMetric, SupportTicket
    )

    # Customer base
    svc = CustomerService(db)
    customer = await svc.get_by_id(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Last 10 timeline events
    tl = await db.execute(
        select(Timeline)
        .where(Timeline.customer_id == customer_id)
        .order_by(desc(Timeline.occurred_at)).limit(10)
    )
    timeline = [
        {"id": str(t.id), "event_type": t.event_type, "title": t.title,
         "description": t.description, "occurred_at": str(t.occurred_at),
         "metadata": t.event_metadata or {}}
        for t in tl.scalars().all()
    ]

    # Last 5 recommendations
    recs = await db.execute(
        select(Recommendation)
        .where(Recommendation.customer_id == customer_id)
        .order_by(desc(Recommendation.created_at)).limit(5)
    )
    recommendations = [
        {"id": str(r.id), "title": r.title, "category": r.category,
         "priority": r.priority, "status": r.status,
         "confidence_score": r.confidence_score, "risk_score": r.risk_score,
         "evidence": r.evidence or [], "reasoning": r.reasoning,
         "actions": r.actions or [], "created_at": str(r.created_at),
         "feedback_note": r.feedback_note}
        for r in recs.scalars().all()
    ]

    # Last meeting
    meet = await db.execute(
        select(Meeting)
        .where(Meeting.customer_id == customer_id)
        .order_by(desc(Meeting.meeting_date)).limit(3)
    )
    meetings = [
        {"title": m.title, "summary": m.summary, "sentiment": m.sentiment,
         "meeting_date": str(m.meeting_date), "action_items": m.action_items or [],
         "risks_identified": m.risks_identified or []}
        for m in meet.scalars().all()
    ]

    # Latest usage metric
    usage = await db.execute(
        select(UsageMetric)
        .where(UsageMetric.customer_id == customer_id)
        .order_by(desc(UsageMetric.date)).limit(1)
    )
    latest_usage = usage.scalar_one_or_none()

    # Open tickets count
    tickets = await db.execute(
        select(SupportTicket)
        .where(SupportTicket.customer_id == customer_id)
        .where(SupportTicket.status == "open")
    )
    open_tickets = len(tickets.scalars().all())

    # Last agent run
    runs = await db.execute(
        select(AgentRun)
        .where(AgentRun.customer_id == customer_id)
        .order_by(desc(AgentRun.started_at)).limit(1)
    )
    last_run = runs.scalar_one_or_none()

    # AI insights extracted from last recommendation reasoning
    ai_issues = []
    ai_opportunities = []
    for r in recommendations[:2]:
        if r["priority"] in ("critical", "high") and r["evidence"]:
            ai_issues.extend(r["evidence"][:2])
        if r["category"] == "expansion":
            ai_opportunities.extend(r["actions"][:2])

    # Renewal days left
    renewal_days = None
    if hasattr(customer, "renewal_date") and customer.renewal_date:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        rd = customer.renewal_date
        if rd.tzinfo is None:
            from datetime import timezone as tz
            rd = rd.replace(tzinfo=tz.utc)
        renewal_days = max(0, (rd - now).days)

    return {
        "customer": {
            "id": str(customer.id),
            "name": customer.name,
            "email": customer.email,
            "plan": customer.plan,
            "arr": customer.arr,
            "mrr": customer.mrr,
            "seats": customer.seats,
            "renewal_date": str(customer.renewal_date) if customer.renewal_date else None,
            "renewal_days_left": renewal_days,
            "health_score": customer.health_score,
            "health_status": customer.health_status,
            "churn_probability": customer.churn_probability,
            "sentiment": customer.sentiment,
            "sentiment_score": customer.sentiment_score,
            "tags": customer.tags or [],
            "notes": customer.notes,
        },
        "scores": {
            "health_score": customer.health_score,
            "churn_risk_pct": round((customer.churn_probability or 0) * 100, 1),
            "sentiment_label": customer.sentiment,
            "adoption_score": latest_usage.adoption_score if latest_usage and hasattr(latest_usage, "adoption_score") else None,
            "open_tickets": open_tickets,
        },
        "ai_insights": {
            "issues": list(set(ai_issues))[:5],
            "opportunities": list(set(ai_opportunities))[:3],
            "last_analyzed": str(last_run.started_at) if last_run else None,
            "agent_status": last_run.status if last_run else "never_run",
        },
        "recommendations": recommendations,
        "timeline": timeline,
        "meetings": meetings,
    }


# ─── AI Executive Summary ──────────────────────────────────────────────────────
@router.get("/{customer_id}/executive-summary")
async def get_executive_summary(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Generate a concise AI executive summary for the Customer 360 header."""
    from sqlalchemy import select, desc
    from app.models.models import Customer, Recommendation, Meeting, AgentRun, SupportTicket
    from app.core.llm_factory import get_fast_llm
    from datetime import datetime, timezone
    import json

    svc = CustomerService(db)
    customer = await svc.get_by_id(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Gather signals
    recs_q = await db.execute(
        select(Recommendation).where(Recommendation.customer_id == customer_id)
        .order_by(desc(Recommendation.created_at)).limit(3)
    )
    recs = recs_q.scalars().all()

    meet_q = await db.execute(
        select(Meeting).where(Meeting.customer_id == customer_id)
        .order_by(desc(Meeting.meeting_date)).limit(1)
    )
    last_meeting = meet_q.scalar_one_or_none()

    ticket_q = await db.execute(
        select(SupportTicket).where(SupportTicket.customer_id == customer_id)
        .where(SupportTicket.status == "open")
    )
    open_tickets = len(ticket_q.scalars().all())

    run_q = await db.execute(
        select(AgentRun).where(AgentRun.customer_id == customer_id)
        .order_by(desc(AgentRun.started_at)).limit(1)
    )
    last_run = run_q.scalar_one_or_none()

    renewal_days = None
    if customer.renewal_date:
        now = datetime.now(timezone.utc)
        rd = customer.renewal_date
        if rd.tzinfo is None:
            rd = rd.replace(tzinfo=timezone.utc)
        renewal_days = max(0, (rd - now).days)

    churn_pct = round((customer.churn_probability or 0) * 100, 1)

    # Build bullet points from real data (no LLM needed - deterministic + fast)
    bullets = []
    
    if churn_pct >= 70:
        bullets.append(f"⚠️ High churn risk at {churn_pct}% — immediate intervention required")
    elif churn_pct >= 40:
        bullets.append(f"⚡ Moderate churn risk at {churn_pct}% — proactive outreach advised")
    else:
        bullets.append(f"✅ Low churn risk at {churn_pct}% — account is stable")

    if customer.sentiment == "negative":
        bullets.append("😟 Negative sentiment detected across recent interactions")
    elif customer.sentiment == "positive":
        bullets.append("😊 Positive customer sentiment — relationship is strong")

    if open_tickets > 0:
        bullets.append(f"🎫 {open_tickets} open support ticket{'s' if open_tickets > 1 else ''} requiring resolution")

    if renewal_days is not None:
        if renewal_days <= 30:
            bullets.append(f"🔴 Renewal in {renewal_days} days — intervention window closing fast")
        elif renewal_days <= 60:
            bullets.append(f"🟡 Renewal in {renewal_days} days — begin renewal conversation now")
        else:
            bullets.append(f"📅 Renewal in {renewal_days} days — healthy renewal timeline")

    if last_meeting and last_meeting.sentiment == "negative":
        bullets.append(f"📋 Last meeting sentiment was negative: '{last_meeting.title}'")

    health = customer.health_score or 0
    if health < 40:
        bullets.append(f"📉 Health score at {round(health)} — critical threshold")
    elif health >= 80:
        bullets.append(f"📈 Health score at {round(health)} — strong account performance")

    # Best next action from top recommendation
    next_action = None
    confidence = None
    if recs:
        top = recs[0]
        next_action = top.title
        confidence = round((top.confidence_score or 0.75) * 100)

    return {
        "customer_name": customer.name,
        "company_name": customer.company.name if customer.company else "",
        "health_score": round(health),
        "churn_risk_pct": churn_pct,
        "bullets": bullets[:5],
        "recommended_next_action": next_action,
        "action_confidence": confidence,
        "last_analyzed": str(last_run.started_at) if last_run else None,
        "sentiment": customer.sentiment,
        "renewal_days": renewal_days,
    }
