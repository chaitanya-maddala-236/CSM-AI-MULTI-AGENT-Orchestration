"""Customer Service — business logic"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from app.models.models import Customer, Company, User, Recommendation, AgentRun, Timeline, UsageMetric
from app.schemas.schemas import CustomerCreate, CustomerUpdate
import uuid

class CustomerService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, page: int = 1, page_size: int = 20, health_status: Optional[str] = None, search: Optional[str] = None, csm_id: Optional[str] = None):
        query = select(Customer).options(selectinload(Customer.company), selectinload(Customer.csm))
        if health_status:
            query = query.where(Customer.health_status == health_status)
        if search:
            query = query.where(or_(Customer.name.ilike(f"%{search}%"), Customer.email.ilike(f"%{search}%")))
        if csm_id:
            query = query.where(Customer.csm_id == csm_id)
        count_q = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_q)).scalar()
        query = query.offset((page - 1) * page_size).limit(page_size).order_by(Customer.churn_probability.desc())
        result = await self.db.execute(query)
        return result.scalars().all(), total

    async def get_by_id(self, customer_id: str):
        result = await self.db.execute(
            select(Customer).options(selectinload(Customer.company), selectinload(Customer.csm),
                selectinload(Customer.recommendations), selectinload(Customer.usage_metrics),
                selectinload(Customer.meetings), selectinload(Customer.support_tickets)
            ).where(Customer.id == customer_id)
        )
        return result.scalar_one_or_none()

    async def create(self, data: CustomerCreate):
        customer = Customer(id=str(uuid.uuid4()), **data.model_dump())
        customer.arr = data.mrr * 12
        self.db.add(customer)
        await self.db.flush()
        return customer

    async def update(self, customer_id: str, data: CustomerUpdate):
        customer = await self.get_by_id(customer_id)
        if not customer:
            return None
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(customer, k, v)
        if data.mrr is not None:
            customer.arr = data.mrr * 12
        await self.db.flush()
        return customer

    async def get_dashboard_stats(self):
        now = datetime.now(timezone.utc)
        next_month = now + timedelta(days=30)
        
        total = (await self.db.execute(select(func.count(Customer.id)).where(Customer.is_active == True))).scalar()
        healthy = (await self.db.execute(select(func.count(Customer.id)).where(and_(Customer.health_status == "healthy", Customer.is_active == True)))).scalar()
        at_risk = (await self.db.execute(select(func.count(Customer.id)).where(and_(Customer.health_status == "at_risk", Customer.is_active == True)))).scalar()
        critical = (await self.db.execute(select(func.count(Customer.id)).where(and_(Customer.health_status == "critical", Customer.is_active == True)))).scalar()
        renewals = (await self.db.execute(select(func.count(Customer.id)).where(and_(Customer.renewal_date >= now, Customer.renewal_date <= next_month, Customer.is_active == True)))).scalar()
        upsell = (await self.db.execute(select(func.count(Customer.id)).where(and_(Customer.health_score >= 75, Customer.is_active == True)))).scalar()
        pending = (await self.db.execute(select(func.count(Recommendation.id)).where(Recommendation.status == "pending"))).scalar()
        avg_health = (await self.db.execute(select(func.avg(Customer.health_score)).where(Customer.is_active == True))).scalar() or 0
        total_arr = (await self.db.execute(select(func.sum(Customer.arr)).where(Customer.is_active == True))).scalar() or 0
        
        return {"total_customers": total, "healthy": healthy, "at_risk": at_risk, "critical": critical,
                "renewals_this_month": renewals, "upsell_opportunities": upsell, "pending_approvals": pending,
                "avg_health_score": round(float(avg_health), 1), "total_arr": round(float(total_arr), 2)}
