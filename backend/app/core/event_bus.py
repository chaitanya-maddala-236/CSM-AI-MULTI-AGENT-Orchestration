"""
Redis Pub/Sub Event Bus
Architecture:
  Publisher  → redis channel → Subscriber → handler → agents

Event channels:
  cs:events:meeting   - new meeting/transcript uploaded
  cs:events:usage     - usage drop detected
  cs:events:ticket    - support ticket opened/escalated
  cs:events:trigger   - manual analysis trigger
  cs:events:result    - analysis completed (recommendations ready)
"""
import json
import asyncio
import uuid
from datetime import datetime, timezone
from typing import Callable, Dict, List, Any
from app.core.redis_client import get_redis


# ── Event types ───────────────────────────────────────────────────────────────
class EventType:
    MEETING_UPLOADED    = "meeting.uploaded"
    USAGE_DROPPED       = "usage.dropped"
    TICKET_OPENED       = "ticket.opened"
    TICKET_ESCALATED    = "ticket.escalated"
    ANALYSIS_TRIGGERED  = "analysis.triggered"
    ANALYSIS_COMPLETED  = "analysis.completed"
    RECOMMENDATION_READY = "recommendation.ready"
    CHURN_ALERT         = "churn.alert"


CHANNEL_MAP = {
    EventType.MEETING_UPLOADED:     "cs:events:meeting",
    EventType.USAGE_DROPPED:        "cs:events:usage",
    EventType.TICKET_OPENED:        "cs:events:ticket",
    EventType.TICKET_ESCALATED:     "cs:events:ticket",
    EventType.ANALYSIS_TRIGGERED:   "cs:events:trigger",
    EventType.ANALYSIS_COMPLETED:   "cs:events:result",
    EventType.RECOMMENDATION_READY: "cs:events:result",
    EventType.CHURN_ALERT:          "cs:events:alert",
}

# Fallback channel for all events (useful for monitoring)
GLOBAL_CHANNEL = "cs:events:all"


# ── Publisher ─────────────────────────────────────────────────────────────────
async def publish_event(
    event_type: str,
    customer_id: str,
    payload: Dict[str, Any],
    source: str = "api",
) -> str:
    """Publish an event to the appropriate Redis channel."""
    event_id = str(uuid.uuid4())
    event = {
        "event_id": event_id,
        "event_type": event_type,
        "customer_id": customer_id,
        "source": source,
        "payload": payload,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    try:
        r = await get_redis()
        channel = CHANNEL_MAP.get(event_type, "cs:events:misc")
        msg = json.dumps(event)
        await r.publish(channel, msg)
        await r.publish(GLOBAL_CHANNEL, msg)
        # Also store in a list for replay/audit (keep last 500)
        await r.lpush("cs:event_log", msg)
        await r.ltrim("cs:event_log", 0, 499)
        return event_id
    except Exception as e:
        print(f"⚠️ EventBus publish failed: {e}")
        return event_id


# ── Subscriber ────────────────────────────────────────────────────────────────
class EventBusSubscriber:
    """Async subscriber that listens to Redis channels and dispatches to handlers."""

    def __init__(self):
        self._handlers: Dict[str, List[Callable]] = {}
        self._running = False

    def on(self, event_type: str):
        """Decorator to register an event handler."""
        def decorator(fn: Callable):
            self._handlers.setdefault(event_type, []).append(fn)
            return fn
        return decorator

    async def start(self, channels: List[str] = None):
        """Start listening. Call once at app startup."""
        if channels is None:
            channels = list(set(CHANNEL_MAP.values())) + [GLOBAL_CHANNEL]
        self._running = True
        try:
            r = await get_redis()
            pubsub = r.pubsub()
            await pubsub.subscribe(*channels)
            print(f"🔔 EventBus listening on: {', '.join(channels)}")
            async for message in pubsub.listen():
                if not self._running:
                    break
                if message["type"] != "message":
                    continue
                try:
                    event = json.loads(message["data"])
                    await self._dispatch(event)
                except Exception as e:
                    print(f"⚠️ EventBus dispatch error: {e}")
        except Exception as e:
            print(f"⚠️ EventBus subscriber error: {e}")

    async def _dispatch(self, event: Dict[str, Any]):
        event_type = event.get("event_type")
        handlers = self._handlers.get(event_type, [])
        for handler in handlers:
            try:
                await handler(event)
            except Exception as e:
                print(f"⚠️ Handler error for {event_type}: {e}")

    def stop(self):
        self._running = False


# ── Singleton subscriber ──────────────────────────────────────────────────────
bus = EventBusSubscriber()


# ── Register handlers ─────────────────────────────────────────────────────────
@bus.on(EventType.MEETING_UPLOADED)
async def handle_meeting_uploaded(event: Dict[str, Any]):
    """Trigger AI analysis when a new meeting is uploaded."""
    customer_id = event.get("customer_id")
    print(f"📨 EventBus: meeting.uploaded → triggering analysis for {customer_id}")
    try:
        from app.core.database import AsyncSessionLocal
        from app.services.recommendation_service import RecommendationService
        async with AsyncSessionLocal() as db:
            svc = RecommendationService(db)
            await svc.trigger_analysis(customer_id, "event:meeting.uploaded")
            await db.commit()
        # Publish result event
        await publish_event(
            EventType.ANALYSIS_COMPLETED,
            customer_id,
            {"trigger": "meeting.uploaded"},
            source="event_bus"
        )
    except Exception as e:
        print(f"⚠️ handle_meeting_uploaded error: {e}")


@bus.on(EventType.ANALYSIS_COMPLETED)
async def handle_analysis_completed(event: Dict[str, Any]):
    """Broadcast WebSocket notification when analysis completes."""
    customer_id = event.get("customer_id")
    print(f"📨 EventBus: analysis.completed → notifying via WS for {customer_id}")
    try:
        from app.websocket import global_manager
        await global_manager.broadcast_alert(
            alert_type="analysis_complete",
            message=f"AI analysis completed for customer {customer_id}",
            customer_name=event.get("payload", {}).get("customer_name", ""),
            severity="info",
        )
    except Exception as e:
        print(f"⚠️ handle_analysis_completed error: {e}")


@bus.on(EventType.CHURN_ALERT)
async def handle_churn_alert(event: Dict[str, Any]):
    """Create a DB notification when a churn alert fires."""
    payload = event.get("payload", {})
    customer_id = event.get("customer_id")
    print(f"📨 EventBus: churn.alert → {payload.get('churn_pct')}% for {customer_id}")
    try:
        from app.core.database import AsyncSessionLocal
        from app.models.models import Notification, Customer
        from sqlalchemy import select
        import uuid as _uuid
        async with AsyncSessionLocal() as db:
            cust = (await db.execute(select(Customer).where(Customer.id == customer_id))).scalar_one_or_none()
            if cust and cust.csm_id:
                db.add(Notification(
                    id=str(_uuid.uuid4()),
                    user_id=cust.csm_id,
                    title=f"🔴 Churn Alert: {cust.name}",
                    message=f"Churn risk at {payload.get('churn_pct')}%. Immediate action required.",
                    type="alert",
                    related_customer_id=customer_id,
                ))
                await db.commit()
    except Exception as e:
        print(f"⚠️ handle_churn_alert error: {e}")


# ── Recent event log ──────────────────────────────────────────────────────────
async def get_recent_events(limit: int = 20) -> List[Dict]:
    """Fetch recent events from Redis log for monitoring dashboard."""
    try:
        r = await get_redis()
        raw = await r.lrange("cs:event_log", 0, limit - 1)
        return [json.loads(e) for e in raw]
    except Exception:
        return []
