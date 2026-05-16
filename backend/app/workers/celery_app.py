"""
ClipWise — Celery Application

Configures the Celery distributed task queue with Redis
as both the message broker and result backend.
"""

from celery import Celery

from app.config import get_settings

settings = get_settings()

# =====================================================
# Celery Instance
# =====================================================

celery_app = Celery(
    "clipwise",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

# =====================================================
# Celery Configuration
# =====================================================

celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",

    # Timezone
    timezone="UTC",
    enable_utc=True,

    # Task behavior
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,

    # Result expiration (24 hours)
    result_expires=86400,

    # Task routing
    task_routes={
        "app.workers.tasks.process_video": {"queue": "video_processing"},
        "app.workers.video_renderer.render_video_clips": {"queue": "video_processing"},
    },

    # Retry policy for broker connection
    broker_connection_retry_on_startup=True,
)

# Auto-discover tasks in the workers module
celery_app.autodiscover_tasks(["app.workers"])
