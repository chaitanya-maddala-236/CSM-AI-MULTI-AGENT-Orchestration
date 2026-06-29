"""Knowledge Agent — RAG over ChromaDB + fallback to rule-based playbooks.

Strategy:
1. Try ChromaDB (real vector retrieval over user-created knowledge docs)
2. Fall back to rule-based snippets derived from customer context
3. Merge both sources and deduplicate

The ChromaDB collection is populated by the /knowledge POST endpoint
(see knowledge_service.py for embedding logic).
"""

from typing import Dict, Any, List
import time


async def knowledge_node(state: Dict[str, Any]) -> Dict[str, Any]:
    start = time.time()
    ctx = state.get("customer_context", {})
    health_score = state.get("health_score") or ctx.get("health_score", 70)
    churn_prob = ctx.get("churn_probability", 0)

    knowledge: List[str] = []

    # ── 1. Real RAG from ChromaDB ─────────────────────────────────────────
    try:
        knowledge += await _retrieve_from_chroma(ctx, health_score, churn_prob)
    except Exception as e:
        knowledge.append(f"[Knowledge] ChromaDB unavailable ({e}). Using rule-based fallback.")

    # ── 2. Rule-based playbook snippets ───────────────────────────────────
    knowledge += _rule_based_context(ctx, health_score, churn_prob)

    # Deduplicate while preserving order
    seen = set()
    unique = []
    for k in knowledge:
        key = k[:80]
        if key not in seen:
            seen.add(key)
            unique.append(k)

    ms = int((time.time() - start) * 1000)
    return {
        "current_agent": "knowledge",
        "knowledge_context": unique,
        "agent_logs": [
            f"[Knowledge] Retrieved {len(unique)} context snippets in {ms}ms "
            f"(RAG: {len(knowledge) - len(_rule_based_context(ctx, health_score, churn_prob))}, "
            f"rules: {len(_rule_based_context(ctx, health_score, churn_prob))})"
        ],
    }


# ---------------------------------------------------------------------------
# ChromaDB retrieval
# ---------------------------------------------------------------------------

async def _retrieve_from_chroma(
    ctx: Dict[str, Any], health_score: float, churn_prob: float
) -> List[str]:
    """Query ChromaDB with a context-aware embedding query."""
    from app.core.config import settings
    import chromadb

    # Build a natural language query from customer context
    query_parts = []
    if health_score < 40:
        query_parts.append("churn risk critical customer recovery plan")
    elif health_score < 60:
        query_parts.append("at-risk customer health improvement")
    if churn_prob > 0.7:
        query_parts.append("high churn probability retention strategy")
    renewal = ctx.get("renewal_date")
    if renewal:
        query_parts.append("renewal playbook contract negotiation")
    if ctx.get("mrr", 0) > 5000:
        query_parts.append("upsell expansion enterprise upgrade")
    if ctx.get("open_tickets", 0) > 2:
        query_parts.append("support ticket escalation resolution")

    if not query_parts:
        query_parts.append("customer success best practices engagement")

    query = " ".join(query_parts)

    client = chromadb.HttpClient(
        host=settings.CHROMA_HOST,
        port=settings.CHROMA_PORT,
    )
    try:
        collection = client.get_collection(settings.CHROMA_COLLECTION)
    except Exception:
        return []

    results = collection.query(query_texts=[query], n_results=4)
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]

    retrieved = []
    for doc, meta in zip(docs, metas):
        title = meta.get("title", "Knowledge Article")
        retrieved.append(f"[{title}] {doc}")

    return retrieved


async def embed_knowledge_doc(doc_id: str, title: str, content: str, category: str) -> bool:
    """Embed a knowledge doc into ChromaDB. Called from knowledge route on create."""
    from app.core.config import settings
    import chromadb

    try:
        client = chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)
        collection = client.get_or_create_collection(
            name=settings.CHROMA_COLLECTION,
            metadata={"hnsw:space": "cosine"},
        )
        collection.upsert(
            ids=[doc_id],
            documents=[f"{title}\n\n{content}"],
            metadatas=[{"title": title, "category": category, "doc_id": doc_id}],
        )
        return True
    except Exception:
        return False


async def delete_knowledge_doc(doc_id: str) -> bool:
    """Remove a doc from ChromaDB when deleted from the knowledge base."""
    from app.core.config import settings
    import chromadb

    try:
        client = chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)
        collection = client.get_collection(settings.CHROMA_COLLECTION)
        collection.delete(ids=[doc_id])
        return True
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Rule-based fallback (always included, rich and specific)
# ---------------------------------------------------------------------------

def _rule_based_context(ctx: Dict, health_score: float, churn_prob: float) -> List[str]:
    snippets: List[str] = []

    if health_score < 40:
        snippets.append(
            "CHURN RISK PLAYBOOK (CRITICAL): Health score below 40 requires immediate action. "
            "1) Escalate to VP Customer Success within 24 hours. "
            "2) Schedule emergency executive call within 48 hours. "
            "3) Draft personalized 90-day recovery plan with measurable milestones. "
            "4) Consider service credits or feature unlocks to demonstrate commitment. "
            "5) Assign a dedicated senior CSM as the single point of contact."
        )
    elif health_score < 60:
        snippets.append(
            "AT-RISK PLAYBOOK: Health score 40–60 requires proactive intervention. "
            "1) Schedule health check call within 5 business days. "
            "2) Review product adoption metrics and identify underused features. "
            "3) Provide targeted training sessions for the customer's team. "
            "4) Share case studies from similar customers who improved adoption. "
            "5) Set up weekly check-in cadence until health score exceeds 65."
        )
    elif health_score >= 75:
        snippets.append(
            "HEALTHY CUSTOMER PLAYBOOK: Leverage strong health for expansion. "
            "1) Identify power users and propose champion program membership. "
            "2) Run an NPS survey to capture satisfaction and generate testimonials. "
            "3) Introduce advanced features or add-on modules. "
            "4) Schedule QBR to celebrate wins and align on next-year goals."
        )

    if churn_prob > 0.7:
        snippets.append(
            "HIGH CHURN PROBABILITY PROTOCOL (>70%): "
            "Activate retention playbook immediately. "
            "Key actions: executive involvement, custom success plan review, "
            "multi-year contract discussion with incentive pricing, "
            "product roadmap alignment session to address feature gaps."
        )
    elif churn_prob > 0.4:
        snippets.append(
            "MODERATE CHURN RISK PROTOCOL (40–70%): "
            "Increase touchpoint frequency. Review contract value vs. perceived ROI. "
            "Send ROI impact report. Introduce to new features that address stated pain points."
        )

    renewal = ctx.get("renewal_date")
    if renewal:
        snippets.append(
            "RENEWAL PLAYBOOK: "
            "90 days before renewal — Week 1: Deliver ROI review report. "
            "Week 4: Executive sponsor alignment meeting. "
            "Week 8: Contract terms and multi-year options discussion. "
            "Week 12: Close renewal. Always personalize with customer-specific success metrics."
        )

    if ctx.get("mrr", 0) > 5000:
        snippets.append(
            "EXPANSION PLAYBOOK (High-value account MRR > $5k): "
            "1) Map all active users and identify untapped seats. "
            "2) Calculate and present ROI of moving to next tier. "
            "3) Offer a 30-day pilot for premium features. "
            "4) Involve sales for co-selling opportunities (add-ons, integrations)."
        )

    open_tickets = ctx.get("open_tickets", 0)
    if open_tickets >= 3:
        snippets.append(
            f"SUPPORT ESCALATION PLAYBOOK: Customer has {open_tickets} open tickets. "
            "1) Schedule a dedicated support review call. "
            "2) Assign a technical account manager for the resolution period. "
            "3) Provide weekly written status updates until all P1/P2 tickets are resolved. "
            "4) After resolution, conduct a post-mortem and share prevention steps."
        )

    snippets.append(
        "GENERAL BEST PRACTICE: "
        "Document all interactions in CRM within 24 hours. "
        "Set follow-up reminders 48 hours after every touchpoint. "
        "Share industry-specific customer success stories relevant to this account. "
        "Every interaction should advance one of: retention, expansion, or advocacy."
    )

    return snippets
