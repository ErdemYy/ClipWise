"""
ClipWise — User Pydantic Models

Defines request/response schemas for user operations.
All models use Pydantic v2 with strict validation.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    """Schema for user registration request."""

    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password (min 8 characters)",
    )
    full_name: Optional[str] = Field(
        default=None,
        max_length=255,
        description="User's display name",
    )


class UserLogin(BaseModel):
    """Schema for user login request."""

    email: EmailStr = Field(..., description="Registered email address")
    password: str = Field(..., description="Account password")


class UserResponse(BaseModel):
    """Schema for user data in API responses."""

    id: UUID = Field(..., description="Unique user identifier")
    email: str = Field(..., description="User's email address")
    full_name: Optional[str] = Field(default=None, description="Display name")
    avatar_url: Optional[str] = Field(default=None, description="Profile image URL")
    subscription_status: str = Field(
        default="free",
        description="Current subscription tier",
    )
    credits_remaining: int = Field(
        default=10,
        description="Remaining processing credits",
    )
    created_at: datetime = Field(..., description="Account creation timestamp")

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """Schema for authentication token response."""

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiry in seconds")
    user: UserResponse = Field(..., description="Authenticated user data")
