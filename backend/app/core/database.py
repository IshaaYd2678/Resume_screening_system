from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
import logging

from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# Create engine with connection pooling
engine = create_engine(
    settings.DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,
    echo=False,
    connect_args={
        "connect_timeout": 10,
        "options": "-c statement_timeout=30000"  # 30 second timeout
    }
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for ORM models
Base = declarative_base()


def get_db() -> Session:
    """Dependency for FastAPI to get DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Initialize database tables and extensions."""
    # Enable pgvector extension
    with engine.begin() as connection:
        try:
            connection.execute(
                text("CREATE EXTENSION IF NOT EXISTS vector")
            )
            connection.commit()
            logger.info("✓ pgvector extension enabled")
        except Exception as e:
            logger.warning(f"pgvector extension may already exist: {e}")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    logger.info("✓ Database tables created")
