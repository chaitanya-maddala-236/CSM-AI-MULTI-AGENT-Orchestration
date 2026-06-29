"""Planner Agent — routing + real tool-calling for deterministic signals."""
from typing import Dict, Any
from langchain_core.messages import HumanMessage, SystemMessage
from app.core.llm_factory import get_fast_llm, invoke_with_token_tracking
from app.agents.prompts import PLANNER_SYSTEM, TOOL_CALLER_SYSTEM
from app.tools import ALL_TOOLS, execute_tool_calls
import json, time


async def _compute_signals_via_tools(ctx: Dict[str, Any]) -> tuple:
    """Let the LLM call structured tools; degrade gracefully on failure."""
    try:
        llm = get_fast_llm().bind_tools(ALL_TOOLS)
        human = (
            f"health_score={ctx.get('health_score')}, "
            f"churn_probability={ctx.get('churn_probability')}, "
            f"renewal_date={ctx.get('renewal_date')}"
        )
        ai_msg = await llm.ainvoke([
            SystemMessage(content=TOOL_CALLER_SYSTEM),
            HumanMessage(content=human)
        ])
        signals = await execute_tool_calls(ai_msg)
        logs = [f"[Planner→Tool] {name}() = {result}" for name, result in signals.items()]
        if not signals:
            logs = ["[Planner→Tool] LLM issued no tool calls this run."]
        return signals, logs
    except Exception as e:
        return {}, [f"[Planner→Tool] Tool-calling unavailable ({e}); skipping."]


async def planner_node(state: Dict[str, Any]) -> Dict[str, Any]:
    start = time.time()
    ctx = state.get("customer_context", {})

    prompt = (
        f"Customer: {ctx.get('customer_name')} at {ctx.get('company_name')}\n"
        f"Health Score: {ctx.get('health_score')}, Churn Risk: {ctx.get('churn_probability')}\n"
        f"Plan: {ctx.get('plan')}, MRR: ${ctx.get('mrr')}, Renewal: {ctx.get('renewal_date')}\n"
        f"Open Tickets: {ctx.get('open_tickets', 0)}, Seats: {ctx.get('seats')}\n"
        f"Recent Interactions: {len(ctx.get('recent_interactions', []))} events\n"
        f"Usage Metrics: {'available' if ctx.get('usage_metrics') else 'none'}\n"
        f"Trigger: {state.get('trigger_reason', 'scheduled_analysis')}"
    )

    try:
        llm = get_fast_llm()
        response, token_usage = await invoke_with_token_tracking(
            llm,
            [SystemMessage(content=PLANNER_SYSTEM), HumanMessage(content=prompt)],
            state, "planner"
        )
        raw = response.content.strip().replace("```json", "").replace("```", "")
        plan = json.loads(raw)
    except Exception as e:
        plan = {
            "run_interaction": True, "run_usage": True,
            "run_sentiment": True, "run_knowledge": True,
            "reasoning": f"Default plan activated (parse error: {e})"
        }
        token_usage = state.get("token_usage", {})

    signals, tool_logs = await _compute_signals_via_tools(ctx)
    ms = int((time.time() - start) * 1000)

    return {
        "current_agent": "planner",
        "token_usage": token_usage,
        "computed_signals": signals,
        "agent_logs": [f"[Planner] Plan in {ms}ms: {plan.get('reasoning', '')}"] + tool_logs,
        "interaction_analysis": {"should_run": plan.get("run_interaction", True)},
        "usage_analysis":       {"should_run": plan.get("run_usage", True)},
        "sentiment_analysis":   {"should_run": plan.get("run_sentiment", True)},
        "knowledge_context":    [] if not plan.get("run_knowledge", True) else None,
    }
