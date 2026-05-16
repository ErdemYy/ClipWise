"""
ClipWise — Video Pydantic Models

Defines request/response schemas for video operations.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


class VideoStatus(str, Enum):
    """Possible states of a video in the processing pipeline."""

    PENDING = "pending"
    PROCESSING = "processing"
    TRANSCRIBED = "transcribed"
    COMPLETED = "completed"
    FAILED = "failed"


class VideoCreate(BaseModel):
    """Schema for video upload / creation request."""

    title: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Optional title for the video",
    )
    original_url: str = Field(
        ...,
        description="URL of the original video (upload URL or external link)",
    )


class VideoResponse(BaseModel):
    """Schema for video data in API responses."""

    id: UUID = Field(..., description="Unique video identifier")
    user_id: UUID = Field(..., description="Owner user ID")
    title: Optional[str] = Field(default=None, description="Video title")
    original_url: str = Field(..., description="Original video URL")
    processed_url: Optional[str] = Field(
        default=None,
        description="Processed video URL (available after completion)",
    )
    status: VideoStatus = Field(
        default=VideoStatus.PENDING,
        description="Current processing status",
    )
    duration_seconds: Optional[float] = Field(
        default=None,
        description="Video duration in seconds",
    )
    file_size_bytes: Optional[int] = Field(
        default=None,
        description="File size in bytes",
    )
    error_message: Optional[str] = Field(
        default=None,
        description="Error details if status is 'failed'",
    )
    created_at: datetime = Field(..., description="Upload timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = {"from_attributes": True}


class VideoStatusUpdate(BaseModel):
    """Schema for updating video processing status (internal use)."""

    status: VideoStatus = Field(..., description="New processing status")
    processed_url: Optional[str] = Field(
        default=None,
        description="URL of the processed video",
    )
    error_message: Optional[str] = Field(
        default=None,
        description="Error message if processing failed",
    )


class VideoListResponse(BaseModel):
    """Paginated list of videos."""

    videos: list[VideoResponse] = Field(default_factory=list)
    total: int = Field(..., description="Total number of videos")
    page: int = Field(default=1, description="Current page number")
    per_page: int = Field(default=20, description="Items per page")
