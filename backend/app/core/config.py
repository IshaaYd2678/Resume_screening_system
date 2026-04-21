import os
from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration from environment variables."""
    
    # App
    APP_TITLE: str = "IRSS Open Source"
    APP_VERSION: str = "2.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    RELOAD: bool = False
    
    # Database
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: int = 5432
    
    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )
    
    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    
    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # Ollama
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    MODEL_PARSE: str = "mistral:7b-instruct-q4_K_M"
    MODEL_EXPLAIN: str = "llama3.1:8b-instruct-q4_K_M"
    MODEL_EMBED: str = "nomic-embed-text"
    LLM_TEMPERATURE: float = 0.7
    LLM_TOP_P: float = 0.95
    LLM_MAX_TOKENS: int = 2048
    LLM_TIMEOUT: int = 60
    
    # MinIO
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ROOT_USER: str = "minioadmin"
    MINIO_ROOT_PASSWORD: str = "minioadmin"
    MINIO_BUCKET_NAME: str = "irss-resumes"
    MINIO_SECURE: bool = False
    
    # Celery
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/1"
    CELERY_TASK_TIME_LIMIT: int = 3600  # 1 hour
    CELERY_TASK_SOFT_TIME_LIMIT: int = 3500
    
    # CORS
    ALLOWED_ORIGINS: list = ["http://localhost:3000", "http://frontend:3000", "https://localhost"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Feature Flags
    ENABLE_OBSERVABILITY: bool = True
    ENABLE_MINIO: bool = True
    ENABLE_OLLAMA_FALLBACK: bool = True
    
    # OpenTelemetry
    OTEL_EXPORTER_OTLP_ENDPOINT: str = "http://jaeger:4317"
    OTEL_SERVICE_NAME: str = "irss-api"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
