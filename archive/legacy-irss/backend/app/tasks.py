"""Celery task definitions for resume processing pipeline."""

import logging
import asyncio
from uuid import UUID
from datetime import datetime

from app.celery_app import celery_app
from app.core.database import SessionLocal
from app.nlp.extraction import extract_resume_text, clean_text
from app.nlp.parser import parse_resume_with_spacy_fallback
from app.nlp.embedding import embedding_client
from app.nlp.scorer import score_candidate
from app.models import Resume, Candidate, Score, Job
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@celery_app.task(bind=True, name='app.tasks.parse_resume_task')
def parse_resume_task(self, resume_id: str):
    """Parse single resume file."""
    try:
        db = SessionLocal()
        resume_uuid = UUID(resume_id)
        resume = db.query(Resume).filter(Resume.id == resume_uuid).first()
        
        if not resume:
            raise ValueError(f"Resume {resume_id} not found")
        
        logger.info(f"📄 Parsing resume: {resume.file_name}")
        
        # Download from MinIO if needed
        file_path = resume.file_path
        local_file_path = file_path
        
        # Check if file is in MinIO (starts with job_id/)
        if '/' in file_path and not file_path.startswith('/'):
            # File is in MinIO, download it
            try:
                from minio import Minio
                from app.core.config import get_settings
                import tempfile
                import os
                
                settings = get_settings()
                
                if settings.ENABLE_MINIO:
                    minio_client = Minio(
                        settings.MINIO_ENDPOINT,
                        access_key=settings.MINIO_ROOT_USER,
                        secret_key=settings.MINIO_ROOT_PASSWORD,
                        secure=settings.MINIO_SECURE
                    )
                    
                    # Download to temp file
                    temp_dir = tempfile.gettempdir()
                    local_file_path = os.path.join(temp_dir, f"{resume_id}.{resume.file_type}")
                    
                    minio_client.fget_object(
                        settings.MINIO_BUCKET_NAME,
                        file_path,
                        local_file_path
                    )
                    logger.info(f"✓ Downloaded from MinIO: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to download from MinIO, using local path: {e}")
        
        # Extract text from file
        raw_text = extract_resume_text(local_file_path, resume.file_type)
        raw_text = clean_text(raw_text)
        
        resume.raw_text = raw_text
        db.commit()
        
        # Parse with LLM
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        parsed = loop.run_until_complete(parse_resume_with_spacy_fallback(raw_text))
        loop.close()
        
        if not parsed:
            raise ValueError("Parsing returned no data")
        
        # Create candidate record
        candidate = Candidate(
            resume_id=resume_uuid,
            name=parsed.get("name"),
            email=parsed.get("email"),
            phone=parsed.get("phone"),
            location=parsed.get("location"),
            linkedin_url=parsed.get("linkedin_url"),
            github_url=parsed.get("github_url"),
            skills=parsed.get("skills", []),
            skills_raw=parsed.get("skills", []),
            experience=parsed.get("experience", []),
            education=parsed.get("education", []),
            years_of_experience=parsed.get("years_of_experience"),
            embedding=None  # Will be set in embed task
        )
        
        db.add(candidate)
        
        # Update resume
        resume.parsed = parsed
        resume.parse_status = "success"
        
        db.commit()
        db.refresh(resume)
        db.refresh(candidate)
        
        logger.info(f"✓ Resume parsed: {candidate.name}")
        
        return {"resume_id": resume_id, "candidate_id": str(candidate.id)}
    
    except Exception as e:
        db = SessionLocal()
        resume = db.query(Resume).filter(Resume.id == UUID(resume_id)).first()
        if resume:
            resume.parse_status = "failed"
            resume.parse_error = str(e)
            db.commit()
        
        logger.error(f"✗ Parse error: {e}", exc_info=True)
        raise
    
    finally:
        db.close()


@celery_app.task(bind=True, name='app.tasks.embed_candidate_task')
def embed_candidate_task(self, parse_result):
    """Generate embedding for candidate resume."""
    try:
        # Extract candidate_id from previous task result
        if isinstance(parse_result, dict):
            candidate_id = parse_result.get('candidate_id')
        else:
            candidate_id = parse_result
        
        db = SessionLocal()
        candidate_uuid = UUID(candidate_id)
        candidate = db.query(Candidate).filter(Candidate.id == candidate_uuid).first()
        
        if not candidate:
            raise ValueError(f"Candidate {candidate_id} not found")
        
        logger.info(f"🧬 Embedding candidate: {candidate.name}")
        
        # Get resume text
        resume = candidate.resume
        text = resume.raw_text or ""
        
        if not text:
            logger.warning(f"No text to embed for {candidate.name}")
            return {"candidate_id": candidate_id, "embedding_status": "skipped"}
        
        # Generate embedding
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        embedding = loop.run_until_complete(embedding_client.embed_text(text))
        loop.close()
        
        if embedding:
            candidate.embedding = embedding
            candidate.embedding_model = settings.MODEL_EMBED
            db.commit()
            logger.info(f"✓ Embedding generated: {len(embedding)} dimensions")
        else:
            logger.warning("Failed to generate embedding")
        
        return {"candidate_id": candidate_id, "embedding_status": "success"}
    
    except Exception as e:
        logger.error(f"✗ Embedding error: {e}", exc_info=True)
        raise
    
    finally:
        db.close()


@celery_app.task(bind=True, name='app.tasks.score_candidate_task')
def score_candidate_task(self, embed_result, job_id: str, weights: dict = None):
    """Score candidate against job."""
    try:
        # Extract candidate_id from previous task result
        if isinstance(embed_result, dict):
            candidate_id = embed_result.get('candidate_id')
        else:
            candidate_id = embed_result
        
        db = SessionLocal()
        candidate_uuid = UUID(candidate_id)
        job_uuid = UUID(job_id)
        
        candidate = db.query(Candidate).filter(Candidate.id == candidate_uuid).first()
        job = db.query(Job).filter(Job.id == job_uuid).first()
        
        if not candidate or not job:
            raise ValueError(f"Candidate or job not found")
        
        logger.info(f"📊 Scoring: {candidate.name} for job {job.title}")
        
        # Use provided weights or job weights
        if weights is None:
            weights = job.weights or {
                "skills": 0.30,
                "semantic": 0.25,
                "experience": 0.25,
                "education": 0.10,
                "keywords": 0.10
            }
        
        # Score candidate
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        scores = loop.run_until_complete(
            score_candidate(candidate, job, weights, db)
        )
        loop.close()
        
        # Determine tier
        composite = scores['composite']
        if composite >= 80:
            tier = "Top"
        elif composite >= 60:
            tier = "Strong"
        elif composite >= 40:
            tier = "Moderate"
        else:
            tier = "Weak"
        
        # Check if score already exists (for re-ranking)
        existing_score = db.query(Score).filter(
            Score.candidate_id == candidate_uuid,
            Score.job_id == job_uuid
        ).first()
        
        if existing_score:
            # Update existing score
            existing_score.skills_score = scores.get('skills_score')
            existing_score.semantic_score = scores.get('semantic_score')
            existing_score.experience_score = scores.get('experience_score')
            existing_score.education_score = scores.get('education_score')
            existing_score.keywords_score = scores.get('keywords_score')
            existing_score.composite_score = composite
            existing_score.tier = tier
            db.commit()
            db.refresh(existing_score)
            score = existing_score
        else:
            # Create new score record
            score = Score(
                candidate_id=candidate_uuid,
                job_id=job_uuid,
                skills_score=scores.get('skills_score'),
                semantic_score=scores.get('semantic_score'),
                experience_score=scores.get('experience_score'),
                education_score=scores.get('education_score'),
                keywords_score=scores.get('keywords_score'),
                composite_score=composite,
                tier=tier
            )
            
            db.add(score)
            db.commit()
            db.refresh(score)
        
        logger.info(f"✓ Score: {composite:.1f} ({tier}) for {candidate.name}")
        
        return {"score_id": str(score.id), "composite": composite, "tier": tier}
    
    except Exception as e:
        logger.error(f"✗ Scoring error: {e}", exc_info=True)
        raise
    
    finally:
        db.close()


@celery_app.task(bind=True, name='app.tasks.rerank_job_candidates')
def rerank_job_candidates(self, job_id: str):
    """Re-rank all candidates for a job with updated weights."""
    try:
        db = SessionLocal()
        job_uuid = UUID(job_id)
        
        job = db.query(Job).filter(Job.id == job_uuid).first()
        if not job:
            raise ValueError(f"Job {job_id} not found")
        
        logger.info(f"🔄 Re-ranking candidates for job: {job.title}")
        
        # Get all scores for this job
        scores = db.query(Score).filter(Score.job_id == job_uuid).all()
        
        reranked_count = 0
        for score in scores:
            candidate = score.candidate
            
            # Re-score with new weights
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            new_scores = loop.run_until_complete(
                score_candidate(candidate, job, job.weights, db)
            )
            loop.close()
            
            # Update score
            composite = new_scores['composite']
            if composite >= 80:
                tier = "Top"
            elif composite >= 60:
                tier = "Strong"
            elif composite >= 40:
                tier = "Moderate"
            else:
                tier = "Weak"
            
            score.skills_score = new_scores.get('skills_score')
            score.semantic_score = new_scores.get('semantic_score')
            score.experience_score = new_scores.get('experience_score')
            score.education_score = new_scores.get('education_score')
            score.keywords_score = new_scores.get('keywords_score')
            score.composite_score = composite
            score.tier = tier
            
            reranked_count += 1
        
        db.commit()
        
        logger.info(f"✓ Re-ranked {reranked_count} candidates for {job.title}")
        
        return {"job_id": job_id, "reranked_count": reranked_count}
    
    except Exception as e:
        logger.error(f"✗ Re-ranking error: {e}", exc_info=True)
        raise
    
    finally:
        db.close()
