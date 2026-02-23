"""Analytics Agent — compute KPIs, fetch metrics, populate dashboard."""
from datetime import datetime, timedelta
from collections import defaultdict
import httpx
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.orm import Post, AnalyticsRow, Account
from app.agents.auth_agent import auth_agent

logger = structlog.get_logger()


class AnalyticsAgent:
    """Computes analytics KPIs and fetches metrics from platforms."""

    async def compute_summary(self, user_id: str, db: AsyncSession) -> dict:
        """Return aggregated analytics summary for the dashboard."""
        # Fetch analytics rows
        result = await db.execute(
            select(AnalyticsRow).where(
                AnalyticsRow.user_id == user_id,
                AnalyticsRow.timestamp >= datetime.utcnow() - timedelta(days=30),
            )
        )
        rows = result.scalars().all()

        # Fetch published posts
        posts_result = await db.execute(
            select(Post).where(
                Post.user_id == user_id,
                Post.status == "published",
            )
        )
        posts = posts_result.scalars().all()

        total_likes = sum(r.value for r in rows if r.metric == "likes")
        total_comments = sum(r.value for r in rows if r.metric == "comments")
        total_views = sum(r.value for r in rows if r.metric == "views")
        total_posts = len(posts)

        # Also aggregate from post.metrics
        for post in posts:
            metrics = post.metrics or {}
            total_likes += metrics.get("likes", 0)
            total_comments += metrics.get("comments", 0)
            total_views += metrics.get("views", 0)

        avg_engagement = 0.0
        if total_posts > 0 and total_views > 0:
            avg_engagement = ((total_likes + total_comments) / total_views) * 100

        # Best posting hours
        hour_engagement: dict[int, float] = defaultdict(float)
        for post in posts:
            if post.published_at:
                hour = post.published_at.hour
                m = post.metrics or {}
                hour_engagement[hour] += m.get("likes", 0) + m.get("comments", 0)

        best_hours = sorted(hour_engagement, key=hour_engagement.get, reverse=True)[:4]

        # Platform breakdown
        platform_breakdown: dict[str, dict] = defaultdict(lambda: {"posts": 0, "likes": 0, "comments": 0})
        for post in posts:
            platform = post.platform or "unknown"
            m = post.metrics or {}
            platform_breakdown[platform]["posts"] += 1
            platform_breakdown[platform]["likes"] += m.get("likes", 0)
            platform_breakdown[platform]["comments"] += m.get("comments", 0)

        # Simple trend
        recent_views = sum(r.value for r in rows if r.metric == "views" and
                          r.timestamp >= datetime.utcnow() - timedelta(days=7))
        older_views = sum(r.value for r in rows if r.metric == "views" and
                         r.timestamp < datetime.utcnow() - timedelta(days=7))
        if older_views > 0:
            trend = "up" if recent_views > older_views * 0.9 else "down"
        else:
            trend = "neutral"

        return {
            "total_posts": total_posts,
            "total_likes": total_likes,
            "total_comments": total_comments,
            "total_views": total_views,
            "avg_engagement_rate": round(avg_engagement, 2),
            "best_posting_hours": best_hours or [9, 12, 17, 20],
            "platform_breakdown": dict(platform_breakdown),
            "recent_trend": trend,
        }

    async def fetch_and_store_metrics(
        self,
        user_id: str,
        db: AsyncSession,
    ) -> dict:
        """Fetch latest metrics from platforms and store them."""
        result = await db.execute(
            select(Account).where(
                Account.user_id == user_id,
                Account.is_active == True,
            )
        )
        accounts = result.scalars().all()
        total_stored = 0

        for account in accounts:
            try:
                token = await auth_agent.get_valid_access_token(account, db)
                metrics = await self._fetch_platform_metrics(account, token)

                for m in metrics:
                    row = AnalyticsRow(
                        user_id=user_id,
                        post_id=m.get("post_id"),
                        metric=m["metric"],
                        value=m["value"],
                        dimensions=m.get("dimensions", {}),
                        timestamp=datetime.utcnow(),
                    )
                    db.add(row)
                    total_stored += 1
            except Exception as exc:
                logger.error("metrics_fetch_error", account_id=account.id, error=str(exc))

        await db.flush()
        return {"user_id": user_id, "metrics_stored": total_stored}

    async def _fetch_platform_metrics(self, account: Account, token: str) -> list[dict]:
        """Fetch metrics from a specific platform."""
        platform = account.platform
        metrics = []

        if platform == "x":
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://api.twitter.com/2/users/me/tweets",
                    params={"tweet.fields": "public_metrics", "max_results": 10},
                    headers={"Authorization": f"Bearer {token}"},
                )
                if resp.status_code == 200:
                    for tweet in resp.json().get("data", []):
                        pm = tweet.get("public_metrics", {})
                        for metric_name, value in pm.items():
                            clean_name = metric_name.replace("_count", "")
                            metrics.append({
                                "metric": clean_name,
                                "value": value,
                                "dimensions": {"platform": "x", "post_id": tweet["id"]},
                            })

        elif platform == "instagram":
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://graph.instagram.com/me/media",
                    params={
                        "fields": "id,like_count,comments_count",
                        "access_token": token,
                    },
                )
                if resp.status_code == 200:
                    for item in resp.json().get("data", []):
                        metrics.extend([
                            {"metric": "likes", "value": item.get("like_count", 0),
                             "dimensions": {"platform": "instagram", "post_id": item["id"]}},
                            {"metric": "comments", "value": item.get("comments_count", 0),
                             "dimensions": {"platform": "instagram", "post_id": item["id"]}},
                        ])

        return metrics


analytics_agent = AnalyticsAgent()