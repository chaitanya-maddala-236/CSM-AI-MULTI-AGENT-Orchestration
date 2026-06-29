"""App config — PostgreSQL only. Copy .env.example → .env and fill in your values."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_ENV: str = "development"
    APP_SECRET_KEY: str = "dev-secret-key-change-in-production"
    APP_DEBUG: bool = True
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"

    # LLM — set ONE key; provider auto-detected
    LLM_PROVIDER: str = "auto"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-pro"

    # PostgreSQL — required
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/cs_copilot"

    # Redis (optional)
    REDIS_URL: str = "redis://localhost:6379/0"

    # ChromaDB (optional — RAG falls back to rules without it)
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    CHROMA_COLLECTION: str = "cs_knowledge"

    # Auth
    JWT_SECRET_KEY: str = "jwt-dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Email (optional)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    # LangSmith (optional)
    LANGCHAIN_TRACING_V2: bool = False
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_PROJECT: str = "cs-copilot"

    def _resolved_provider(self) -> str:
        if self.LLM_PROVIDER != "auto":
            return self.LLM_PROVIDER
        if self.OPENAI_API_KEY.startswith("sk-"):   return "openai"
        if self.GROQ_API_KEY.startswith("gsk_"):    return "groq"
        if self.GEMINI_API_KEY.startswith("AIza"):  return "gemini"
        if self.OPENAI_API_KEY:  return "openai"
        if self.GROQ_API_KEY:    return "groq"
        if self.GEMINI_API_KEY:  return "gemini"
        return "openai"

    @property
    def active_provider(self) -> str:
        return self._resolved_provider()

    @property
    def active_model(self) -> str:
        return {"openai": self.OPENAI_MODEL, "groq": self.GROQ_MODEL, "gemini": self.GEMINI_MODEL}[self.active_provider]

    @property
    def active_api_key(self) -> str:
        return {"openai": self.OPENAI_API_KEY, "groq": self.GROQ_API_KEY, "gemini": self.GEMINI_API_KEY}[self.active_provider]

    # Backward-compat aliases
    @property
    def LLM_PROVIDER_RESOLVED(self) -> str: return self.active_provider
    @property
    def active_llm_model(self) -> str: return self.active_model

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
