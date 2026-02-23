"""Ingestion Agent — fetch historical content, process webhooks, normalize."""
import httpx
import structlog
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.orm import Account, Post, PlatformEnum
from app.agents.auth_agent import auth_agent
from app.services.pubsub import publish_analytics_event
from app.services.audit import write_audit

logger = structlog.get_logger()


class IngestionAgent:
    """Ingests historical posts and subscribes to webhooks."""

    async def sync_account(
        self,
        account_id: str,
        db: AsyncSession,
        days_back: int = 90,
    ) -> dict:
        result = await db.execute(select(Account).where(Account.id == account_id))
        account = result.scalar_one_or_none()
        if not account:
            raise ValueError(f"Account {account_id} not found")

        access_token = await auth_agent.get_valid_access_token(account, db)
        platform = account.platform

        logger.info("ingestion_start", account_id=account_id, platform=platform)

        if platform == PlatformEnum.youtube:
            posts = await self._ingest_youtube(account, access_token, days_back)
        elif platform == PlatformEnum.instagram:
            posts = await self._ingest_instagram(account, access_token, days_back)
        elif platform == PlatformEnum.linkedin:
            posts = await self._ingest_linkedin(account, access_token, days_back)
        elif platform == PlatformEnum.x:
            posts = await self._ingest_x(account, access_token, days_back)
        else:
            posts = []

        saved = 0
        for post_data in posts:
            post = Post(
                user_id=account.user_id,
                account_id=account.id,
                platform=platform,
                content=post_data.get("content", ""),
                status="published",
                published_at=post_data.get("published_at"),
                platform_post_id=post_data.get("platform_id"),
                metrics=post_data.get("metrics", {}),
                raw_payload=post_data,
            )
            db.add(post)
            saved += 1

        account.last_synced_at = datetime.utcnow()
        await db.flush()

        await write_audit(db, actor=account.user_id, action="ingest_sync", payload={
            "account_id": account_id,
            "platform": platform,
            "posts_ingested": saved,
        })

        logger.info("ingestion_complete", account_id=account_id, posts_saved=saved)
        return {"account_id": account_id, "posts_ingested": saved}

    async def _ingest_youtube(self, account: Account, token: str, days_back: int) -> list[dict]:
        """Fetch YouTube channel videos."""
        posts = []
        since = (datetime.utcnow() - timedelta(days=days_back)).isoformat() + "Z"
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "part": "snippet",
                    "forMine": "true",
                    "type": "video",
                    "publishedAfter": since,
                    "maxResults": 50,
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code != 200:
                logger.error("youtube_ingest_error", status=resp.status_code)
                return []
            data = resp.json()
            for item in data.get("items", []):
                snippet = item.get("snippet", {})
                posts.append({
                    "platform_id": item.get("id", {}).get("videoId"),
                    "content": f"{snippet.get('title', '')} {snippet.get('description', '')}",
                    "published_at": snippet.get("publishedAt"),
                    "metrics": {},
                })
        return posts

    async def _ingest_instagram(self, account: Account, token: str, days_back: int) -> list[dict]:
        """Fetch Instagram media."""
        posts = []
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://graph.instagram.com/me/media",
                params={
                    "fields": "id,caption,timestamp,like_count,comments_count",
                    "access_token": token,
                    "limit": 100,
                },
            )
            if resp.status_code != 200:
                logger.error("instagram_ingest_error", status=resp.status_code)
                return []
            for item in resp.json().get("data", []):
                pub_date = datetime.fromisoformat(item.get("timestamp", "").replace("Z", "+00:00"))
                if (datetime.utcnow().replace(tzinfo=None) - pub_date.replace(tzinfo=None)).days > days_back:
                    continue
                posts.append({
                    "platform_id": item.get("id"),
                    "content": item.get("caption", ""),
                    "published_at": item.get("timestamp"),
                    "metrics": {
                        "likes": item.get("like_count", 0),
                        "comments": item.get("comments_count", 0),
                    },
                })
        return posts

    async def _ingest_linkedin(self, account: Account, token: str, days_back: int) -> list[dict]:
        """Fetch LinkedIn posts (UGC Posts API)."""
        posts = []
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.linkedin.com/v2/ugcPosts",
                params={"q": "authors", "count": 50},
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Restli-Protocol-Version": "2.0.0",
                },
            )
            if resp.status_code != 200:
                logger.error("linkedin_ingest_error", status=resp.status_code)
                return []
            for item in resp.json().get("elements", []):
                content = item.get("specificContent", {}).get("com.linkedin.ugc.ShareContent", {})
                posts.append({
                    "platform_id": item.get("id"),
                    "content": content.get("shareCommentary", {}).get("text", ""),
                    "published_at": None,
                    "metrics": {},
                })
        return posts

    async def _ingest_x(self, account: Account, token: str, days_back: int) -> list[dict]:
        """Fetch X/Twitter timeline."""
        posts = []
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.twitter.com/2/users/me/tweets",
                params={
                    "max_results": 100,
                    "tweet.fields": "created_at,public_metrics",
                    "start_time": (datetime.utcnow() - timedelta(days=days_back)).isoformat() + "Z",
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code != 200:
                logger.error("x_ingest_error", status=resp.status_code)
                return []
            for item in resp.json().get("data", []):
                metrics = item.get("public_metrics", {})
                posts.append({
                    "platform_id": item.get("id"),
                    "content": item.get("text", ""),
                    "published_at": item.get("created_at"),
                    "metrics": {
                        "likes": metrics.get("like_count", 0),
                        "comments": metrics.get("reply_count", 0),
                        "views": metrics.get("impression_count", 0),
                    },
                })
        return posts

    async def process_webhook(
        self,
        platform: str,
        payload: dict,
        user_id: str,
        db: AsyncSession,
    ) -> dict:
        """Process incoming webhook from platform."""
        logger.info("webhook_received", platform=platform, user_id=user_id)
        # Platform-specific webhook normalization
        post = Post(
            user_id=user_id,
            platform=platform,
            status="published",
            raw_payload=payload,
            published_at=datetime.utcnow(),
        )
        db.add(post)
        await db.flush()
        return {"post_id": post.id, "status": "ingested"}


ingestion_agent = IngestionAgent()