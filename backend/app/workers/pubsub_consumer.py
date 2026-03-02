"""Pub/Sub subscription listener — processes ingestion and publish job messages."""
import asyncio
import json
import structlog

logger = structlog.get_logger()

try:
    from google.cloud import pubsub_v1
    PUBSUB_AVAILABLE = True
except ImportError:
    PUBSUB_AVAILABLE = False
    logger.warning("google-cloud-pubsub not installed; consumer will not run")

from app.config import settings


# ---------------------------------------------------------------------------
# Message handlers
# ---------------------------------------------------------------------------
async def handle_ingestion_message(data: dict) -> None:
    from app.database import AsyncSessionLocal
    from app.agents.ingestion_agent import ingestion_agent
    from app.agents.vectorization_agent import vectorization_agent

    account_id = data.get("account_id")
    user_id = data.get("user_id")

    if not account_id or not user_id:
        logger.error("ingestion_message_missing_fields", data=data)
        return

    async with AsyncSessionLocal() as db:
        try:
            await ingestion_agent.sync_account(account_id, db)
            await vectorization_agent.vectorize_user_posts(user_id, db)
            await db.commit()
            logger.info("ingestion_job_complete", account_id=account_id)
        except Exception as exc:
            await db.rollback()
            logger.error("ingestion_job_failed", account_id=account_id, error=str(exc))
            raise  # causes nack → retry


async def handle_publish_message(data: dict) -> None:
    from app.database import AsyncSessionLocal
    from app.agents.publisher_agent import publisher_agent

    job_id = data.get("job_id")
    if not job_id:
        logger.error("publish_message_missing_job_id", data=data)
        return

    async with AsyncSessionLocal() as db:
        try:
            result = await publisher_agent.execute_job(job_id, db)
            await db.commit()
            logger.info("publish_job_complete", job_id=job_id, result=result)
        except Exception as exc:
            await db.rollback()
            logger.error("publish_job_failed", job_id=job_id, error=str(exc))
            raise


async def handle_analytics_message(data: dict) -> None:
    from app.database import AsyncSessionLocal
    from app.agents.analytics_agent import analytics_agent

    user_id = data.get("user_id")
    if not user_id:
        return

    async with AsyncSessionLocal() as db:
        try:
            await analytics_agent.fetch_and_store_metrics(user_id, db)
            await db.commit()
        except Exception as exc:
            await db.rollback()
            logger.error("analytics_job_failed", user_id=user_id, error=str(exc))
            raise


# ---------------------------------------------------------------------------
# Generic subscriber factory
# ---------------------------------------------------------------------------
TOPIC_HANDLERS = {
    settings.pubsub_topic_ingestion: handle_ingestion_message,
    settings.pubsub_topic_publish: handle_publish_message,
    settings.pubsub_topic_analytics: handle_analytics_message,
}

SUBSCRIPTION_IDS = {
    settings.pubsub_topic_ingestion: "ingestion-jobs-sub",
    settings.pubsub_topic_publish: "publish-jobs-sub",
    settings.pubsub_topic_analytics: "analytics-events-sub",
}


def make_callback(handler, loop: asyncio.AbstractEventLoop):
    """Wrap async handler as a synchronous Pub/Sub callback."""
    def callback(message: "pubsub_v1.subscriber.message.Message"):
        try:
            data = json.loads(message.data.decode("utf-8"))
            logger.info("pubsub_message_received", data=data)
            future = asyncio.run_coroutine_threadsafe(handler(data), loop)
            future.result(timeout=300)
            message.ack()
            logger.info("pubsub_message_acked")
        except Exception as exc:
            logger.error("pubsub_message_nacked", error=str(exc))
            message.nack()
    return callback


def run_subscriber(topic_id: str) -> None:
    """Start a blocking Pub/Sub subscriber for a given topic."""
    if not PUBSUB_AVAILABLE:
        logger.warning("pubsub_not_available_skipping_subscriber", topic=topic_id)
        return

    subscription_id = SUBSCRIPTION_IDS.get(topic_id)
    handler = TOPIC_HANDLERS.get(topic_id)

    if not subscription_id or not handler:
        raise ValueError(f"No subscription or handler configured for topic: {topic_id}")

    subscription_path = f"projects/{settings.gcp_project_id}/subscriptions/{subscription_id}"

    loop = asyncio.new_event_loop()
    subscriber = pubsub_v1.SubscriberClient()

    flow_control = pubsub_v1.types.FlowControl(max_messages=10)
    streaming_pull = subscriber.subscribe(
        subscription_path,
        callback=make_callback(handler, loop),
        flow_control=flow_control,
    )

    logger.info("pubsub_subscriber_started", subscription=subscription_path)
    try:
        loop.run_until_complete(_keep_alive(streaming_pull))
    except KeyboardInterrupt:
        streaming_pull.cancel()
        streaming_pull.result()
    finally:
        loop.close()
        subscriber.close()


async def _keep_alive(future) -> None:
    """Keep the event loop alive while the streaming pull runs in a thread."""
    while True:
        if future.done():
            break
        await asyncio.sleep(1)


# ---------------------------------------------------------------------------
# Entry points
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys
    topic = sys.argv[1] if len(sys.argv) > 1 else settings.pubsub_topic_ingestion
    logger.info("starting_pubsub_consumer", topic=topic)
    run_subscriber(topic)