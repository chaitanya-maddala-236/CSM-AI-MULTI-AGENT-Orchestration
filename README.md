# CS Copilot — AI Customer Success Intelligence Platform

**Multi-agent AI platform for B2B SaaS Customer Success teams.**

> LangGraph orchestration · FastAPI · React 18 · PostgreSQL · ChromaDB RAG · Redis · WebSockets

One API key (OpenAI / Groq / Gemini) — everything else is automatic.

---

## Table of Contents

1. [Quick Start](#quick-start-docker--2-minutes)
2. [Architecture Overview](#architecture-overview)
3. [System Architecture Diagram](#system-architecture-diagram)
4. [Agent Pipeline Diagram](#agent-pipeline-diagram)
5. [Data Flow: Ingestion → Recommendation](#data-flow-ingestion--recommendation)
6. [Module Reference](#module-reference)
7. [Feature Overview](#feature-overview)
8. [API Reference](#api-reference)
9. [Environment Variables](#environment-variables)
10. [Development Guide](#development-guide)

---

## Quick Start (Docker — 2 minutes)

```bash
# 1. Clone and configure
git clone <repo>
cd cs-copilot

# 2. Add your AI key to .env (only ONE needed):
echo "OPENAI_API_KEY=sk-..."   >> .env   # GPT-4o (recommended)
echo "GROQ_API_KEY=gsk_..."    >> .env   # LLaMA 3.3 70B (free tier)
echo "GEMINI_API_KEY=AIza..." >> .env   # Gemini 1.5 Pro

# 3. Start all 5 services
docker-compose up -d

# 4. Open
open http://localhost:5173

# Default credentials
# Email:    admin@cscopilot.demo
# Password: demo1234
```

**First-launch**: The backend seeds ~50 demo customers, knowledge docs, recommendations,
timeline events, and agent run history automatically. Takes ~30 seconds.

---

## Architecture Overview

CS Copilot is built as a **reusable multi-agent platform** with strict separation between:

| Layer | Technology | Role |
|-------|-----------|------|
| **Presentation** | React 18 + Vite + TailwindCSS | CSM-facing UI, HITL review panels |
| **API Gateway** | FastAPI (async) | REST endpoints + WebSocket events |
| **Agent Orchestration** | LangGraph (StateGraph) | Planner → specialized agents |
| **Memory** | PostgreSQL + ChromaDB | Short-term state + long-term RAG |
| **Event Bus** | Redis Pub/Sub | Async cross-service event delivery |
| **LLM** | LangChain (OpenAI / Groq / Gemini) | Classification + reasoning |

### Design Principles

- **Data-first**: Every recommendation is grounded in real stored data (meetings, usage, health, tickets)
- **HITL**: AI outputs are always shown to a human before triggering any customer-facing action
- **Graceful degradation**: If the LLM is unavailable, rule-based fallbacks ensure the platform still works
- **Reusable agents**: Each agent exposes a standard `async (state: WorkflowState) → WorkflowState` interface
- **Explainability**: Every recommendation ships with `evidence[]`, `reasoning`, and `confidence_score`

---

## System Architecture Diagram
<img width="2720" height="3280" alt="cs_copilot_system_architecture" src="https://github.com/user-attachments/assets/2517aef9-ae03-430c-aa78-07ef500f8e21" />


---

## Agent Pipeline Diagram

<img width="2720" height="3600" alt="cs_copilot_agent_pipeline" src="https://github.com/user-attachments/assets/691023e5-6cee-4a04-8fa8-9359e8d8096b" />


---

## Data Flow: Ingestion → Recommendation
<img width="2760" height="1680" alt="ingestion_to_classification_flow" src="https://github.com/user-attachments/assets/f4ad333a-fc03-4eb1-82a1-18904cde46d6" />

That's the intake half — CSM input through classification to the human-in-the-loop preview. Once the CSM clicks approve, it triggers the full LangGraph workflow, which is where the actual recommendation gets built

<img width="2720" height="2504" alt="agent_workflow_to_recommendation_flow" src="https://github.com/user-attachments/assets/d3c6e243-9ad1-41e6-92bd-57679b206e37" />

And the final piece — what happens after the HITL gate decides:

<img width="2720" height="1160" alt="hitl_gate_to_persisted_recommendation" src="https://github.com/user-attachments/assets/9acacf38-3c74-4862-a407-2d4f837f90ae" />


## Module Reference

### Backend (`/backend/app/`)

| Path | Purpose |
|------|---------|
| `agents/planner_agent.py` | LangGraph orchestrator — decides which agents to invoke |
| `agents/memory_agent.py` | Loads past recommendations + outcomes for context |
| `agents/interaction_agent.py` | Parses meetings, emails, notes for signals |
| `agents/sentiment_agent.py` | Scores sentiment across interaction history |
| `agents/usage_agent.py` | Analyzes feature adoption and engagement metrics |
| `agents/knowledge_agent.py` | ChromaDB RAG retrieval + document embedding |
| `agents/recommendation_agent.py` | Final LLM synthesis → next-best-action recommendations |
| `agents/workflow.py` | LangGraph StateGraph wiring all agents together |
| `agents/state.py` | `WorkflowState` TypedDict shared across all agents |
| `agents/prompts.py` | All LLM system prompts (centralized, versioned) |
| `api/routes/ingestion.py` | Data ingestion intake + AI classification pipeline |
| `api/routes/customers.py` | Customer CRUD + 360-view + executive summary |
| `api/routes/recommendations.py` | Recommendation CRUD + approval + feedback + simulation |
| `api/routes/knowledge.py` | Knowledge base CRUD + ChromaDB sync |
| `api/routes/analytics.py` | Health trends, revenue, team performance, risk formula |
| `api/routes/memory.py` | Memory timeline per customer |
| `api/routes/agents.py` | Agent run log + observability stats |
| `core/llm_factory.py` | Auto-detects provider from .env, builds LangChain client |
| `core/event_bus.py` | Redis Pub/Sub event publication/subscription |
| `models/models.py` | All SQLAlchemy ORM models |
| `services/recommendation_service.py` | Business-logic wrapper around the agent workflow |
| `services/explainability.py` | Evidence extraction and confidence scoring |
| `utils/seed.py` | Full demo data seeder (customers, meetings, recs, knowledge) |

### Frontend (`/frontend/src/`)

| Path | Purpose |
|------|---------|
| `pages/DataIngestion.tsx` | Paste-to-analyze intake form + HITL preview + knowledge table |
| `pages/Knowledge.tsx` | Knowledge base table — CRUD + push-to-recommendation |
| `pages/Customer360.tsx` | Full 360° customer view (health, usage, meetings, recs) |
| `pages/Recommendations.tsx` | All recommendations with approval workflow |
| `pages/Approvals.tsx` | Pending approval queue with approve/reject UI |
| `pages/MemoryTimeline.tsx` | Per-customer learning memory + outcome history |
| `pages/AgentObservability.tsx` | Live agent run log, token usage, latency |
| `pages/RecommendationSimulator.tsx` | Predict next-best-actions from historical patterns |
| `pages/RecommendationFeedbackLoop.tsx` | Outcome tracking + model learning visualization |
| `pages/Analytics.tsx` | Health trends, revenue, risk distribution |
| `pages/BusinessRulesEngine.tsx` | Configure auto-approve thresholds + rule simulation |
| `services/api.ts` | All API client functions (axios) |
| `stores/authStore.ts` | Zustand auth state |

---

## Feature Overview

### 1. Data Ingestion (Innovation)
**What makes it different**: Raw text in → structured intelligence out in <3 seconds.

- Paste meeting notes, email threads, call transcripts, CRM updates, or any free text
- LLM automatically extracts: sentiment score, key topics, risks, expansion opportunities, executive summary
- Human-in-the-Loop (HITL) review panel shows AI analysis before any action is taken
- "Approve & Analyze" button triggers the full 7-agent LangGraph workflow
- All data persisted as immutable audit records — never lose context
- **"Try an example"** buttons for instant demo with realistic sample data
- Signal quality indicator helps CSMs understand what content the AI can work with

### 2. Knowledge Base (Innovation)
**What makes it different**: Documents are not just stored — they actively power recommendations.

- Full CRUD table with inline expand to read content
- Category filters: playbook, documentation, FAQ, case study, churn risk, expansion, renewal, onboarding, support
- **"Generate Recommendation"** button: select a customer → triggers full AI workflow using this document
- All documents auto-embedded into ChromaDB for semantic retrieval
- AI Knowledge Agent retrieves the top-k most relevant documents during every recommendation cycle
- Copy content, edit inline, delete — with ChromaDB sync on every operation

### 3. Multi-Agent Orchestration
- LangGraph `StateGraph` dynamically decides which agents to run based on customer context
- Each agent runs independently, merges results into shared `WorkflowState`
- Full observability: every agent run logged with input/output/token usage/latency
- Fallback: if LLM unavailable, rule-based heuristics produce recommendations from data patterns

### 4. Explainable Recommendations
- Every recommendation includes: `evidence[]` (cited data points), `reasoning` (chain-of-thought), `confidence_score` (0-100)
- Priority: high / medium / low with risk score
- Concrete action steps (not vague advice)
- CSM can approve, reject, or mark as executed with outcome feedback

### 5. Memory & Learning
- Past recommendations with outcomes (success / partial / failed) are injected into every future prompt
- Prevents the AI from suggesting the same rejected action twice
- Outcome rates feed the Recommendation Simulator for data-driven predictions
- Per-customer memory timeline shows the full history of AI decisions and their results

### 6. Business Rules Engine
- Configure auto-approve confidence threshold
- Rules persist in PostgreSQL, enforced server-side on every recommendation
- Business rule simulation: test rules against current customer data without triggering real workflows

---

## API Reference

### Ingestion
```
POST   /api/v1/ingestion              Ingest raw text, trigger AI classification
GET    /api/v1/ingestion              List all ingested records (filterable)
GET    /api/v1/ingestion/{id}         Get single record with AI analysis
POST   /api/v1/ingestion/{id}/reprocess       Re-run AI classification
POST   /api/v1/ingestion/{id}/trigger-workflow  HITL approval → full workflow
DELETE /api/v1/ingestion/{id}         Delete record
```

### Knowledge
```
GET    /api/v1/knowledge              List documents (search, category filters)
POST   /api/v1/knowledge              Create + embed into ChromaDB
GET    /api/v1/knowledge/{id}         Get single document
PATCH  /api/v1/knowledge/{id}         Update + re-embed
DELETE /api/v1/knowledge/{id}         Soft-delete + remove from ChromaDB
```

### Recommendations
```
GET    /api/v1/recommendations                    List (by customer, status)
POST   /api/v1/recommendations/trigger            Run full agent workflow
POST   /api/v1/recommendations/{id}/approve       Approve / reject (HITL)
POST   /api/v1/recommendations/{id}/feedback      Log outcome (success/failed)
GET    /api/v1/recommendations/simulate/{cid}     Predict success rates
GET    /api/v1/recommendations/priority/{cid}     Priority queue
```

### Customers
```
GET    /api/v1/customers              List with health/churn data
GET    /api/v1/customers/{id}         Get customer
GET    /api/v1/customers/{id}/360     Full 360° view
GET    /api/v1/customers/{id}/executive-summary  AI-generated exec brief
POST   /api/v1/customers/{id}/trigger-analysis   Trigger full agent workflow
```

### Analytics
```
GET    /api/v1/analytics/health-trend
GET    /api/v1/analytics/recommendation-stats
GET    /api/v1/analytics/revenue-trend
GET    /api/v1/analytics/team-performance
GET    /api/v1/analytics/recommendation-success-rates
GET    /api/v1/analytics/ai-performance
GET    /api/v1/analytics/upsell-opportunities
```

---

## Environment Variables

```env
# ── LLM (one required) ────────────────────────────────────────────────────
OPENAI_API_KEY=sk-...         # Uses GPT-4o + GPT-4o-mini
GROQ_API_KEY=gsk_...          # Uses LLaMA-3.3-70B + LLaMA-3.1-8B (free tier)
GEMINI_API_KEY=AIza...        # Uses Gemini-1.5-Pro + Gemini-1.5-Flash

# ── Database ──────────────────────────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://cscopilot:cscopilot@postgres:5432/cs_copilot
CHROMA_HOST=chromadb
CHROMA_PORT=8001

# ── Cache / Event Bus ─────────────────────────────────────────────────────
REDIS_URL=redis://redis:6379/0

# ── Auth ──────────────────────────────────────────────────────────────────
SECRET_KEY=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ── Optional overrides ────────────────────────────────────────────────────
LLM_MODEL=gpt-4o              # Override auto-detected model
OPENAI_BASE_URL=              # For Azure OpenAI or proxy
```

---

## Development Guide

### Run without Docker

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

### Run with hot-reload Docker

```bash
docker-compose -f docker-compose.dev.yml up
```

### Extending the platform

**Add a new agent:**
1. Create `backend/app/agents/my_agent.py` with `async def my_agent_node(state: WorkflowState) -> WorkflowState`
2. Register it in `workflow.py`: `graph.add_node("my_agent", my_agent_node)`
3. Wire it into the planner decision in `planner_agent.py`

**Add a new data source:**
1. Add a model to `models/models.py`
2. Add a route to `api/routes/`
3. Register the router in `main.py`
4. Add the API client in `frontend/src/services/api.ts`

**Add a new recommendation category:**
1. Add to `RecommendationCategory` enum in `models/models.py`
2. Add the CATEGORY_COLORS mapping in `frontend/src/pages/Recommendations.tsx`
3. Add a matching knowledge document in the Knowledge Base to guide the AI

### Running tests

```bash
cd backend
pytest tests/ -v
```

---

## Business Domain

**Domain**: B2B SaaS Customer Success

**Business Process**: CSM identifies at-risk or growth customers → AI analyzes all signals → recommends next-best-actions → CSM approves → actions executed → outcomes fed back to improve future recommendations

**Customer Journey**:
1. Onboarding (first 90 days) — adoption tracking, blockers, success milestones
2. Expansion (day 91+) — usage growth, seat expansion, upsell opportunities
3. Renewal (60-90 days before contract end) — health score, risk mitigation, renewal prep
4. At-Risk (churn signals detected) — emergency playbooks, executive escalation

**Decision Points**:
- Health score drops below threshold → trigger churn risk analysis
- Usage stagnates for 14+ days → trigger adoption playbook
- Meeting sentiment turns negative → flag for immediate CSM attention
- Renewal date < 90 days → trigger renewal preparation workflow

**Success Metrics**:
- Net Revenue Retention (NRR)
- Customer Health Score (composite: usage 40% + sentiment 30% + support 20% + engagement 10%)
- Recommendation acceptance rate
- Time-to-recommendation (AI analysis latency)
- Churn prevention rate (recommendations with `outcome: success`)

---

## Key Design Decisions

### 1. Data-First Recommendations
Every recommendation is grounded in real stored data (meetings, usage, health scores, tickets) — the LLM never fabricates context. Evidence arrays and confidence scores are returned with every recommendation.

### 2. Human-in-the-Loop (HITL) by Default
AI outputs are always shown to a human before triggering customer-facing actions. The HITL gate is not optional — it is enforced in the LangGraph workflow and the API route.

### 3. Graceful Degradation
If the LLM is unavailable, rule-based heuristics in each agent produce recommendations from stored data patterns. The platform remains functional without an active LLM connection.

### 4. LLM Provider Agnostic
A `LLMFactory` (core/llm_factory.py) auto-detects which API key is present in `.env` and builds the appropriate LangChain client. Switching between OpenAI, Groq (free tier), and Gemini requires only a `.env` change.

### 5. Explainability as a First-Class Feature
Every recommendation ships with:
- `evidence[]` — cited data points that informed the decision
- `reasoning` — chain-of-thought explanation
- `confidence_score` — 0–100 numeric score
- `priority` — high / medium / low with risk score

### 6. Reusable Agent Interface
Each agent exposes a single standard interface:
```python
async def agent_node(state: WorkflowState) -> WorkflowState
```
This makes agents independently testable, swappable, and extensible.

### 7. Memory & Learning Loop
Past recommendation outcomes (success / partial / failed) are injected into every future prompt for the same customer, preventing the AI from repeating rejected actions and improving over time.

### 8. Event-Driven Architecture
Redis Pub/Sub decouples the agent workflow from the API layer. Long-running agent tasks publish events; the frontend receives real-time updates via WebSocket.

---

