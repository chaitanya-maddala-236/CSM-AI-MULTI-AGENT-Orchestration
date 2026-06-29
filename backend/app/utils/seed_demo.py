"""
Enhanced Demo Seed — 4 canonical hackathon demo customers.

Usage:
    python -m app.utils.seed_demo

Creates exactly 4 customers that showcase all CS Copilot features:
  1. TechNova Corp   — Healthy (usage 95%, risk 8%)
  2. RetailMax Inc   — At Risk (usage 45%, risk 88%, negative sentiment)
  3. GlobalShip Ltd  — Critical (usage 12%, risk 97%, renewal in 7 days)
  4. GrowFast SaaS   — Expansion (usage 98%, upsell probability 92%)
"""
import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.config import settings
from app.models.models import (
    Base, User, Company, Customer, Meeting, SupportTicket,
    UsageMetric, Recommendation, Timeline, KnowledgeDocument
)
from app.auth.auth import hash_password


DEMO_DATA = [
    {
        "company": {
            "name": "TechNova Corp",
            "industry": "Technology",
            "size": "enterprise",
            "country": "USA",
            "annual_revenue": 80_000_000,
        },
        "customer": {
            "name": "Rachel Kim",
            "title": "VP of Engineering",
            "email": "rachel@technova.com",
            "plan": "enterprise",
            "mrr": 18_000,
            "health_score": 93,
            "churn_risk_pct": 8,
            "status": "healthy",
            "sentiment_label": "positive",
            "adoption_score": 0.95,
            "days_to_renewal": 280,
        },
        "story": "3 QBRs completed this year. NPS 9/10. Expanding into EU market — prime upsell candidate for Seat Expansion pack.",
        "tickets": 0,
        "usage_trend": "stable",
        "meetings": [
            {"type": "meeting", "title": "Q3 Business Review", "sentiment": "positive",
             "summary": "Customer highly satisfied. Discussed EU expansion. Interested in additional seats."},
            {"type": "meeting", "title": "Feature Onboarding Session", "sentiment": "positive",
             "summary": "Team fully trained on advanced analytics module. Adoption rate excellent."},
        ],
        "recommendations": [
            {
                "action": "Seat Expansion Upsell",
                "priority": "high",
                "confidence_score": 0.92,
                "rationale": "Usage at 95% capacity. EU expansion planned. Seat limit will be hit in 45 days.",
                "predicted_impact": "Expected MRR increase of $4,500/month",
                "status": "pending",
            }
        ],
    },
    {
        "company": {
            "name": "RetailMax Inc",
            "industry": "Retail",
            "size": "enterprise",
            "country": "USA",
            "annual_revenue": 45_000_000,
        },
        "customer": {
            "name": "Marcus Chen",
            "title": "CTO",
            "email": "mchen@retailmax.com",
            "plan": "professional",
            "mrr": 6_500,
            "health_score": 31,
            "churn_risk_pct": 88,
            "status": "at_risk",
            "sentiment_label": "negative",
            "adoption_score": 0.45,
            "days_to_renewal": 30,
        },
        "story": "Usage dropped 45% in 30 days. New CTO onboarded 60 days ago — legacy champion gone. 3 open tickets unresolved.",
        "tickets": 3,
        "usage_trend": "declining",
        "meetings": [
            {"type": "meeting", "title": "Onboarding Review",
             "sentiment": "negative",
             "summary": "New CTO unfamiliar with platform. Expressed frustration with API documentation. Considering alternatives."},
            {"type": "email", "title": "Follow-up on Migration Questions",
             "sentiment": "negative",
             "summary": "Customer asked about data export. Mentioned evaluating a competitor."},
        ],
        "recommendations": [
            {
                "action": "Executive Business Review",
                "priority": "critical",
                "confidence_score": 0.89,
                "rationale": "Usage decline 45%, negative onboarding sentiment, new champion needs re-engagement at executive level.",
                "predicted_impact": "Reduce churn risk from 88% to under 40% if executed within 14 days",
                "status": "pending",
            },
            {
                "action": "Technical Training Session",
                "priority": "high",
                "confidence_score": 0.74,
                "rationale": "New CTO team lacks platform knowledge. Training resolves the knowledge gap driving disengagement.",
                "predicted_impact": "Expected adoption recovery to 70%+ within 30 days",
                "status": "pending",
            },
            {
                "action": "Discount / Renewal Incentive",
                "priority": "medium",
                "confidence_score": 0.44,
                "rationale": "Commercial lever as last resort if engagement actions fail. 10% discount for 12-month commit.",
                "predicted_impact": "Moderate — addresses price objections but not root cause",
                "status": "pending",
            },
        ],
    },
    {
        "company": {
            "name": "GlobalShip Ltd",
            "industry": "Logistics",
            "size": "enterprise",
            "country": "UK",
            "annual_revenue": 120_000_000,
        },
        "customer": {
            "name": "James O'Brien",
            "title": "VP Operations",
            "email": "james@globalship.com",
            "plan": "enterprise",
            "mrr": 22_000,
            "health_score": 12,
            "churn_risk_pct": 97,
            "status": "critical",
            "sentiment_label": "negative",
            "adoption_score": 0.12,
            "days_to_renewal": 7,
        },
        "story": "CRITICAL: Renewal in 7 days. Usage collapsed to 12% — team stopped using product after integration failure 45 days ago. No CSM contact in 30 days.",
        "tickets": 5,
        "usage_trend": "declining",
        "meetings": [
            {"type": "meeting", "title": "Integration Issue Call",
             "sentiment": "negative",
             "summary": "ERP integration failed during migration. Team reverted to manual processes. Very frustrated."},
        ],
        "recommendations": [
            {
                "action": "Emergency Executive Escalation",
                "priority": "critical",
                "confidence_score": 0.95,
                "rationale": "7 days to renewal, 97% churn risk, usage at 12%. Requires C-level intervention immediately.",
                "predicted_impact": "Last chance to save $264K ARR",
                "status": "pending",
            },
        ],
    },
    {
        "company": {
            "name": "GrowFast SaaS",
            "industry": "SaaS",
            "size": "smb",
            "country": "USA",
            "annual_revenue": 18_000_000,
        },
        "customer": {
            "name": "Priya Patel",
            "title": "Head of Customer Success",
            "email": "priya@growfast.io",
            "plan": "professional",
            "mrr": 3_200,
            "health_score": 97,
            "churn_risk_pct": 5,
            "status": "healthy",
            "sentiment_label": "positive",
            "adoption_score": 0.98,
            "days_to_renewal": 180,
        },
        "story": "Power user. Using 98% of features. Team of 12 all active daily. NPS 10. Ready for Enterprise plan — 3 competitors already on Enterprise.",
        "tickets": 0,
        "usage_trend": "growing",
        "meetings": [
            {"type": "meeting", "title": "Monthly Success Check-in",
             "sentiment": "positive",
             "summary": "Priya shared that the team loves the AI recommendations feature. Asked about API rate limits — hitting them."},
        ],
        "recommendations": [
            {
                "action": "Enterprise Plan Upgrade Pitch",
                "priority": "high",
                "confidence_score": 0.92,
                "rationale": "98% feature adoption, hitting API rate limits, team growing. Enterprise plan removes all limits + adds SSO.",
                "predicted_impact": "MRR expansion from $3,200 to $8,500/month (+$5,300)",
                "status": "pending",
            }
        ],
    },
]


async def seed_demo():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with Session() as session:
        # Create admin user
        from sqlalchemy import select
        result = await session.execute(select(User).where(User.email == "admin@cscopilot.com"))
        admin = result.scalar_one_or_none()
        if not admin:
            admin = User(
                email="admin@cscopilot.com",
                full_name="Admin User",
                role="admin",
                hashed_password=hash_password("admin123"),
            )
            session.add(admin)
            await session.flush()

        now = datetime.now(timezone.utc)

        for d in DEMO_DATA:
            # Company
            company = Company(**d["company"])
            session.add(company)
            await session.flush()

            # Customer
            c = d["customer"]
            renewal_date = now + timedelta(days=c["days_to_renewal"])
            customer = Customer(
                name=c["name"],
                title=c["title"],
                email=c["email"],
                company_id=company.id,
                csm_id=admin.id,
                plan=c["plan"],
                mrr=c["mrr"],
                arr=c["mrr"] * 12,
                health_score=c["health_score"],
                churn_probability=c["churn_risk_pct"] / 100.0,
                health_status=c["status"],
                sentiment=c["sentiment_label"],
                sentiment_score=1.0 - (c["churn_risk_pct"] / 100.0),
                renewal_date=renewal_date,
                contract_start=now - timedelta(days=365),
                seats=20,
                is_active=True,
                last_activity=now - timedelta(days=1),
            )
            session.add(customer)
            await session.flush()

            # Meetings
            for i, m in enumerate(d["meetings"]):
                meeting = Meeting(
                    customer_id=customer.id,
                    title=m["title"],
                    sentiment=m["sentiment"],
                    summary=m["summary"],
                    meeting_date=now - timedelta(days=(i + 1) * 10),
                    duration_minutes=45,
                )
                session.add(meeting)
                session.add(Timeline(
                    customer_id=customer.id,
                    event_type="meeting",
                    title=m["title"],
                    description=m["summary"],
                    occurred_at=now - timedelta(days=(i + 1) * 10),
                ))

            # Support tickets
            for t in range(d["tickets"]):
                ticket = SupportTicket(
                    customer_id=customer.id,
                    title=f"Issue #{t+1}: Platform Configuration",
                    description=f"Customer reported issue with platform configuration. Requires investigation.",
                    status="open",
                    priority="high" if t == 0 else "medium",
                    category="technical",
                    opened_at=now - timedelta(days=(t + 1) * 5),
                )
                session.add(ticket)

            # Usage metrics (30-day history)
            base_adoption = c["adoption_score"]
            trend = d["usage_trend"]
            for day in range(30):
                delta = 0
                if trend == "declining":
                    delta = -0.015 * day
                elif trend == "growing":
                    delta = 0.002 * day
                adoption = max(0.05, min(1.0, base_adoption + delta))
                session.add(UsageMetric(
                    customer_id=customer.id,
                    date=now - timedelta(days=30 - day),
                    dau=int(adoption * 50),
                    mau=max(1, int(adoption * 200)),
                    sessions=max(1, int(adoption * 100)),
                    adoption_score=adoption,
                    api_calls=int(adoption * 5000),
                    errors=max(0, int((1.0 - adoption) * 10)),
                ))

            # Recommendations
            for rec_data in d.get("recommendations", []):
                rec = Recommendation(
                    customer_id=customer.id,
                    title=rec_data["action"],
                    description=rec_data["rationale"],
                    category=rec_data.get("category", "general"),
                    priority=rec_data["priority"],
                    confidence_score=rec_data["confidence_score"],
                    risk_score=c["churn_risk_pct"] / 100.0,
                    reasoning=rec_data["rationale"],
                    evidence=[rec_data.get("predicted_impact", "")],
                    actions=[rec_data["action"]],
                    status=rec_data["status"],
                )
                session.add(rec)

        await session.commit()
        print("✅ Demo seed complete!")
        print("   4 canonical demo customers created:")
        for d in DEMO_DATA:
            c = d["customer"]
            print(f"   • {d['company']['name']} ({c['status'].upper()}) — Risk: {c['churn_risk_pct']}%")
        print()
        print("   Login: admin@cscopilot.com / admin123")


if __name__ == "__main__":
    asyncio.run(seed_demo())
