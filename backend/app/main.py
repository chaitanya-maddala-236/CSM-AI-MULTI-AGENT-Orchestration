"""FastAPI Main Application — CS Copilot"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import init_db
from app.api.routes import (
    auth, customers, recommendations, agents, analytics,
    notifications, timeline, knowledge, meetings, ingestion,
    settings as settings_routes, ws, memory as memory_routes,
)
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────────────
    # Validate LLM config and print provider info
    from app.core.startup_check import validate_llm_config
    validate_llm_config()

    await init_db()

    import asyncio
    from app.core.event_bus import bus
    task = asyncio.create_task(bus.start())

    yield

    # ── Shutdown ─────────────────────────────────────────────────────────────
    bus.stop()
    task.cancel()


app = FastAPI(
    title="CS Copilot — AI Decision Intelligence",
    version="9.0.0",
    description="Multi-agent Customer Success AI with universal LLM support.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
for router in [
    auth.router, customers.router, recommendations.router,
    agents.router, analytics.router, notifications.router,
    timeline.router, knowledge.router, meetings.router, ingestion.router,
    settings_routes.router, memory_routes.router,
]:
    app.include_router(router, prefix="/api/v1")

app.include_router(ws.router)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "llm_provider": settings.active_provider,
        "llm_model": settings.active_model,
        "api_key_set": bool(settings.active_api_key),
    }


# ── Event bus endpoints ───────────────────────────────────────────────────────
@app.get("/api/v1/events/recent")
async def recent_events(limit: int = 20):
    from app.core.event_bus import get_recent_events
    return {"events": await get_recent_events(limit)}


@app.post("/api/v1/events/publish")
async def publish_event_endpoint(data: dict):
    from app.core.event_bus import publish_event
    event_id = await publish_event(
        event_type=data["event_type"],
        customer_id=data["customer_id"],
        payload=data.get("payload", {}),
        source="api_manual",
    )
    return {"event_id": event_id, "message": "Event published"}
