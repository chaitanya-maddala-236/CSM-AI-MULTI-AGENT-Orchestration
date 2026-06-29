"""
health_snapshot.py
------------------
Run this daily (cron / Celery beat) to store a snapshot of customer health
distribution. These snapshots power the real health-trend chart in Analytics.

Usage:
    python -m app.utils.health_snapshot

Or schedule with Celery beat:
    @app.on_after_configure.connect
    def setup_periodic_tasks(sender, **kwargs):
        sender.add_periodic_task(crontab(hour=0, minute=5), take_health_snapshot.s())
"""
import asyncio
import uuid
from datetime import datetime, timezone

from app.core.database import AsyncSessionLocal
from app.models.models import Customer, Timeline
from sqlalchemy import select, func


async def take_health_snapshot() -> dict:
    """Store a health_snapshot Timeline event with current counts."""
    async with AsyncSessionLocal() as db:
        healthy = (
            await db.execute(
                select(func.count(Customer.id)).where(Customer.health_status == "healthy")
            )
        ).scalar() or 0

        at_risk = (
            await db.execute(
                select(func.count(Customer.id)).where(Customer.health_status == "at_risk")
            )
        ).scalar() or 0

        critical = (
            await db.execute(
                select(func.count(Customer.id)).where(Customer.health_status == "critical")
            )
        ).scalar() or 0

        now = datetime.now(timezone.utc)
        snapshot = Timeline(
            id=str(uuid.uuid4()),
            customer_id=None,          # portfolio-level event, no single customer
            event_type="health_snapshot",
            title=f"Health Snapshot — {now.strftime('%Y-%m-%d')}",
            description=f"Healthy: {healthy} | At Risk: {at_risk} | Critical: {critical}",
            event_metadata={
                "healthy": healthy,
                "at_risk": at_risk,
                "critical": critical,
                "total": healthy + at_risk + critical,
            },
            occurred_at=now,
        )
        db.add(snapshot)
        await db.commit()

        result = {"date": now.isoformat(), "healthy": healthy, "at_risk": at_risk, "critical": critical}
        print(f"[health_snapshot] Stored: {result}")
        return result


async def seed_past_snapshots(days: int = 10) -> None:
    """Seed historical snapshots for demo purposes.
    Generates plausible improving/worsening trend over `days`."""
    import random
    random.seed(12345)

    async with AsyncSessionLocal() as db:
        # Get current counts as baseline
        healthy = (
            await db.execute(
                select(func.count(Customer.id)).where(Customer.health_status == "healthy")
            )
        ).scalar() or 5

        at_risk = (
            await db.execute(
                select(func.count(Customer.id)).where(Customer.health_status == "at_risk")
            )
        ).scalar() or 3

        critical = (
            await db.execute(
                select(func.count(Customer.id)).where(Customer.health_status == "critical")
            )
        ).scalar() or 2

        from datetime import timedelta
        now = datetime.now(timezone.utc)

        for i in range(days, 0, -1):
            # Simulate a worsening trend going back in time
            day = now - timedelta(days=i)
            delta = int(i * 0.3)
            snap_healthy = max(1, healthy + delta)
            snap_critical = max(0, critical - delta // 2)
            snap_at_risk = max(0, at_risk - delta // 3)

            # Avoid duplicate for same day
            existing = (
                await db.execute(
                    select(Timeline).where(
                        Timeline.event_type == "health_snapshot",
                        func.date(Timeline.occurred_at) == day.date(),
                    )
                )
            ).scalar_one_or_none()

            if not existing:
                db.add(
                    Timeline(
                        id=str(uuid.uuid4()),
                        customer_id=None,
                        event_type="health_snapshot",
                        title=f"Health Snapshot — {day.strftime('%Y-%m-%d')}",
                        description=f"Healthy: {snap_healthy} | At Risk: {snap_at_risk} | Critical: {snap_critical}",
                        event_metadata={
                            "healthy": snap_healthy,
                            "at_risk": snap_at_risk,
                            "critical": snap_critical,
                            "total": snap_healthy + snap_at_risk + snap_critical,
                        },
                        occurred_at=day,
                    )
                )

        await db.commit()
        print(f"[health_snapshot] Seeded {days} historical snapshots.")


if __name__ == "__main__":
    asyncio.run(take_health_snapshot())
