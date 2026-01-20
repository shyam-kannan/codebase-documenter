"""
Celery application configuration for background task processing.
"""
from celery import Celery
from app.core.config import settings

# Create Celery application
celery_app = Celery(
    "codebase_documenter",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.document_repo"]
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max per task
    task_soft_time_limit=3300,  # Soft limit at 55 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50,
    broker_connection_retry_on_startup=True,
)

# Optional: Celery beat schedule for periodic tasks (future use)
celery_app.conf.beat_schedule = {
    # Example: Clean up old jobs every day
    # 'cleanup-old-jobs': {
    #     'task': 'app.tasks.cleanup.cleanup_old_jobs',
    #     'schedule': crontab(hour=0, minute=0),
    # },
}

if __name__ == "__main__":
    celery_app.start()
