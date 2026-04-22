from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.models import Candidate, Score, Explanation
from app.schemas.common import CandidateResponse, ScoreResponse, ExplanationResponse

router = APIRouter(prefix="/api/v1/candidates", tags=["candidates"])


@router.get("/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(candidate_id: UUID, db: Session = Depends(get_db)):
    """Get candidate profile."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )
    
    return candidate


@router.get("/{candidate_id}/scores", response_model=dict)
async def get_candidate_scores(candidate_id: UUID, db: Session = Depends(get_db)):
    """Get all scores for a candidate across all jobs."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )
    
    scores = db.query(Score).filter(Score.candidate_id == candidate_id).all()
    
    return {
        "candidate_id": candidate_id,
        "scores": [
            {
                "job_id": str(score.job_id),
                "composite_score": score.composite_score,
                "tier": score.tier,
                "dimensions": {
                    "skills": score.skills_score,
                    "semantic": score.semantic_score,
                    "experience": score.experience_score,
                    "education": score.education_score,
                    "keywords": score.keywords_score
                }
            }
            for score in scores
        ]
    }


@router.get("/{candidate_id}/explanation", response_model=ExplanationResponse)
async def get_candidate_explanation(
    candidate_id: UUID,
    job_id: UUID = None,
    db: Session = Depends(get_db)
):
    """Get explanation for candidate score (XAI)."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )
    
    # Find the score
    score_query = db.query(Score).filter(Score.candidate_id == candidate_id)
    
    if job_id:
        score_query = score_query.filter(Score.job_id == job_id)
    
    score = score_query.first()
    
    if not score or not score.explanation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Explanation not found"
        )
    
    return score.explanation
