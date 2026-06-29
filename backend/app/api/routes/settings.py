"""Settings routes — actually persist preferences to DB (via UserSettings JSON column)."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.auth.auth import get_current_user
from app.models.models import User

router = APIRouter(prefix="/settings", tags=["settings"])


class UserSettingsUpdate(BaseModel):
    email_notifications:   Optional[bool] = None
    push_notifications:    Optional[bool] = None
    churn_alerts:          Optional[bool] = None
    renewal_alerts:        Optional[bool] = None
    approval_alerts:       Optional[bool] = None
    llm_provider:          Optional[str]  = None
    analysis_frequency:    Optional[str]  = None
    auto_approve:          Optional[bool] = None
    confidence_threshold:  Optional[int]  = None
    dark_mode:             Optional[bool] = None
    compact_view:          Optional[bool] = None
    language:              Optional[str]  = None


@router.get("")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return current user's saved settings, falling back to defaults."""
    saved = current_user.preferences or {}
    defaults = {
        "email_notifications": True,
        "push_notifications": True,
        "churn_alerts": True,
        "renewal_alerts": True,
        "approval_alerts": True,
        "llm_provider": "openai",
        "analysis_frequency": "daily",
        "auto_approve": False,
        "confidence_threshold": 75,
        "dark_mode": False,
        "compact_view": False,
        "language": "en",
    }
    return {**defaults, **saved}


@router.put("")
async def save_settings(
    body: UserSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Merge and persist user settings into User.preferences JSON column."""
    existing = dict(current_user.preferences or {})
    updates = body.model_dump(exclude_none=True)
    existing.update(updates)
    current_user.preferences = existing
    db.add(current_user)
    await db.commit()
    return {"message": "Settings saved", "settings": existing}


@router.put("/profile")
async def update_profile(
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update display name."""
    if "full_name" in body and body["full_name"].strip():
        current_user.full_name = body["full_name"].strip()
        db.add(current_user)
        await db.commit()
    return {"message": "Profile updated", "full_name": current_user.full_name}


# ─── Business Rules Engine ───────────────────────────────────────────────────
from app.models.models import BusinessRuleSettings

class BusinessRulesUpdate(BaseModel):
    usage_drop_threshold: Optional[float] = None     # % drop that triggers risk
    usage_drop_risk_weight: Optional[float] = None   # risk points added
    negative_sentiment_weight: Optional[float] = None
    tickets_threshold: Optional[int] = None          # number of open tickets
    tickets_risk_weight: Optional[float] = None
    renewal_days_threshold: Optional[int] = None     # days until renewal
    renewal_risk_weight: Optional[float] = None
    auto_approve_enabled: Optional[bool] = None
    auto_approve_confidence_threshold: Optional[float] = None

@router.get("/business-rules")
async def get_business_rules(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    """Return current business rule weights."""
    from sqlalchemy import select
    row = (await db.execute(select(BusinessRuleSettings).where(BusinessRuleSettings.id == "default"))).scalar_one_or_none()
    defaults = {
        "usage_drop_threshold": 40.0,
        "usage_drop_risk_weight": 30.0,
        "negative_sentiment_weight": 25.0,
        "tickets_threshold": 3,
        "tickets_risk_weight": 20.0,
        "renewal_days_threshold": 30,
        "renewal_risk_weight": 15.0,
        "auto_approve_enabled": row.auto_approve_enabled if row else False,
        "auto_approve_confidence_threshold": row.auto_approve_confidence_threshold if row else 75.0,
    }
    return defaults

@router.put("/business-rules")
async def update_business_rules(
    body: BusinessRulesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update business rule engine weights."""
    from sqlalchemy import select
    row = (await db.execute(select(BusinessRuleSettings).where(BusinessRuleSettings.id == "default"))).scalar_one_or_none()
    if not row:
        row = BusinessRuleSettings(id="default", updated_by=current_user.id)
        db.add(row)
    if body.auto_approve_enabled is not None:
        row.auto_approve_enabled = body.auto_approve_enabled
    if body.auto_approve_confidence_threshold is not None:
        row.auto_approve_confidence_threshold = body.auto_approve_confidence_threshold
    row.updated_by = current_user.id
    await db.commit()
    return {"message": "Business rules updated"}

@router.post("/business-rules/simulate")
async def simulate_risk_score(body: dict, _: User = Depends(get_current_user)):
    """Run the risk scoring formula with custom inputs — for the live simulator UI."""
    usage_drop = float(body.get("usage_drop", 0))
    negative_sentiment = bool(body.get("negative_sentiment", False))
    open_tickets = int(body.get("open_tickets", 0))
    renewal_days = int(body.get("renewal_days", 90))

    breakdown = []
    risk = 0.0

    if usage_drop >= 40:
        pts = min(30, usage_drop * 0.6)
        risk += pts
        breakdown.append({"rule": f"Usage drop ≥ 40% (actual: {usage_drop:.0f}%)", "points": round(pts, 1), "triggered": True})
    else:
        breakdown.append({"rule": f"Usage drop < 40% (actual: {usage_drop:.0f}%)", "points": 0, "triggered": False})

    if negative_sentiment:
        risk += 25
        breakdown.append({"rule": "Negative sentiment detected", "points": 25, "triggered": True})
    else:
        breakdown.append({"rule": "Negative sentiment", "points": 0, "triggered": False})

    if open_tickets >= 3:
        pts = min(20, open_tickets * 5)
        risk += pts
        breakdown.append({"rule": f"Open tickets ≥ 3 (actual: {open_tickets})", "points": round(pts, 1), "triggered": True})
    else:
        breakdown.append({"rule": f"Open tickets < 3 (actual: {open_tickets})", "points": 0, "triggered": False})

    if renewal_days <= 30:
        risk += 15
        breakdown.append({"rule": f"Renewal in ≤ 30 days (actual: {renewal_days}d)", "points": 15, "triggered": True})
    else:
        breakdown.append({"rule": f"Renewal in > 30 days (actual: {renewal_days}d)", "points": 0, "triggered": False})

    final_risk = min(100, round(risk, 1))
    return {
        "risk_score": final_risk,
        "risk_level": "critical" if final_risk >= 70 else "at_risk" if final_risk >= 40 else "healthy",
        "breakdown": breakdown,
    }


# ── LLM Provider Info ─────────────────────────────────────────────────────────

@router.get("/llm-info")
async def get_llm_info(current_user: User = Depends(get_current_user)):
    """Return current LLM provider info (safe — never returns the full key)."""
    from app.core.config import settings
    key = settings.active_api_key
    return {
        "provider": settings.active_provider,
        "model": settings.active_model,
        "fast_model": {"openai": "gpt-4o-mini", "groq": "llama-3.1-8b-instant", "gemini": "gemini-1.5-flash"}.get(settings.active_provider, "unknown"),
        "key_configured": bool(key),
        "key_preview": f"{key[:6]}...{key[-4:]}" if len(key) > 10 else "not set",
    }
