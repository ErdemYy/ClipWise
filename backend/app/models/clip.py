"""
ClipWise — Clip Pydantic Models

Defines request/response schemas for clip (short-form video segment) operations.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class ViralClip(BaseModel):
    """Schema for parsing the structured output from the LLM."""
    title: str = Field(..., description="Viral and engaging title for the clip")
    start_time: float = Field(..., description="Start time in seconds")
    end_time: float = Field(..., description="End time in seconds")
    score: float = Field(..., description="Virality score from 0 to 100")
    viral_reason: str = Field(..., description="Why this segment is viral")

class ViralClipList(BaseModel):
    """Schema for the array of clips returned by the LLM."""
    clips: list[ViralClip]

class ClipCreate(BaseModel):
    """Schema for creating a new clip (typically by the AI worker)."""

    video_id: UUID = Field(..., description="Parent video ID")
    title: str = Field(
        ...,
        max_length=500,
        description="AI-generated clip title",
    )
    start_time: float = Field(
        ...,
        ge=0,
        description="Start timestamp in seconds",
    )
    end_time: float = Field(
        ...,
        ge=0,
        description="End timestamp in seconds",
    )
    transcript: Optional[str] = Field(
        default=None,
        description="Transcribed text of the clip segment",
    )
    video_url: Optional[str] = Field(
        default=None,
        description="URL of the generated clip video file",
    )
    score: Optional[float] = Field(
        default=None,
        ge=0,
        le=100,
        description="AI virality/engagement score (0-100)",
    )

    @model_validator(mode="after")
    def validate_time_range(self) -> "ClipCreate":
        """Ensure end_time is strictly greater than start_time."""
        if self.end_time <= self.start_time:
            raise ValueError(
                f"end_time ({self.end_time}) must be greater than "
                f"start_time ({self.start_time})"
            )
        return self


class ClipResponse(BaseModel):
    """Schema for clip data in API responses."""

    id: UUID = Field(..., description="Unique clip identifier")
    video_id: UUID = Field(..., description="Parent video ID")
    title: str = Field(..., description="Clip title")
    start_time: float = Field(..., description="Start timestamp in seconds")
    end_time: float = Field(..., description="End timestamp in seconds")
    transcript: Optional[str] = Field(default=None, description="Clip transcript")
    video_url: Optional[str] = Field(default=None, description="Clip video URL")
    score: Optional[float] = Field(default=None, description="AI engagement score")
    created_at: datetime = Field(..., description="Creation timestamp")

    model_config = {"from_attributes": True}

    @property
    def duration_seconds(self) -> float:
        """Calculate the clip duration."""
        return round(self.end_time - self.start_time, 2)


class ClipListResponse(BaseModel):
    """List of clips for a video."""

    clips: list[ClipResponse] = Field(default_factory=list)
    total: int = Field(..., description="Total number of clips")
    video_id: UUID = Field(..., description="Parent video ID")
