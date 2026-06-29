"""Notification routes"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.auth.auth import get_current_user
from app.models.models import User, Notification
from app.schemas.schemas import NotificationOut

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("")
async def list_notifications(
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    total = (await db.execute(select(func.count(Notification.id)).where(Notification.user_id == current_user.id))).scalar()
    result = await db.execute(select(Notification).where(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).offset((page-1)*page_size).limit(page_size))
    items = result.scalars().all()
    unread = (await db.execute(select(func.count(Notification.id)).where(Notification.user_id == current_user.id, Notification.is_read == False))).scalar()
    return {"total": total, "unread": unread, "items": items}

@router.post("/{notif_id}/read")
async def mark_read(notif_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Notification).where(Notification.id == notif_id, Notification.user_id == current_user.id))
    notif = result.scalar_one_or_none()
    if notif:
        notif.is_read = True
        await db.commit()
    return {"success": True}

@router.post("/read-all")
async def mark_all_read(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Notification).where(Notification.user_id == current_user.id, Notification.is_read == False))
    for n in result.scalars().all():
        n.is_read = True
    await db.commit()
    return {"success": True}
