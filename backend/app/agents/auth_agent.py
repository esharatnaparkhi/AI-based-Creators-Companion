"""Auth Agent — OAuth flows, token refresh, encrypted storage."""
import secrets
import httpx
import structlog
from datetime import datetime, timedelta
from urllib.parse import urlencode
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.orm import Account, User, PlatformEnum
from app.services.security import encrypt_token, decrypt_token, hash_password, verify_password, create_access_token
from app.services.oauth_config import OAUTH_CONFIGS, get_redirect_uri
from app.services.audit import write_audit
from app.config import settings

logger = structlog.get_logger()


class AuthAgent:
    """Handles OAuth flows and token lifecycle."""

    async def start_oauth(self, platform: str, user_id: str) -> dict:
        """Generate OAuth authorization URL with CSRF state."""
        config = OAUTH_CONFIGS.get(platform)
        if not config or config.get("type") == "smtp":
            raise ValueError(f"OAuth not supported for platform: {platform}")

        state = f"{user_id}:{secrets.token_urlsafe(32)}"
        params = {
            "client_id": config["client_id"],
            "redirect_uri": get_redirect_uri(platform),
            "scope": " ".join(config["scopes"]),
            "response_type": "code",
            "state": state,
            "access_type": "offline",  # for refresh tokens
        }
        redirect_url = f"{config['authorize_url']}?{urlencode(params)}"
        return {"redirect_url": redirect_url, "state": state}

    async def handle_oauth_callback(
        self,
        platform: str,
        code: str,
        state: str,
        db: AsyncSession,
    ) -> Account:
        """Exchange code for tokens and store encrypted account."""
        # Validate state
        parts = state.split(":", 1)
        if len(parts) != 2:
            raise ValueError("Invalid OAuth state")
        user_id = parts[0]

        config = OAUTH_CONFIGS[platform]

        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                config["token_url"],
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": get_redirect_uri(platform),
                    "client_id": config["client_id"],
                    "client_secret": config["client_secret"],
                },
                headers={"Accept": "application/json"},
            )
            token_data = token_resp.json()

        access_token = token_data.get("access_token", "")
        refresh_token = token_data.get("refresh_token", "")
        expires_in = token_data.get("expires_in", 3600)

        # Fetch user info from platform
        userinfo = await self._fetch_userinfo(platform, access_token, config)

        # Check if account already exists
        result = await db.execute(
            select(Account).where(
                Account.user_id == user_id,
                Account.platform == platform,
            )
        )
        account = result.scalar_one_or_none()

        if not account:
            account = Account(user_id=user_id, platform=platform)
            db.add(account)

        account.encrypted_access_token = encrypt_token(access_token) if access_token else None
        account.encrypted_refresh_token = encrypt_token(refresh_token) if refresh_token else None
        account.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        account.platform_user_id = userinfo.get("id") or userinfo.get("sub")
        account.platform_username = userinfo.get("username") or userinfo.get("name")
        account.is_active = True

        await db.flush()
        await write_audit(db, actor=user_id, action="oauth_connect", payload={"platform": platform})
        logger.info("oauth_connected", user_id=user_id, platform=platform)
        return account

    async def refresh_token(self, account: Account, db: AsyncSession) -> Account:
        """Refresh an expired OAuth access token."""
        config = OAUTH_CONFIGS.get(account.platform)
        if not config or not account.encrypted_refresh_token:
            raise ValueError("Cannot refresh token")

        refresh_token = decrypt_token(account.encrypted_refresh_token)
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                config["token_url"],
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": config["client_id"],
                    "client_secret": config["client_secret"],
                },
                headers={"Accept": "application/json"},
            )
            data = resp.json()

        if "access_token" not in data:
            account.is_active = False
            await db.flush()
            raise ValueError(f"Token refresh failed: {data}")

        account.encrypted_access_token = encrypt_token(data["access_token"])
        if "refresh_token" in data:
            account.encrypted_refresh_token = encrypt_token(data["refresh_token"])
        account.token_expires_at = datetime.utcnow() + timedelta(seconds=data.get("expires_in", 3600))
        await db.flush()
        return account

    async def get_valid_access_token(self, account: Account, db: AsyncSession) -> str:
        """Return a valid (refreshed if needed) access token."""
        if account.token_expires_at and account.token_expires_at < datetime.utcnow():
            account = await self.refresh_token(account, db)
        return decrypt_token(account.encrypted_access_token)

    async def _fetch_userinfo(self, platform: str, access_token: str, config: dict) -> dict:
        url = config.get("userinfo_url", "")
        if not url:
            return {}
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                url,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            return resp.json() if resp.status_code == 200 else {}


auth_agent = AuthAgent()