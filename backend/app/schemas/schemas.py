"""Pydantic v2 schemas"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Any, Dict
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2)
    password: str = Field(..., min_length=8)
    role: str = "csm"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str; email: str; full_name: str; role: str; is_active: bool
    avatar_url: Optional[str] = None; created_at: Optional[datetime] = None

class TokenResponse(BaseModel):
    access_token: str; refresh_token: str; token_type: str = "bearer"; user: UserOut

class RefreshRequest(BaseModel):
    refresh_token: str

class CompanyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str; name: str; industry: Optional[str]=None; website: Optional[str]=None
    size: Optional[str]=None; country: Optional[str]=None; annual_revenue: Optional[float]=None

class CustomerCreate(BaseModel):
    name: str; email: EmailStr; company_id: str
    title: Optional[str]=None; plan: Optional[str]=None
    mrr: float=0.0; renewal_date: Optional[datetime]=None; seats: int=1

class CustomerUpdate(BaseModel):
    name: Optional[str]=None; title: Optional[str]=None; plan: Optional[str]=None
    mrr: Optional[float]=None; renewal_date: Optional[datetime]=None
    notes: Optional[str]=None; tags: Optional[List[str]]=None

class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str; name: str; email: str; title: Optional[str]=None
    health_score: float; churn_probability: float; health_status: str
    sentiment: str; sentiment_score: float; plan: Optional[str]=None
    mrr: float; arr: float; renewal_date: Optional[datetime]=None; seats: int
    tags: List[Any]=[]; is_active: bool
    created_at: Optional[datetime]=None; last_activity: Optional[datetime]=None
    company: Optional[CompanyOut]=None; csm: Optional[UserOut]=None

class CustomerListOut(BaseModel):
    total: int; items: List[CustomerOut]; page: int; page_size: int

class RecommendationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str; customer_id: str; title: str; description: Optional[str]=None
    category: Optional[str]=None; priority: str; status: str
    actions: List[Any]=[]; evidence: List[Any]=[]; reasoning: Optional[str]=None
    confidence_score: float; risk_score: float
    approved_by: Optional[str]=None; approved_at: Optional[datetime]=None
    feedback_note: Optional[str]=None; created_at: Optional[datetime]=None
    customer: Optional[CustomerOut]=None

class ApprovalRequest(BaseModel):
    status: str; feedback_note: Optional[str]=None

class AgentRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str; customer_id: Optional[str]=None; workflow_id: Optional[str]=None
    agent_name: Optional[str]=None; status: str; execution_time_ms: int
    token_usage: Dict={}; llm_provider: Optional[str]=None; error: Optional[str]=None
    logs: List[Any]=[]; started_at: Optional[datetime]=None; completed_at: Optional[datetime]=None

class TriggerAgentRequest(BaseModel):
    customer_id: str; force: bool=False

class DashboardStats(BaseModel):
    total_customers: int; healthy: int; at_risk: int; critical: int
    renewals_this_month: int; upsell_opportunities: int; pending_approvals: int
    avg_health_score: float; total_arr: float

class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str; title: str; message: str; type: str; is_read: bool
    related_customer_id: Optional[str]=None; created_at: Optional[datetime]=None

class TimelineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str; customer_id: str; event_type: str; title: str
    description: Optional[str]=None; event_metadata: Dict={}; occurred_at: Optional[datetime]=None

class KnowledgeDocCreate(BaseModel):
    title: str; content: str; category: str="documentation"; tags: List[str]=[]

class KnowledgeDocOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str; title: str; category: str; tags: List[Any]=[]; is_active: bool; content: Optional[str]=None; created_at: Optional[datetime]=None

class MessageResponse(BaseModel):
    message: str; success: bool=True

# ─── Data Ingestion (raw interaction intake) ──────────────────────────────────

class IngestRequest(BaseModel):
    customer_id: Optional[str] = None
    source_type: str = Field("note", description="meeting_notes | transcript | email | crm_update | note | other")
    title: str = Field(..., min_length=2)
    raw_content: str = Field(..., min_length=5)
    auto_process: bool = True       # run AI detection immediately
    trigger_workflow: bool = False  # also kick off full recommendation analysis (requires customer_id)


class IngestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    customer_id: Optional[str] = None
    source_type: str
    title: str
    raw_content: str
    status: str
    detected_sentiment: Optional[str] = None
    detected_sentiment_score: Optional[float] = None
    detected_topics: List[Any] = []
    detected_risks: List[Any] = []
    detected_opportunities: List[Any] = []
    ai_summary: Optional[str] = None
    linked_meeting_id: Optional[str] = None
    triggered_workflow: bool = False
    error: Optional[str] = None
    created_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None
    customer: Optional[CustomerOut] = None


class IngestListOut(BaseModel):
    total: int
    items: List[IngestOut]
    page: int
    page_size: int


# FIX P2 — CSM Assignment
class CSMAssignRequest(BaseModel):
    csm_id: Optional[str] = None  # None = unassign


# FIX — real business-rule enforcement (was localStorage-only / cosmetic)
class BusinessRuleSettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    auto_approve_enabled: bool
    auto_approve_confidence_threshold: float
    updated_at: Optional[datetime] = None


class BusinessRuleSettingsUpdate(BaseModel):
    auto_approve_enabled: bool
    auto_approve_confidence_threshold: float = Field(ge=0, le=100)
