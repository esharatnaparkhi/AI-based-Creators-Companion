"""Posts and scheduling API routes."""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.database import get_db
from app.models.orm import Post, Draft, ScheduleJob, JobStatusEnum, PostStatusEnum
from app.models.schemas import ScheduleRequest, ScheduleResponse, PostOut, PublishResult
from app.services.security import get_current_user_id, verify_service_token
from app.agents.publisher_agent import publisher_agent

router = APIRouter(tags=["posts"])


@router.get("/posts", response_model=list[PostOut])
async def list_posts(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    status: str | None = None,
    limit: int = 20,
    offset: int = 0,
):
    query = select(Post).where(Post.user_id == user_id)
    if status:
        query = query.where(Post.status == status)
    query = query.order_by(Post.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/posts/schedule", response_model=ScheduleResponse)
async def schedule_post(
    body: ScheduleRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Schedule a draft for publishing."""
    if body.scheduled_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="scheduled_at must be in the future")

    # Verify draft ownership
    result = await db.execute(
        select(Draft).where(Draft.id == body.draft_id, Draft.user_id == user_id)
    )
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    # Create post record
    post = Post(
        user_id=user_id,
        content=draft.content,
        status=PostStatusEnum.scheduled,
        scheduled_at=body.scheduled_at,
        platform=body.platforms[0] if body.platforms else None,
    )
    db.add(post)
    await db.flush()

    # Create schedule job
    job = ScheduleJob(
        post_id=post.id,
        draft_id=body.draft_id,
        scheduled_at=body.scheduled_at,
        status=JobStatusEnum.pending,
        platform_targets=body.platforms,
    )
    db.add(job)
    await db.flush()

    return ScheduleResponse(
        job_id=job.id,
        scheduled_at=body.scheduled_at,
        status="scheduled",
    )


@router.post("/publish/{job_id}/execute", response_model=PublishResult)
async def execute_publish(
    job_id: str,
    x_service_token: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """Internal worker endpoint — execute a publish job."""
    if not x_service_token or not verify_service_token(x_service_token):
        raise HTTPException(status_code=403, detail="Forbidden: invalid service token")

    result = await publisher_agent.execute_job(job_id, db)
    return result


@router.get("/schedule/jobs")
async def list_scheduled_jobs(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ScheduleJob, Post).join(Post, Post.id == ScheduleJob.post_id, isouter=True)
        .where(Post.user_id == user_id)
        .order_by(ScheduleJob.scheduled_at)
        .limit(50)
    )
    rows = result.all()
    return [
        {
            "job_id": job.id,
            "scheduled_at": job.scheduled_at,
            "status": job.status,
            "platforms": job.platform_targets,
            "content_preview": (post.content or "")[:100] if post else "",
        }
        for job, post in rows
    ]


@router.delete("/schedule/jobs/{job_id}")
async def cancel_job(
    job_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ScheduleJob).where(ScheduleJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status not in [JobStatusEnum.pending]:
        raise HTTPException(status_code=400, detail="Can only cancel pending jobs")

    job.status = JobStatusEnum.failed
    job.result = {"error": "Cancelled by user"}
    await db.flush()
    return {"cancelled": job_id}