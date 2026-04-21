"""Celery task configuration."""

from celery import Celery
from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "irss",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=settings.CELERY_TASK_TIME_LIMIT,
    task_soft_time_limit=settings.CELERY_TASK_SOFT_TIME_LIMIT,
    result_expires=86400,  # 24 hours
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
)
