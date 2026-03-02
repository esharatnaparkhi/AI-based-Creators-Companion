"""Add image_url column to drafts.

Revision ID: 0002_add_image_url_to_drafts
Revises: 0001_initial
Create Date: 2026-03-02 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_add_image_url_to_drafts"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("drafts", sa.Column("image_url", sa.Text, nullable=True))


def downgrade() -> None:
    op.drop_column("drafts", "image_url")
