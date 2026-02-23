"""Google Cloud Pub/Sub event publisher."""
import json
import structlog
from typing import Any

from app.config import settings

logger = structlog.get_logger()

try:
    from google.cloud import pubsub_v1
    _publisher = pubsub_v1.PublisherClient()
    PUBSUB_AVAILABLE = True
except Exception:
    PUBSUB_AVAILABLE = False
    logger.warning("Pub/Sub not available — events will be logged only")


async def publish_event(topic_id: str, data: dict[str, Any]) -> str | None:
    """Publish a message to a Pub/Sub topic."""
    if not PUBSUB_AVAILABLE:
        logger.info("pubsub_event_mock", topic=topic_id, data=data)
        return None

    topic_path = _publisher.topic_path(settings.gcp_project_id, topic_id)
    payload = json.dumps(data).encode("utf-8")
    try:
        future = _publisher.publish(topic_path, payload)
        msg_id = future.result()
        logger.info("pubsub_published", topic=topic_id, msg_id=msg_id)
        return msg_id
    except Exception as exc:
        logger.error("pubsub_publish_failed", topic=topic_id, error=str(exc))
        return None


async def publish_ingestion_job(account_id: str, user_id: str, sync_type: str = "full") -> None:
    await publish_event(settings.pubsub_topic_ingestion, {
        "account_id": account_id,
        "user_id": user_id,
        "sync_type": sync_type,
    })


async def publish_publish_job(job_id: str) -> None:
    await publish_event(settings.pubsub_topic_publish, {"job_id": job_id})


async def publish_analytics_event(event: dict) -> None:
    await publish_event(settings.pubsub_topic_analytics, event)