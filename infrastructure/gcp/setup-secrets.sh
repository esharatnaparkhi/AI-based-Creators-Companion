#!/bin/bash
# Store application secrets in GCP Secret Manager
# Usage: ./setup-secrets.sh PROJECT_ID
# Then set each secret's value via: gcloud secrets versions add SECRET_NAME --data-file=-

PROJECT_ID=${1:-"your-project-id"}

SECRETS=(
  "database_url"
  "redis_url"
  "secret_key"
  "service_auth_token"
  "token_encryption_key"
  "openai_api_key"
  "pinecone_api_key"
  "google_client_id"
  "google_client_secret"
  "meta_app_id"
  "meta_app_secret"
  "linkedin_client_id"
  "linkedin_client_secret"
  "x_client_id"
  "x_client_secret"
  "sentry_dsn"
)

for SECRET in "${SECRETS[@]}"; do
  echo "Creating secret: $SECRET"
  gcloud secrets create $SECRET \
    --project=$PROJECT_ID \
    --replication-policy=automatic 2>/dev/null || echo "  (already exists)"
done

# Group as a single Kubernetes-style secret for Cloud Run
cat > /tmp/secret-env.yaml <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: creator-companion-secrets
stringData:
  database_url: "SET_ME"
  redis_url: "SET_ME"
  secret_key: "SET_ME"
  openai_api_key: "SET_ME"
  pinecone_api_key: "SET_ME"
EOF

echo ""
echo "Secrets created. Use the GCP console or CLI to set values:"
echo "  gcloud secrets versions add SECRET_NAME --data-file=/path/to/value"