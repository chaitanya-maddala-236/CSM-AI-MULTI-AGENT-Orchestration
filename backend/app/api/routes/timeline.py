"""Timeline routes"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.auth.auth import get_current_user
from app.models.models import User, Timeline

router = APIRouter(prefix="/timeline", tags=["timeline"])

@router.get("/customer/{customer_id}")
async def get_timeline(customer_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Timeline).where(Timeline.customer_id == customer_id).order_by(Timeline.occurred_at.desc()).limit(50))
    return result.scalars().all()
