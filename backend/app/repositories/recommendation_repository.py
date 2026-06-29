"""Recommendation repository."""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional, List, Tuple
from app.models.models import Recommendation, Customer


class RecommendationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_pending(self, limit: int = 50) -> List[Recommendation]:
        result = await self.db.execute(
            select(Recommendation)
            .options(
                selectinload(Recommendation.customer).selectinload(Customer.company),
                selectinload(Recommendation.customer).selectinload(Customer.csm),
            )
            .where(Recommendation.status == "pending")
            .order_by(Recommendation.created_at.desc())
            .limit(limit)
        )
        return result.scalars().all()

    async def count_by_status(self) -> dict:
        counts = {}
        for status in ("pending", "approved", "rejected", "executed"):
            n = (
                await self.db.execute(
                    select(func.count(Recommendation.id)).where(Recommendation.status == status)
                )
            ).scalar()
            counts[status] = n
        return counts
