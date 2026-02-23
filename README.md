# AI Creator Companion

A full-stack AI companion for social media creators — multi-platform account aggregation, AI-powered content generation, scheduling, publishing, and analytics.

## Architecture

```
ai-creator-companion/
├── backend/              # FastAPI backend + agent workers
│   ├── app/
│   │   ├── api/          # Route handlers
│   │   ├── agents/       # Agent microservices
│   │   ├── models/       # SQLAlchemy + Pydantic models
│   │   ├── services/     # Business logic
│   │   └── workers/      # Pub/Sub background workers
│   ├── migrations/       # Alembic migrations
│   └── tests/
├── frontend/             # React/Next.js UI
├── infrastructure/       # GCP / Kubernetes manifests
└── scripts/              # Dev & deploy scripts
```

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, Alembic, Redis, OpenAI, Pinecone/Vertex
- **Frontend**: Next.js, TailwindCSS, React Query, Zustand
- **Infra**: GCP (Cloud Run, Cloud SQL, Pub/Sub, BigQuery, Secret Manager)
- **Auth**: JWT + OAuth2

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- GCP project with required APIs enabled

### Local Development

```bash
# Clone and setup
git clone <repo>
cd ai-creator-companion

# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in your secrets

# Run DB migrations
alembic upgrade head

# Start backend
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

### Docker Compose (full stack)

```bash
docker-compose up --build
```

## Environment Variables

See `backend/.env.example` and `frontend/.env.local.example`.

## API Documentation

Once running, visit `http://localhost:8000/docs` for interactive Swagger UI.

## Deployment

See `infrastructure/` for GCP Cloud Run and GKE manifests.

```bash
./scripts/deploy.sh production
```



ai-creator-companion/
│
├── README.md
├── docker-compose.yml                        # Full local dev stack
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── pytest.ini
│   ├── .env.example
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                           # FastAPI app, CORS, Sentry, Prometheus
│   │   ├── config.py                         # Pydantic settings (all env vars)
│   │   ├── database.py                       # SQLAlchemy async engine + session
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── orm.py                        # User, Account, Post, Draft, VectorMeta,
│   │   │   │                                 # ScheduleJob, AnalyticsRow, AuditLog
│   │   │   └── schemas.py                    # Pydantic request/response schemas
│   │   │
│   │   ├── api/                              # FastAPI routers
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                       # POST /register, /login, /oauth/{platform}/start+callback
│   │   │   ├── accounts.py                   # GET/DELETE /accounts
│   │   │   ├── ingest.py                     # POST /ingest/{account_id}/sync, /webhook/{platform}
│   │   │   ├── drafts.py                     # POST /drafts/generate, GET/PATCH/DELETE /drafts
│   │   │   ├── posts.py                      # GET /posts, POST /posts/schedule, POST /publish/{job_id}/execute
│   │   │   ├── analytics.py                  # GET /analytics/summary, /analytics/calendar
│   │   │   └── gdpr.py                       # GET /gdpr/export, DELETE /gdpr/delete-account
│   │   │
│   │   ├── agents/                           # Agent microservices
│   │   │   ├── __init__.py
│   │   │   ├── auth_agent.py                 # OAuth flows, token refresh, encrypted storage
│   │   │   ├── ingestion_agent.py            # Fetch history from YouTube/Instagram/LinkedIn/X
│   │   │   ├── vectorization_agent.py        # Chunk text, embed, upsert to Pinecone, RAG retrieval
│   │   │   ├── composer_agent.py             # LLM draft generation with RAG + platform rules
│   │   │   ├── compliance_agent.py           # Safety checks, platform char limits, human review flags
│   │   │   ├── planner_agent.py              # Weekly calendar suggestions (heuristics + analytics)
│   │   │   ├── publisher_agent.py            # Execute publishes to each platform with retry/backoff
│   │   │   ├── analytics_agent.py            # KPI computation, fetch live metrics from platforms
│   │   │   └── orchestrator.py               # Coordinate multi-step workflows (onboarding, scheduler)
│   │   │
│   │   ├── services/                         # Shared infrastructure services
│   │   │   ├── __init__.py
│   │   │   ├── security.py                   # JWT, bcrypt, Fernet token encryption, service auth
│   │   │   ├── llm.py                        # OpenAI embeddings + chat completions, platform rules
│   │   │   ├── vector_db.py                  # Pinecone upsert/query/delete, multi-tenant namespaces
│   │   │   ├── cache.py                      # Redis async get/set/delete
│   │   │   ├── pubsub.py                     # GCP Pub/Sub event publishing
│   │   │   ├── audit.py                      # Audit log writer
│   │   │   └── oauth_config.py               # OAuth2 configs for all 4 platforms + redirect URIs
│   │   │
│   │   └── workers/
│   │       ├── __init__.py
│   │       └── scheduler.py                  # Async polling loop — picks up due jobs every 30s
│   │
│   ├── migrations/
│   │   ├── env.py                            # Alembic async env config
│   │   └── versions/
│   │       └── 0001_initial.py               # All tables + indexes in one migration
│   │
│   └── tests/
│       ├── conftest.py                       # pytest fixtures: DB, async client, user, auth_headers
│       ├── unit/
│       │   ├── test_compliance.py            # ComplianceAgent — safety, platform rules
│       │   ├── test_vectorization.py         # VectorizationAgent — chunking, embedding, RAG
│       │   ├── test_composer.py              # ComposerAgent — draft generation, compliance filter
│       │   └── test_analytics.py            # AnalyticsAgent — KPI computation, platform breakdown
│       └── e2e/
│           └── test_pipeline.py             # Full flow: register → draft → schedule → analytics
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── .env.local.example
│   │
│   └── src/
│       ├── styles/
│       │   └── globals.css
│       │
│       ├── services/
│       │   └── api.ts                        # Axios client, JWT interceptor, all API methods
│       │
│       ├── store/
│       │   └── auth.ts                       # Zustand auth store (user, token, hydrate, logout)
│       │
│       ├── hooks/
│       │   └── useApi.ts                     # React Query hooks for all resources
│       │
│       ├── components/
│       │   ├── ui.tsx                        # Button, Card, Badge, Input, Select, Spinner, EmptyState
│       │   ├── Sidebar.tsx                   # Navigation sidebar with active state
│       │   └── Layout.tsx                    # Auth-guarded layout wrapper
│       │
│       └── pages/
│           ├── _app.tsx                      # QueryClient + Toaster providers
│           ├── index.tsx                     # Redirect to /dashboard or /login
│           ├── login.tsx                     # Email/password login form
│           ├── register.tsx                  # Registration form
│           ├── dashboard.tsx                 # KPI overview, platform stats, trend
│           ├── accounts.tsx                  # Connect/disconnect/sync platforms
│           ├── drafts.tsx                    # Generate AI drafts, view, copy, schedule
│           ├── schedule.tsx                  # Scheduled jobs, AI calendar suggestions
│           └── analytics.tsx                # Bar + pie charts, engagement rate, best hours
│
└── infrastructure/
    └── gcp/
        ├── main.tf                           # Terraform: VPC, Cloud SQL, Redis, GCS, BigQuery, Pub/Sub
        ├── cloud-run-api.yaml                # Cloud Run service for API (autoscale 1–20)
        ├── cloud-run-worker.yaml             # Cloud Run Job for scheduler worker
        ├── setup-pubsub.sh                   # Create Pub/Sub topics + subscriptions + DLQs
        └── setup-secrets.sh                  # Create Secret Manager secrets