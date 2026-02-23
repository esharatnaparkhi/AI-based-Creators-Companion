terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  backend "gcs" {
    bucket = "YOUR_TERRAFORM_STATE_BUCKET"
    prefix = "creator-companion/state"
  }
}

variable "project_id"  { description = "GCP Project ID" }
variable "region"      { default     = "us-central1" }
variable "db_password" { sensitive   = true }
variable "image_tag"   { default     = "latest" }

provider "google" {
  project = var.project_id
  region  = var.region
}

# ─── VPC ─────────────────────────────────────────────────────────────────────
resource "google_compute_network" "main" {
  name                    = "creator-companion-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "main" {
  name          = "creator-companion-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.main.id
}

resource "google_vpc_access_connector" "serverless" {
  name          = "creator-companion-connector"
  region        = var.region
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.main.name
}

# ─── Cloud SQL (Postgres 15) ──────────────────────────────────────────────────
resource "google_sql_database_instance" "main" {
  name             = "creator-companion-db"
  database_version = "POSTGRES_15"
  region           = var.region
  deletion_protection = true

  settings {
    tier              = "db-g1-small"
    availability_type = "REGIONAL"
    disk_size         = 20
    disk_autoresize   = true
    disk_autoresize_limit = 100

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
      transaction_log_retention_days = 7
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
    }
  }
}

resource "google_sql_database" "app" {
  name     = "creator_companion"
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "app_user" {
  name     = "creator"
  instance = google_sql_database_instance.main.name
  password = var.db_password
}

# ─── Memorystore (Redis 7) ────────────────────────────────────────────────────
resource "google_redis_instance" "cache" {
  name               = "creator-companion-cache"
  tier               = "STANDARD_HA"
  memory_size_gb     = 1
  region             = var.region
  redis_version      = "REDIS_7_0"
  authorized_network = google_compute_network.main.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
}

# ─── Cloud Storage ────────────────────────────────────────────────────────────
resource "google_storage_bucket" "media" {
  name          = "${var.project_id}-creator-media"
  location      = var.region
  force_destroy = false

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning { enabled = true }

  lifecycle_rule {
    condition { age = 90  }
    action    { type = "SetStorageClass"; storage_class = "NEARLINE" }
  }
  lifecycle_rule {
    condition { age = 365 }
    action    { type = "SetStorageClass"; storage_class = "COLDLINE" }
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "PUT", "POST"]
    response_header = ["Content-Type", "Authorization"]
    max_age_seconds = 3600
  }
}

# ─── BigQuery ─────────────────────────────────────────────────────────────────
resource "google_bigquery_dataset" "analytics" {
  dataset_id  = "creator_analytics"
  location    = var.region
  description = "Creator Companion analytics events"
  delete_contents_on_destroy = false
}

resource "google_bigquery_table" "events" {
  dataset_id          = google_bigquery_dataset.analytics.dataset_id
  table_id            = "events"
  deletion_protection = false

  schema = jsonencode([
    { name = "user_id",    type = "STRING",    mode = "REQUIRED" },
    { name = "event",      type = "STRING",    mode = "REQUIRED" },
    { name = "platform",   type = "STRING",    mode = "NULLABLE" },
    { name = "post_id",    type = "STRING",    mode = "NULLABLE" },
    { name = "metric",     type = "STRING",    mode = "NULLABLE" },
    { name = "value",      type = "FLOAT64",   mode = "NULLABLE" },
    { name = "dimensions", type = "JSON",      mode = "NULLABLE" },
    { name = "timestamp",  type = "TIMESTAMP", mode = "REQUIRED" },
  ])

  time_partitioning {
    type  = "DAY"
    field = "timestamp"
  }

  clustering = ["user_id", "platform", "event"]
}

# ─── Artifact Registry ────────────────────────────────────────────────────────
resource "google_artifact_registry_repository" "main" {
  location      = var.region
  repository_id = "creator-companion"
  format        = "DOCKER"
}

# ─── Pub/Sub ──────────────────────────────────────────────────────────────────
locals {
  topics = {
    ingestion = "ingestion-jobs"
    publish   = "publish-jobs"
    analytics = "analytics-events"
  }
}

resource "google_pubsub_topic" "topics" {
  for_each                   = local.topics
  name                       = each.value
  message_retention_duration = "604800s"
}

resource "google_pubsub_topic" "dlq" {
  for_each = { for k, v in local.topics : k => "${v}-dlq" }
  name     = each.value
}

resource "google_pubsub_subscription" "ingestion" {
  name  = "ingestion-jobs-sub"
  topic = google_pubsub_topic.topics["ingestion"].name
  ack_deadline_seconds       = 300
  message_retention_duration = "604800s"

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dlq["ingestion"].id
    max_delivery_attempts = 5
  }
}

resource "google_pubsub_subscription" "publish" {
  name  = "publish-jobs-sub"
  topic = google_pubsub_topic.topics["publish"].name
  ack_deadline_seconds       = 120
  message_retention_duration = "604800s"

  retry_policy {
    minimum_backoff = "5s"
    maximum_backoff = "300s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dlq["publish"].id
    max_delivery_attempts = 3
  }
}

resource "google_pubsub_subscription" "analytics" {
  name  = "analytics-events-sub"
  topic = google_pubsub_topic.topics["analytics"].name
  ack_deadline_seconds       = 60
  message_retention_duration = "259200s"
}

# ─── Secret Manager ───────────────────────────────────────────────────────────
locals {
  secret_names = [
    "database_url", "redis_url", "secret_key", "service_auth_token",
    "token_encryption_key", "openai_api_key", "pinecone_api_key",
    "google_client_id", "google_client_secret",
    "meta_app_id", "meta_app_secret",
    "linkedin_client_id", "linkedin_client_secret",
    "x_client_id", "x_client_secret", "sentry_dsn",
  ]
}

resource "google_secret_manager_secret" "secrets" {
  for_each  = toset(local.secret_names)
  secret_id = each.value
  replication { auto {} }
}

# ─── Cloud Run — API ──────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "api" {
  name     = "creator-companion-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 1
      max_instance_count = 20
    }

    vpc_access {
      connector = google_vpc_access_connector.serverless.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/creator-companion/api:${var.image_tag}"
      ports { container_port = 8000 }

      resources {
        limits   = { cpu = "2", memory = "2Gi" }
        cpu_idle = false
      }

      dynamic "env" {
        for_each = toset(local.secret_names)
        content {
          name = upper(env.value)
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.secrets[env.value].secret_id
              version = "latest"
            }
          }
        }
      }

      startup_probe {
        http_get { path = "/health"; port = 8000 }
        initial_delay_seconds = 5
        period_seconds        = 5
        failure_threshold     = 10
      }
      liveness_probe {
        http_get { path = "/health"; port = 8000 }
        period_seconds    = 30
        failure_threshold = 3
      }
    }

    annotations = {
      "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.main.connection_name
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "api_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ─── Cloud Run — Frontend ─────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "frontend" {
  name     = "creator-companion-frontend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/creator-companion/frontend:${var.image_tag}"
      ports { container_port = 3000 }
      resources { limits = { cpu = "1", memory = "512Mi" } }
      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = google_cloud_run_v2_service.api.uri
      }
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ─── Cloud Scheduler ─────────────────────────────────────────────────────────
resource "google_service_account" "scheduler_sa" {
  account_id   = "creator-scheduler-sa"
  display_name = "Creator Companion Scheduler SA"
}

resource "google_cloud_run_v2_service_iam_member" "scheduler_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler_sa.email}"
}

resource "google_cloud_scheduler_job" "run_scheduler" {
  name      = "creator-companion-scheduler"
  region    = var.region
  schedule  = "* * * * *"
  time_zone = "UTC"

  http_target {
    uri         = "${google_cloud_run_v2_service.api.uri}/internal/run-scheduled-jobs"
    http_method = "POST"
    headers     = { "Content-Type" = "application/json" }
    body        = base64encode("{}")

    oidc_token {
      service_account_email = google_service_account.scheduler_sa.email
    }
  }
}

# ─── Outputs ─────────────────────────────────────────────────────────────────
output "api_url"            { value = google_cloud_run_v2_service.api.uri }
output "frontend_url"       { value = google_cloud_run_v2_service.frontend.uri }
output "db_connection_name" { value = google_sql_database_instance.main.connection_name }
output "redis_host"         { value = google_redis_instance.cache.host; sensitive = true }
output "media_bucket"       { value = google_storage_bucket.media.name }
output "artifact_registry"  { value = google_artifact_registry_repository.main.name }