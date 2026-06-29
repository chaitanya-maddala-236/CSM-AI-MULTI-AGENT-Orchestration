"""Meetings / Log Interaction route"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.auth.auth import get_current_user
from app.models.models import User, Customer, Meeting, Timeline
import uuid

router = APIRouter(prefix="/meetings", tags=["meetings"])

class LogInteractionRequest(BaseModel):
    customer_id: str
    type: str = "meeting"          # meeting | email | note
    title: str
    summary: str
    sentiment: str = "neutral"     # positive | neutral | negative
    duration_minutes: Optional[int] = None

@router.get("/customer/{customer_id}")
async def get_meetings_for_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """FIX: frontend's meetingsApi.byCustomer() called this endpoint but it
    never existed on the backend — every call 404'd silently. Added to
    surface logged interactions (meetings/emails/notes) per customer."""
    result = await db.execute(
        select(Meeting)
        .where(Meeting.customer_id == customer_id)
        .order_by(Meeting.meeting_date.desc())
    )
    return result.scalars().all()


@router.post("")
async def log_interaction(
    data: LogInteractionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify customer exists
    customer = (await db.execute(select(Customer).where(Customer.id == data.customer_id))).scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    now = datetime.now(timezone.utc)

    # Create meeting record
    meeting = Meeting(
        id=str(uuid.uuid4()),
        customer_id=data.customer_id,
        title=data.title,
        summary=data.summary,
        sentiment=data.sentiment,
        meeting_date=now,
        duration_minutes=data.duration_minutes,
    )
    db.add(meeting)

    # Also add a Timeline entry so it shows in the timeline tab
    event_type_map = {"meeting": "meeting_logged", "email": "email_logged", "note": "note_added"}
    timeline_entry = Timeline(
        id=str(uuid.uuid4()),
        customer_id=data.customer_id,
        event_type=event_type_map.get(data.type, "interaction_logged"),
        title=f"{data.type.capitalize()}: {data.title}",
        description=data.summary,
        event_metadata={"type": data.type, "sentiment": data.sentiment, "logged_by": current_user.full_name},
        occurred_at=now,
    )
    db.add(timeline_entry)
    await db.commit()

    # Publish event to event bus → triggers async AI analysis
    try:
        from app.core.event_bus import publish_event, EventType
        from app.worker import analyze_customer
        await publish_event(
            EventType.MEETING_UPLOADED,
            data.customer_id,
            {"meeting_id": meeting.id, "type": data.type, "sentiment": data.sentiment},
            source="meetings_api",
        )
        # Also queue Celery task for async processing
        analyze_customer.delay(data.customer_id, "meeting.uploaded")
    except Exception:
        pass  # Event bus is optional — don't fail the request

    return {"id": meeting.id, "message": "Interaction logged successfully"}
