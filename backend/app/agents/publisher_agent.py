"""Publisher Agent — execute scheduled publishes with retry/backoff."""
import asyncio
import httpx
import structlog
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.orm import ScheduleJob, Post, Draft, Account, JobStatusEnum, PostStatusEnum
from app.agents.auth_agent import auth_agent
from app.agents.compliance_agent import compliance_agent
from app.services.audit import write_audit

logger = structlog.get_logger()


class PublisherAgent:
    """Executes scheduled post publishes with retry logic."""

    async def execute_job(self, job_id: str, db: AsyncSession) -> dict:
        """Execute a scheduled publish job."""
        result = await db.execute(select(ScheduleJob).where(ScheduleJob.id == job_id))
        job = result.scalar_one_or_none()
        if not job:
            raise ValueError(f"Job {job_id} not found")

        # Get content
        content, user_id, platform_targets = await self._get_job_content(job, db)
        if not content:
            job.status = JobStatusEnum.failed
            job.result = {"error": "No content found"}
            await db.flush()
            return {"job_id": job_id, "status": "failed"}

        job.status = JobStatusEnum.running
        await db.flush()

        platform_results = []
        all_success = True

        for platform in (platform_targets or []):
            # Compliance check
            review = await compliance_agent.review_before_publish(content, platform)
            if not review["approved"]:
                platform_results.append({
                    "platform": platform,
                    "success": False,
                    "error": f"Failed compliance: {review}",
                    "requires_human_review": review.get("requires_human_review", False),
                })
                all_success = False
                continue

            success, error = await self._publish_to_platform(
                platform=platform,
                content=content,
                user_id=user_id,
                db=db,
            )
            platform_results.append({
                "platform": platform,
                "success": success,
                "error": error,
                "published_at": datetime.utcnow().isoformat() if success else None,
            })
            if not success:
                all_success = False

        # Handle retries on partial failure
        if not all_success and job.retry_count < job.max_retries:
            job.status = JobStatusEnum.retrying
            job.retry_count += 1
            logger.info("job_scheduled_retry", job_id=job_id, retry=job.retry_count)
        else:
            job.status = JobStatusEnum.completed if all_success else JobStatusEnum.failed

        job.result = {"platform_results": platform_results}
        await db.flush()

        # Update post status
        if job.post_id:
            post_result = await db.execute(select(Post).where(Post.id == job.post_id))
            post = post_result.scalar_one_or_none()
            if post:
                post.status = PostStatusEnum.published if all_success else PostStatusEnum.failed
                post.published_at = datetime.utcnow() if all_success else None
                await db.flush()

        await write_audit(
            db,
            actor=user_id or "system",
            action="publish_executed",
            payload={"job_id": job_id, "success": all_success, "results": platform_results},
        )

        return {
            "job_id": job_id,
            "status": job.status,
            "platform_results": platform_results,
            "published_at": datetime.utcnow().isoformat() if all_success else None,
        }

    async def _get_job_content(
        self,
        job: ScheduleJob,
        db: AsyncSession,
    ) -> tuple[str | None, str | None, list]:
        if job.post_id:
            result = await db.execute(select(Post).where(Post.id == job.post_id))
            post = result.scalar_one_or_none()
            if post:
                return post.content, post.user_id, job.platform_targets or []

        if job.draft_id:
            result = await db.execute(select(Draft).where(Draft.id == job.draft_id))
            draft = result.scalar_one_or_none()
            if draft:
                return draft.content, draft.user_id, job.platform_targets or draft.platform_targets or []

        return None, None, []

    async def _publish_to_platform(
        self,
        platform: str,
        content: str,
        user_id: str,
        db: AsyncSession,
    ) -> tuple[bool, str | None]:
        """Publish content to a specific platform."""
        # Get active account for this platform
        result = await db.execute(
            select(Account).where(
                Account.user_id == user_id,
                Account.platform == platform,
                Account.is_active == True,
            )
        )
        account = result.scalar_one_or_none()
        if not account:
            return False, f"No active account for {platform}"

        try:
            token = await auth_agent.get_valid_access_token(account, db)

            if platform == "instagram":
                return await self._publish_instagram(token, content, account)
            elif platform == "linkedin":
                return await self._publish_linkedin(token, content, account)
            elif platform == "x":
                return await self._publish_x(token, content)
            elif platform == "youtube":
                return False, "YouTube video upload requires media file"
            else:
                return False, f"Publishing not implemented for {platform}"

        except Exception as exc:
            logger.error("publish_error", platform=platform, error=str(exc))
            return False, str(exc)

    async def _publish_instagram(self, token: str, content: str, account: Account) -> tuple[bool, str | None]:
        """Publish to Instagram via Graph API."""
        async with httpx.AsyncClient() as client:
            # Step 1: Create container
            resp = await client.post(
                f"https://graph.instagram.com/{account.platform_user_id}/media",
                json={"caption": content, "media_type": "TEXT"},
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code != 200:
                return False, f"Container creation failed: {resp.text}"

            container_id = resp.json().get("id")
            # Step 2: Publish container
            pub_resp = await client.post(
                f"https://graph.instagram.com/{account.platform_user_id}/media_publish",
                json={"creation_id": container_id},
                headers={"Authorization": f"Bearer {token}"},
            )
            return pub_resp.status_code == 200, None if pub_resp.status_code == 200 else pub_resp.text

    async def _publish_linkedin(self, token: str, content: str, account: Account) -> tuple[bool, str | None]:
        """Publish to LinkedIn."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.linkedin.com/v2/ugcPosts",
                json={
                    "author": f"urn:li:person:{account.platform_user_id}",
                    "lifecycleState": "PUBLISHED",
                    "specificContent": {
                        "com.linkedin.ugc.ShareContent": {
                            "shareCommentary": {"text": content},
                            "shareMediaCategory": "NONE",
                        }
                    },
                    "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
                },
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Restli-Protocol-Version": "2.0.0",
                },
            )
            return resp.status_code in (200, 201), None if resp.status_code in (200, 201) else resp.text

    async def _publish_x(self, token: str, content: str) -> tuple[bool, str | None]:
        """Publish to X (Twitter)."""
        if len(content) > 280:
            content = content[:277] + "..."
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.twitter.com/2/tweets",
                json={"text": content},
                headers={"Authorization": f"Bearer {token}"},
            )
            return resp.status_code == 201, None if resp.status_code == 201 else resp.text


publisher_agent = PublisherAgent()