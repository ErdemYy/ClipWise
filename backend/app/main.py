"""
ClipWise — FastAPI Application Entry Point

Configures the FastAPI app with:
- CORS middleware
- Lifespan (startup/shutdown) for DB and Redis
- Router mounting
- Global exception handling
- Health check endpoint
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import close_redis, init_redis, init_supabase
from app.routers import auth, clips, payments, videos

# =====================================================
# Logging
# =====================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("clipwise")


# =====================================================
# Application Lifespan
# =====================================================

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Manage startup and shutdown lifecycle events.
    - Startup: initialize Supabase client and Redis pool
    - Shutdown: close Redis connections gracefully
    """
    settings = get_settings()
    logger.info("🚀 Starting ClipWise API v%s", settings.app_version)

    # --- Startup ---
    logger.info("Connecting to Supabase at %s", settings.supabase_url)
    init_supabase()
    logger.info("✅ Supabase client initialized")

    try:
        await init_redis()
        logger.info("✅ Redis connected at %s", settings.redis_url)
    except Exception as e:
        logger.warning("⚠️ Redis connection failed: %s — continuing without cache", e)

    yield

    # --- Shutdown ---
    logger.info("🛑 Shutting down ClipWise API...")
    await close_redis()
    logger.info("✅ Redis connections closed")


# =====================================================
# FastAPI App Instance
# =====================================================

settings = get_settings()

app = FastAPI(
    title="ClipWise API",
    description="AI-Powered Video Repurposer — Enterprise REST API",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# =====================================================
# CORS Middleware
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-Id"],
)


# =====================================================
# Global Exception Handler
# =====================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all exception handler to prevent 500 error leaks.
    Logs the full traceback and returns a sanitized response.
    """
    logger.error(
        "Unhandled exception on %s %s: %s",
        request.method,
        request.url.path,
        exc,
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "An internal server error occurred. Please try again later.",
            "detail": str(exc) if settings.backend_debug else None,
        },
    )


# =====================================================
# Routers
# =====================================================

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(videos.router, prefix="/api/videos", tags=["Videos"])
app.include_router(clips.router, prefix="/api/clips", tags=["Clips"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])


# =====================================================
# Health Check
# =====================================================

@app.get(
    "/api/health",
    tags=["System"],
    summary="Health check endpoint",
    response_model=dict,
)
async def health_check() -> dict:
    """
    Returns the current health status of the API.
    Used by load balancers and monitoring systems.
    """
    return {
        "status": "healthy",
        "service": "clipwise-api",
        "version": settings.app_version,
    }
