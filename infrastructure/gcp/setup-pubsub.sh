#!/bin/bash
# Create Pub/Sub topics and subscriptions for CreatorAI
# Usage: ./setup-pubsub.sh PROJECT_ID

PROJECT_ID=${1:-"your-project-id"}
REGION="us-central1"

echo "Setting up Pub/Sub for project: $PROJECT_ID"

# Create topics
gcloud pubsub topics create ingestion-jobs --project=$PROJECT_ID
gcloud pubsub topics create publish-jobs --project=$PROJECT_ID
gcloud pubsub topics create analytics-events --project=$PROJECT_ID

# Create subscriptions with dead-letter topics
gcloud pubsub topics create ingestion-jobs-dlq --project=$PROJECT_ID
gcloud pubsub topics create publish-jobs-dlq --project=$PROJECT_ID

gcloud pubsub subscriptions create ingestion-jobs-sub \
  --topic=ingestion-jobs \
  --project=$PROJECT_ID \
  --ack-deadline=300 \
  --max-delivery-attempts=5 \
  --dead-letter-topic=ingestion-jobs-dlq \
  --message-retention-duration=7d

gcloud pubsub subscriptions create publish-jobs-sub \
  --topic=publish-jobs \
  --project=$PROJECT_ID \
  --ack-deadline=120 \
  --max-delivery-attempts=3 \
  --dead-letter-topic=publish-jobs-dlq \
  --message-retention-duration=7d

gcloud pubsub subscriptions create analytics-events-sub \
  --topic=analytics-events \
  --project=$PROJECT_ID \
  --ack-deadline=60 \
  --message-retention-duration=3d

echo "Pub/Sub topics and subscriptions created successfully."