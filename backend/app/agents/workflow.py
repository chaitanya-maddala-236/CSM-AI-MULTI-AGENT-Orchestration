"""LangGraph workflow orchestration — Memory → Planner → Conditional Agents → Recommendation → Memory Save

FIX Tech-1: Conditional edges based on planner decisions (was unconditional add_edge).
FIX Tech-3: WebSocket broadcast called at each agent transition.
FIX Tech-2: Token usage accumulated via LangChain callback.
"""
from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.agents.memory_agent import memory_load_node, memory_save_node
from app.agents.planner_agent import planner_node
from app.agents.interaction_agent import interaction_node
from app.agents.usage_agent import usage_node
from app.agents.sentiment_agent import sentiment_node
from app.agents.knowledge_agent import knowledge_node
from app.agents.recommendation_agent import recommendation_node
from app.core.config import settings
import uuid
from typing import Dict, Any


# ── Routing functions for conditional edges ────────────────────────────────

def route_after_planner(state: Dict[str, Any]) -> str:
    """Run interaction first if planned, else skip to usage."""
    if state.get("interaction_analysis", {}).get("should_run", True):
        return "interaction"
    return "usage"


def route_after_interaction(state: Dict[str, Any]) -> str:
    if state.get("usage_analysis", {}).get("should_run", True):
        return "usage"
    return "sentiment"


def route_after_usage(state: Dict[str, Any]) -> str:
    if state.get("sentiment_analysis", {}).get("should_run", True):
        return "sentiment"
    return "knowledge"


def route_after_sentiment(state: Dict[str, Any]) -> str:
    # knowledge_context == [] means planner set run_knowledge=False
    kc = state.get("knowledge_context")
    if kc is None:  # None means "please run"
        return "knowledge"
    return "recommendation"


# ── WS broadcast helper (non-fatal) ────────────────────────────────────────

async def _broadcast(state: Dict[str, Any], agent_name: str):
    """Broadcast current agent name to any connected WS clients."""
    try:
        from app.websocket import manager
        customer_id = state.get("customer_id", "")
        if customer_id:
            await manager.broadcast(customer_id, {
                "type": "agent_progress",
                "current_agent": agent_name,
                "workflow_id": state.get("workflow_id"),
                "logs": state.get("agent_logs", [])[-3:],
            })
    except Exception:
        pass  # WS failures must never abort the workflow


# ── Wrapped nodes that broadcast progress ─────────────────────────────────

async def _wrap(node_fn, agent_name: str, state: Dict[str, Any]) -> Dict[str, Any]:
    await _broadcast(state, agent_name)
    result = await node_fn(state)
    merged = {**state, **result}
    await _broadcast(merged, agent_name + "_done")
    return result


async def memory_load_node_w(state): return await _wrap(memory_load_node, "memory_load", state)
async def planner_node_w(state):     return await _wrap(planner_node, "planner", state)
async def interaction_node_w(state): return await _wrap(interaction_node, "interaction", state)
async def usage_node_w(state):       return await _wrap(usage_node, "usage", state)
async def sentiment_node_w(state):   return await _wrap(sentiment_node, "sentiment", state)
async def knowledge_node_w(state):   return await _wrap(knowledge_node, "knowledge", state)
async def recommendation_node_w(state): return await _wrap(recommendation_node, "recommendation", state)
async def memory_save_node_w(state): return await _wrap(memory_save_node, "memory_save", state)


def build_workflow():
    graph = StateGraph(AgentState)

    # Nodes (wrapped for WS broadcast)
    graph.add_node("memory_load", memory_load_node_w)
    graph.add_node("planner", planner_node_w)
    graph.add_node("interaction", interaction_node_w)
    graph.add_node("usage", usage_node_w)
    graph.add_node("sentiment", sentiment_node_w)
    graph.add_node("knowledge", knowledge_node_w)
    graph.add_node("recommendation", recommendation_node_w)
    graph.add_node("memory_save", memory_save_node_w)

    # Fixed linear section
    graph.set_entry_point("memory_load")
    graph.add_edge("memory_load", "planner")

    # FIX Tech-1: Conditional edges replace unconditional add_edge
    graph.add_conditional_edges("planner", route_after_planner,
        {"interaction": "interaction", "usage": "usage"})
    graph.add_conditional_edges("interaction", route_after_interaction,
        {"usage": "usage", "sentiment": "sentiment"})
    graph.add_conditional_edges("usage", route_after_usage,
        {"sentiment": "sentiment", "knowledge": "knowledge"})
    graph.add_conditional_edges("sentiment", route_after_sentiment,
        {"knowledge": "knowledge", "recommendation": "recommendation"})

    graph.add_edge("knowledge", "recommendation")
    graph.add_edge("recommendation", "memory_save")
    graph.add_edge("memory_save", END)

    return graph.compile()


workflow = build_workflow()


async def run_customer_analysis(
    customer_data: Dict[str, Any],
    db=None,
) -> Dict[str, Any]:
    workflow_id = str(uuid.uuid4())
    initial_state = {
        "customer_id": customer_data["customer_id"],
        "customer_context": customer_data,
        "trigger_reason": customer_data.get("trigger_reason", "scheduled_analysis"),
        "memory_context": None,
        "interaction_analysis": None,
        "usage_analysis": None,
        "sentiment_analysis": None,
        "knowledge_context": None,
        "computed_signals": None,
        "recommendations": [],
        "health_score": None,
        "churn_probability": None,
        "agent_logs": [],
        "errors": [],
        "current_agent": "init",
        "workflow_id": workflow_id,
        "llm_provider": settings.LLM_PROVIDER,
        "token_usage": {},
        "_db": db,
    }
    result = await workflow.ainvoke(initial_state)
    return result
