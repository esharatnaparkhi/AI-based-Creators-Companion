#!/bin/bash
# Deploy AI Creator Companion to GCP
# Usage: ./scripts/deploy.sh [production|staging] [api|frontend|all]

set -euo pipefail

ENV=${1:-staging}
TARGET=${2:-all}
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/creator-companion"
IMAGE_TAG=$(git rev-parse --short HEAD)

echo "🚀 Deploying Creator Companion"
echo "   Environment : $ENV"
echo "   Target      : $TARGET"
echo "   Project     : $PROJECT_ID"
echo "   Image tag   : $IMAGE_TAG"
echo ""

build_and_push() {
  local SERVICE=$1
  local CONTEXT=$2
  local IMAGE="${REGISTRY}/${SERVICE}:${IMAGE_TAG}"

  echo "📦 Building $SERVICE..."
  docker build -t "$IMAGE" "$CONTEXT"
  echo "📤 Pushing $SERVICE..."
  docker push "$IMAGE"
  docker tag "$IMAGE" "${REGISTRY}/${SERVICE}:latest"
  docker push "${REGISTRY}/${SERVICE}:latest"
  echo "✅ $SERVICE pushed"
}

run_migrations() {
  echo "🗃️  Running DB migrations..."
  gcloud run jobs execute creator-companion-migrate \
    --region "$REGION" --wait || {
    gcloud run jobs create creator-companion-migrate \
      --image "${REGISTRY}/api:${IMAGE_TAG}" \
      --region "$REGION" \
      --command "alembic" \
      --args "upgrade,head" \
      --set-secrets "DATABASE_URL=database_url:latest" \
      --max-retries 1
    gcloud run jobs execute creator-companion-migrate --region "$REGION" --wait
  }
  echo "✅ Migrations complete"
}

deploy_api() {
  build_and_push "api" "./backend"
  run_migrations

  echo "🌐 Deploying API..."
  gcloud run deploy creator-companion-api \
    --image "${REGISTRY}/api:${IMAGE_TAG}" \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --min-instances 1 \
    --max-instances 20 \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --set-secrets "DATABASE_URL=database_url:latest,\
REDIS_URL=redis_url:latest,\
SECRET_KEY=secret_key:latest,\
SERVICE_AUTH_TOKEN=service_auth_token:latest,\
TOKEN_ENCRYPTION_KEY=token_encryption_key:latest,\
OPENAI_API_KEY=openai_api_key:latest,\
PINECONE_API_KEY=pinecone_api_key:latest,\
GOOGLE_CLIENT_ID=google_client_id:latest,\
GOOGLE_CLIENT_SECRET=google_client_secret:latest,\
META_APP_ID=meta_app_id:latest,\
META_APP_SECRET=meta_app_secret:latest,\
LINKEDIN_CLIENT_ID=linkedin_client_id:latest,\
LINKEDIN_CLIENT_SECRET=linkedin_client_secret:latest,\
X_CLIENT_ID=x_client_id:latest,\
X_CLIENT_SECRET=x_client_secret:latest,\
SENTRY_DSN=sentry_dsn:latest" \
    --set-env-vars "APP_ENV=${ENV},GCP_PROJECT_ID=${PROJECT_ID}"
  echo "✅ API deployed"
}

deploy_frontend() {
  API_URL=$(gcloud run services describe creator-companion-api \
    --region "$REGION" --format "value(status.url)" 2>/dev/null || echo "http://localhost:8000")

  build_and_push "frontend" "./frontend"

  echo "🖥️  Deploying Frontend..."
  gcloud run deploy creator-companion-frontend \
    --image "${REGISTRY}/frontend:${IMAGE_TAG}" \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --min-instances 1 \
    --max-instances 10 \
    --memory 512Mi \
    --cpu 1 \
    --set-env-vars "NEXT_PUBLIC_API_URL=${API_URL}"
  echo "✅ Frontend deployed"
}

gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

case "$TARGET" in
  api)      deploy_api ;;
  frontend) deploy_frontend ;;
  all)      deploy_api; deploy_frontend ;;
  *)        echo "❌ Unknown target: $TARGET (use api|frontend|all)"; exit 1 ;;
esac

echo ""
echo "🎉 Deployment complete!"
API_URL=$(gcloud run services describe creator-companion-api --region "$REGION" --format "value(status.url)" 2>/dev/null || echo "N/A")
FE_URL=$(gcloud run services describe creator-companion-frontend --region "$REGION" --format "value(status.url)" 2>/dev/null || echo "N/A")
echo "   API URL      : $API_URL"
echo "   Frontend URL : $FE_URL"
echo "   API Docs     : $API_URL/docs"