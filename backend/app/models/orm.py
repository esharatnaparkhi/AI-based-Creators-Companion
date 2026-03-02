"""SQLAlchemy ORM models for all core entities."""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Text, DateTime, Boolean, Integer, Float,
    ForeignKey, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class PlatformEnum(str, enum.Enum):
    youtube = "youtube"
    instagram = "instagram"
    linkedin = "linkedin"
    x = "x"
    email = "email"


class PostStatusEnum(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    published = "published"
    failed = "failed"


class JobStatusEnum(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"
    retrying = "retrying"


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255))
    plan: Mapped[str] = mapped_column(String(50), default="free")
    settings: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    persona_vector_ref: Mapped[Optional[str]] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    accounts: Mapped[list["Account"]] = relationship("Account", back_populates="user", lazy="select")
    posts: Mapped[list["Post"]] = relationship("Post", back_populates="user", lazy="select")
    drafts: Mapped[list["Draft"]] = relationship("Draft", back_populates="user", lazy="select")


# ---------------------------------------------------------------------------
# Account (linked platform)
# ---------------------------------------------------------------------------
class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    platform_user_id: Mapped[Optional[str]] = mapped_column(String(255))
    platform_username: Mapped[Optional[str]] = mapped_column(String(255))
    encrypted_access_token: Mapped[Optional[str]] = mapped_column(Text)
    encrypted_refresh_token: Mapped[Optional[str]] = mapped_column(Text)
    token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    scopes: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    meta: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="accounts")
    posts: Mapped[list["Post"]] = relationship("Post", back_populates="account")


# ---------------------------------------------------------------------------
# Post
# ---------------------------------------------------------------------------
class Post(Base):
    __tablename__ = "posts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    account_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("accounts.id", ondelete="SET NULL"))
    platform: Mapped[Optional[str]] = mapped_column(String(50))
    content: Mapped[Optional[str]] = mapped_column(Text)
    media_refs: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(
    String(50),
    default="draft")
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    platform_post_id: Mapped[Optional[str]] = mapped_column(String(255))
    metrics: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    raw_payload: Mapped[Optional[dict]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="posts")
    account: Mapped[Optional["Account"]] = relationship("Account", back_populates="posts")


# ---------------------------------------------------------------------------
# Draft
# ---------------------------------------------------------------------------
class Draft(Base):
    __tablename__ = "drafts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    platform_targets: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    agent_origin: Mapped[Optional[str]] = mapped_column(String(100))
    score: Mapped[Optional[float]] = mapped_column(Float)
    tags: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    hook_variations: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="drafts")


# ---------------------------------------------------------------------------
# VectorMeta
# ---------------------------------------------------------------------------
class VectorMeta(Base):
    __tablename__ = "vector_meta"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    object_type: Mapped[str] = mapped_column(String(100), nullable=False)
    object_id: Mapped[str] = mapped_column(String(36), nullable=False)
    vector_id: Mapped[str] = mapped_column(String(255), nullable=False)
    extra_metadata: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# ScheduleJob
# ---------------------------------------------------------------------------
class ScheduleJob(Base):
    __tablename__ = "schedule_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    post_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("posts.id", ondelete="CASCADE"))
    draft_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("drafts.id", ondelete="CASCADE"))
    scheduled_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(
    String(50),
    default="pending")
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, default=3)
    result: Mapped[Optional[dict]] = mapped_column(JSON)
    platform_targets: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ---------------------------------------------------------------------------
# AnalyticsRow
# ---------------------------------------------------------------------------
class AnalyticsRow(Base):
    __tablename__ = "analytics_rows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("posts.id", ondelete="SET NULL"))
    metric: Mapped[str] = mapped_column(String(100), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    dimensions: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)


# ---------------------------------------------------------------------------
# AuditLog
# ---------------------------------------------------------------------------
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    actor: Mapped[str] = mapped_column(String(255), nullable=False)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    payload: Mapped[Optional[dict]] = mapped_column(JSON)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)