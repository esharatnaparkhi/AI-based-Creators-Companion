"""Auth API routes."""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.orm import User
from app.models.schemas import UserRegister, UserLogin, TokenResponse, OAuthStartResponse
from app.services.security import (
    hash_password, verify_password, create_access_token, get_current_user_id
)
from app.agents.auth_agent import auth_agent
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

SUPPORTED_PLATFORMS = ["youtube", "instagram", "linkedin", "x"]


@router.post("/register", response_model=TokenResponse)
async def register(body: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=body.email,
        name=body.name,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    await db.flush()

    token = create_access_token({"sub": user.id, "email": user.email})
    return TokenResponse(access_token=token, user_id=user.id, email=user.email)


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password or ""):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.id, "email": user.email})
    return TokenResponse(access_token=token, user_id=user.id, email=user.email)


@router.get("/oauth/{platform}/start", response_model=OAuthStartResponse)
async def oauth_start(
    platform: str,
    user_id: str = Depends(get_current_user_id),
):
    if platform not in SUPPORTED_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")
    result = await auth_agent.start_oauth(platform, user_id)
    return OAuthStartResponse(redirect_url=result["redirect_url"], state=result["state"])


@router.get("/oauth/{platform}/callback")
async def oauth_callback(
    platform: str,
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    if platform not in SUPPORTED_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")
    try:
        account = await auth_agent.handle_oauth_callback(platform, code, state, db)
        # Redirect to frontend with success
        return RedirectResponse(
            url=f"{settings.frontend_url}/accounts?connected={platform}&account_id={account.id}"
        )
    except Exception as exc:
        return RedirectResponse(
            url=f"{settings.frontend_url}/accounts?error={str(exc)}"
        )


@router.get("/me")
async def me(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user.id, "email": user.email, "name": user.name, "plan": user.plan}