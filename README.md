# CreatorAI

CreatorAI is a platform built on a custom RAG-based agentic architecture that uses modular AI services and structured workflow orchestration. It enables social media creators to connect their accounts, generate AI-powered content grounded in their own historical data, schedule and publish posts reliably, and track performance insights, all within a production-oriented, multi-tenant system.
 
### *What It Does*
- Connects creator accounts via OAuth (YouTube, Instagram, X, LinkedIn-ready design).
- Fetches historical posts and engagement data (incremental syncs, rate-limit safe).
- Converts content into embeddings for contextual retrieval (RAG).
- Generates platform-aware drafts using creator history (LLM + retrieved context).
- Applies compliance and safety checks and marks items for human review.
- Schedules and publishes posts reliably with retries and exponential backoff.
- Aggregates analytics and suggests optimal posting times and KPIs.

### *Technical Highlights*
- RAG implementation via a tenant-isolated vectorization_agent.
- LLM orchestration via composer_agent (structured prompts + prompt versioning).
- Multi-step AI workflows coordinated by an orchestrator (idempotent, checkpointed).
- Platform-aware prompt structuring and constraint enforcement to reduce hallucination.
- Deterministic evaluation hooks for draft validation and A/B prompt testing.
- Observability: structured logs, distributed tracing, and metrics for AI workflows.
- Production-style modular backend architecture with strict multi-tenant vector isolation.
- Encrypted credential storage and secure token rotation.
- Durable scheduling and retry-safe publishing (no in-memory-only schedulers).

### *Evaluation, metrics & reliability*
- Quality evaluation: deterministic evaluation hooks to run automated checks (toxicity, format, constraint pass rate) and small human-in-the-loop scoring for draft usefulness.
- Prompt experiments: built-in support to compare prompt variants and record engagement deltas.
- Performance: latency and throughput targets for draft generation (benchmark LLM calls, embedding batch sizes).
- Monitoring: structured logging, request traces, SLOs for critical flows (ingest, generate, publish).
- Failure modes: explicit retry/backoff policies, DLQs for ingestion/publish failures, and idempotency keys for safe replays.
- Privacy & compliance: GDPR export/delete endpoints, tenant-scoped data deletion.

### *Agents* 
- Auth Agent : Handles OAuth flows, encrypted token storage, and refresh logic.
- Ingestion Agent : Fetches historical content and normalizes platform data.
- Vectorization Agent :Chunks text, generates embeddings, stores vectors per tenant, and provides retrieval for RAG.
- Composer Agent : Uses LLM + retrieved context to generate structured, platform-optimized drafts.
- Compliance Agent : Enforces character limits, formatting rules, and safety checks.
- Planner Agent : Suggests posting schedules based on analytics and heuristics.
- Publisher Agent : Executes scheduled publishing with retries and backoff handling.
- Analytics Agent : Aggregates engagement metrics and computes KPIs.
- Orchestrator : Coordinates full workflows from onboarding → ingest → vectorize → generate → validate → schedule → publish → analyze.
  
> Each agent is independently testable and communicates via APIs or events.

### *Tech Stack*
- Backend: FastAPI (async), SQLAlchemy + Alembic, PostgreSQL, Redis
- LLM & embeddings: OpenAI-compatible APIs (provider-agnostic)
- Vector store: Pinecone / Vertex Matching / equivalent (tenant namespaces)
- Infra / infra-as-code: GCP (Cloud Run, Cloud SQL, Pub/Sub, Secret Manager), Terraform, Docker & Docker Compose
- Frontend (separate): Next.js, TailwindCSS, React Query, Zustand

### *Key Features*
- Key Capabilities
- Multi-tenant architecture with isolated vector namespaces
- Encrypted credential storage
- RAG-based content generation using creator history
- Reliable scheduling with retry-safe publishing
- KPI computation and performance insights
- End-to-end tested workf

### *Architecture*
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
