from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import datetime
import httpx
import redis

from app.core.database import get_db
from app.core.config import get_settings
from app.schemas.common import HealthCheck

router = APIRouter(prefix="/api/v1", tags=["health"])
settings = get_settings()


@router.get("/health", response_model=HealthCheck)
async def health_check(db: Session = Depends(get_db)):
    """Check health of all services."""
    health_status = {
        "status": "healthy",
        "postgres": "down",
        "redis": "down",
        "ollama": "down",
        "minio": "down",
        "timestamp": datetime.utcnow()
    }
    
    # Check PostgreSQL
    try:
        db.execute(text("SELECT 1"))
        health_status["postgres"] = "up"
    except Exception as e:
        health_status["postgres"] = f"down: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check Redis
    try:
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
        health_status["redis"] = "up"
    except Exception as e:
        health_status["redis"] = f"down: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check Ollama
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if response.status_code == 200:
                health_status["ollama"] = "up"
    except Exception as e:
        health_status["ollama"] = f"down: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check MinIO
    if settings.ENABLE_MINIO:
        try:
            from minio import Minio
            client = Minio(
                settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ROOT_USER,
                secret_key=settings.MINIO_ROOT_PASSWORD,
                secure=settings.MINIO_SECURE
            )
            client.list_buckets()
            health_status["minio"] = "up"
        except Exception as e:
            health_status["minio"] = f"down: {str(e)}"
            health_status["status"] = "degraded"
    
    return HealthCheck(**health_status)
