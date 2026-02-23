"""Ingestion API routes."""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.orm import Account
from app.models.schemas import SyncResponse
from app.services.security import get_current_user_id
from app.agents.ingestion_agent import ingestion_agent
from app.agents.vectorization_agent import vectorization_agent

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("/{account_id}/sync", response_model=SyncResponse)
async def sync_account(
    account_id: str,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Enqueue a full content sync for the given account."""
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Run in background
    background_tasks.add_task(_run_sync, account_id, user_id)

    return SyncResponse(
        account_id=account_id,
        status="queued",
        message=f"Sync started for {account.platform}",
    )


@router.post("/{account_id}/sync/wait", response_model=dict)
async def sync_account_wait(
    account_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Synchronous sync — waits for completion (dev/small accounts)."""
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Account not found")

    ingest_result = await ingestion_agent.sync_account(account_id, db)
    vec_result = await vectorization_agent.vectorize_user_posts(user_id, db)
    return {**ingest_result, **vec_result}


async def _run_sync(account_id: str, user_id: str):
    """Background task for async sync."""
    from app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        try:
            await ingestion_agent.sync_account(account_id, db)
            await vectorization_agent.vectorize_user_posts(user_id, db)
            await db.commit()
        except Exception as exc:
            import structlog
            structlog.get_logger().error("background_sync_failed", error=str(exc))


@router.post("/webhook/{platform}")
async def receive_webhook(
    platform: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """Receive webhook from platform (platform calls this)."""
    # In production, verify platform-specific webhook signatures here
    user_id = payload.get("user_id", "")
    result = await ingestion_agent.process_webhook(platform, payload, user_id, db)
    return result