# CreatorAI

CreatorAI is a platform built on a custom RAG-based agentic architecture that uses modular AI services and structured workflow orchestration. It enables social media creators to connect their accounts, generate AI-powered content grounded in their own historical data, schedule and publish posts reliably, and track performance insights, all within a production-oriented, multi-tenant system.
 
### *What It Does*
- Connects creator accounts using OAuth (YouTube, Instagram, X, LinkedIn-ready design)
- Fetches historical posts and engagement data
- Converts content into embeddings for contextual retrieval (RAG)
- Generates platform-aware AI drafts using creator history
- Applies compliance and safety checks
- Schedules and publishes posts with retry handling
- Aggregates analytics and suggests optimal posting times
- System Design
- The system is built around independent agents coordinated by a central orchestrator.

### *Technical Highlights*
- RAG implementation via vectorization_agent
- LLM orchestration via composer_agent
- Multi-step AI workflows coordinated by orchestrator
- Platform-aware prompt structuring
- Production-style modular backend architecture
- Strict multi-tenant vector isolation

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
- Backend:
    - FastAPI (async)
    - SQLAlchemy + Alembic
    - PostgreSQL
    - Redis
    - OpenAI-compatible LLM APIs
    - Pinecone or Vertex-based vector storage
- Infrastructure:
    - GCP (Cloud Run, Cloud SQL, Pub/Sub, Secret Manager)
    - Docker & Docker Compose
    - Terraform (infrastructure as code)
- Frontend:
    - Next.js
    - TailwindCSS
    - React Query + Zustand

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
