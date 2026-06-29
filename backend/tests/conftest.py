"""
Pytest configuration — uses PostgreSQL for tests.

Set TEST_DATABASE_URL env var, or tests will use the main DATABASE_URL.
Fastest: spin up postgres via docker-compose and run pytest from there.
For CI: the .github/workflows/ci.yml already starts a postgres service.
"""
import pytest, asyncio, os
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from unittest.mock import AsyncMock, patch

# Use a separate test database
TEST_DB_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/cs_copilot_test"
)

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    from app.models.models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    Session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as session:
        yield session
        await session.rollback()

@pytest.fixture
async def client(db_session) -> AsyncGenerator[AsyncClient, None]:
    from app.main import app
    from app.core.database import get_db

    async def override_db():
        yield db_session

    app.dependency_overrides[get_db] = override_db

    with patch("app.core.llm_factory.get_llm") as mock_llm, \
         patch("app.core.llm_factory.get_fast_llm") as mock_fast:
        mock_llm.return_value = AsyncMock()
        mock_fast.return_value = AsyncMock()
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c

    app.dependency_overrides.clear()

@pytest.fixture
async def auth_headers(client) -> dict:
    await client.post("/api/v1/auth/signup", json={
        "email": "test@example.com", "full_name": "Test User",
        "password": "testpass123", "role": "csm",
    })
    r = await client.post("/api/v1/auth/login", json={
        "email": "test@example.com", "password": "testpass123"
    })
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
