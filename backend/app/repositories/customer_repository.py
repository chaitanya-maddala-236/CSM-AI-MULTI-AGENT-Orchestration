"""Customer repository — reusable DB queries."""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List, Tuple
from app.models.models import Customer, Company


class CustomerRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_by_id(self, customer_id: str) -> Optional[Customer]:
        result = await self.db.execute(
            select(Customer)
            .options(
                selectinload(Customer.company),
                selectinload(Customer.csm),
                selectinload(Customer.recommendations),
                selectinload(Customer.usage_metrics),
                selectinload(Customer.meetings),
                selectinload(Customer.support_tickets),
            )
            .where(Customer.id == customer_id)
        )
        return result.scalar_one_or_none()

    async def find_all(
        self,
        page: int = 1,
        page_size: int = 20,
        health_status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Customer], int]:
        query = select(Customer).options(
            selectinload(Customer.company),
            selectinload(Customer.csm),
        )
        if health_status:
            query = query.where(Customer.health_status == health_status)
        if search:
            query = query.where(
                or_(Customer.name.ilike(f"%{search}%"), Customer.email.ilike(f"%{search}%"))
            )
        total = (await self.db.execute(select(func.count()).select_from(query.subquery()))).scalar()
        result = await self.db.execute(
            query.order_by(Customer.churn_probability.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return result.scalars().all(), total

    async def find_critical(self, limit: int = 10) -> List[Customer]:
        result = await self.db.execute(
            select(Customer)
            .options(
                selectinload(Customer.company),
                selectinload(Customer.csm),
            )
            .where(and_(Customer.health_status == "critical", Customer.is_active == True))
            .order_by(Customer.churn_probability.desc())
            .limit(limit)
        )
        return result.scalars().all()
