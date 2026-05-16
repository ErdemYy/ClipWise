"""
ClipWise — Authentication Router

Handles user registration, login, and profile retrieval.
Delegates to Supabase Auth for credential management.
"""

import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client as SupabaseClient

from app.dependencies import get_current_user, get_db
from app.models.user import (
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
)

logger = logging.getLogger("clipwise.auth")
router = APIRouter()


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(
    payload: UserRegister,
    db: SupabaseClient = Depends(get_db),
) -> TokenResponse:
    """
    Create a new user account via Supabase Auth.

    1. Calls Supabase `sign_up` with email, password, and metadata.
    2. Returns the JWT access token and user profile on success.
    3. Raises 400 if registration fails (e.g., email already exists).
    """
    try:
        auth_response = db.auth.sign_up(
            {
                "email": payload.email,
                "password": payload.password,
                "options": {
                    "data": {
                        "full_name": payload.full_name or "",
                    }
                },
            }
        )
    except Exception as e:
        logger.error("Supabase sign_up failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}",
        )

    if auth_response.user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed. Email may already be in use.",
        )

    # Fetch the created user profile from our users table
    user_data = (
        db.table("users")
        .select("*")
        .eq("id", str(auth_response.user.id))
        .execute()
    )

    if not user_data.data:
        # Profile may not exist yet if trigger hasn't fired; build from auth data
        user_dict = {
            "id": str(auth_response.user.id),
            "email": payload.email,
            "full_name": payload.full_name,
            "avatar_url": None,
            "subscription_status": "free",
            "credits_remaining": 10,
            "created_at": auth_response.user.created_at,
        }
    else:
        user_dict = user_data.data[0]

    session = auth_response.session
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account created but session could not be established. Please verify your email.",
        )

    return TokenResponse(
        access_token=session.access_token,
        token_type="bearer",
        expires_in=session.expires_in or 3600,
        user=UserResponse(**user_dict),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate an existing user",
)
async def login(
    payload: UserLogin,
    db: SupabaseClient = Depends(get_db),
) -> TokenResponse:
    """
    Authenticate a user with email and password.

    1. Calls Supabase `sign_in_with_password`.
    2. Returns JWT access token and user profile on success.
    3. Raises 401 if credentials are invalid.
    """
    try:
        auth_response = db.auth.sign_in_with_password(
            {
                "email": payload.email,
                "password": payload.password,
            }
        )
    except Exception as e:
        logger.warning("Login failed for %s: %s", payload.email, e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if auth_response.user is None or auth_response.session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Fetch user profile
    user_data = (
        db.table("users")
        .select("*")
        .eq("id", str(auth_response.user.id))
        .execute()
    )

    if not user_data.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found",
        )

    return TokenResponse(
        access_token=auth_response.session.access_token,
        token_type="bearer",
        expires_in=auth_response.session.expires_in or 3600,
        user=UserResponse(**user_data.data[0]),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
)
async def get_me(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> UserResponse:
    """
    Return the authenticated user's profile data.
    Requires a valid Bearer token in the Authorization header.
    """
    return UserResponse(**current_user)
