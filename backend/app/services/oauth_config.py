"""OAuth platform configurations."""
from app.config import settings

OAUTH_CONFIGS = {
    "youtube": {
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "scopes": [
            "https://www.googleapis.com/auth/youtube.readonly",
            "https://www.googleapis.com/auth/youtube.upload",
            "openid", "email", "profile",
        ],
        "userinfo_url": "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    "instagram": {
        "client_id": settings.meta_app_id,
        "client_secret": settings.meta_app_secret,
        "authorize_url": "https://api.instagram.com/oauth/authorize",
        "token_url": "https://api.instagram.com/oauth/access_token",
        "scopes": ["instagram_basic", "instagram_content_publish", "pages_read_engagement"],
        "userinfo_url": "https://graph.instagram.com/me?fields=id,username",
    },
    "linkedin": {
        "client_id": settings.linkedin_client_id,
        "client_secret": settings.linkedin_client_secret,
        "authorize_url": "https://www.linkedin.com/oauth/v2/authorization",
        "token_url": "https://www.linkedin.com/oauth/v2/accessToken",
        "scopes": ["r_liteprofile", "r_emailaddress", "w_member_social"],
        "userinfo_url": "https://api.linkedin.com/v2/me",
    },
    "x": {
        "client_id": settings.x_client_id,
        "client_secret": settings.x_client_secret,
        "authorize_url": "https://twitter.com/i/oauth2/authorize",
        "token_url": "https://api.twitter.com/2/oauth2/token",
        "scopes": ["tweet.read", "tweet.write", "users.read", "offline.access"],
        "userinfo_url": "https://api.twitter.com/2/users/me",
    },
    "email": {
        # Email uses SMTP credentials, not OAuth — handled differently
        "type": "smtp",
    },
}


def get_redirect_uri(platform: str) -> str:
    return f"{settings.api_base_url}/auth/oauth/{platform}/callback"