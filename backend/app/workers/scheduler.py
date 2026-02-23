"""Background scheduler worker — polls for due jobs and executes them."""
import asyncio
import structlog

logger = structlog.get_logger()


async def run_scheduler():
    """Main scheduler loop."""
    from app.database import AsyncSessionLocal
    from app.agents.orchestrator import orchestrator

    logger.info("scheduler_started")

    while True:
        try:
            async with AsyncSessionLocal() as db:
                result = await orchestrator.run_scheduled_jobs(db)
                await db.commit()
                if result["executed"] > 0 or result["failed"] > 0:
                    logger.info("scheduler_cycle", **result)
        except Exception as exc:
            logger.error("scheduler_error", error=str(exc))

        await asyncio.sleep(30)  # Poll every 30 seconds


if __name__ == "__main__":
    asyncio.run(run_scheduler())