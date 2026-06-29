"""Recommendation Service — passes DB into workflow for memory agent"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone
from typing import Optional
from app.models.models import Recommendation, Customer, AgentRun, Timeline, Notification, User, BusinessRuleSettings
from app.schemas.schemas import ApprovalRequest
from app.core.config import settings
from app.agents.workflow import run_customer_analysis
import uuid


class RecommendationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        priority: Optional[str] = None,
    ):
        query = select(Recommendation).options(
            selectinload(Recommendation.customer).selectinload(Customer.company),
            selectinload(Recommendation.customer).selectinload(Customer.csm),
        )
        if status:
            query = query.where(Recommendation.status == status)
        if priority:
            query = query.where(Recommendation.priority == priority)
        total = (await self.db.execute(select(func.count()).select_from(query.subquery()))).scalar()
        query = query.offset((page - 1) * page_size).limit(page_size).order_by(
            Recommendation.created_at.desc()
        )
        result = await self.db.execute(query)
        return result.scalars().all(), total

    async def get_by_customer(self, customer_id: str):
        result = await self.db.execute(
            select(Recommendation)
            .where(Recommendation.customer_id == customer_id)
            .order_by(Recommendation.created_at.desc())
        )
        return result.scalars().all()

    async def approve_or_reject(self, rec_id: str, data: ApprovalRequest, approver_id: str):
        result = await self.db.execute(
            select(Recommendation).where(Recommendation.id == rec_id)
        )
        rec = result.scalar_one_or_none()
        if not rec:
            return None

        rec.status = data.status
        rec.approved_by = approver_id
        rec.approved_at = datetime.now(timezone.utc)
        rec.feedback_note = data.feedback_note

        tl = Timeline(
            id=str(uuid.uuid4()),
            customer_id=rec.customer_id,
            event_type=f"recommendation_{data.status}",
            title=f"Recommendation {data.status}: {rec.title}",
            description=data.feedback_note,
            event_metadata={
                "recommendation_id": rec_id,
                "category": rec.category,
                "status": data.status,
                "feedback": data.feedback_note,
            },
        )
        self.db.add(tl)
        await self.db.flush()
        return rec

    async def trigger_analysis(self, customer_id: str, triggered_by: str = "manual"):
        result = await self.db.execute(
            select(Customer)
            .options(
                selectinload(Customer.company),
                selectinload(Customer.csm),
                selectinload(Customer.usage_metrics),
                selectinload(Customer.meetings),
                selectinload(Customer.support_tickets),
            )
            .where(Customer.id == customer_id)
        )
        customer = result.scalar_one_or_none()
        if not customer:
            return None

        usage = sorted(customer.usage_metrics, key=lambda u: u.date or datetime.min, reverse=True)[:7]
        meetings = sorted(customer.meetings, key=lambda m: m.meeting_date or datetime.min, reverse=True)[:3]
        open_tickets = [t for t in customer.support_tickets if t.status == "open"]
        all_tickets = customer.support_tickets[-5:] if customer.support_tickets else []

        customer_data = {
            "customer_id": customer_id,
            "customer_name": customer.name,
            "company_name": customer.company.name if customer.company else "Unknown",
            "health_score": customer.health_score,
            "churn_probability": customer.churn_probability,
            "plan": customer.plan or "unknown",
            "mrr": customer.mrr,
            "arr": customer.arr,
            "renewal_date": str(customer.renewal_date) if customer.renewal_date else None,
            "seats": customer.seats,
            "open_tickets": len(open_tickets),
            "trigger_reason": triggered_by,
            "recent_interactions": (
                [
                    {
                        "type": "meeting",
                        "title": m.title,
                        "sentiment": m.sentiment.value if m.sentiment else "neutral",
                        "sentiment_score": m.sentiment_score,
                        "summary": m.summary or "",
                        "key_topics": m.key_topics or [],
                        "risks": m.risks_identified or [],
                        "date": str(m.meeting_date),
                    }
                    for m in meetings
                ]
                + [
                    {
                        "type": "ticket",
                        "title": t.title,
                        "status": t.status,
                        "priority": t.priority,
                        "category": t.category,
                        "opened_at": str(t.opened_at),
                    }
                    for t in all_tickets
                ]
            ),
            "usage_metrics": [
                {
                    "date": str(u.date),
                    "dau": u.dau,
                    "mau": u.mau,
                    "sessions": u.sessions,
                    "avg_session_minutes": u.avg_session_minutes,
                    "api_calls": u.api_calls,
                    "errors": u.errors,
                    "adoption_score": u.adoption_score,
                    "features_used": u.features_used or [],
                }
                for u in usage
            ],
        }

        agent_run = AgentRun(
            id=str(uuid.uuid4()),
            customer_id=customer_id,
            agent_name="orchestrator",
            workflow_id=str(uuid.uuid4()),
            status="running",
            input_data={k: v for k, v in customer_data.items() if k != "_db"},
            llm_provider=settings.LLM_PROVIDER,
            logs=[],
        )
        self.db.add(agent_run)
        await self.db.flush()

        try:
            rules = (await self.db.execute(
                select(BusinessRuleSettings).where(BusinessRuleSettings.id == "default")
            )).scalar_one_or_none()

            result_state = await run_customer_analysis(customer_data, db=self.db)

            for rec_data in result_state.get("recommendations", []):
                confidence_score = rec_data.get("confidence_score", 0.7)
                auto_approved = bool(
                    rules
                    and rules.auto_approve_enabled
                    and confidence_score * 100 >= rules.auto_approve_confidence_threshold
                )
                rec = Recommendation(
                    id=str(uuid.uuid4()),
                    customer_id=customer_id,
                    agent_run_id=agent_run.id,
                    title=rec_data.get("title", "Recommendation"),
                    description=rec_data.get("description"),
                    category=rec_data.get("category", "general"),
                    priority=rec_data.get("priority", "medium"),
                    status="approved" if auto_approved else "pending",
                    actions=rec_data.get("actions", []),
                    evidence=rec_data.get("evidence", []),
                    reasoning=rec_data.get("reasoning"),
                    confidence_score=confidence_score,
                    risk_score=rec_data.get("risk_score", 0.5),
                    approved_at=datetime.now(timezone.utc) if auto_approved else None,
                )
                self.db.add(rec)

                if auto_approved:
                    self.db.add(Timeline(
                        id=str(uuid.uuid4()),
                        customer_id=customer_id,
                        event_type="recommendation_auto_approved",
                        title=f"Auto-approved: {rec.title}",
                        description=(
                            f"Confidence {confidence_score*100:.0f}% met the "
                            f"{rules.auto_approve_confidence_threshold:.0f}% threshold."
                        ),
                        event_metadata={
                            "recommendation_id": rec.id,
                            "confidence_score": confidence_score,
                            "threshold": rules.auto_approve_confidence_threshold,
                        },
                    ))

            if result_state.get("health_score"):
                hs = result_state["health_score"]
                customer.health_score = hs
                customer.health_status = (
                    "healthy" if hs >= 70 else ("at_risk" if hs >= 40 else "critical")
                )

            if result_state.get("sentiment_analysis"):
                sa = result_state["sentiment_analysis"]
                customer.sentiment = sa.get("overall_sentiment", "neutral")
                customer.sentiment_score = sa.get("sentiment_score", 0.5)

            if customer.health_score < 40 and customer.csm_id:
                self.db.add(Notification(
                    id=str(uuid.uuid4()),
                    user_id=customer.csm_id,
                    title=f"⚠️ Critical: {customer.name}",
                    message=(
                        f"AI analysis flagged {customer.name} as critical "
                        f"(health: {customer.health_score:.0f}). "
                        f"{len(result_state.get('recommendations', []))} recommendation(s) generated."
                    ),
                    type="alert",
                    related_customer_id=customer_id,
                ))

            agent_run.status = "completed"
            agent_run.output_data = {
                "recommendations_count": len(result_state.get("recommendations", [])),
                "health_score": result_state.get("health_score"),
                "memory_loaded": bool(result_state.get("memory_context")),
                "computed_signals": result_state.get("computed_signals") or {},
            }
            agent_run.logs = result_state.get("agent_logs", [])
            agent_run.completed_at = datetime.now(timezone.utc)
            agent_run.execution_time_ms = sum(
                int(log.split("in ")[-1].split("ms")[0])
                for log in agent_run.logs
                if "in " in log and "ms" in log
            )

            try:
                from app.websocket import global_manager
                import asyncio
                churn_pct = round((customer.churn_probability or 0) * 100, 1)
                severity = 'critical' if churn_pct >= 70 else ('warning' if churn_pct >= 40 else 'info')
                emoji = '🔴' if churn_pct >= 70 else ('🟡' if churn_pct >= 40 else '🟢')
                asyncio.create_task(global_manager.broadcast_alert(
                    alert_type='churn_risk',
                    message=f'{emoji} {customer.name} — Churn risk {churn_pct}%.',
                    customer_name=customer.name,
                    severity=severity,
                ))
            except Exception:
                pass

            await self.db.flush()
            return agent_run

        except Exception as e:
            agent_run.status = "failed"
            agent_run.error = str(e)
            agent_run.completed_at = datetime.now(timezone.utc)
            await self.db.flush()
            raise
