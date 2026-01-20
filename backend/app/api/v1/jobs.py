from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from uuid import UUID
import logging
import boto3
from botocore.exceptions import ClientError
from app.core.database import get_db
from app.models.job import Job
from app.schemas.job import JobCreate, JobResponse
from app.tasks.document_repo import document_repository
from app.core.config import settings
from app.core.s3 import get_s3_client

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
        # Return the existing job instead of raising an error
        return existing_job

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

@router.get("/jobs/{job_id}/documentation")
async def get_documentation(job_id: UUID, db: Session = Depends(get_db)):
    """
    Get the documentation markdown content for a job.

    This endpoint fetches the markdown file from S3 and returns it,
    avoiding CORS issues when accessing S3 directly from the browser.

    - **job_id**: The UUID of the job
    """
    # Get the job
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found"
        )

    # Check if documentation exists
    if not job.documentation_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documentation not yet available for this job"
        )

    # Fetch from S3
    try:
        s3_client = get_s3_client()
        object_key = f"docs/{job_id}.md"

        response = s3_client.get_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=object_key
        )

        markdown_content = response['Body'].read().decode('utf-8')

        return Response(
            content=markdown_content,
            media_type="text/markdown",
            headers={
                "Content-Disposition": f'inline; filename="{job_id}.md"'
            }
        )

    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'NoSuchKey':
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Documentation file not found in storage"
            )
        else:
            logger.error(f"S3 error fetching documentation: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve documentation from storage"
            )
    except Exception as e:
        logger.error(f"Error fetching documentation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving the documentation"
        )
