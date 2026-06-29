"""Auth endpoint tests"""
import pytest


@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "llm_provider" in data
    assert "model" in data


@pytest.mark.asyncio
async def test_signup(client):
    r = await client.post("/api/v1/auth/signup", json={
        "email": "new@example.com",
        "full_name": "New User",
        "password": "password123",
        "role": "csm",
    })
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "new@example.com"


@pytest.mark.asyncio
async def test_signup_duplicate_email(client):
    payload = {"email": "dup@example.com", "full_name": "Dup", "password": "password123", "role": "csm"}
    await client.post("/api/v1/auth/signup", json=payload)
    r = await client.post("/api/v1/auth/signup", json=payload)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_login_valid(client):
    await client.post("/api/v1/auth/signup", json={
        "email": "login@example.com", "full_name": "Login User",
        "password": "mypassword", "role": "csm",
    })
    r = await client.post("/api/v1/auth/login", json={
        "email": "login@example.com", "password": "mypassword"
    })
    assert r.status_code == 200
    assert "access_token" in r.json()


@pytest.mark.asyncio
async def test_login_invalid_credentials(client):
    r = await client.post("/api/v1/auth/login", json={
        "email": "nobody@example.com", "password": "wrongpass"
    })
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client, auth_headers):
    r = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_me_unauthenticated(client):
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_refresh_token(client):
    r = await client.post("/api/v1/auth/signup", json={
        "email": "refresh@example.com", "full_name": "Refresh",
        "password": "password123", "role": "csm",
    })
    refresh_token = r.json()["refresh_token"]
    r2 = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert r2.status_code == 200
    assert "access_token" in r2.json()
