from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, JSON, ForeignKey, Index, func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from pgvector.sqlalchemy import Vector
import uuid
from datetime import datetime

from app.core.database import Base


class User(Base):
    """User account model."""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    role = Column(String(50), default="user", index=True)  # admin, recruiter, user
    org_id = Column(String(255), nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    jobs = relationship("Job", back_populates="created_by_user")
    shortlists = relationship("Shortlist", back_populates="created_by_user")
    
    __table_args__ = (
        Index('idx_user_email_active', 'email', 'is_active'),
    )


class Job(Base):
    """Job opening model."""
    __tablename__ = "jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False, index=True)
    jd_text = Column(Text, nullable=False)
    jd_embedding = Column(Vector(384), nullable=True)  # nomic-embed-text dimension
    
    # Scoring weights (JSON: {skills: 0.3, semantic: 0.25, experience: 0.25, education: 0.1, keywords: 0.1})
    weights = Column(JSON, default={
        "skills": 0.30,
        "semantic": 0.25,
        "experience": 0.25,
        "education": 0.10,
        "keywords": 0.10
    })
    
    status = Column(String(50), default="active", index=True)  # active, archived, draft
    must_have_skills = Column(ARRAY(String), nullable=True)
    nice_to_have_skills = Column(ARRAY(String), nullable=True)
    min_experience_years = Column(Integer, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    created_by_user = relationship("User", back_populates="jobs")
    resumes = relationship("Resume", back_populates="job", cascade="all, delete-orphan")
    scores = relationship("Score", back_populates="job", cascade="all, delete-orphan")
    shortlists = relationship("Shortlist", back_populates="job", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_job_status_created', 'status', 'created_at'),
        Index(
            'idx_job_jd_embedding',
            'jd_embedding',
            postgresql_using='hnsw',
            postgresql_ops={'jd_embedding': 'vector_cosine_ops'},
        ),
    )


class Resume(Base):
    """Resume/CV file and metadata."""
    __tablename__ = "resumes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False, index=True)
    file_path = Column(String(500), nullable=False)  # MinIO key
    file_name = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, nullable=True)
    file_type = Column(String(50), nullable=False)  # pdf, docx, txt
    
    raw_text = Column(Text, nullable=True)
    parsed = Column(JSON, nullable=True)
    parse_status = Column(String(50), default="pending", index=True)  # pending, success, failed
    parse_error = Column(Text, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    job = relationship("Job", back_populates="resumes")
    candidate = relationship("Candidate", uselist=False, back_populates="resume", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_resume_job_status', 'job_id', 'parse_status'),
    )


class Candidate(Base):
    """Parsed candidate profile."""
    __tablename__ = "candidates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resume_id = Column(UUID(as_uuid=True), ForeignKey("resumes.id"), nullable=False, unique=True)
    
    name = Column(String(255), nullable=True, index=True)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(20), nullable=True)
    location = Column(String(255), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    github_url = Column(String(500), nullable=True)
    
    skills = Column(ARRAY(String), nullable=True)  # Normalized skill IDs from ESCO taxonomy
    skills_raw = Column(ARRAY(String), nullable=True)  # Original extracted skills
    
    experience = Column(JSON, nullable=True)  # [{title, company, start, end, duration_years, description}, ...]
    education = Column(JSON, nullable=True)  # [{degree, field, school, graduation_year}, ...]
    years_of_experience = Column(Float, nullable=True)
    
    # Embedding of resume text
    embedding = Column(Vector(384), nullable=True)
    embedding_model = Column(String(50), default="nomic-embed-text", nullable=True)
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    resume = relationship("Resume", back_populates="candidate")
    scores = relationship("Score", back_populates="candidate", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index(
            'idx_candidate_embedding',
            'embedding',
            postgresql_using='hnsw',
            postgresql_ops={'embedding': 'vector_cosine_ops'},
        ),
        Index('idx_candidate_name_email', 'name', 'email'),
    )


class Score(Base):
    """Scoring result for candidate against job."""
    __tablename__ = "scores"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False, index=True)
    
    # Dimension scores (0-100)
    skills_score = Column(Float, nullable=True)
    semantic_score = Column(Float, nullable=True)
    experience_score = Column(Float, nullable=True)
    education_score = Column(Float, nullable=True)
    keywords_score = Column(Float, nullable=True)
    
    # Composite score (0-100)
    composite_score = Column(Float, nullable=False, index=True)
    
    # Tier (Top/Strong/Moderate/Weak)
    tier = Column(String(20), nullable=False, index=True)
    
    rank = Column(Integer, nullable=True)  # Within job's candidate list
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    candidate = relationship("Candidate", back_populates="scores")
    job = relationship("Job", back_populates="scores")
    explanation = relationship("Explanation", uselist=False, back_populates="score", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_score_job_composite', 'job_id', 'composite_score'),
        Index('idx_score_job_tier', 'job_id', 'tier'),
    )


class Explanation(Base):
    """Explainability data for score (XAI)."""
    __tablename__ = "explanations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    score_id = Column(UUID(as_uuid=True), ForeignKey("scores.id"), nullable=False, unique=True)
    
    # Evidence
    matched_skills = Column(ARRAY(String), nullable=True)  # Top 5 matched skills
    missing_required_skills = Column(ARRAY(String), nullable=True)  # Top 3 missing must-haves
    top_matching_experience = Column(String(500), nullable=True)  # Best matching work experience
    
    # LLM-generated narrative
    narrative = Column(Text, nullable=True)
    narrative_model = Column(String(50), nullable=True)
    
    # Highlight data for PDF viewer
    highlights = Column(JSON, nullable=True)  # [{sentence, similarity_score}, ...]
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    score = relationship("Score", back_populates="explanation")


class Shortlist(Base):
    """Saved shortlist snapshot."""
    __tablename__ = "shortlists"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    
    # Array of candidate IDs
    candidate_ids = Column(ARRAY(UUID), nullable=False)
    
    # Weights snapshot when shortlist was created
    weights_snapshot = Column(JSON, nullable=True)
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Relationships
    job = relationship("Job", back_populates="shortlists")
    created_by_user = relationship("User", back_populates="shortlists")
