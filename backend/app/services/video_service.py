"""
ClipWise — Video Service

Business logic for video CRUD operations, credit management,
and status tracking throughout the processing pipeline.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

from supabase import Client as SupabaseClient

logger = logging.getLogger("clipwise.services.video")


class VideoService:
    """Handles video-related database operations and business logic."""

    def __init__(self, db: SupabaseClient) -> None:
        self.db = db

    async def create_video(
        self,
        user_id: str,
        original_url: str,
        title: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a new video record with 'pending' status.

        Args:
            user_id: Owner's UUID.
            original_url: URL of the uploaded/linked video.
            title: Optional video title.

        Returns:
            The created video record as a dict.

        Raises:
            RuntimeError: If the insert operation fails.
        """
        insert_data: Dict[str, Any] = {
            "user_id": user_id,
            "original_url": original_url,
            "status": "pending",
        }

        if title:
            insert_data["title"] = title

        result = self.db.table("videos").insert(insert_data).execute()

        if not result.data or len(result.data) == 0:
            logger.error("Failed to create video for user %s", user_id)
            raise RuntimeError("Failed to create video record")

        video = result.data[0]
        logger.info("Created video %s for user %s", video["id"], user_id)
        return video

    async def list_user_videos(
        self,
        user_id: str,
        page: int = 1,
        per_page: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Retrieve a paginated list of videos for a user.

        Args:
            user_id: Owner's UUID.
            page: Page number (1-indexed).
            per_page: Number of items per page.

        Returns:
            Tuple of (video list, total count).
        """
        offset = (page - 1) * per_page

        # Get total count
        count_result = (
            self.db.table("videos")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        total = count_result.count if count_result.count is not None else 0

        # Get paginated data
        result = (
            self.db.table("videos")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + per_page - 1)
            .execute()
        )

        videos = result.data if result.data else []
        logger.info(
            "Listed %d/%d videos for user %s (page %d)",
            len(videos), total, user_id, page,
        )
        return videos, total

    async def get_video_by_id(
        self,
        video_id: str,
        user_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch a single video by ID, scoped to the owning user.

        Args:
            video_id: The video's UUID string.
            user_id: The requesting user's UUID (for ownership check).

        Returns:
            Video dict if found and owned by user, None otherwise.
        """
        result = (
            self.db.table("videos")
            .select("*")
            .eq("id", video_id)
            .eq("user_id", user_id)
            .execute()
        )

        if result.data and len(result.data) > 0:
            return result.data[0]

        logger.warning("Video %s not found for user %s", video_id, user_id)
        return None

    async def update_video_status(
        self,
        video_id: str,
        status: str,
        processed_url: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Update a video's processing status.

        Args:
            video_id: The video's UUID.
            status: New status ('pending', 'processing', 'completed', 'failed').
            processed_url: URL of processed video (on completion).
            error_message: Error details (on failure).

        Returns:
            Updated video dict if successful, None otherwise.
        """
        update_data: Dict[str, Any] = {"status": status}

        if processed_url is not None:
            update_data["processed_url"] = processed_url
        if error_message is not None:
            update_data["error_message"] = error_message

        result = (
            self.db.table("videos")
            .update(update_data)
            .eq("id", video_id)
            .execute()
        )

        if result.data and len(result.data) > 0:
            logger.info("Video %s status updated to '%s'", video_id, status)
            return result.data[0]

        logger.error("Failed to update status for video %s", video_id)
        return None

    async def deduct_user_credit(self, user_id: str) -> None:
        """
        Deduct one processing credit from the user's balance.

        Uses an RPC call or direct update to atomically decrement credits.

        Args:
            user_id: The user's UUID.

        Raises:
            RuntimeError: If credit deduction fails.
        """
        # Fetch current credits
        user_result = (
            self.db.table("users")
            .select("credits_remaining")
            .eq("id", user_id)
            .execute()
        )

        if not user_result.data:
            raise RuntimeError(f"User {user_id} not found for credit deduction")

        current_credits = user_result.data[0]["credits_remaining"]
        new_credits = max(0, current_credits - 1)

        update_result = (
            self.db.table("users")
            .update({"credits_remaining": new_credits})
            .eq("id", user_id)
            .execute()
        )

        if not update_result.data:
            raise RuntimeError(f"Failed to deduct credit for user {user_id}")

        logger.info(
            "Deducted 1 credit for user %s: %d → %d",
            user_id, current_credits, new_credits,
        )
