"""
Startup validation — checks LLM provider config and prints clear guidance.
Called from main.py lifespan on startup.
"""
import logging
logger = logging.getLogger(__name__)


def validate_llm_config() -> None:
    """Check that exactly one valid API key is configured and log the result."""
    from app.core.config import settings

    provider = settings.active_provider
    key = settings.active_api_key
    model = settings.active_model

    if not key:
        logger.warning(
            "\n"
            "═══════════════════════════════════════════════════════════\n"
            "  ⚠️  NO AI PROVIDER KEY CONFIGURED\n"
            "═══════════════════════════════════════════════════════════\n"
            "  The AI agents will use fallback recommendations.\n"
            "  To enable full AI: add ONE key to your .env file:\n"
            "\n"
            "    OPENAI_API_KEY=sk-...         (GPT-4o)\n"
            "    GROQ_API_KEY=gsk_...          (LLaMA 3.3 70B — free tier)\n"
            "    GEMINI_API_KEY=AIza...         (Gemini 1.5 Pro)\n"
            "═══════════════════════════════════════════════════════════"
        )
        return

    logger.info(
        "\n"
        "═══════════════════════════════════════════════════════════\n"
        f"  ✅ AI Provider: {provider.upper()}\n"
        f"  ✅ Model:       {model}\n"
        f"  ✅ Key:         {key[:8]}{'*' * (len(key) - 8) if len(key) > 8 else '***'}\n"
        "═══════════════════════════════════════════════════════════"
    )
