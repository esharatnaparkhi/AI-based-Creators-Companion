"""GDPR compliance routes: data export and deletion."""
import json
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database import get_db
from app.models.orm import User, Account, Post, Draft, AnalyticsRow, AuditLog
from app.services.security import get_current_user_id
from app.services.vector_db import delete_vectors_by_user

router = APIRouter(prefix="/gdpr", tags=["gdpr"])


@router.get("/export")
async def export_data(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Export all user data as JSON."""
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()

    posts_result = await db.execute(select(Post).where(Post.user_id == user_id))
    drafts_result = await db.execute(select(Draft).where(Draft.user_id == user_id))

    export = {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "created_at": str(user.created_at),
        } if user else {},
        "posts": [
            {
                "id": p.id,
                "content": p.content,
                "platform": p.platform,
                "status": p.status,
                "published_at": str(p.published_at) if p.published_at else None,
            }
            for p in posts_result.scalars().all()
        ],
        "drafts": [
            {"id": d.id, "content": d.content, "created_at": str(d.created_at)}
            for d in drafts_result.scalars().all()
        ],
    }
    return JSONResponse(content=export)


@router.delete("/delete-account")
async def delete_account(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete all user data (GDPR right to erasure)."""
    # Delete vectors
    await delete_vectors_by_user(user_id)

    # Delete DB records (cascade handles related)
    await db.execute(delete(User).where(User.id == user_id))
    await db.flush()

    return {"status": "deleted", "user_id": user_id}