"""Composer Agent — generate platform-aware drafts with RAG."""
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.orm import Draft, User
from app.agents.vectorization_agent import vectorization_agent
from app.services.llm import generate_drafts
from app.services.audit import write_audit

logger = structlog.get_logger()


class ComposerAgent:
    """Generates personalized, platform-aware content drafts."""

    async def generate(
        self,
        user_id: str,
        platform_targets: list[str],
        topic: str | None = None,
        prompts: list[str] | None = None,
        tone: str | None = None,
        db: AsyncSession | None = None,
    ) -> list[Draft]:
        """Generate drafts for multiple platforms using RAG."""
        # Build topic from prompts if not provided
        query = topic or " ".join(prompts or []) or "general content"

        # Retrieve RAG context
        rag_context = await vectorization_agent.get_rag_context(
            user_id=user_id,
            query=query,
        )

        # Get user persona settings
        user_context = ""
        if db:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user and user.settings:
                persona = user.settings.get("persona", {})
                user_context = f"""
Creator persona: {persona.get('description', '')}
Niche: {persona.get('niche', '')}
Target audience: {persona.get('audience', '')}
Writing style: {persona.get('style', '')}
"""

        # Generate drafts via LLM
        raw_drafts = await generate_drafts(
            user_context=user_context,
            topic=query,
            platform_targets=platform_targets,
            tone=tone,
            rag_context=rag_context,
        )

        # Compliance check
        compliance_agent = _get_compliance()
        saved_drafts = []

        for raw in raw_drafts:
            content = raw.get("content", "")
            if not compliance_agent.is_safe(content):
                logger.warning("draft_failed_compliance", user_id=user_id, platform=raw.get("platform"))
                continue

            draft = Draft(
                user_id=user_id,
                content=content,
                platform_targets=[raw.get("platform")],
                agent_origin="composer",
                score=raw.get("score"),
                tags=raw.get("tags", []),
                hook_variations=raw.get("hook_variations", []),
            )
            if db:
                db.add(draft)
                await db.flush()

            saved_drafts.append(draft)

        if db:
            await write_audit(
                db,
                actor=user_id,
                action="drafts_generated",
                payload={"count": len(saved_drafts), "platforms": platform_targets},
            )

        logger.info("drafts_generated", user_id=user_id, count=len(saved_drafts))
        return saved_drafts


def _get_compliance():
    from app.agents.compliance_agent import compliance_agent
    return compliance_agent


composer_agent = ComposerAgent()