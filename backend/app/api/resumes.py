"""Batch upload and processing endpoints."""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import uuid
import io
import tempfile
import os
import logging

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import get_settings
from app.models import Job, Resume
from app.tasks import parse_resume_task, embed_candidate_task, score_candidate_task

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(prefix="/api/v1/jobs", tags=["resumes"])


def get_minio_client():
    """Get MinIO client instance."""
    if not settings.ENABLE_MINIO:
        return None
    
    try:
        from minio import Minio
        client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ROOT_USER,
            secret_key=settings.MINIO_ROOT_PASSWORD,
            secure=settings.MINIO_SECURE
        )
        
        # Ensure bucket exists
        if not client.bucket_exists(settings.MINIO_BUCKET_NAME):
            client.make_bucket(settings.MINIO_BUCKET_NAME)
            logger.info(f"Created bucket: {settings.MINIO_BUCKET_NAME}")
        
        return client
    except Exception as e:
        logger.error(f"MinIO client error: {e}")
        return None


@router.post("/{job_id}/resumes")
async def upload_resumes(
    job_id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Batch upload resumes for a job and trigger processing pipeline."""
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    job = db.query(Job).filter(Job.id == job_uuid).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    minio_client = get_minio_client()
    uploaded_resumes = []
    
    for file in files:
        try:
            # Validate file type
            file_ext = file.filename.split('.')[-1].lower()
            if file_ext not in ['pdf', 'docx', 'txt']:
                logger.warning(f"Skipping unsupported file: {file.filename}")
                continue
            
            # Read file content
            content = await file.read()
            
            # Generate unique file path
            resume_id = uuid.uuid4()
            file_path = f"{job_id}/{resume_id}.{file_ext}"
            
            # Upload to MinIO if enabled
            if minio_client:
                try:
                    minio_client.put_object(
                        settings.MINIO_BUCKET_NAME,
                        file_path,
                        io.BytesIO(content),
                        len(content),
                        content_type=file.content_type or 'application/octet-stream'
                    )
                    logger.info(f"✓ Uploaded to MinIO: {file_path}")
                except Exception as e:
                    logger.error(f"MinIO upload failed: {e}")
                    # Continue with local storage fallback
                    file_path = f"/tmp/{resume_id}.{file_ext}"
                    with open(file_path, 'wb') as f:
                        f.write(content)
            else:
                # Local storage fallback
                file_path = f"/tmp/{resume_id}.{file_ext}"
                with open(file_path, 'wb') as f:
                    f.write(content)
            
            # Create resume record
            resume = Resume(
                id=resume_id,
                job_id=job_uuid,
                file_path=file_path,
                file_name=file.filename,
                file_size_bytes=len(content),
                file_type=file_ext,
                parse_status="pending"
            )
            
            db.add(resume)
            db.commit()
            db.refresh(resume)
            
            # Trigger Celery pipeline: parse -> embed -> score
            try:
                # Chain tasks: parse -> embed -> score
                from celery import chain
                
                task_chain = chain(
                    parse_resume_task.s(str(resume_id)),
                    embed_candidate_task.s(),
                    score_candidate_task.s(job_id=str(job_uuid))
                )
                
                result = task_chain.apply_async()
                logger.info(f"✓ Queued processing for {file.filename}")
                
                uploaded_resumes.append({
                    "resume_id": str(resume_id),
                    "file_name": file.filename,
                    "status": "queued",
                    "task_id": result.id
                })
            except Exception as e:
                logger.error(f"Failed to queue task: {e}")
                uploaded_resumes.append({
                    "resume_id": str(resume_id),
                    "file_name": file.filename,
                    "status": "error",
                    "error": str(e)
                })
        
        except Exception as e:
            logger.error(f"Error processing {file.filename}: {e}")
            continue
    
    return {
        "job_id": job_id,
        "uploaded": len(uploaded_resumes),
        "resumes": uploaded_resumes
    }
