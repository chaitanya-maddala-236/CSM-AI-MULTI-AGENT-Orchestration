"""LangGraph agent state definitions"""
from typing import TypedDict, List, Optional, Any, Dict, Annotated
import operator


class CustomerContext(TypedDict):
    customer_id: str
    customer_name: str
    company_name: str
    health_score: float
    churn_probability: float
    plan: str
    mrr: float
    renewal_date: Optional[str]
    seats: int
    open_tickets: int
    recent_interactions: List[Dict[str, Any]]
    usage_metrics: List[Dict[str, Any]]
    trigger_reason: str


class AgentState(TypedDict):
    # Input
    customer_id: str
    customer_context: CustomerContext
    trigger_reason: str

    # Memory (loaded before planner)
    memory_context: Optional[Dict[str, Any]]

    # Intermediate results
    interaction_analysis: Optional[Dict[str, Any]]
    usage_analysis: Optional[Dict[str, Any]]
    sentiment_analysis: Optional[Dict[str, Any]]
    knowledge_context: Optional[List[str]]
    computed_signals: Optional[Dict[str, Any]]  # outputs of real tool-calls (planner agent)

    # Output
    recommendations: Annotated[List[Dict[str, Any]], operator.add]
    health_score: Optional[float]
    churn_probability: Optional[float]

    # Meta
    agent_logs: Annotated[List[str], operator.add]
    errors: Annotated[List[str], operator.add]
    current_agent: str
    workflow_id: str
    llm_provider: str
    token_usage: Dict[str, int]

    # DB session (injected at runtime, not serialised)
    _db: Optional[Any]
