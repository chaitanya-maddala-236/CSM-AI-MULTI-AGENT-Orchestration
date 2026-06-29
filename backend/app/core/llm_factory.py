"""
Universal LLM Factory — one key, any provider.

Supports: OpenAI, Groq, Gemini.
Provider is auto-detected from the key format; no config change needed.

Token tracking is accurate across all providers via LangChain callbacks.
"""
from __future__ import annotations
from typing import Any, Dict, List
from langchain_core.language_models import BaseChatModel
from langchain_core.callbacks import BaseCallbackHandler
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


# ── Token tracking ────────────────────────────────────────────────────────────

class TokenUsageCallback(BaseCallbackHandler):
    """Accumulate prompt + completion tokens across all LLM calls in one agent node."""

    def __init__(self):
        self.input_tokens = 0
        self.output_tokens = 0

    def on_llm_end(self, response: Any, **kwargs: Any) -> None:
        try:
            # OpenAI / Groq style
            usage = (response.llm_output or {}).get("token_usage", {})
            self.input_tokens  += usage.get("prompt_tokens", 0)
            self.output_tokens += usage.get("completion_tokens", 0)

            # Gemini style (token_usage may be nested differently)
            if not usage:
                for gen_list in response.generations:
                    for gen in gen_list:
                        gi = getattr(gen, "generation_info", {}) or {}
                        self.input_tokens  += gi.get("input_tokens", 0)
                        self.output_tokens += gi.get("output_tokens", 0)
        except Exception:
            pass

    @property
    def totals(self) -> Dict[str, int]:
        return {
            "input_tokens":  self.input_tokens,
            "output_tokens": self.output_tokens,
            "total_tokens":  self.input_tokens + self.output_tokens,
        }


# ── Provider builders ─────────────────────────────────────────────────────────

def _build_openai(model: str, temperature: float, streaming: bool) -> BaseChatModel:
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(
        model=model,
        temperature=temperature,
        streaming=streaming,
        api_key=settings.OPENAI_API_KEY,
    )


def _build_groq(model: str, temperature: float, streaming: bool) -> BaseChatModel:
    from langchain_groq import ChatGroq
    return ChatGroq(
        model=model,
        temperature=temperature,
        streaming=streaming,
        api_key=settings.GROQ_API_KEY,
    )


def _build_gemini(model: str, temperature: float, streaming: bool) -> BaseChatModel:
    from langchain_google_genai import ChatGoogleGenerativeAI
    return ChatGoogleGenerativeAI(
        model=model,
        temperature=temperature,
        streaming=streaming,
        google_api_key=settings.GEMINI_API_KEY,
        # Gemini 1.5 Pro supports function calling
        convert_system_message_to_human=False,
    )


_BUILDERS = {
    "openai": _build_openai,
    "groq":   _build_groq,
    "gemini": _build_gemini,
}

_FAST_MODELS = {
    "openai": "gpt-4o-mini",
    "groq":   "llama-3.1-8b-instant",
    "gemini": "gemini-1.5-flash",
}


# ── Public API ────────────────────────────────────────────────────────────────

def get_llm(temperature: float = 0.1, streaming: bool = False) -> BaseChatModel:
    """Return the primary (smart) LLM for the auto-detected provider."""
    provider = settings.active_provider
    model    = settings.active_model
    builder  = _BUILDERS.get(provider)
    if not builder:
        raise ValueError(
            f"Unsupported LLM provider: '{provider}'. "
            f"Set OPENAI_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY in your .env"
        )
    logger.debug("LLM: provider=%s model=%s", provider, model)
    return builder(model, temperature, streaming)


def get_fast_llm(temperature: float = 0.0, streaming: bool = False) -> BaseChatModel:
    """Return the fast/cheap LLM variant (mini/flash/8b) for quick classification tasks."""
    provider   = settings.active_provider
    fast_model = _FAST_MODELS.get(provider, settings.active_model)
    builder    = _BUILDERS.get(provider)
    if not builder:
        return get_llm(temperature, streaming)
    logger.debug("Fast LLM: provider=%s model=%s", provider, fast_model)
    return builder(fast_model, temperature, streaming)


async def invoke_with_token_tracking(
    llm: BaseChatModel,
    messages: list,
    state: Dict[str, Any],
    agent_key: str,
) -> tuple[Any, Dict[str, int]]:
    """
    Invoke LLM and merge token usage into state['token_usage'].
    Returns (response, updated_token_usage_dict).
    """
    cb = TokenUsageCallback()
    response = await llm.ainvoke(messages, config={"callbacks": [cb]})
    existing: Dict[str, int] = dict(state.get("token_usage") or {})
    for k, v in cb.totals.items():
        existing[k] = existing.get(k, 0) + v
    existing[f"{agent_key}_tokens"] = cb.totals["total_tokens"]
    return response, existing
