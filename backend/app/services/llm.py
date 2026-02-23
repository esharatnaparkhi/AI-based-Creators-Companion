"""OpenAI LLM and embedding service with caching."""
from typing import Optional
import structlog
from openai import AsyncOpenAI
from app.config import settings
from app.services.cache import cache_get, cache_set
import hashlib
import json

logger = structlog.get_logger()

_client: Optional[AsyncOpenAI] = None


def get_openai_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


async def get_embedding(text: str) -> list[float]:
    """Generate text embedding with caching."""
    cache_key = f"emb:{hashlib.sha256(text.encode()).hexdigest()}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    client = get_openai_client()
    response = await client.embeddings.create(
        model=settings.openai_embedding_model,
        input=text[:8191],  # token limit guard
    )
    embedding = response.data[0].embedding
    await cache_set(cache_key, embedding, ttl=86400)
    return embedding


async def generate_text(
    system_prompt: str,
    user_prompt: str,
    model: Optional[str] = None,
    max_tokens: int = 2000,
    temperature: float = 0.7,
) -> str:
    """Generate text with OpenAI chat completion."""
    cache_key = f"gen:{hashlib.sha256((system_prompt+user_prompt).encode()).hexdigest()}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    client = get_openai_client()
    chosen_model = model or settings.openai_draft_model
    response = await client.chat.completions.create(
        model=chosen_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    result = response.choices[0].message.content or ""
    await cache_set(cache_key, result, ttl=600)
    return result


PLATFORM_RULES = {
    "instagram": {
        "max_chars": 2200,
        "tone": "casual, visual, use hashtags",
        "format": "Short punchy lines. End with 5-10 relevant hashtags.",
    },
    "linkedin": {
        "max_chars": 3000,
        "tone": "professional, insightful",
        "format": "Start with a hook. Use short paragraphs. End with a question.",
    },
    "x": {
        "max_chars": 280,
        "tone": "concise, witty",
        "format": "Single tweet or thread. Be direct.",
    },
    "youtube": {
        "max_chars": 5000,
        "tone": "engaging, educational",
        "format": "Video description. Timestamps optional. Call to action at end.",
    },
    "email": {
        "max_chars": 10000,
        "tone": "personal, direct",
        "format": "Subject line + body. Clear CTA. Sign off professionally.",
    },
}


async def generate_drafts(
    user_context: str,
    topic: str,
    platform_targets: list[str],
    tone: Optional[str] = None,
    rag_context: Optional[str] = None,
) -> list[dict]:
    """Generate platform-aware drafts for each target platform."""
    drafts = []
    for platform in platform_targets:
        rules = PLATFORM_RULES.get(platform, {})
        system_prompt = f"""You are an expert social media content creator.
Platform: {platform}
Format rules: {rules.get('format', '')}
Tone: {tone or rules.get('tone', 'engaging')}
Max characters: {rules.get('max_chars', 2000)}

Creator's past content and style context:
{rag_context or 'No previous context available.'}

Always stay on-brand and within character limits."""

        user_prompt = f"""Create content about: {topic}
{('Additional context: ' + chr(10).join(user_context.split(chr(10))[:5])) if user_context else ''}

Return a JSON object with keys:
- "content": the main post content
- "hook_variations": list of 3 alternative opening hooks
- "score": estimated engagement score 1-10
- "tags": list of relevant tags/topics"""

        raw = await generate_text(system_prompt, user_prompt, max_tokens=1500)

        # Parse JSON response
        try:
            import re
            json_match = re.search(r'\{.*\}', raw, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
            else:
                parsed = {"content": raw, "hook_variations": [], "score": 5.0, "tags": []}
        except Exception:
            parsed = {"content": raw, "hook_variations": [], "score": 5.0, "tags": []}

        drafts.append({
            "platform": platform,
            **parsed,
        })

    return drafts