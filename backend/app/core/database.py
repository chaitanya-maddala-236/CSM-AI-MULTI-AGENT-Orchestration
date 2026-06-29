"""Async PostgreSQL database setup — asyncpg driver only."""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings

# PostgreSQL engine with proper connection pooling
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.APP_DEBUG,
    pool_pre_ping=True,     # reconnect on stale connections
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,       # recycle connections every hour
    pool_timeout=30,
    connect_args={
        "server_settings": {"application_name": "cs_copilot"},
    },
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=True,
)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db():
    """Create all tables on startup (idempotent with PostgreSQL)."""
    from app.models.models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
