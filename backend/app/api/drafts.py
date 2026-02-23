"""Drafts API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.orm import Draft
from app.models.schemas import DraftGenerateRequest, DraftOut
from app.services.security import get_current_user_id
from app.agents.composer_agent import composer_agent

router = APIRouter(prefix="/drafts", tags=["drafts"])


@router.post("/generate", response_model=list[DraftOut])
async def generate_drafts(
    body: DraftGenerateRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Generate AI drafts for one or more platforms."""
    if not body.platform_targets:
        raise HTTPException(status_code=400, detail="At least one platform target required")

    drafts = await composer_agent.generate(
        user_id=user_id,
        platform_targets=body.platform_targets,
        topic=body.topic,
        prompts=body.prompts,
        tone=body.tone,
        db=db,
    )

    if not drafts:
        raise HTTPException(status_code=422, detail="Draft generation failed compliance checks")

    return drafts


@router.get("", response_model=list[DraftOut])
async def list_drafts(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
    offset: int = 0,
):
    result = await db.execute(
        select(Draft).where(Draft.user_id == user_id)
        .order_by(Draft.created_at.desc())
        .limit(limit).offset(offset)
    )
    return result.scalars().all()


@router.get("/{draft_id}", response_model=DraftOut)
async def get_draft(
    draft_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Draft).where(Draft.id == draft_id, Draft.user_id == user_id)
    )
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return draft


@router.patch("/{draft_id}", response_model=DraftOut)
async def update_draft(
    draft_id: str,
    body: dict,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Draft).where(Draft.id == draft_id, Draft.user_id == user_id)
    )
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    if "content" in body:
        draft.content = body["content"]
    if "is_approved" in body:
        draft.is_approved = body["is_approved"]

    await db.flush()
    return draft


@router.delete("/{draft_id}")
async def delete_draft(
    draft_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Draft).where(Draft.id == draft_id, Draft.user_id == user_id)
    )
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    await db.delete(draft)
    return {"deleted": draft_id}