from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
import logging

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import Job, Resume, Score
from app.schemas.common import JobCreate, JobUpdate, JobResponse, RankingListResponse, JobStatusResponse
from uuid import UUID

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])
logger = logging.getLogger(__name__)


@router.get("", response_model=list)
async def list_jobs(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all jobs for the current user."""
    user_id = UUID(current_user["user_id"])
    
    jobs = db.query(Job).filter(Job.created_by == user_id).order_by(Job.created_at.desc()).all()
    
    return jobs


@router.post("", response_model=JobResponse)
async def create_job(
    job_data: JobCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new job opening."""
    user_id = UUID(current_user["user_id"])
    
    # Generate embedding for JD text
    from app.nlp.embedding import embedding_client
    import asyncio
    
    jd_embedding = None
    try:
        jd_embedding = await embedding_client.embed_text(job_data.jd_text)
    except Exception as e:
        logger.warning(f"Failed to generate JD embedding: {e}")
    
    job = Job(
        title=job_data.title,
        jd_text=job_data.jd_text,
        jd_embedding=jd_embedding,
        must_have_skills=job_data.must_have_skills,
        nice_to_have_skills=job_data.nice_to_have_skills,
        min_experience_years=job_data.min_experience_years,
        created_by=user_id
    )
    
    db.add(job)
    db.commit()
    db.refresh(job)
    
    return job


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: UUID, db: Session = Depends(get_db)):
    """Get job details."""
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    return job


@router.patch("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: UUID,
    job_data: JobUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a job opening."""
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Check authorization
    if job.created_by != UUID(current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this job"
        )
    
    # Update fields
    if job_data.title is not None:
        job.title = job_data.title
    if job_data.jd_text is not None:
        job.jd_text = job_data.jd_text
    if job_data.weights is not None:
        job.weights = job_data.weights
        # Trigger re-ranking with new weights
        try:
            from app.tasks import rerank_job_candidates
            rerank_job_candidates.apply_async(args=[str(job_id)])
            logger.info(f"Triggered re-ranking for job {job_id}")
        except Exception as e:
            logger.warning(f"Failed to trigger re-ranking: {e}")
    if job_data.status is not None:
        job.status = job_data.status
    
    db.commit()
    db.refresh(job)
    
    return job


@router.get("/{job_id}/status", response_model=JobStatusResponse)
async def get_job_status(job_id: UUID, db: Session = Depends(get_db)):
    """Get job processing status."""
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Count resumes
    total_resumes = db.query(Resume).filter(Resume.job_id == job_id).count()
    parsed = db.query(Resume).filter(
        Resume.job_id == job_id,
        Resume.parse_status == "success"
    ).count()
    
    # Count scores
    scored = db.query(Score).filter(Score.job_id == job_id).count()
    
    progress = (parsed / total_resumes * 100) if total_resumes > 0 else 0
    
    return JobStatusResponse(
        job_id=job_id,
        status=job.status,
        total_resumes=total_resumes,
        parsed=parsed,
        scored=scored,
        progress_percent=progress,
        current_operation="parsing" if parsed < total_resumes else "ranking"
    )


@router.get("/{job_id}/candidates", response_model=RankingListResponse)
async def get_job_candidates(
    job_id: UUID,
    page: int = 1,
    page_size: int = 50,
    tier: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get ranked candidates for a job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Query scores with filtering
    query = db.query(Score).filter(Score.job_id == job_id)
    
    if tier:
        query = query.filter(Score.tier == tier)
    
    # Order by composite score descending
    query = query.order_by(Score.composite_score.desc())
    
    total = query.count()
    
    # Pagination
    offset = (page - 1) * page_size
    scores = query.offset(offset).limit(page_size).all()
    
    candidates = []
    for score in scores:
        candidates.append({
            "candidate": score.candidate,
            "score": score,
            "explanation": score.explanation
        })
    
    return RankingListResponse(
        job_id=job_id,
        total_candidates=total,
        page=page,
        page_size=page_size,
        candidates=candidates
    )
