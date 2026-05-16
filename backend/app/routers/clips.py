"""
ClipWise — Clips Router

Handles listing and retrieving AI-generated clips for videos.
"""

import logging
from typing import Any, Dict
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client as SupabaseClient

from app.dependencies import get_current_user, get_db
from app.models.clip import ClipListResponse, ClipResponse
from app.services.clip_service import ClipService

logger = logging.getLogger("clipwise.clips")
router = APIRouter()


@router.get(
    "/video/{video_id}",
    response_model=ClipListResponse,
    summary="List all clips for a video",
)
async def list_clips_for_video(
    video_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: SupabaseClient = Depends(get_db),
) -> ClipListResponse:
    """
    Retrieve all AI-generated clips for a specific video.

    1. Verify the video belongs to the current user.
    2. Return all clips sorted by score (highest first).
    """
    # Verify video ownership
    video_result = (
        db.table("videos")
        .select("id")
        .eq("id", str(video_id))
        .eq("user_id", current_user["id"])
        .execute()
    )

    if not video_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found or access denied",
        )

    service = ClipService(db)
    clips = await service.list_clips_by_video(video_id=str(video_id))

    return ClipListResponse(
        clips=[ClipResponse(**c) for c in clips],
        total=len(clips),
        video_id=video_id,
    )


@router.get(
    "/{clip_id}/detail",
    response_model=ClipResponse,
    summary="Get clip details",
)
async def get_clip_detail(
    clip_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: SupabaseClient = Depends(get_db),
) -> ClipResponse:
    """
    Retrieve details of a specific clip.
    Verifies that the clip belongs to a video owned by the current user.
    """
    service = ClipService(db)
    clip = await service.get_clip_by_id(clip_id=str(clip_id))

    if clip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clip not found",
        )

    # Verify ownership through the parent video
    video_result = (
        db.table("videos")
        .select("id")
        .eq("id", clip["video_id"])
        .eq("user_id", current_user["id"])
        .execute()
    )

    if not video_result.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this clip",
        )

    return ClipResponse(**clip)
