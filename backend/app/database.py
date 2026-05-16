"""
ClipWise — Database & Cache Connections

Manages Supabase (PostgreSQL) client and Redis connection pool.
Both clients are initialized at app startup and cleaned up on shutdown.
"""

import redis.asyncio as aioredis
from supabase import Client as SupabaseClient, create_client

from app.config import get_settings


# =====================================================
# Global client references (set during app lifespan)
# =====================================================
_supabase_client: SupabaseClient | None = None
_redis_pool: aioredis.Redis | None = None


# =====================================================
# Supabase
# =====================================================

def init_supabase() -> SupabaseClient:
    """
    Initialize the Supabase client using service role key.
    The service role key bypasses RLS for backend operations.
    """
    global _supabase_client
    settings = get_settings()
    _supabase_client = create_client(
        supabase_url=settings.supabase_url,
        supabase_key=settings.supabase_service_role_key,
    )
    return _supabase_client


def get_supabase() -> SupabaseClient:
    """
    Return the initialized Supabase client.
    Raises RuntimeError if called before initialization.
    """
    if _supabase_client is None:
        raise RuntimeError(
            "Supabase client has not been initialized. "
            "Ensure the app lifespan has started."
        )
    return _supabase_client


# =====================================================
# Redis
# =====================================================

async def init_redis() -> aioredis.Redis:
    """
    Initialize the async Redis connection pool.
    Uses connection pooling for efficient resource usage.
    """
    global _redis_pool
    settings = get_settings()
    _redis_pool = aioredis.from_url(
        settings.redis_url,
        encoding="utf-8",
        decode_responses=True,
        max_connections=20,
    )
    # Verify connectivity
    await _redis_pool.ping()
    return _redis_pool


async def close_redis() -> None:
    """Gracefully close the Redis connection pool."""
    global _redis_pool
    if _redis_pool is not None:
        await _redis_pool.aclose()
        _redis_pool = None


def get_redis() -> aioredis.Redis:
    """
    Return the initialized Redis client.
    Raises RuntimeError if called before initialization.
    """
    if _redis_pool is None:
        raise RuntimeError(
            "Redis pool has not been initialized. "
            "Ensure the app lifespan has started."
        )
    return _redis_pool
