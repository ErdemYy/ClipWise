"""
ClipWise — Videos Router

Handles video upload, listing, and detail retrieval.
Integrates with Celery for async video processing.
"""

import logging
from typing import Any, Dict
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client as SupabaseClient

from app.dependencies import get_current_user, get_db
from app.models.video import (
    VideoCreate,
    VideoListResponse,
    VideoResponse,
)
from app.services.video_service import VideoService

logger = logging.getLogger("clipwise.videos")
router = APIRouter()


@router.post(
    "/upload",
    response_model=VideoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a new video for processing",
)
async def upload_video(
    payload: VideoCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: SupabaseClient = Depends(get_db),
) -> VideoResponse:
    """
    Upload a video and queue it for AI processing.

    Flow:
    1. Verify the user has remaining credits.
    2. Create a video record with 'pending' status.
    3. Deduct one credit from the user's balance.
    4. Dispatch a Celery task for async processing.
    5. Return the created video record.
    """
    service = VideoService(db)

    # Check credits
    credits = current_user.get("credits_remaining", 0)
    if credits <= 0:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits. Please upgrade your plan.",
        )

    # Create video record
    video = await service.create_video(
        user_id=current_user["id"],
        title=payload.title,
        original_url=payload.original_url,
    )

    # Deduct credit
    await service.deduct_user_credit(user_id=current_user["id"])

    # Dispatch processing task
    try:
        from app.workers.tasks import process_video

        process_video.delay(str(video["id"]))
        logger.info("Dispatched processing task for video %s", video["id"])
    except Exception as e:
        logger.warning("Failed to dispatch Celery task: %s — video will stay pending", e)

    return VideoResponse(**video)


@router.get(
    "",
    response_model=VideoListResponse,
    summary="List current user's videos",
)
async def list_videos(
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=20, ge=1, le=100, description="Items per page"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: SupabaseClient = Depends(get_db),
) -> VideoListResponse:
    """
    Retrieve a paginated list of the current user's videos.
    Sorted by creation date (newest first).
    """
    service = VideoService(db)
    videos, total = await service.list_user_videos(
        user_id=current_user["id"],
        page=page,
        per_page=per_page,
    )

    return VideoListResponse(
        videos=[VideoResponse(**v) for v in videos],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get(
    "/{video_id}",
    response_model=VideoResponse,
    summary="Get video details",
)
async def get_video(
    video_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: SupabaseClient = Depends(get_db),
) -> VideoResponse:
    """
    Retrieve details of a specific video.
    Only the video owner can access their videos.
    """
    service = VideoService(db)
    video = await service.get_video_by_id(
        video_id=str(video_id),
        user_id=current_user["id"],
    )

    if video is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found",
        )

    return VideoResponse(**video)
