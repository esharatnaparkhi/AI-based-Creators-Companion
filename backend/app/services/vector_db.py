"""Vector database service using Pinecone Integrated Embeddings (llama-text-embed-v2)."""
import structlog
from typing import Optional
from app.config import settings

logger = structlog.get_logger()

try:
    from pinecone import Pinecone
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
        _index = _pc.Index(settings.pinecone_index)
    return _index


async def upsert_text_record(
    record_id: str,
    text: str,
    metadata: dict,
    namespace: str = "default",
) -> bool:
    """Upsert a text record — Pinecone generates the embedding internally."""
    index = get_index()
    if not index:
        return False
    try:
        index.upsert(
            records=[{"id": record_id, "text": text, "metadata": metadata}],
            namespace=namespace,
        )
        return True
    except Exception as exc:
        logger.error("vector_upsert_failed", error=str(exc))
        return False


async def query_text(
    query: str,
    top_k: int = 5,
    namespace: str = "default",
    filter: Optional[dict] = None,
) -> list[dict]:
    """Query for similar records using raw text — Pinecone embeds the query internally."""
    index = get_index()
    if not index:
        return []
    try:
        result = index.query(
            query={"text": query},
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
