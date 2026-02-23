"""Main FastAPI application."""
import structlog
import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.config import settings
from app.api import auth, accounts, ingest, drafts, posts, analytics, gdpr

# Logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)

# Sentry
if settings.sentry_dsn:
    sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.app_env)

app = FastAPI(
    title="AI Creator Companion",
    version="1.0.0",
    description="AI-powered content creation, scheduling, and analytics for social media creators.",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics
Instrumentator().instrument(app).expose(app)

# Routers
app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(ingest.router)
app.include_router(drafts.router)
app.include_router(posts.router)
app.include_router(analytics.router)
app.include_router(gdpr.router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/")
async def root():
    return {"message": "AI Creator Companion API", "docs": "/docs"}