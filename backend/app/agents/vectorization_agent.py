"""Vectorization Agent — embeddings, chunking, vector DB writes."""
import uuid
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.orm import Post, VectorMeta
from app.services.llm import get_embedding
from app.services.vector_db import upsert_vector, query_vectors

logger = structlog.get_logger()

CHUNK_SIZE = 500  # characters per chunk


class VectorizationAgent:
    """Converts text content to embeddings and stores in vector DB."""

    async def vectorize_post(self, post: Post, db: AsyncSession) -> list[str]:
        """Chunk and vectorize a single post."""
        if not post.content:
            return []

        chunks = self._chunk_text(post.content, CHUNK_SIZE)
        vector_ids = []

        for i, chunk in enumerate(chunks):
            vector_id = f"post:{post.id}:chunk:{i}"
            embedding = await get_embedding(chunk)

            metadata = {
                "user_id": post.user_id,
                "post_id": post.id,
                "platform": post.platform,
                "chunk_index": i,
                "content_preview": chunk[:200],
                "likes": (post.metrics or {}).get("likes", 0),
                "comments": (post.metrics or {}).get("comments", 0),
            }

            success = await upsert_vector(
                vector_id=vector_id,
                embedding=embedding,
                metadata=metadata,
                namespace=post.user_id,
            )

            if success:
                vm = VectorMeta(
                    user_id=post.user_id,
                    object_type="post",
                    object_id=post.id,
                    vector_id=vector_id,
                    metadata=metadata,
                )
                db.add(vm)
                vector_ids.append(vector_id)

        await db.flush()
        logger.info("post_vectorized", post_id=post.id, chunks=len(vector_ids))
        return vector_ids

    async def vectorize_user_posts(self, user_id: str, db: AsyncSession) -> dict:
        """Vectorize all unvectorized posts for a user."""
        result = await db.execute(
            select(Post).where(
                Post.user_id == user_id,
                Post.content.isnot(None),
            ).limit(500)
        )
        posts = result.scalars().all()

        total_vectors = 0
        for post in posts:
            # Skip if already vectorized
            existing = await db.execute(
                select(VectorMeta).where(
                    VectorMeta.object_id == post.id,
                    VectorMeta.object_type == "post",
                )
            )
            if existing.scalar_one_or_none():
                continue

            ids = await self.vectorize_post(post, db)
            total_vectors += len(ids)

        return {"user_id": user_id, "posts_processed": len(posts), "vectors_created": total_vectors}

    async def get_rag_context(
        self,
        user_id: str,
        query: str,
        top_k: int = 5,
    ) -> str:
        """Retrieve relevant past content for RAG."""
        query_embedding = await get_embedding(query)
        results = await query_vectors(
            embedding=query_embedding,
            top_k=top_k,
            namespace=user_id,
            filter={"user_id": user_id},
        )

        if not results:
            return ""

        context_parts = []
        for r in results:
            meta = r.get("metadata", {})
            content = meta.get("content_preview", "")
            platform = meta.get("platform", "unknown")
            score = r.get("score", 0)
            context_parts.append(f"[{platform}, relevance {score:.2f}] {content}")

        return "\n\n".join(context_parts)

    def _chunk_text(self, text: str, chunk_size: int) -> list[str]:
        """Simple character-based chunking with overlap."""
        overlap = 50
        chunks = []
        start = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))
            chunks.append(text[start:end])
            start = end - overlap if end < len(text) else end
        return chunks


vectorization_agent = VectorizationAgent()