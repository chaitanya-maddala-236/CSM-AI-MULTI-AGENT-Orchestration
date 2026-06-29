"""
Celery Background Task Worker

Tasks:
  - analyze_customer        : full AI analysis pipeline (non-blocking)
  - process_transcript      : extract insights from uploaded meeting transcript
  - health_score_snapshot   : periodic health score recording
  - churn_sweep             : daily sweep to flag at-risk accounts
  - memory_consolidation    : consolidate episodic memory entries

Run worker:
  celery -A app.worker.celery_app worker --loglevel=info -Q analysis,transcripts,scheduled

Run beat scheduler (for periodic tasks):
  celery -A app.worker.celery_app beat --loglevel=info
"""
import asyncio
from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

# ── Celery app ────────────────────────────────────────────────────────────────
celery_app = Celery(
    "cs_copilot",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.worker"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,              # only ack after task completes
    worker_prefetch_multiplier=1,     # one task at a time per worker
    task_routes={
        "app.worker.analyze_customer":      {"queue": "analysis"},
        "app.worker.process_transcript":    {"queue": "transcripts"},
        "app.worker.health_score_snapshot": {"queue": "scheduled"},
        "app.worker.churn_sweep":           {"queue": "scheduled"},
        "app.worker.memory_consolidation":  {"queue": "scheduled"},
    },
    beat_schedule={
        # Health score snapshots every 6 hours
        "health-snapshot-every-6h": {
            "task": "app.worker.health_score_snapshot",
            "schedule": crontab(minute=0, hour="*/6"),
        },
        # Daily churn sweep at 08:00 UTC
        "churn-sweep-daily": {
            "task": "app.worker.churn_sweep",
            "schedule": crontab(hour=8, minute=0),
        },
        # Memory consolidation nightly at 02:00 UTC
        "memory-consolidation-nightly": {
            "task": "app.worker.memory_consolidation",
            "schedule": crontab(hour=2, minute=0),
        },
    },
)


# ── Helper: run async code from sync Celery task ──────────────────────────────
def run_async(coro):
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, coro)
                return future.result()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


# ── Task: analyze_customer ────────────────────────────────────────────────────
@celery_app.task(
    name="app.worker.analyze_customer",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    soft_time_limit=300,
    time_limit=360,
)
def analyze_customer(self, customer_id: str, triggered_by: str = "celery"):
    """
    Full AI analysis pipeline for a customer.
    Flow: Meeting uploaded → Event Bus → Celery → Agents → Recommendations
    """
    async def _run():
        from app.core.database import AsyncSessionLocal
        from app.services.recommendation_service import RecommendationService
        from app.core.event_bus import publish_event, EventType

        async with AsyncSessionLocal() as db:
            svc = RecommendationService(db)
            try:
                await svc.trigger_analysis(customer_id, triggered_by)
                await db.commit()
                await publish_event(
                    EventType.ANALYSIS_COMPLETED,
                    customer_id,
                    {"triggered_by": triggered_by, "status": "success"},
                    source="celery",
                )
            except Exception as e:
                await db.rollback()
                raise self.retry(exc=e)

    run_async(_run())
    return {"status": "completed", "customer_id": customer_id}


# ── Task: process_transcript ──────────────────────────────────────────────────
@celery_app.task(
    name="app.worker.process_transcript",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
    soft_time_limit=120,
    time_limit=180,
)
def process_transcript(self, meeting_id: str, customer_id: str, transcript_text: str):
    """
    Process a meeting transcript asynchronously.
    Flow: Upload → Queue → Sentiment Agent → Knowledge Agent → store insights
    """
    async def _run():
        from app.core.database import AsyncSessionLocal
        from app.models.models import Meeting, MeetingTranscript, Timeline
        from app.agents.sentiment_agent import sentiment_node
        from sqlalchemy import select
        import uuid

        async with AsyncSessionLocal() as db:
            # Store full transcript
            meeting = (await db.execute(
                select(Meeting).where(Meeting.id == meeting_id)
            )).scalar_one_or_none()

            if not meeting:
                return

            # Save transcript record
            db.add(MeetingTranscript(
                id=str(uuid.uuid4()),
                meeting_id=meeting_id,
                customer_id=customer_id,
                raw_transcript=transcript_text,
                word_count=len(transcript_text.split()),
            ))

            # Run sentiment agent on transcript
            state = {
                "customer_id": customer_id,
                "customer_context": {"customer_name": "", "company_name": ""},
                "interaction_analysis": {"transcript": transcript_text},
            }
            sentiment_result = await sentiment_node(state)

            sa = sentiment_result.get("sentiment_analysis", {})
            meeting.transcript = transcript_text
            meeting.sentiment = sa.get("overall_sentiment", "neutral")
            meeting.sentiment_score = sa.get("sentiment_score", 0.5)
            meeting.risks_identified = sa.get("risks_identified", [])
            meeting.action_items = sa.get("action_items", [])

            # Timeline event
            db.add(Timeline(
                id=str(uuid.uuid4()),
                customer_id=customer_id,
                event_type="transcript_processed",
                title="Meeting transcript analyzed",
                description=f"Sentiment: {meeting.sentiment}. Risks: {len(meeting.risks_identified)}",
                event_metadata={"meeting_id": meeting_id, "word_count": len(transcript_text.split())},
            ))

            await db.commit()

            # Now trigger full analysis
            analyze_customer.delay(customer_id, "transcript_processed")

    run_async(_run())
    return {"status": "processed", "meeting_id": meeting_id}


# ── Task: health_score_snapshot ───────────────────────────────────────────────
@celery_app.task(name="app.worker.health_score_snapshot")
def health_score_snapshot():
    """Snapshot current health scores for all active customers (runs every 6h)."""
    async def _run():
        from app.core.database import AsyncSessionLocal
        from app.models.models import Customer, CustomerHealthScore
        from sqlalchemy import select
        import uuid

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Customer).where(Customer.is_active == True))
            customers = result.scalars().all()
            for c in customers:
                db.add(CustomerHealthScore(
                    id=str(uuid.uuid4()),
                    customer_id=c.id,
                    health_score=c.health_score or 70.0,
                    churn_probability=c.churn_probability or 0.1,
                    sentiment_score=c.sentiment_score or 0.5,
                    snapshot_reason="scheduled",
                ))
            await db.commit()
            print(f"✅ Snapshotted health scores for {len(customers)} customers")

    run_async(_run())
    return {"status": "done"}


# ── Task: churn_sweep ─────────────────────────────────────────────────────────
@celery_app.task(name="app.worker.churn_sweep")
def churn_sweep():
    """
    Daily sweep: find high-risk accounts, publish churn alerts, trigger analysis.
    """
    async def _run():
        from app.core.database import AsyncSessionLocal
        from app.models.models import Customer
        from app.core.event_bus import publish_event, EventType
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Customer).where(
                    Customer.is_active == True,
                    Customer.churn_probability >= 0.6,
                )
            )
            at_risk = result.scalars().all()
            for c in at_risk:
                churn_pct = round((c.churn_probability or 0) * 100, 1)
                await publish_event(
                    EventType.CHURN_ALERT,
                    str(c.id),
                    {"churn_pct": churn_pct, "account_name": c.name, "arr": c.arr},
                    source="churn_sweep",
                )
                # Re-analyze high-risk accounts
                if c.churn_probability >= 0.75:
                    analyze_customer.delay(str(c.id), "churn_sweep")

            print(f"✅ Churn sweep: {len(at_risk)} at-risk accounts flagged")

    run_async(_run())
    return {"status": "done"}


# ── Task: memory_consolidation ────────────────────────────────────────────────
@celery_app.task(name="app.worker.memory_consolidation")
def memory_consolidation():
    """
    Nightly memory consolidation: deduplicate and importance-score memory entries.
    """
    async def _run():
        from app.core.database import AsyncSessionLocal
        from app.models.models import CustomerMemory
        from sqlalchemy import select, func

        async with AsyncSessionLocal() as db:
            # Decay old low-importance memories
            result = await db.execute(
                select(CustomerMemory).where(
                    CustomerMemory.importance_score < 0.2,
                    CustomerMemory.created_at < func.now() - func.make_interval(days=90),
                )
            )
            old_memories = result.scalars().all()
            for m in old_memories:
                await db.delete(m)

            await db.commit()
            print(f"✅ Memory consolidation: removed {len(old_memories)} stale entries")

    run_async(_run())
    return {"status": "done"}
