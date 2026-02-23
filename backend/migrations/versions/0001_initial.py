"""Initial schema — all tables.

Revision ID: 0001_initial
Revises:
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255)),
        sa.Column("plan", sa.String(50), server_default="free"),
        sa.Column("settings", JSON),
        sa.Column("persona_vector_ref", sa.String(255)),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "accounts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform", sa.String(50), nullable=False),
        sa.Column("platform_user_id", sa.String(255)),
        sa.Column("platform_username", sa.String(255)),
        sa.Column("encrypted_access_token", sa.Text),
        sa.Column("encrypted_refresh_token", sa.Text),
        sa.Column("token_expires_at", sa.DateTime),
        sa.Column("scopes", JSON),
        sa.Column("meta", JSON),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("last_synced_at", sa.DateTime),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_accounts_user_platform", "accounts", ["user_id", "platform"])

    op.create_table(
        "posts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_id", sa.String(36), sa.ForeignKey("accounts.id", ondelete="SET NULL")),
        sa.Column("platform", sa.String(50)),
        sa.Column("content", sa.Text),
        sa.Column("media_refs", JSON),
        sa.Column("status", sa.String(50), server_default="draft"),
        sa.Column("scheduled_at", sa.DateTime),
        sa.Column("published_at", sa.DateTime),
        sa.Column("platform_post_id", sa.String(255)),
        sa.Column("metrics", JSON),
        sa.Column("raw_payload", JSON),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_posts_user_status", "posts", ["user_id", "status"])

    op.create_table(
        "drafts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("platform_targets", JSON),
        sa.Column("agent_origin", sa.String(100)),
        sa.Column("score", sa.Float),
        sa.Column("tags", JSON),
        sa.Column("hook_variations", JSON),
        sa.Column("is_approved", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "vector_meta",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("object_type", sa.String(100), nullable=False),
        sa.Column("object_id", sa.String(36), nullable=False),
        sa.Column("vector_id", sa.String(255), nullable=False),
        sa.Column("metadata", JSON),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_vector_meta_object", "vector_meta", ["object_type", "object_id"])

    op.create_table(
        "schedule_jobs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("post_id", sa.String(36), sa.ForeignKey("posts.id", ondelete="CASCADE")),
        sa.Column("draft_id", sa.String(36), sa.ForeignKey("drafts.id", ondelete="CASCADE")),
        sa.Column("scheduled_at", sa.DateTime, nullable=False),
        sa.Column("status", sa.String(50), server_default="pending"),
        sa.Column("retry_count", sa.Integer, server_default="0"),
        sa.Column("max_retries", sa.Integer, server_default="3"),
        sa.Column("result", JSON),
        sa.Column("platform_targets", JSON),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_schedule_jobs_status_scheduled", "schedule_jobs", ["status", "scheduled_at"])

    op.create_table(
        "analytics_rows",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("post_id", sa.String(36), sa.ForeignKey("posts.id", ondelete="SET NULL")),
        sa.Column("metric", sa.String(100), nullable=False),
        sa.Column("timestamp", sa.DateTime, nullable=False),
        sa.Column("value", sa.Float, nullable=False),
        sa.Column("dimensions", JSON),
    )
    op.create_index("ix_analytics_user_metric", "analytics_rows", ["user_id", "metric", "timestamp"])

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("actor", sa.String(255), nullable=False),
        sa.Column("action", sa.String(255), nullable=False),
        sa.Column("payload", JSON),
        sa.Column("timestamp", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_audit_logs_actor", "audit_logs", ["actor", "timestamp"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("analytics_rows")
    op.drop_table("schedule_jobs")
    op.drop_table("vector_meta")
    op.drop_table("drafts")
    op.drop_table("posts")
    op.drop_table("accounts")
    op.drop_table("users")