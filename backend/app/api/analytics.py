"""Analytics API routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.schemas import AnalyticsSummary
from app.services.security import get_current_user_id
from app.agents.analytics_agent import analytics_agent
from app.agents.planner_agent import planner_agent

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def analytics_summary(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Return aggregated analytics KPIs."""
    return await analytics_agent.compute_summary(user_id, db)


@router.post("/refresh")
async def refresh_metrics(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Fetch latest metrics from platforms."""
    result = await analytics_agent.fetch_and_store_metrics(user_id, db)
    return result


@router.get("/calendar")
async def posting_calendar(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get AI-suggested posting calendar for the week."""
    from app.models.orm import Account
    from sqlalchemy import select

    result = await db.execute(
        select(Account).where(Account.user_id == user_id, Account.is_active == True)
    )
    accounts = result.scalars().all()
    platforms = list(set(a.platform for a in accounts))

    plan = await planner_agent.generate_weekly_plan(user_id, platforms, db)
    return {"suggestions": plan}