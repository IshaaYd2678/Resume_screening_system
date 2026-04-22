from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


# ============ Auth Schemas ============
class TokenRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


# ============ Job Schemas ============
class JobCreate(BaseModel):
    title: str
    jd_text: str
    must_have_skills: Optional[List[str]] = None
    nice_to_have_skills: Optional[List[str]] = None
    min_experience_years: Optional[int] = None


class JobUpdate(BaseModel):
    title: Optional[str] = None
    jd_text: Optional[str] = None
    weights: Optional[Dict[str, float]] = None
    status: Optional[str] = None


class JobResponse(BaseModel):
    id: UUID
    title: str
    status: str
    weights: Dict[str, float]
    created_at: datetime
    created_by: UUID
    
    class Config:
        from_attributes = True


# ============ Resume & Candidate Schemas ============
class ResumeUpload(BaseModel):
    file_name: str
    file_size_bytes: int
    file_type: str  # pdf, docx, txt


class CandidateResponse(BaseModel):
    id: UUID
    name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    location: Optional[str]
    linkedin_url: Optional[str]
    github_url: Optional[str]
    skills: Optional[List[str]]
    years_of_experience: Optional[float]
    
    class Config:
        from_attributes = True


# ============ Score Schemas ============
class ScoreDimensions(BaseModel):
    skills_score: Optional[float]
    semantic_score: Optional[float]
    experience_score: Optional[float]
    education_score: Optional[float]
    keywords_score: Optional[float]


class ScoreResponse(BaseModel):
    id: UUID
    candidate_id: UUID
    job_id: UUID
    composite_score: float
    tier: str
    rank: Optional[int]
    dimensions: ScoreDimensions
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ Explanation Schemas ============
class ExplanationResponse(BaseModel):
    matched_skills: Optional[List[str]]
    missing_required_skills: Optional[List[str]]
    top_matching_experience: Optional[str]
    narrative: Optional[str]
    highlights: Optional[List[Dict[str, Any]]]
    
    class Config:
        from_attributes = True


# ============ Ranking Schemas ============
class CandidateRankingResponse(BaseModel):
    candidate: CandidateResponse
    score: ScoreResponse
    explanation: Optional[ExplanationResponse]


class RankingListResponse(BaseModel):
    job_id: UUID
    total_candidates: int
    page: int
    page_size: int
    candidates: List[CandidateRankingResponse]


# ============ Job Status Schemas ============
class JobStatusResponse(BaseModel):
    job_id: UUID
    status: str
    total_resumes: int
    parsed: int
    scored: int
    progress_percent: float
    current_operation: Optional[str]


# ============ Health Check ============
class HealthCheck(BaseModel):
    status: str
    postgres: str
    redis: str
    ollama: str
    minio: Optional[str] = None
    timestamp: datetime


# ============ Shortlist Schemas ============
class ShortlistCreate(BaseModel):
    name: str
    candidate_ids: List[UUID]


class ShortlistResponse(BaseModel):
    id: UUID
    job_id: UUID
    name: str
    candidate_ids: List[UUID]
    created_at: datetime
    
    class Config:
        from_attributes = True
