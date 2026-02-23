"""Orchestrator — coordinate agent workflows and approvals."""
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger()


class OrchestratorAgent:
    """Coordinates multi-step workflows across agents."""

    async def run_onboarding_pipeline(
        self,
        user_id: str,
        account_id: str,
        db: AsyncSession,
    ) -> dict:
        """Full pipeline: ingest → vectorize → suggest drafts."""
        from app.agents.ingestion_agent import ingestion_agent
        from app.agents.vectorization_agent import vectorization_agent
        from app.agents.planner_agent import planner_agent

        results = {}

        # Step 1: Ingest
        try:
            ingest_result = await ingestion_agent.sync_account(account_id, db)
            results["ingestion"] = ingest_result
            logger.info("onboarding_ingestion_done", **ingest_result)
        except Exception as exc:
            results["ingestion"] = {"error": str(exc)}
            logger.error("onboarding_ingestion_failed", error=str(exc))
            return results

        # Step 2: Vectorize
        try:
            vec_result = await vectorization_agent.vectorize_user_posts(user_id, db)
            results["vectorization"] = vec_result
            logger.info("onboarding_vectorization_done", **vec_result)
        except Exception as exc:
            results["vectorization"] = {"error": str(exc)}
            logger.error("onboarding_vectorization_failed", error=str(exc))

        # Step 3: Generate initial plan
        try:
            from app.models.orm import Account
            from sqlalchemy import select
            acct_result = await db.execute(select(Account).where(Account.id == account_id))
            account = acct_result.scalar_one_or_none()
            platforms = [account.platform] if account else []
            plan = await planner_agent.generate_weekly_plan(user_id, platforms, db)
            results["plan"] = plan
        except Exception as exc:
            results["plan"] = {"error": str(exc)}

        return results

    async def run_scheduled_jobs(self, db: AsyncSession) -> dict:
        """Pick up pending due jobs and execute them."""
        from app.models.orm import ScheduleJob, JobStatusEnum
        from app.agents.publisher_agent import publisher_agent
        from sqlalchemy import select
        from datetime import datetime

        result = await db.execute(
            select(ScheduleJob).where(
                ScheduleJob.status.in_([JobStatusEnum.pending, JobStatusEnum.retrying]),
                ScheduleJob.scheduled_at <= datetime.utcnow(),
            ).limit(50)
        )
        jobs = result.scalars().all()

        executed = 0
        failed = 0
        for job in jobs:
            try:
                await publisher_agent.execute_job(job.id, db)
                executed += 1
            except Exception as exc:
                logger.error("scheduled_job_failed", job_id=job.id, error=str(exc))
                failed += 1

        return {"executed": executed, "failed": failed}


orchestrator = OrchestratorAgent()