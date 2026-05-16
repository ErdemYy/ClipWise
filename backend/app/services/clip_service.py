"""
ClipWise — Clip Service

Business logic for clip CRUD operations.
Clips are AI-generated short-form video segments extracted from source videos.
"""

import logging
from typing import Any, Dict, List, Optional
from uuid import uuid4

from supabase import Client as SupabaseClient

logger = logging.getLogger("clipwise.services.clip")


class ClipService:
    """Handles clip-related database operations."""

    def __init__(self, db: SupabaseClient) -> None:
        self.db = db

    async def list_clips_by_video(self, video_id: str) -> List[Dict[str, Any]]:
        """
        Retrieve all clips for a given video, sorted by score descending.

        Args:
            video_id: The parent video's UUID.

        Returns:
            List of clip dicts, ordered by engagement score.
        """
        result = (
            self.db.table("clips")
            .select("*")
            .eq("video_id", video_id)
            .order("score", desc=True, nullsfirst=False)
            .execute()
        )

        clips = result.data if result.data else []
        logger.info("Found %d clips for video %s", len(clips), video_id)
        return clips

    async def get_clip_by_id(self, clip_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch a single clip by its UUID.

        Args:
            clip_id: The clip's UUID string.

        Returns:
            Clip dict if found, None otherwise.
        """
        result = (
            self.db.table("clips")
            .select("*")
            .eq("id", clip_id)
            .execute()
        )

        if result.data and len(result.data) > 0:
            return result.data[0]

        logger.warning("Clip %s not found", clip_id)
        return None

    async def create_clip(
        self,
        video_id: str,
        title: str,
        start_time: float,
        end_time: float,
        transcript: Optional[str] = None,
        video_url: Optional[str] = None,
        score: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Create a new clip record for a processed video.

        Args:
            video_id: Parent video UUID.
            title: AI-generated clip title.
            start_time: Clip start timestamp in seconds.
            end_time: Clip end timestamp in seconds.
            transcript: Transcribed text of the clip.
            video_url: URL of the generated clip file.
            score: AI virality/engagement score (0-100).

        Returns:
            The created clip record.

        Raises:
            RuntimeError: If the insert operation fails.
        """
        insert_data: Dict[str, Any] = {
            "video_id": video_id,
            "title": title,
            "start_time": start_time,
            "end_time": end_time,
        }

        if transcript is not None:
            insert_data["transcript"] = transcript
        if video_url is not None:
            insert_data["video_url"] = video_url
        if score is not None:
            insert_data["score"] = score

        result = self.db.table("clips").insert(insert_data).execute()

        if not result.data or len(result.data) == 0:
            logger.error("Failed to create clip for video %s", video_id)
            raise RuntimeError("Failed to create clip record")

        clip = result.data[0]
        logger.info(
            "Created clip %s for video %s (%.1fs–%.1fs, score=%.1f)",
            clip["id"], video_id, start_time, end_time, score or 0,
        )
        return clip

    async def create_clips_batch(
        self,
        clips_data: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Batch-create multiple clips at once (used by the video processing worker).

        Args:
            clips_data: List of dicts, each containing clip fields.

        Returns:
            List of created clip records.

        Raises:
            RuntimeError: If the batch insert fails.
        """
        if not clips_data:
            return []

        result = self.db.table("clips").insert(clips_data).execute()

        if not result.data:
            logger.error("Batch clip creation failed for %d clips", len(clips_data))
            raise RuntimeError("Failed to batch-create clips")

        logger.info("Batch-created %d clips", len(result.data))
        return result.data

    async def delete_clips_for_video(self, video_id: str) -> int:
        """
        Delete all clips associated with a video.
        Used when re-processing a video.

        Args:
            video_id: The parent video's UUID.

        Returns:
            Number of clips deleted.
        """
        result = (
            self.db.table("clips")
            .delete()
            .eq("video_id", video_id)
            .execute()
        )

        deleted_count = len(result.data) if result.data else 0
        logger.info("Deleted %d clips for video %s", deleted_count, video_id)
        return deleted_count
