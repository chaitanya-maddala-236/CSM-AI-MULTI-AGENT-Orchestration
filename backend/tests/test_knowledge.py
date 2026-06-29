"""Knowledge base endpoint tests"""
import pytest
from unittest.mock import patch


@pytest.mark.asyncio
async def test_list_knowledge_empty(client, auth_headers):
    r = await client.get("/api/v1/knowledge", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_create_knowledge_doc(client, auth_headers):
    # Patch ChromaDB so tests don't need the service running
    with patch("app.agents.knowledge_agent.embed_knowledge_doc", return_value=True):
        r = await client.post("/api/v1/knowledge", headers=auth_headers, json={
            "title": "Churn Playbook",
            "content": "When health drops below 40, escalate immediately.",
            "category": "churn_risk",
            "tags": ["churn", "playbook"],
        })
    assert r.status_code == 201
    data = r.json()
    assert data["title"] == "Churn Playbook"
    assert data["category"] == "churn_risk"


@pytest.mark.asyncio
async def test_get_knowledge_doc(client, auth_headers):
    with patch("app.agents.knowledge_agent.embed_knowledge_doc", return_value=True):
        create = await client.post("/api/v1/knowledge", headers=auth_headers, json={
            "title": "Renewal Guide", "content": "90-day process.", "category": "renewal", "tags": [],
        })
    doc_id = create.json()["id"]
    r = await client.get(f"/api/v1/knowledge/{doc_id}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["id"] == doc_id


@pytest.mark.asyncio
async def test_delete_knowledge_doc(client, auth_headers):
    with patch("app.agents.knowledge_agent.embed_knowledge_doc", return_value=True), \
         patch("app.agents.knowledge_agent.delete_knowledge_doc", return_value=True):
        create = await client.post("/api/v1/knowledge", headers=auth_headers, json={
            "title": "To Delete", "content": "content", "category": "general", "tags": [],
        })
        doc_id = create.json()["id"]
        r = await client.delete(f"/api/v1/knowledge/{doc_id}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["success"] is True


@pytest.mark.asyncio
async def test_knowledge_search(client, auth_headers):
    with patch("app.agents.knowledge_agent.embed_knowledge_doc", return_value=True):
        await client.post("/api/v1/knowledge", headers=auth_headers, json={
            "title": "Searchable Doc", "content": "content", "category": "support", "tags": [],
        })
    r = await client.get("/api/v1/knowledge?search=Searchable", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["total"] >= 1
