"""Agent monitoring routes"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import Optional
from app.core.database import get_db
from app.auth.auth import get_current_user
from app.models.models import User, AgentRun
from app.core.config import settings

router = APIRouter(prefix="/agents", tags=["agents"])

AGENT_LIST = [
    {"name": "Planner Agent",       "key": "planner",        "description": "Analyzes customer context and dynamically routes to appropriate sub-agents"},
    {"name": "Memory Agent",        "key": "memory",         "description": "Loads past recommendation history and feedback to inform current analysis"},
    {"name": "Interaction Agent",   "key": "interaction",    "description": "Analyzes meetings, emails, and support tickets for sentiment and risk signals"},
    {"name": "Usage Agent",         "key": "usage",          "description": "Evaluates product adoption trends and identifies engagement issues"},
    {"name": "Sentiment Agent",     "key": "sentiment",      "description": "Deep customer sentiment analysis with trend detection"},
    {"name": "Knowledge Agent",     "key": "knowledge",      "description": "RAG retrieval over playbooks and documentation via ChromaDB"},
    {"name": "Recommendation Agent","key": "recommendation", "description": "Generates next best actions with confidence scores and chain-of-thought reasoning"},
    {"name": "Approval Agent",      "key": "approval",       "description": "Human-in-the-loop review gate — routes approved actions to execution"},
]


@router.get("/list")
async def get_agents(_: User = Depends(get_current_user)):
    return {
        "agents": AGENT_LIST,
        "llm_provider": settings.LLM_PROVIDER,
        "llm_model": settings.active_llm_model,
    }


@router.get("/runs")
async def get_runs(
    customer_id: Optional[str] = Query(None),   # FIX P1: honour customer_id filter
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    base = select(AgentRun)
    if customer_id:
        base = base.where(AgentRun.customer_id == customer_id)

    total = (await db.execute(
        select(func.count()).select_from(base.subquery())
    )).scalar()

    result = await db.execute(
        base.order_by(desc(AgentRun.started_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    runs = result.scalars().all()
    return {"total": total, "items": runs, "page": page, "page_size": page_size}


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    total = (await db.execute(select(func.count(AgentRun.id)))).scalar() or 0
    completed = (await db.execute(
        select(func.count(AgentRun.id)).where(AgentRun.status == "completed")
    )).scalar() or 0
    failed = (await db.execute(
        select(func.count(AgentRun.id)).where(AgentRun.status == "failed")
    )).scalar() or 0
    avg_time = (await db.execute(
        select(func.avg(AgentRun.execution_time_ms)).where(AgentRun.status == "completed")
    )).scalar()
    return {
        "total_runs": total,
        "completed": completed,
        "failed": failed,
        "success_rate": round(completed / total * 100, 1) if total > 0 else 0,
        "avg_execution_ms": round(float(avg_time or 0), 0),
    }
