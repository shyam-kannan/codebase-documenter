from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
import logging
from app.core.database import get_db
from app.models.job import Job
from app.schemas.job import JobCreate, JobResponse
from app.tasks.document_repo import document_repository

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(job_data: JobCreate, db: Session = Depends(get_db)):
    """
    Create a new documentation job for a GitHub repository.

    - **github_url**: The GitHub repository URL to document

    This endpoint creates a job and queues it for background processing.
    """
    # Check if job already exists for this URL
    existing_job = db.query(Job).filter(Job.github_url == job_data.github_url).first()
    if existing_job:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Job already exists for this repository. Job ID: {existing_job.id}"
        )

    # Create new job
    new_job = Job(github_url=job_data.github_url)
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    # Queue the Celery task for background processing
    try:
        task = document_repository.delay(str(new_job.id))
        logger.info(f"Queued task {task.id} for job {new_job.id}")
    except Exception as e:
        logger.error(f"Failed to queue task for job {new_job.id}: {str(e)}")
        # Don't fail the request, job will remain in pending state
        # Could be picked up manually or by a retry mechanism

    return new_job

@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: UUID, db: Session = Depends(get_db)):
    """
    Get the status of a documentation job.

    - **job_id**: The UUID of the job to retrieve
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found"
        )

    return job

@router.get("/jobs", response_model=list[JobResponse])
async def list_jobs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    List all documentation jobs.

    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return
    """
    jobs = db.query(Job).order_by(Job.created_at.desc()).offset(skip).limit(limit).all()
    return jobs
