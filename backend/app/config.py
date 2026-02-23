"""Application configuration using pydantic-settings."""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_env: str = "development"
    secret_key: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    service_auth_token: str = "internal-service-token"

    # Database
    database_url: str = "postgresql+asyncpg://creator:password@localhost:5432/creator_companion"
    redis_url: str = "redis://localhost:6379/0"

    # GCP
    gcp_project_id: str = ""
    gcp_region: str = "us-central1"
    gcs_bucket: str = "creator-companion-media"
    pubsub_topic_ingestion: str = "ingestion-jobs"
    pubsub_topic_publish: str = "publish-jobs"
    pubsub_topic_analytics: str = "analytics-events"
    bigquery_dataset: str = "creator_analytics"

    # OpenAI
    openai_api_key: str = ""
    openai_embedding_model: str = "text-embedding-3-small"
    openai_draft_model: str = "gpt-4o-mini"
    openai_final_model: str = "gpt-4o"

    # Vector DB
    pinecone_api_key: str = ""
    pinecone_environment: str = "us-east-1"
    pinecone_index: str = "creator-content"

    # OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    meta_app_id: str = ""
    meta_app_secret: str = ""
    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""
    x_client_id: str = ""
    x_client_secret: str = ""

    # Encryption
    token_encryption_key: str = ""

    # Sentry
    sentry_dsn: str = ""

    # URLs
    frontend_url: str = "http://localhost:3000"
    api_base_url: str = "http://localhost:8000"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()