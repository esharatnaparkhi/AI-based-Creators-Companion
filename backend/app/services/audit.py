"""Audit log service."""
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.orm import AuditLog


async def write_audit(
    db: AsyncSession,
    actor: str,
    action: str,
    payload: dict | None = None,
) -> AuditLog:
    log = AuditLog(
        actor=actor,
        action=action,
        payload=payload or {},
        timestamp=datetime.utcnow(),
    )
    db.add(log)
    await db.flush()
    return log