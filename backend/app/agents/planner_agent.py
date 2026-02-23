"""Planner Agent — weekly calendar suggestions using heuristics."""
from datetime import datetime, timedelta
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.orm import Post, AnalyticsRow

logger = structlog.get_logger()

# Platform best posting times (hour in UTC)
BEST_HOURS = {
    "instagram": [8, 11, 17, 19],
    "linkedin": [8, 10, 12, 17],
    "x": [8, 12, 16, 20],
    "youtube": [14, 16, 20],
    "email": [9, 14],
}

# Best days of week (0=Monday)
BEST_DAYS = {
    "instagram": [0, 2, 4],  # Mon, Wed, Fri
    "linkedin": [1, 2, 3],   # Tue, Wed, Thu
    "x": [0, 1, 2, 3, 4],    # Weekdays
    "youtube": [5, 6],        # Weekend
    "email": [1, 3],          # Tue, Thu
}


class PlannerAgent:
    """Generates weekly posting calendar using analytics + heuristics."""

    async def generate_weekly_plan(
        self,
        user_id: str,
        platforms: list[str],
        db: AsyncSession,
        posts_per_platform: int = 3,
    ) -> list[dict]:
        """Return a list of suggested posting slots."""
        # Try to use analytics to refine best times
        best_times = await self._get_best_times_from_analytics(user_id, db)

        suggestions = []
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

        for platform in platforms:
            platform_hours = best_times.get(platform) or BEST_HOURS.get(platform, [9, 15])
            platform_days = BEST_DAYS.get(platform, [0, 2, 4])
            count = 0

            for day_offset in range(7):
                if count >= posts_per_platform:
                    break
                day = today + timedelta(days=day_offset)
                weekday = day.weekday()
                if weekday not in platform_days:
                    continue

                hour = platform_hours[count % len(platform_hours)]
                slot = day.replace(hour=hour)
                suggestions.append({
                    "platform": platform,
                    "suggested_at": slot.isoformat(),
                    "day_label": slot.strftime("%A, %b %d"),
                    "time_label": slot.strftime("%I:%M %p UTC"),
                    "reason": f"Best engagement time for {platform}",
                })
                count += 1

        return sorted(suggestions, key=lambda x: x["suggested_at"])

    async def _get_best_times_from_analytics(
        self,
        user_id: str,
        db: AsyncSession,
    ) -> dict[str, list[int]]:
        """Query DB to find historically best posting hours per platform."""
        result = await db.execute(
            select(AnalyticsRow).where(
                AnalyticsRow.user_id == user_id,
                AnalyticsRow.metric == "likes",
            ).limit(200)
        )
        rows = result.scalars().all()

        if not rows:
            return {}

        # Group by platform and hour
        from collections import defaultdict
        hour_scores: dict[str, dict[int, float]] = defaultdict(lambda: defaultdict(float))

        for row in rows:
            dims = row.dimensions or {}
            platform = dims.get("platform")
            hour = dims.get("hour")
            if platform and hour is not None:
                hour_scores[platform][int(hour)] += row.value

        best_times = {}
        for platform, hour_map in hour_scores.items():
            sorted_hours = sorted(hour_map, key=hour_map.get, reverse=True)
            best_times[platform] = sorted_hours[:4]

        return best_times


planner_agent = PlannerAgent()