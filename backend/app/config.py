"""
ClipWise — Application Configuration

Centralized configuration using Pydantic Settings.
All values are loaded from environment variables or .env file.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    Pydantic Settings automatically reads from .env files and
    environment variables, with env vars taking precedence.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- App ---
    app_name: str = "ClipWise API"
    app_version: str = "0.1.0"
    backend_debug: bool = False

    # --- Supabase ---
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    # --- Redis ---
    redis_url: str = "redis://localhost:6379/0"

    # --- CORS ---
    cors_origins: str = "http://localhost:3000"

    # --- Celery ---
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # --- OpenAI ---
    openai_api_key: str = ""

    # --- Stripe Payments ---
    stripe_api_key: str = ""
    stripe_webhook_secret: str = ""
    frontend_url: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> List[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache()
def get_settings() -> Settings:
    """
    Cached settings instance — created once and reused across the app.
    Uses lru_cache to avoid re-reading .env on every call.
    """
    try:
        settings = Settings()
    except Exception as e:
        raise ValueError(f"Environment variables configuration error: {e}")
        
    # Explicit verification of critical environment variables
    missing_vars = []
    if not settings.openai_api_key or settings.openai_api_key.strip() == "":
        missing_vars.append("OPENAI_API_KEY")
    if not settings.celery_broker_url or settings.celery_broker_url.strip() == "":
        missing_vars.append("CELERY_BROKER_URL")
    if not settings.supabase_url or settings.supabase_url.strip() == "":
        missing_vars.append("SUPABASE_URL")
    if not settings.supabase_anon_key or settings.supabase_anon_key.strip() == "":
        missing_vars.append("SUPABASE_ANON_KEY")
    if not settings.supabase_service_role_key or settings.supabase_service_role_key.strip() == "":
        missing_vars.append("SUPABASE_SERVICE_ROLE_KEY")
        
    if missing_vars:
        raise ValueError(
            f"CRITICAL CONFIGURATION ERROR: Missing required environment variables: {', '.join(missing_vars)}. "
            "Please configure them in your .env file or environment variables before running the backend."
        )
        
    return settings
