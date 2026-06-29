"""Data Ingestion routes — the intake point for ALL raw customer-interaction
data: meeting notes, call transcripts, emails, CRM updates, manual notes.

This sits in front of the existing Meeting / EmailRecord tables and the
LangGraph agent workflow. Flow:

  1. CSM submits raw text via the intake form (or a future bulk/CRM webhook).
  2. We store it immediately in `ingested_interactions` (status=new) — never
     lose data even if AI processing fails.
  3. If auto_process=True, a lightweight LLM call (reusing the same prompt
     contract as the interaction agent) extracts sentiment / topics / risks
     / opportunities / a short summary. This is intentionally a *fast,
     single-shot classification* — not the full multi-agent workflow — so
     the intake form gets a near-instant preview the CSM can review
     (Human-in-the-Loop) before anything customer-facing happens.
  4. If linked to a customer, we mirror it into the existing Meeting /
     Timeline tables so it shows up everywhere else in the app exactly like
     a manually-logged interaction does today.
  5. If trigger_workflow=True (and customer_id is set), we kick off the full
     memory -> planner -> ... -> recommendation LangGraph run in the
     background, the same as the "Run AI Analysis" button elsewhere.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone
from typing import Optional
import json
import uuid

from app.core.database import get_db, AsyncSessionLocal
from app.auth.auth import get_current_user
from app.models.models import (
    User, Customer, IngestedInteraction, Meeting, Timeline,
)
from app.schemas.schemas import IngestRequest, IngestOut, IngestListOut, MessageResponse

router = APIRouter(prefix="/ingestion", tags=["ingestion"])

SOURCE_TYPES = ["meeting_notes", "transcript", "email", "crm_update", "note", "other"]

_EVENT_TYPE_MAP = {
    "meeting_notes": "meeting_logged",
    "transcript":    "meeting_logged",
    "email":         "email_logged",
    "crm_update":    "crm_update_logged",
    "note":          "note_added",
    "other":         "interaction_logged",
}


# ─── Lightweight AI classification (separate from the full agent workflow) ───

CLASSIFY_SYSTEM = """You are a Customer Success Interaction Intelligence Analyst.

Read the raw interaction text (a meeting transcript, email, CRM note, or free-form note) and extract structured intelligence.

GUIDELINES:
- Sentiment reflects the overall tone of THIS text, not assumptions about the wider relationship.
- Risks must be concrete and specific (e.g. "Mentioned evaluating a competitor next quarter"), never generic.
- Opportunities must be grounded in the text (e.g. "Asked about adding 20 more seats"), never invented.
- key_topics: product features, pain points, or business outcomes actually mentioned.
- summary: 1-2 sentence neutral recap.

Return ONLY a valid JSON object, no markdown, no preamble:
{
  "sentiment": "positive" | "neutral" | "negative",
  "sentiment_score": 0.0-1.0,
  "key_topics": ["..."],
  "risks": ["..."],
  "opportunities": ["..."],
  "summary": "..."
}"""


async def _classify_text(title: str, content: str) -> dict:
    """Run a fast single-shot LLM classification. Never raises — falls back to
    a neutral, clearly-labeled result if the LLM is unavailable or errors."""
    try:
        from app.core.llm_factory import get_fast_llm
        from langchain_core.messages import HumanMessage, SystemMessage

        llm = get_fast_llm()
        prompt = f"Title: {title}\n\nContent:\n{content[:6000]}"
        response = await llm.ainvoke(
            [SystemMessage(content=CLASSIFY_SYSTEM), HumanMessage(content=prompt)]
        )
        raw = response.content.strip().replace("```json", "").replace("```", "")
        result = json.loads(raw)
        result["_ai_available"] = True
        return result
    except Exception as e:
        return {
            "sentiment": "neutral", "sentiment_score": 0.5,
            "key_topics": [], "risks": [], "opportunities": [],
            "summary": "AI classification unavailable — review manually.",
            "_ai_available": False, "_error": str(e)[:160],
        }


async def _process_ingestion(ingestion_id: str):
    """Background task: classify the text, persist results, mirror into
    Meeting/Timeline if linked to a customer."""
    async with AsyncSessionLocal() as db:
        try:
            row = (await db.execute(
                select(IngestedInteraction).where(IngestedInteraction.id == ingestion_id)
            )).scalar_one_or_none()
            if not row:
                return

            row.status = "processing"
            await db.flush()

            result = await _classify_text(row.title, row.raw_content)

            row.detected_sentiment = result.get("sentiment", "neutral")
            row.detected_sentiment_score = result.get("sentiment_score", 0.5)
            row.detected_topics = result.get("key_topics", [])
            row.detected_risks = result.get("risks", [])
            row.detected_opportunities = result.get("opportunities", [])
            row.ai_summary = result.get("summary")
            row.status = "failed" if result.get("_error") and not result.get("_ai_available") else "processed"
            if result.get("_error"):
                row.error = result["_error"]
            row.processed_at = datetime.now(timezone.utc)

            # Mirror into Meeting + Timeline so it shows up everywhere else
            # in the app exactly like a manually-logged interaction.
            if row.customer_id:
                meeting = Meeting(
                    id=str(uuid.uuid4()),
                    customer_id=row.customer_id,
                    title=row.title,
                    transcript=row.raw_content if row.source_type == "transcript" else None,
                    summary=row.ai_summary or row.raw_content[:500],
                    sentiment=row.detected_sentiment or "neutral",
                    sentiment_score=row.detected_sentiment_score or 0.5,
                    key_topics=row.detected_topics or [],
                    risks_identified=row.detected_risks or [],
                    meeting_date=datetime.now(timezone.utc),
                )
                db.add(meeting)
                await db.flush()
                row.linked_meeting_id = meeting.id

                db.add(Timeline(
                    id=str(uuid.uuid4()),
                    customer_id=row.customer_id,
                    event_type=_EVENT_TYPE_MAP.get(row.source_type, "interaction_logged"),
                    title=f"{row.source_type.replace('_', ' ').title()}: {row.title}",
                    description=row.ai_summary or row.raw_content[:300],
                    event_metadata={
                        "ingestion_id": row.id,
                        "source_type": row.source_type,
                        "sentiment": row.detected_sentiment,
                        "topics": row.detected_topics,
                        "risks": row.detected_risks,
                    },
                    occurred_at=datetime.now(timezone.utc),
                ))

                # Publish to event bus -> the existing meeting.uploaded handler
                # auto-triggers a full recommendation run. Skip this if the
                # caller already explicitly requested trigger_workflow=True
                # (handled separately below) to avoid running the workflow twice.
                if not row.triggered_workflow:
                    try:
                        from app.core.event_bus import publish_event, EventType
                        await publish_event(
                            EventType.MEETING_UPLOADED,
                            row.customer_id,
                            {"ingestion_id": row.id, "source_type": row.source_type,
                             "sentiment": row.detected_sentiment},
                            source="ingestion_api",
                        )
                    except Exception:
                        pass

            await db.commit()
        except Exception as e:
            await db.rollback()
            try:
                row.status = "failed"
                row.error = str(e)[:300]
                await db.commit()
            except Exception:
                pass


async def _trigger_full_workflow(customer_id: str):
    async with AsyncSessionLocal() as db:
        from app.services.recommendation_service import RecommendationService
        svc = RecommendationService(db)
        try:
            await svc.trigger_analysis(customer_id, "data_ingestion")
            await db.commit()
        except Exception:
            await db.rollback()


# ─── Routes ─────────────────────────────────────────────────────────────────

@router.get("/source-types")
async def list_source_types(_: User = Depends(get_current_user)):
    return {"source_types": SOURCE_TYPES}


@router.get("", response_model=IngestListOut)
async def list_ingestions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    source_type: Optional[str] = None,
    customer_id: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Table view of all ingested raw interaction data — the 'internal
    knowledge data' grid the CSM team can scan, filter, and drill into."""
    q = select(IngestedInteraction).options(
        selectinload(IngestedInteraction.customer).selectinload(Customer.company),
        selectinload(IngestedInteraction.customer).selectinload(Customer.csm),
    )
    if status:
        q = q.where(IngestedInteraction.status == status)
    if source_type:
        q = q.where(IngestedInteraction.source_type == source_type)
    if customer_id:
        q = q.where(IngestedInteraction.customer_id == customer_id)
    if search:
        q = q.where(IngestedInteraction.title.ilike(f"%{search}%"))

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    q = q.order_by(desc(IngestedInteraction.created_at)).offset((page - 1) * page_size).limit(page_size)
    items = (await db.execute(q)).scalars().all()
    return IngestListOut(total=total, items=items, page=page, page_size=page_size)


@router.get("/{ingestion_id}", response_model=IngestOut)
async def get_ingestion(
    ingestion_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = (await db.execute(
        select(IngestedInteraction)
        .options(
            selectinload(IngestedInteraction.customer).selectinload(Customer.company),
            selectinload(IngestedInteraction.customer).selectinload(Customer.csm),
        )
        .where(IngestedInteraction.id == ingestion_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Ingestion record not found")
    return row


@router.post("", response_model=IngestOut, status_code=201)
async def create_ingestion(
    data: IngestRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.source_type not in SOURCE_TYPES:
        raise HTTPException(status_code=400, detail=f"source_type must be one of {SOURCE_TYPES}")

    if data.customer_id:
        customer = (await db.execute(
            select(Customer).where(Customer.id == data.customer_id)
        )).scalar_one_or_none()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")

    row = IngestedInteraction(
        id=str(uuid.uuid4()),
        customer_id=data.customer_id,
        source_type=data.source_type,
        title=data.title,
        raw_content=data.raw_content,
        status="new",
        uploaded_by=current_user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)

    if data.auto_process:
        background_tasks.add_task(_process_ingestion, row.id)

    if data.trigger_workflow:
        if not data.customer_id:
            raise HTTPException(
                status_code=400,
                detail="trigger_workflow requires a customer_id (full analysis is customer-scoped)",
            )
        row.triggered_workflow = True
        await db.commit()
        background_tasks.add_task(_trigger_full_workflow, data.customer_id)

    # Re-fetch with relationship loaded for the response model
    result = (await db.execute(
        select(IngestedInteraction)
        .options(
            selectinload(IngestedInteraction.customer).selectinload(Customer.company),
            selectinload(IngestedInteraction.customer).selectinload(Customer.csm),
        )
        .where(IngestedInteraction.id == row.id)
    )).scalar_one()
    return result


@router.post("/{ingestion_id}/reprocess", response_model=MessageResponse)
async def reprocess_ingestion(
    ingestion_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = (await db.execute(
        select(IngestedInteraction).where(IngestedInteraction.id == ingestion_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Ingestion record not found")
    row.status = "new"
    row.error = None
    await db.commit()
    background_tasks.add_task(_process_ingestion, ingestion_id)
    return MessageResponse(message="Reprocessing queued")


@router.post("/{ingestion_id}/trigger-workflow", response_model=MessageResponse)
async def trigger_workflow_for_ingestion(
    ingestion_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """HITL action: after reviewing the AI-detected sentiment/risks for an
    ingested record, the CSM explicitly kicks off the full recommendation
    workflow for the linked customer."""
    row = (await db.execute(
        select(IngestedInteraction).where(IngestedInteraction.id == ingestion_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Ingestion record not found")
    if not row.customer_id:
        raise HTTPException(status_code=400, detail="Record is not linked to a customer")

    row.triggered_workflow = True
    await db.commit()
    background_tasks.add_task(_trigger_full_workflow, row.customer_id)
    return MessageResponse(message="Full AI analysis triggered for the linked customer")


@router.delete("/{ingestion_id}", response_model=MessageResponse)
async def delete_ingestion(
    ingestion_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = (await db.execute(
        select(IngestedInteraction).where(IngestedInteraction.id == ingestion_id)
    )).scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
    return MessageResponse(message="Deleted")
