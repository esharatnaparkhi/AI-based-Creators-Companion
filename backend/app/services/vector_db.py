"""Vector database service using Pinecone."""
import structlog
from typing import Optional
from app.config import settings

logger = structlog.get_logger()

try:
    from pinecone import Pinecone, ServerlessSpec
    _pc = Pinecone(api_key=settings.pinecone_api_key)
    _index = None
    PINECONE_AVAILABLE = True
except Exception:
    PINECONE_AVAILABLE = False
    logger.warning("Pinecone not available — vector ops will be no-ops")


def get_index():
    global _index
    if not PINECONE_AVAILABLE:
        return None
    if _index is None:
        existing = [i.name for i in _pc.list_indexes()]
        if settings.pinecone_index not in existing:
            _pc.create_index(
                name=settings.pinecone_index,
                dimension=1536,  # text-embedding-3-small
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region=settings.pinecone_environment),
            )
        _index = _pc.Index(settings.pinecone_index)
    return _index


async def upsert_vector(
    vector_id: str,
    embedding: list[float],
    metadata: dict,
    namespace: str = "default",
) -> bool:
    """Upsert a vector with metadata."""
    index = get_index()
    if not index:
        return False
    try:
        index.upsert(
            vectors=[{"id": vector_id, "values": embedding, "metadata": metadata}],
            namespace=namespace,
        )
        return True
    except Exception as exc:
        logger.error("vector_upsert_failed", error=str(exc))
        return False


async def query_vectors(
    embedding: list[float],
    top_k: int = 5,
    namespace: str = "default",
    filter: Optional[dict] = None,
) -> list[dict]:
    """Query for similar vectors."""
    index = get_index()
    if not index:
        return []
    try:
        result = index.query(
            vector=embedding,
            top_k=top_k,
            namespace=namespace,
            include_metadata=True,
            filter=filter,
        )
        return [
            {"id": m.id, "score": m.score, "metadata": m.metadata}
            for m in result.matches
        ]
    except Exception as exc:
        logger.error("vector_query_failed", error=str(exc))
        return []


async def delete_vectors_by_user(user_id: str) -> bool:
    """GDPR: delete all vectors for a user (by namespace)."""
    index = get_index()
    if not index:
        return False
    try:
        index.delete(delete_all=True, namespace=user_id)
        return True
    except Exception as exc:
        logger.error("vector_delete_failed", user_id=user_id, error=str(exc))
        return False