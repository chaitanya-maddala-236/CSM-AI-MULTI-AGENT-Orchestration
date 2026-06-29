"""SQLAlchemy ORM Models"""
import uuid, enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, JSON, Enum as SAEnum, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.sql import func

def gen_uuid(): return str(uuid.uuid4())

class Base(DeclarativeBase): pass

class UserRole(str, enum.Enum):
    ADMIN="admin"; CSM="csm"; MANAGER="manager"; SUPPORT="support"; EXECUTIVE="executive"

class CustomerHealth(str, enum.Enum):
    HEALTHY="healthy"; AT_RISK="at_risk"; CRITICAL="critical"

class RecommendationStatus(str, enum.Enum):
    PENDING="pending"; APPROVED="approved"; REJECTED="rejected"; EXECUTED="executed"

class RecommendationPriority(str, enum.Enum):
    LOW="low"; MEDIUM="medium"; HIGH="high"; CRITICAL="critical"

class SentimentLabel(str, enum.Enum):
    POSITIVE="positive"; NEUTRAL="neutral"; NEGATIVE="negative"

class AgentStatus(str, enum.Enum):
    IDLE="idle"; RUNNING="running"; COMPLETED="completed"; FAILED="failed"

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.CSM, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    preferences = Column(JSON, default=dict, nullable=True)
    notifications = relationship("Notification", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")

class Company(Base):
    __tablename__ = "companies"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    industry = Column(String(100))
    website = Column(String(255))
    size = Column(String(50))
    country = Column(String(100))
    annual_revenue = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    customers = relationship("Customer", back_populates="company")

class Customer(Base):
    __tablename__ = "customers"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id = Column(UUID(as_uuid=False), ForeignKey("companies.id"), nullable=False)
    csm_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    title = Column(String(100))
    phone = Column(String(50))
    health_score = Column(Float, default=70.0)
    churn_probability = Column(Float, default=0.1)
    health_status = Column(SAEnum(CustomerHealth), default=CustomerHealth.HEALTHY)
    sentiment = Column(SAEnum(SentimentLabel), default=SentimentLabel.NEUTRAL)
    sentiment_score = Column(Float, default=0.5)
    plan = Column(String(100))
    mrr = Column(Float, default=0.0)
    arr = Column(Float, default=0.0)
    renewal_date = Column(DateTime(timezone=True), nullable=True)
    contract_start = Column(DateTime(timezone=True), nullable=True)
    seats = Column(Integer, default=1)
    tags = Column(JSON, default=list)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_activity = Column(DateTime(timezone=True), nullable=True)
    company = relationship("Company", back_populates="customers")
    csm = relationship("User", foreign_keys=[csm_id])
    usage_metrics = relationship("UsageMetric", back_populates="customer")
    meetings = relationship("Meeting", back_populates="customer")
    emails = relationship("EmailRecord", back_populates="customer")
    support_tickets = relationship("SupportTicket", back_populates="customer")
    recommendations = relationship("Recommendation", back_populates="customer")
    timelines = relationship("Timeline", back_populates="customer")
    agent_runs = relationship("AgentRun", back_populates="customer")
    __table_args__ = (Index("ix_customer_health", "health_status"), Index("ix_customer_churn", "churn_probability"),)

class Meeting(Base):
    __tablename__ = "meetings"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("customers.id"), nullable=False)
    title = Column(String(255))
    transcript = Column(Text)
    summary = Column(Text)
    sentiment = Column(SAEnum(SentimentLabel), default=SentimentLabel.NEUTRAL)
    sentiment_score = Column(Float, default=0.5)
    key_topics = Column(JSON, default=list)
    risks_identified = Column(JSON, default=list)
    action_items = Column(JSON, default=list)
    meeting_date = Column(DateTime(timezone=True))
    duration_minutes = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    customer = relationship("Customer", back_populates="meetings")

class EmailRecord(Base):
    __tablename__ = "emails"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("customers.id"), nullable=False)
    subject = Column(String(500))
    body = Column(Text)
    direction = Column(String(10))
    sentiment = Column(SAEnum(SentimentLabel), default=SentimentLabel.NEUTRAL)
    sentiment_score = Column(Float, default=0.5)
    sent_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    customer = relationship("Customer", back_populates="emails")

class SupportTicket(Base):
    __tablename__ = "support_tickets"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("customers.id"), nullable=False)
    title = Column(String(500))
    description = Column(Text)
    status = Column(String(50), default="open")
    priority = Column(String(20), default="medium")
    category = Column(String(100))
    resolution = Column(Text)
    opened_at = Column(DateTime(timezone=True))
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    customer = relationship("Customer", back_populates="support_tickets")

class UsageMetric(Base):
    __tablename__ = "usage_metrics"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("customers.id"), nullable=False)
    date = Column(DateTime(timezone=True))
    dau = Column(Integer, default=0)
    mau = Column(Integer, default=0)
    sessions = Column(Integer, default=0)
    avg_session_minutes = Column(Float, default=0.0)
    features_used = Column(JSON, default=list)
    api_calls = Column(Integer, default=0)
    errors = Column(Integer, default=0)
    adoption_score = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    customer = relationship("Customer", back_populates="usage_metrics")

class Recommendation(Base):
    __tablename__ = "recommendations"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("customers.id"), nullable=False)
    agent_run_id = Column(UUID(as_uuid=False), ForeignKey("agent_runs.id"), nullable=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    priority = Column(SAEnum(RecommendationPriority), default=RecommendationPriority.MEDIUM)
    status = Column(SAEnum(RecommendationStatus), default=RecommendationStatus.PENDING)
    actions = Column(JSON, default=list)
    evidence = Column(JSON, default=list)
    reasoning = Column(Text)
    confidence_score = Column(Float, default=0.0)
    risk_score = Column(Float, default=0.0)
    approved_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    feedback_note = Column(Text, nullable=True)
    outcome = Column(String(20), nullable=True)   # success | partial | failed (set on execution)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    customer = relationship("Customer", back_populates="recommendations")
    approver = relationship("User", foreign_keys=[approved_by])
    agent_run = relationship("AgentRun", back_populates="recommendations", foreign_keys=[agent_run_id])

class AgentRun(Base):
    __tablename__ = "agent_runs"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("customers.id"), nullable=True)
    workflow_id = Column(String(100))
    agent_name = Column(String(100))
    status = Column(SAEnum(AgentStatus), default=AgentStatus.RUNNING)
    input_data = Column(JSON)
    output_data = Column(JSON)
    error = Column(Text, nullable=True)
    execution_time_ms = Column(Integer, default=0)
    token_usage = Column(JSON, default=dict)
    llm_provider = Column(String(50))
    logs = Column(JSON, default=list)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    customer = relationship("Customer", back_populates="agent_runs")
    recommendations = relationship("Recommendation", back_populates="agent_run", foreign_keys="Recommendation.agent_run_id")

class Timeline(Base):
    __tablename__ = "timelines"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("customers.id"), nullable=False)
    event_type = Column(String(100))
    title = Column(String(500))
    description = Column(Text)
    event_metadata = Column(JSON, default=dict)
    occurred_at = Column(DateTime(timezone=True), server_default=func.now())
    customer = relationship("Customer", back_populates="timelines")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    title = Column(String(255))
    message = Column(Text)
    type = Column(String(50))
    is_read = Column(Boolean, default=False)
    related_customer_id = Column(UUID(as_uuid=False), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", back_populates="notifications")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    action = Column(String(100))
    resource = Column(String(100))
    resource_id = Column(String(100))
    details = Column(JSON)
    ip_address = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", back_populates="audit_logs")

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    title = Column(String(500))
    content = Column(Text)
    category = Column(String(100))
    tags = Column(JSON, default=list)
    embedding_id = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class BusinessRuleSettings(Base):
    """Org-wide configurable business rules that actually drive agent behavior.

    FIX: previously these knobs (Settings.tsx 'Auto-Approve Low Priority' /
    'Min Confidence Threshold') were saved to localStorage only and never read
    by the backend — purely cosmetic. This table is the real, enforced
    config: recommendation_service checks it when persisting new
    recommendations and auto-approves anything meeting the threshold.

    Single-row table (id="default") for now — extensible to per-CSM or
    per-team rows later by keying on owner_id.
    """
    __tablename__ = "business_rule_settings"
    id = Column(String(50), primary_key=True, default="default")
    auto_approve_enabled = Column(Boolean, default=False)
    auto_approve_confidence_threshold = Column(Float, default=75.0)  # 0-100, % scale to match UI
    updated_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())


# ─── Missing Tables (v4 additions) ───────────────────────────────────────────

class CustomerHealthScore(Base):
    """Historical health score snapshots for trend analysis."""
    __tablename__ = "customer_health_scores"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("customers.id"), nullable=False)
    health_score = Column(Float, nullable=False)
    churn_probability = Column(Float, default=0.0)
    sentiment_score = Column(Float, default=0.5)
    adoption_score = Column(Float, nullable=True)
    snapshot_reason = Column(String(100), default="scheduled")  # scheduled, post_analysis, manual
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
    customer = relationship("Customer", foreign_keys=[customer_id])
    __table_args__ = (Index("ix_health_scores_customer", "customer_id", "recorded_at"),)


class CustomerEvent(Base):
    """Fine-grained business events for the event bus."""
    __tablename__ = "customer_events"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("customers.id"), nullable=False)
    event_type = Column(String(100), nullable=False)  # meeting.uploaded, usage.dropped, ticket.opened
    payload = Column(JSON, default=dict)
    source = Column(String(50), default="api")       # api, webhook, scheduler, agent
    processed = Column(Boolean, default=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    customer = relationship("Customer", foreign_keys=[customer_id])
    __table_args__ = (Index("ix_customer_events_type", "event_type", "processed"),)


class RecommendationFeedback(Base):
    """Detailed outcome feedback after a recommendation is executed."""
    __tablename__ = "recommendation_feedback"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    recommendation_id = Column(UUID(as_uuid=False), ForeignKey("recommendations.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("customers.id"), nullable=False)
    submitted_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    outcome = Column(String(20), nullable=False)       # success, partial, failed
    outcome_notes = Column(Text, nullable=True)
    impact_score = Column(Float, nullable=True)        # 0.0–1.0 subjective impact
    churn_prevented = Column(Boolean, nullable=True)
    revenue_impacted = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    recommendation = relationship("Recommendation", foreign_keys=[recommendation_id])
    __table_args__ = (Index("ix_rec_feedback_customer", "customer_id"),)


class AgentExecution(Base):
    """Per-agent execution record within a workflow run."""
    __tablename__ = "agent_executions"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    agent_run_id = Column(UUID(as_uuid=False), ForeignKey("agent_runs.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("customers.id"), nullable=False)
    agent_name = Column(String(100), nullable=False)
    status = Column(SAEnum(AgentStatus), default=AgentStatus.IDLE)
    input_data = Column(JSON, default=dict)
    output_data = Column(JSON, default=dict)
    tokens_used = Column(Integer, default=0)
    execution_time_ms = Column(Integer, default=0)
    error = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    agent_run = relationship("AgentRun", foreign_keys=[agent_run_id])
    __table_args__ = (Index("ix_agent_executions_run", "agent_run_id"),)


class MeetingTranscript(Base):
    """Full transcript storage for meeting analysis."""
    __tablename__ = "meeting_transcripts"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    meeting_id = Column(UUID(as_uuid=False), ForeignKey("meetings.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("customers.id"), nullable=False)
    raw_transcript = Column(Text, nullable=False)
    processed_transcript = Column(Text, nullable=True)   # cleaned/diarized version
    word_count = Column(Integer, default=0)
    language = Column(String(10), default="en")
    upload_source = Column(String(50), default="manual") # manual, zoom, teams, gong
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    meeting = relationship("Meeting", foreign_keys=[meeting_id])


class CustomerMemory(Base):
    """Long-term episodic memory entries per customer for the memory agent."""
    __tablename__ = "customer_memories"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("customers.id"), nullable=False)
    memory_type = Column(String(50), nullable=False)   # interaction, outcome, preference, risk
    content = Column(Text, nullable=False)
    embedding_id = Column(String(255), nullable=True)  # ChromaDB doc ID
    importance_score = Column(Float, default=0.5)      # 0.0–1.0
    tags = Column(JSON, default=list)
    source_type = Column(String(50), nullable=True)    # meeting, recommendation, ticket
    source_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    customer = relationship("Customer", foreign_keys=[customer_id])
    __table_args__ = (Index("ix_customer_memories_customer", "customer_id", "memory_type"),)


class IngestedInteraction(Base):
    """Generic intake table for raw customer-interaction data.

    This is the landing zone for ANYTHING a CSM pastes/uploads — meeting
    notes, call transcripts, email threads, CRM activity exports, Slack
    snippets, manual notes — before it's structured. Unlike Meeting /
    EmailRecord (which are already-typed, customer-scoped records), rows
    here can be customer-linked or left unlinked (e.g. a CRM export
    triaged later), and always carry the raw text plus whatever the AI
    detected on processing (sentiment, topics, risks, opportunities).

    Lifecycle: new -> processing -> processed (-> linked to a Meeting/
    Timeline row + optionally kicks off a full recommendation workflow
    run if a customer_id is present); processed rows are immutable
    audit records of what was ingested and what the AI inferred from it.
    """
    __tablename__ = "ingested_interactions"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("customers.id"), nullable=True)
    source_type = Column(String(50), nullable=False)   # meeting_notes, transcript, email, crm_update, note, other
    title = Column(String(500), nullable=False)
    raw_content = Column(Text, nullable=False)
    status = Column(String(20), default="new")          # new, processing, processed, failed
    detected_sentiment = Column(SAEnum(SentimentLabel), nullable=True)
    detected_sentiment_score = Column(Float, nullable=True)
    detected_topics = Column(JSON, default=list)
    detected_risks = Column(JSON, default=list)
    detected_opportunities = Column(JSON, default=list)
    ai_summary = Column(Text, nullable=True)
    linked_meeting_id = Column(UUID(as_uuid=False), ForeignKey("meetings.id"), nullable=True)
    triggered_workflow = Column(Boolean, default=False)
    error = Column(Text, nullable=True)
    uploaded_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    customer = relationship("Customer", foreign_keys=[customer_id])
    uploader = relationship("User", foreign_keys=[uploaded_by])
    __table_args__ = (Index("ix_ingested_status", "status"), Index("ix_ingested_customer", "customer_id"),)


class ApprovalLog(Base):
    """Immutable audit trail for every HITL approval/rejection decision."""
    __tablename__ = "approval_logs"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    recommendation_id = Column(UUID(as_uuid=False), ForeignKey("recommendations.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("customers.id"), nullable=False)
    approver_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    decision = Column(String(20), nullable=False)       # approved, rejected, modified
    original_action = Column(Text, nullable=True)
    modified_action = Column(Text, nullable=True)       # if decision == modified
    reason = Column(Text, nullable=True)
    confidence_at_decision = Column(Float, nullable=True)
    time_to_decide_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    recommendation = relationship("Recommendation", foreign_keys=[recommendation_id])
    __table_args__ = (Index("ix_approval_logs_customer", "customer_id"),)
