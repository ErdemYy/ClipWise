"""
ClipWise — Auth Service

Business logic for authentication operations.
This layer sits between the router and the database,
encapsulating all auth-related data access patterns.
"""

import logging
from typing import Any, Dict, Optional

from supabase import Client as SupabaseClient

logger = logging.getLogger("clipwise.services.auth")


class AuthService:
    """Handles authentication-related database operations."""

    def __init__(self, db: SupabaseClient) -> None:
        self.db = db

    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch a user profile by their UUID.

        Args:
            user_id: The user's UUID string.

        Returns:
            User dict if found, None otherwise.
        """
        result = self.db.table("users").select("*").eq("id", user_id).execute()

        if result.data and len(result.data) > 0:
            return result.data[0]
        return None

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Fetch a user profile by email address.

        Args:
            email: The user's email address.

        Returns:
            User dict if found, None otherwise.
        """
        result = self.db.table("users").select("*").eq("email", email).execute()

        if result.data and len(result.data) > 0:
            return result.data[0]
        return None

    async def update_user_profile(
        self, user_id: str, updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Update a user's profile fields.

        Args:
            user_id: The user's UUID string.
            updates: Dictionary of fields to update.

        Returns:
            Updated user dict if successful, None otherwise.
        """
        # Filter out None values to avoid overwriting with nulls
        clean_updates = {k: v for k, v in updates.items() if v is not None}

        if not clean_updates:
            logger.warning("No valid fields to update for user %s", user_id)
            return await self.get_user_by_id(user_id)

        result = (
            self.db.table("users")
            .update(clean_updates)
            .eq("id", user_id)
            .execute()
        )

        if result.data and len(result.data) > 0:
            logger.info("Updated profile for user %s: %s", user_id, list(clean_updates.keys()))
            return result.data[0]

        logger.error("Failed to update profile for user %s", user_id)
        return None
