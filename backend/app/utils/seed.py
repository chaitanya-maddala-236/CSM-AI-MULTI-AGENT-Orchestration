"""Seed database with realistic demo data"""
import asyncio, uuid, random
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select, func
from app.core.config import settings
from app.models.models import (Base, User, Company, Customer, Meeting, EmailRecord, SupportTicket,
    UsageMetric, Recommendation, Timeline, Notification, KnowledgeDocument, AgentRun, IngestedInteraction)
from app.auth.auth import hash_password

COMPANIES = [
    {"name": "Acme Corp", "industry": "Technology", "size": "enterprise", "country": "USA", "annual_revenue": 50000000},
    {"name": "Beta Dynamics", "industry": "Finance", "size": "smb", "country": "UK", "annual_revenue": 10000000},
    {"name": "Gamma Solutions", "industry": "Healthcare", "size": "startup", "country": "Canada", "annual_revenue": 2000000},
    {"name": "Delta Industries", "industry": "Retail", "size": "enterprise", "country": "Germany", "annual_revenue": 100000000},
    {"name": "Epsilon Tech", "industry": "SaaS", "size": "smb", "country": "Australia", "annual_revenue": 5000000},
    {"name": "Zeta Partners", "industry": "Consulting", "size": "smb", "country": "India", "annual_revenue": 8000000},
    {"name": "Eta Systems", "industry": "Manufacturing", "size": "enterprise", "country": "Japan", "annual_revenue": 200000000},
    {"name": "Theta Analytics", "industry": "Data", "size": "startup", "country": "USA", "annual_revenue": 3000000},
    # Demo scenario companies
    {"name": "Stellar Cloud", "industry": "Technology", "size": "enterprise", "country": "USA", "annual_revenue": 80000000},
    {"name": "RiskBridge Inc", "industry": "Finance", "size": "smb", "country": "USA", "annual_revenue": 6000000},
    {"name": "GrowthStack", "industry": "SaaS", "size": "startup", "country": "USA", "annual_revenue": 12000000},
    {"name": "NovaPeak Corp", "industry": "Legal Tech", "size": "smb", "country": "USA", "annual_revenue": 4500000},
]

# ─── Canonical demo customers for smooth hackathon demo ─────────────────────
DEMO_CUSTOMERS = [
    {
        "name": "Sarah Mitchell",
        "title": "VP of Engineering",
        "company_index": 8,   # Stellar Cloud
        "plan": "enterprise",
        "mrr": 14500,
        "health": 91,
        "churn": 0.04,
        "status": "healthy",
        "sentiment": "positive",
        "adoption_score": 0.90,
        "profile": "healthy",
        "story": "3 QBRs completed, NPS 9, expanding into EU market. Prime upsell candidate.",
    },
    {
        "name": "Marcus Chen",
        "title": "CTO",
        "company_index": 9,   # RiskBridge Inc
        "plan": "professional",
        "mrr": 4200,
        "health": 32,
        "churn": 0.88,
        "status": "critical",
        "sentiment": "negative",
        "adoption_score": 0.31,
        "profile": "at_risk",
        "story": "Usage dropped 55% in 30 days. Escalation ticket open. Missed last two check-ins.",
    },
    {
        "name": "James O'Brien",
        "title": "VP Operations",
        "company_index": 11,  # NovaPeak Corp
        "plan": "enterprise",
        "mrr": 7800,
        "health": 12,
        "churn": 0.97,
        "status": "critical",
        "sentiment": "negative",
        "adoption_score": 0.14,
        "profile": "churning",
        "story": "Usage collapsed 82% in 3 weeks. 4 open escalation tickets. Renewal in 7 days. Exec sponsor left company.",
    },
    {
        "name": "Priya Kapoor",
        "title": "Head of Product",
        "company_index": 10,  # GrowthStack
        "plan": "enterprise",
        "mrr": 9800,
        "health": 88,
        "churn": 0.06,
        "status": "healthy",
        "sentiment": "positive",
        "adoption_score": 0.95,
        "profile": "expansion",
        "story": "Power user, 95% feature adoption, team growing 3x. Strong expansion signal.",
    },
]

CUSTOMERS = [
    {"name": "Alice Johnson", "title": "VP Engineering", "plan": "enterprise", "mrr": 8500, "health": 85, "churn": 0.05, "status": "healthy", "sentiment": "positive"},
    {"name": "Bob Smith", "title": "CTO", "plan": "professional", "mrr": 3200, "health": 35, "churn": 0.78, "status": "critical", "sentiment": "negative"},
    {"name": "Carol White", "title": "Director of Ops", "plan": "professional", "mrr": 4100, "health": 55, "churn": 0.42, "status": "at_risk", "sentiment": "neutral"},
    {"name": "David Brown", "title": "CEO", "plan": "enterprise", "mrr": 12000, "health": 92, "churn": 0.03, "status": "healthy", "sentiment": "positive"},
    {"name": "Eve Davis", "title": "Head of IT", "plan": "starter", "mrr": 800, "health": 48, "churn": 0.65, "status": "at_risk", "sentiment": "negative"},
    {"name": "Frank Miller", "title": "Engineering Lead", "plan": "professional", "mrr": 2900, "health": 78, "churn": 0.12, "status": "healthy", "sentiment": "positive"},
    {"name": "Grace Wilson", "title": "Product Manager", "plan": "enterprise", "mrr": 9200, "health": 28, "churn": 0.88, "status": "critical", "sentiment": "negative"},
    {"name": "Henry Moore", "title": "COO", "plan": "professional", "mrr": 3600, "health": 67, "churn": 0.25, "status": "healthy", "sentiment": "neutral"},
    {"name": "Isabella Taylor", "title": "CTO", "plan": "enterprise", "mrr": 11000, "health": 90, "churn": 0.04, "status": "healthy", "sentiment": "positive"},
    {"name": "James Anderson", "title": "VP Sales", "plan": "starter", "mrr": 500, "health": 44, "churn": 0.70, "status": "at_risk", "sentiment": "negative"},
    {"name": "Karen Thomas", "title": "Director", "plan": "professional", "mrr": 4500, "health": 82, "churn": 0.08, "status": "healthy", "sentiment": "positive"},
    {"name": "Liam Jackson", "title": "Tech Lead", "plan": "professional", "mrr": 3100, "health": 60, "churn": 0.35, "status": "at_risk", "sentiment": "neutral"},
]

async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as db:
        # Admin user
        admin = User(id=str(uuid.uuid4()), email="admin@cscopilot.com", full_name="Admin User",
            hashed_password=hash_password("admin123"), role="admin", is_active=True, is_verified=True)
        csm = User(id=str(uuid.uuid4()), email="csm@cscopilot.com", full_name="Sarah Chen",
            hashed_password=hash_password("csm12345"), role="csm", is_active=True, is_verified=True)
        db.add_all([admin, csm])
        await db.flush()
        print("✓ Users seeded")

        # Companies
        companies = []
        for c in COMPANIES:
            co = Company(id=str(uuid.uuid4()), **c)
            db.add(co); companies.append(co)
        await db.flush()
        print("✓ Companies seeded")

        # Knowledge docs
        docs = [
            ("Churn Risk Playbook", "churn_risk", "When health score drops below 40: 1) Immediate executive escalation 2) Schedule crisis call within 24hrs 3) Create customized recovery plan 4) Consider service credits"),
            ("Expansion Opportunity Guide", "expansion", "For customers with health > 75 and high feature adoption: 1) Identify power users 2) Calculate ROI 3) Present upgrade path 4) Offer pilot program"),
            ("Renewal Best Practices", "renewal", "90-day renewal process: Week 1: ROI review. Week 4: Executive sponsor meeting. Week 8: Contract discussion. Week 12: Close renewal."),
            ("Onboarding Success Framework", "onboarding", "Ensure: 1) Day 1 setup complete 2) Week 1 training scheduled 3) Month 1 health check 4) Quarter 1 business review"),
            ("Support Escalation Process", "support", "P1 tickets: Respond in 1hr. P2: 4hrs. P3: 24hrs. Escalation path: Support -> Senior Support -> Engineering -> VP Engineering"),
        ]
        for title, cat, content in docs:
            doc = KnowledgeDocument(id=str(uuid.uuid4()), title=title, category=cat, content=content, tags=[cat], created_by=admin.id)
            db.add(doc)
        await db.flush()
        print("✓ Knowledge docs seeded")

        # Customers
        now = datetime.now(timezone.utc)
        for i, cdata in enumerate(CUSTOMERS):
            comp = companies[i % len(companies)]
            renewal = now + timedelta(days=random.randint(10, 180))
            c = Customer(id=str(uuid.uuid4()), company_id=comp.id, csm_id=csm.id,
                name=cdata["name"], email=f"{cdata['name'].lower().replace(' ','.')}@{comp.name.lower().replace(' ','')}.com",
                title=cdata["title"], plan=cdata["plan"], mrr=cdata["mrr"], arr=cdata["mrr"]*12,
                health_score=cdata["health"], churn_probability=cdata["churn"],
                health_status=cdata["status"], sentiment=cdata["sentiment"], sentiment_score=1-cdata["churn"],
                renewal_date=renewal, contract_start=now - timedelta(days=365), seats=random.randint(5, 100),
                tags=[cdata["plan"], cdata["status"]], is_active=True, last_activity=now - timedelta(days=random.randint(1,14)))
            db.add(c)
            await db.flush()

            # Usage metrics (30 days)
            for j in range(30):
                d = now - timedelta(days=j)
                trend_factor = 0.6 if cdata["status"] == "critical" else (0.8 if cdata["status"] == "at_risk" else 1.0)
                um = UsageMetric(id=str(uuid.uuid4()), customer_id=c.id, date=d,
                    dau=max(1, int(cdata["mrr"]/500 * trend_factor * random.uniform(0.7,1.3))),
                    mau=max(1, int(cdata["mrr"]/200 * trend_factor)),
                    sessions=random.randint(5, 100), avg_session_minutes=random.uniform(5, 45),
                    features_used=["dashboard", "reports", "api"] if cdata["status"]=="healthy" else ["dashboard"],
                    api_calls=random.randint(100, 5000), errors=random.randint(0, 20 if cdata["status"]=="critical" else 3),
                    adoption_score=cdata["health"]/100 * random.uniform(0.8, 1.0))
                db.add(um)

            # Meetings
            sentiments = {"positive": "positive", "neutral": "neutral", "negative": "negative"}
            meeting_data = [
                (f"QBR - {comp.name}", "positive" if cdata["health"] > 60 else "negative",
                 f"Discussed product roadmap and customer success metrics. Customer expressed {'satisfaction' if cdata['health'] > 60 else 'concerns about product performance and ROI'}."),
                (f"Onboarding Check-in", "neutral", "Reviewed onboarding progress. Identified training needs for new team members."),
            ]
            for title, sent, summary in meeting_data:
                m = Meeting(id=str(uuid.uuid4()), customer_id=c.id, title=title,
                    transcript=f"[Auto-generated transcript for {title}]", summary=summary,
                    sentiment=sent, sentiment_score=0.8 if sent=="positive" else (0.5 if sent=="neutral" else 0.2),
                    key_topics=["product", "roadmap", "support"], risks_identified=["renewal risk"] if cdata["churn"]>0.5 else [],
                    action_items=["Follow up on training", "Share roadmap doc"], meeting_date=now-timedelta(days=random.randint(5,30)), duration_minutes=45)
                db.add(m)

            # Sample ingested-interaction record so the Data Ingestion table
            # isn't empty on first launch — shows the intake -> AI-detection
            # pipeline already populated for a couple of customers per run.
            if i % 3 == 0:
                ingest_sent = "negative" if cdata["churn"] > 0.5 else ("positive" if cdata["health"] > 75 else "neutral")
                ii = IngestedInteraction(
                    id=str(uuid.uuid4()), customer_id=c.id, source_type="transcript",
                    title=f"QBR Call Transcript — {comp.name}",
                    raw_content=(
                        f"[Sample] Call with {cdata['name']} ({cdata['title']}) at {comp.name}. "
                        f"{'Customer raised concerns about ROI and mentioned evaluating alternatives.' if cdata['churn'] > 0.5 else 'Customer is happy with the product and asked about additional seats.'}"
                    ),
                    status="processed",
                    detected_sentiment=ingest_sent,
                    detected_sentiment_score=0.2 if ingest_sent == "negative" else (0.8 if ingest_sent == "positive" else 0.5),
                    detected_topics=["roadmap", "pricing"] if cdata["churn"] <= 0.5 else ["renewal", "competitor"],
                    detected_risks=["Mentioned evaluating alternatives"] if cdata["churn"] > 0.5 else [],
                    detected_opportunities=["Asked about additional seats"] if cdata["churn"] <= 0.5 else [],
                    ai_summary=f"{'Risk signals identified during QBR.' if cdata['churn'] > 0.5 else 'Positive engagement during QBR.'}",
                    uploaded_by=csm.id,
                    processed_at=now - timedelta(days=random.randint(1, 10)),
                )
                db.add(ii)

            # Tickets
            if cdata["churn"] > 0.4:
                for k in range(random.randint(2, 5)):
                    t = SupportTicket(id=str(uuid.uuid4()), customer_id=c.id,
                        title=random.choice(["API integration failing", "Performance issues in dashboard", "Data sync not working", "Login problems"]),
                        description="Customer reported this issue and needs immediate resolution.",
                        status="open" if k < 2 else "resolved", priority="high" if k == 0 else "medium",
                        category="technical", opened_at=now-timedelta(days=random.randint(1,30)))
                    db.add(t)

            # Recommendations
            if cdata["churn"] > 0.5:
                rec = Recommendation(id=str(uuid.uuid4()), customer_id=c.id,
                    title="Urgent: Schedule Executive Escalation Call",
                    description=f"{cdata['name']} shows critical churn risk with health score {cdata['health']}/100. Immediate executive involvement required.",
                    category="churn_risk", priority="critical", status="pending",
                    actions=["Schedule call with VP CS within 24hrs", "Prepare recovery plan", "Review contract terms"],
                    evidence=[f"Health score: {cdata['health']}", f"Churn probability: {cdata['churn']*100:.0f}%", "Multiple open tickets"],
                    reasoning="Customer health has declined significantly. Proactive intervention needed to prevent churn.",
                    confidence_score=0.89, risk_score=cdata["churn"])
                db.add(rec)
            elif cdata["health"] > 80:
                rec = Recommendation(id=str(uuid.uuid4()), customer_id=c.id,
                    title="Upsell Opportunity: Upgrade to Enterprise Plan",
                    description=f"{cdata['name']} shows strong engagement and may benefit from enterprise features.",
                    category="expansion", priority="medium", status="pending",
                    actions=["Schedule expansion discussion", "Prepare ROI analysis", "Demo enterprise features"],
                    evidence=[f"Health score: {cdata['health']}", "High feature adoption", "Growing team size"],
                    reasoning="Strong health score and engagement indicate readiness for expansion.",
                    confidence_score=0.75, risk_score=0.1)
                db.add(rec)

            # Timeline
            for event_type, title in [("customer_created", "Customer account created"), ("health_check", f"Health score updated to {cdata['health']}"), ("recommendation_created", "AI recommendation generated")]:
                tl = Timeline(id=str(uuid.uuid4()), customer_id=c.id, event_type=event_type,
                    title=title, description=f"Automated: {title}", event_metadata={"health_score": cdata["health"]},
                    occurred_at=now-timedelta(days=random.randint(0,30)))
                db.add(tl)

            # Notification for CSM
            if cdata["churn"] > 0.6:
                notif = Notification(id=str(uuid.uuid4()), user_id=csm.id,
                    title=f"⚠️ High Churn Risk: {cdata['name']}",
                    message=f"Customer {cdata['name']} has a {cdata['churn']*100:.0f}% churn probability. Immediate action required.",
                    type="alert", related_customer_id=c.id)
                db.add(notif)

        await db.commit()
        print("✓ Customers, metrics, recommendations seeded")

        # ─── Seed canonical demo customers ───────────────────────────────────
        print("Seeding canonical demo customers...")
        demo_ids = []
        for ddata in DEMO_CUSTOMERS:
            comp = companies[ddata["company_index"] % len(companies)]
            renewal = now + timedelta(days=7 if ddata["profile"] == "churning" else 45 if ddata["profile"] == "at_risk" else 120)
            dc = Customer(
                id=str(uuid.uuid4()), company_id=comp.id, csm_id=csm.id,
                name=ddata["name"], email=f"{ddata['name'].lower().replace(' ', '.')}@{comp.name.lower().replace(' ', '')}.com",
                title=ddata["title"], plan=ddata["plan"], mrr=ddata["mrr"], arr=ddata["mrr"] * 12,
                health_score=ddata["health"], churn_probability=ddata["churn"],
                health_status=ddata["status"], sentiment=ddata["sentiment"],
                sentiment_score=1 - ddata["churn"],
                renewal_date=renewal, contract_start=now - timedelta(days=365),
                seats=random.randint(20, 200), tags=[ddata["plan"], ddata["status"], ddata["profile"]],
                is_active=True, last_activity=now - timedelta(days=1 if ddata["profile"] != "at_risk" else 12),
            )
            db.add(dc)
            await db.flush()
            demo_ids.append(dc.id)

            # Rich usage metrics that tell the story
            for j in range(60):  # 60 days of history
                d = now - timedelta(days=j)
                if ddata["profile"] == "churning":
                    # Simulate catastrophic 82% collapse at day 21
                    trend = 0.18 if j < 40 else (0.5 if j < 50 else 0.8)
                elif ddata["profile"] == "at_risk":
                    # Simulate a 55% usage drop at day 30
                    trend = 0.45 if j < 30 else 1.0
                elif ddata["profile"] == "expansion":
                    trend = min(1.0, 0.7 + (j / 60) * 0.3)  # growing
                else:
                    trend = random.uniform(0.85, 1.0)  # stable healthy

                um = UsageMetric(
                    id=str(uuid.uuid4()), customer_id=dc.id, date=d,
                    dau=max(1, int(ddata["mrr"] / 400 * trend * random.uniform(0.9, 1.1))),
                    mau=max(1, int(ddata["mrr"] / 180 * trend)),
                    sessions=random.randint(20, 200) if trend > 0.6 else random.randint(2, 15),
                    avg_session_minutes=random.uniform(15, 60) if trend > 0.6 else random.uniform(2, 10),
                    features_used=["dashboard", "reports", "api", "analytics", "integrations"] if trend > 0.7 else ["dashboard"],
                    api_calls=random.randint(500, 8000) if trend > 0.6 else random.randint(10, 100),
                    errors=random.randint(0, 3) if trend > 0.7 else random.randint(5, 25),
                    adoption_score=ddata["adoption_score"] * trend,
                )
                db.add(um)

            # Meetings with rich context
            meeting_scenarios = {
                "healthy": [
                    ("Q2 Business Review", "positive", "Exceptional QBR. Customer shared NPS of 9. Expanding use cases to EU team. Discussed roadmap alignment. Action: schedule expansion demo."),
                    ("Monthly Check-in", "positive", "Strong engagement. Team is fully adopted. Power users requesting API enhancements. Upsell conversation opened."),
                    ("Executive Sponsor Meeting", "positive", "VP Engineering endorsed renewal. Budget approved for 3-year deal. Referral potential discussed."),
                ],
                "at_risk": [
                    ("Emergency Call", "negative", "Customer escalated. Usage dropped 55% due to API reliability concerns. Two integration failures. Budget review triggered. Risk: contract cancellation."),
                    ("Technical Review", "negative", "Engineering team frustrated with uptime SLA breaches. Competing vendor evaluation started. Immediate action required."),
                    ("Follow-up", "neutral", "Customer agreed to 30-day improvement plan. Skeptical but willing to wait. Executive sponsor meeting requested."),
                ],
                "churning": [
                    ("Renewal Crisis Call", "negative", "James O'Brien furious. Usage collapsed after exec sponsor departure. Team disengaged. 4 open P1 tickets unresolved. Stated they are evaluating LegalMind Pro as replacement. 7 days to renewal. Needs executive intervention immediately."),
                    ("Emergency Escalation", "negative", "VP CS joined the call. James not responding to normal remediation plan. Demanded SLA credits and a roadmap commitment. Outcome: 1-week extension granted. Status: in progress."),
                    ("Technical Crisis Meeting", "negative", "CTO joined. Integration failures impacting core workflows. Deployment of critical feature promised by EOW. Trust severely damaged."),
                ],
                "expansion": [
                    ("Expansion Planning", "positive", "Team of 3 growing to 12. Customer wants to onboard EU team. Discussed enterprise tier. ROI study completed — 340% return."),
                    ("Product Deep Dive", "positive", "Power users co-creating feature requests. Advocacy potential. Customer agreed to case study. Referral program introduced."),
                    ("QBR - Upsell", "positive", "NPS 10. Signed letter of intent for enterprise upgrade. 3-year deal in negotiation."),
                ],
            }
            for title, sent, summary in meeting_scenarios.get(ddata["profile"], []):
                m = Meeting(
                    id=str(uuid.uuid4()), customer_id=dc.id, title=title,
                    transcript=f"[Full transcript for {title}]", summary=summary,
                    sentiment=sent, sentiment_score=0.9 if sent == "positive" else (0.5 if sent == "neutral" else 0.15),
                    key_topics=["product", "roadmap", "renewal"],
                    risks_identified=["churn_risk", "competitor"] if ddata["profile"] == "at_risk" else [],
                    action_items=["Executive escalation", "SLA review"] if ddata["profile"] == "at_risk" else ["Schedule expansion demo", "Prepare ROI doc"],
                    meeting_date=now - timedelta(days=random.randint(1, 14)), duration_minutes=60,
                )
                db.add(m)

            # Support tickets (rich for at-risk)
            if ddata["profile"] == "at_risk":
                for k, (ticket_title, priority) in enumerate([
                    ("API Integration Failing - CRITICAL", "critical"),
                    ("Performance degradation across dashboards", "high"),
                    ("Data sync errors since last release", "high"),
                    ("Missing SLA — 3rd incident this month", "high"),
                ]):
                    t = SupportTicket(
                        id=str(uuid.uuid4()), customer_id=dc.id,
                        title=ticket_title, description=f"Customer reported: {ticket_title}. Requires immediate attention.",
                        status="open", priority=priority, category="technical",
                        opened_at=now - timedelta(days=k * 3 + 1),
                    )
                    db.add(t)
            elif ddata["profile"] == "churning":
                for k, (ticket_title, priority) in enumerate([
                    ("CRITICAL: Core workflow integration down - 72hrs", "critical"),
                    ("Data export corruption - loss of 3 weeks compliance data", "critical"),
                    ("SLA breach #4 this quarter - formal notice sent", "high"),
                    ("Renewal evaluation: requesting full audit report", "high"),
                ]):
                    t = SupportTicket(
                        id=str(uuid.uuid4()), customer_id=dc.id,
                        title=ticket_title, description=f"Critical escalation: {ticket_title}. Executive sponsor involved.",
                        status="open", priority=priority, category="technical",
                        opened_at=now - timedelta(days=k * 2 + 1),
                    )
                    db.add(t)
            elif ddata["profile"] == "healthy":
                t = SupportTicket(
                    id=str(uuid.uuid4()), customer_id=dc.id,
                    title="Feature request: Advanced API filtering", description="Customer requesting enhancement, not a blocker.",
                    status="resolved", priority="low", category="feature_request",
                    opened_at=now - timedelta(days=20),
                )
                db.add(t)

            # Recommendations per demo profile
            rec_scenarios = {
                "healthy": ("Propose Enterprise Expansion — 3-Year Deal", "expansion", "high", 0.91,
                    ["Schedule expansion discovery call", "Prepare 3-year ROI analysis", "Demo enterprise features"],
                    ["Health score: 91/100", "NPS: 9", "Usage growth: +28% QoQ", "Team growing 3x"]),
                "churning": ("🔴 URGENT: Executive Intervention — Renewal in 7 Days", "churn_risk", "critical", 0.97,
                    ["CEO or CRO to call James O'Brien today", "Offer 30-day SLA guarantee with penalties", "Deploy dedicated support engineer", "Prepare retention package with service credit", "Get roadmap commitment in writing"],
                    ["Health score: 12/100 — lowest in portfolio", "Churn probability: 97%", "Renewal in 7 days", "4 open P1 tickets", "Exec sponsor departed", "Usage collapsed 82% in 3 weeks", "Competitor evaluation active"]),
                "at_risk": ("🚨 Critical: Schedule Emergency Executive Call", "churn_risk", "critical", 0.95,
                    ["Escalate to VP CS within 2 hours", "Prepare SLA remediation plan", "Offer service credit", "Block competitor eval"],
                    ["Health score: 32/100", "Churn probability: 88%", "4 open P1 tickets", "Usage -55% in 30 days", "Competitor evaluation started"]),
                "expansion": ("Upsell to Enterprise — Power User Cohort Ready", "expansion", "high", 0.87,
                    ["Present enterprise ROI case study", "Offer pilot seats for EU team", "Introduce customer advocacy program"],
                    ["Health score: 88/100", "95% feature adoption", "Team headcount 3x this quarter", "NPS: 10"]),
            }
            rec_data = rec_scenarios.get(ddata["profile"])
            if rec_data:
                rtitle, rcat, rpriority, rconf, ractions, revidence = rec_data
                rec = Recommendation(
                    id=str(uuid.uuid4()), customer_id=dc.id,
                    title=rtitle,
                    description=ddata["story"],
                    category=rcat, priority=rpriority, status="pending",
                    actions=ractions, evidence=revidence,
                    reasoning=f"Based on analysis of usage trends, meeting sentiment, and support history for {ddata['name']}.",
                    confidence_score=rconf, risk_score=ddata["churn"],
                )
                db.add(rec)

            # Timeline events
            timeline_events = {
                "healthy": [
                    ("meeting", "QBR Completed", "Q2 Business Review — NPS 9, expansion discussed"),
                    ("health_check", "Health Score: 91", "Excellent — above portfolio average"),
                    ("recommendation_created", "Expansion Opportunity Identified", "AI detected strong upsell signal"),
                ],
                "at_risk": [
                    ("usage.dropped", "⚠️ Usage Drop Detected", "DAU fell 55% over 30 days — automated alert triggered"),
                    ("ticket", "Critical Ticket Escalated", "API integration failure — P1"),
                    ("health_check", "Health Score: 32 (Critical)", "Score dropped from 68 → 32 in 2 weeks"),
                    ("recommendation_created", "Emergency Action Generated", "AI triggered executive escalation workflow"),
                ],
                "expansion": [
                    ("meeting", "Expansion Planning Call", "3-year deal discussed, LOI signed"),
                    ("health_check", "Health Score: 88", "Consistent high performer"),
                    ("recommendation_created", "Upsell Opportunity Flagged", "95% adoption + team growth = ideal expansion candidate"),
                ],
            }
            for etype, etitle, edesc in timeline_events.get(ddata["profile"], []):
                tl = Timeline(
                    id=str(uuid.uuid4()), customer_id=dc.id,
                    event_type=etype, title=etitle, description=edesc,
                    event_metadata={"profile": ddata["profile"], "health_score": ddata["health"]},
                    occurred_at=now - timedelta(days=random.randint(0, 10)),
                )
                db.add(tl)

            # Notifications for at-risk
            if ddata["profile"] == "at_risk":
                for msg in [
                    f"🚨 CRITICAL: {ddata['name']} churn probability at 88% — immediate action required",
                    f"⚠️ Usage alert: {ddata['name']} DAU dropped 55% in 30 days",
                ]:
                    notif = Notification(
                        id=str(uuid.uuid4()), user_id=csm.id,
                        title=msg[:60], message=msg,
                        type="alert", related_customer_id=dc.id,
                    )
                    db.add(notif)

        await db.commit()
        print("✓ Canonical demo customers seeded (Healthy · At-Risk · Expansion)")
        customer_ids = [str(uuid.uuid4())]  # placeholder; real runs reference customer IDs above
        for i in range(8):
            days_ago = random.randint(0, 7)
            tokens_in = random.randint(800, 3200)
            tokens_out = random.randint(200, 900)
            run = AgentRun(
                id=str(uuid.uuid4()),
                workflow_id=str(uuid.uuid4()),
                agent_name="workflow",
                status=random.choice(["completed", "completed", "completed", "failed"]),
                input_data={"trigger": "scheduled"},
                output_data={"recommendations_count": random.randint(1, 3)},
                execution_time_ms=random.randint(4000, 18000),
                token_usage={
                    "input_tokens": tokens_in,
                    "output_tokens": tokens_out,
                    "total_tokens": tokens_in + tokens_out,
                },
                llm_provider="openai",
                logs=["[Planner] Routing complete", "[Recommendation] 2 recs generated"],
                started_at=now - timedelta(days=days_ago, hours=random.randint(0, 23)),
                completed_at=now - timedelta(days=days_ago, hours=random.randint(0, 22)),
            )
            db.add(run)

        await db.commit()
        print("✓ Demo AgentRuns seeded")
        ingestion_count = (await db.execute(select(func.count()).select_from(IngestedInteraction))).scalar()
        print(f"✓ Sample ingested interactions seeded: {ingestion_count}")
        print("\n✅ Seed complete!")
        print("📧 Admin: admin@cscopilot.com / admin123")
        print("📧 CSM:   csm@cscopilot.com  / csm12345")

if __name__ == "__main__":
    asyncio.run(seed())
