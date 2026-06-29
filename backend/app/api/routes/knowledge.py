"""Knowledge base routes — CRUD + ChromaDB embedding"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.auth.auth import get_current_user
from app.models.models import User, KnowledgeDocument
from app.schemas.schemas import KnowledgeDocCreate, KnowledgeDocOut
import uuid

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.get("")
async def list_docs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    category: str = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(KnowledgeDocument).where(KnowledgeDocument.is_active == True)
    if search:
        q = q.where(KnowledgeDocument.title.ilike(f"%{search}%"))
    if category:
        q = q.where(KnowledgeDocument.category == category)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    q = q.order_by(KnowledgeDocument.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    items = result.scalars().all()
    return {"total": total, "items": items, "page": page, "page_size": page_size}


@router.get("/{doc_id}")
async def get_doc(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id, KnowledgeDocument.is_active == True)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.post("", status_code=201)
async def create_doc(
    data: KnowledgeDocCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc_id = str(uuid.uuid4())
    doc = KnowledgeDocument(
        id=doc_id,
        title=data.title,
        content=data.content,
        category=data.category,
        tags=data.tags,
        created_by=current_user.id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Embed into ChromaDB (non-fatal if Chroma unavailable)
    try:
        from app.agents.knowledge_agent import embed_knowledge_doc
        await embed_knowledge_doc(doc_id, data.title, data.content, data.category)
        doc.embedding_id = doc_id
        await db.commit()
    except Exception:
        pass

    return doc


@router.patch("/{doc_id}")
async def update_doc(
    doc_id: str,
    data: KnowledgeDocCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.title = data.title
    doc.content = data.content
    doc.category = data.category
    doc.tags = data.tags
    await db.commit()
    await db.refresh(doc)

    # Re-embed
    try:
        from app.agents.knowledge_agent import embed_knowledge_doc
        await embed_knowledge_doc(doc_id, data.title, data.content, data.category)
    except Exception:
        pass

    return doc


@router.delete("/{doc_id}")
async def delete_doc(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id))
    doc = result.scalar_one_or_none()
    if doc:
        doc.is_active = False
        await db.commit()
        # Remove from ChromaDB
        try:
            from app.agents.knowledge_agent import delete_knowledge_doc
            await delete_knowledge_doc(doc_id)
        except Exception:
            pass
    return {"success": True}
