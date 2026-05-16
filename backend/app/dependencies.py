"""
ClipWise — Dependency Injection

Provides reusable FastAPI dependencies for:
- Database (Supabase) client
- Redis client
- Current authenticated user extraction from JWT
"""

import logging
from typing import Any, Dict

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from supabase import Client as SupabaseClient

from app.config import Settings, get_settings
from app.database import get_redis, get_supabase

logger = logging.getLogger("clipwise.deps")


# =====================================================
# Database Dependencies
# =====================================================

def get_db() -> SupabaseClient:
    """Inject the Supabase client into route handlers."""
    return get_supabase()


async def get_cache():
    """Inject the Redis client into route handlers."""
    return get_redis()


# =====================================================
# Authentication Dependency
# =====================================================

async def get_current_user(
    authorization: str = Header(..., description="Bearer <JWT token>"),
    settings: Settings = Depends(get_settings),
    db: SupabaseClient = Depends(get_db),
) -> Dict[str, Any]:
    """
    Extract and validate the current user from the Authorization header.

    Flow:
    1. Parse the Bearer token from the header
    2. Decode the JWT using the Supabase JWT secret
    3. Extract the user ID (sub claim)
    4. Fetch the user profile from the database
    5. Return the user dict or raise 401

    Returns:
        Dict with user profile data from the users table.

    Raises:
        HTTPException 401: If token is missing, invalid, or user not found.
    """
    # --- Extract token ---
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must start with 'Bearer '",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization[len("Bearer "):]

    # --- Decode JWT ---
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError as e:
        logger.warning("JWT decode failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing 'sub' claim",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # --- Fetch user from database ---
    result = db.table("users").select("*").eq("id", user_id).execute()

    if not result.data or len(result.data) == 0:
        logger.warning("User not found for id=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return result.data[0]
