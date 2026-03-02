"""Pydantic request/response schemas."""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class UserRegister(BaseModel):
    email: EmailStr
    name: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str


class OAuthStartResponse(BaseModel):
    redirect_url: str
    state: str


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------
class UserOut(BaseModel):
    id: str
    email: str
    name: str
    plan: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Account
# ---------------------------------------------------------------------------
class AccountOut(BaseModel):
    id: str
    platform: str
    platform_username: Optional[str]
    is_active: bool
    last_synced_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Draft
# ---------------------------------------------------------------------------
class DraftGenerateRequest(BaseModel):
    user_id: str
    prompts: Optional[List[str]] = None
    platform_targets: List[str] = Field(default_factory=list)
    topic: Optional[str] = None
    tone: Optional[str] = None
    keywords: Optional[List[str]] = None
    target_audience: Optional[str] = None
    content_style: Optional[str] = None
    post_length: Optional[str] = None  # "short", "medium", "long"
    generate_image: bool = False


class DraftOut(BaseModel):
    id: str
    content: str
    platform_targets: Optional[List[str]]
    hook_variations: Optional[List[str]]
    score: Optional[float]
    tags: Optional[List[str]]
    image_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Scheduling
# ---------------------------------------------------------------------------
class ScheduleRequest(BaseModel):
    draft_id: str
    scheduled_at: datetime
    platforms: List[str]


class ScheduleResponse(BaseModel):
    job_id: str
    scheduled_at: datetime
    status: str


# ---------------------------------------------------------------------------
# Post
# ---------------------------------------------------------------------------
class PostOut(BaseModel):
    id: str
    platform: Optional[str]
    content: Optional[str]
    status: str
    scheduled_at: Optional[datetime]
    published_at: Optional[datetime]
    metrics: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------
class AnalyticsSummary(BaseModel):
    total_posts: int
    total_likes: float
    total_comments: float
    total_views: float
    avg_engagement_rate: float
    best_posting_hours: List[int]
    platform_breakdown: dict
    recent_trend: str


# ---------------------------------------------------------------------------
# Publish
# ---------------------------------------------------------------------------
class PublishResult(BaseModel):
    job_id: str
    status: str
    platform_results: List[dict]
    published_at: Optional[datetime]


# ---------------------------------------------------------------------------
# Ingest
# ---------------------------------------------------------------------------
class SyncResponse(BaseModel):
    account_id: str
    status: str
    message: str