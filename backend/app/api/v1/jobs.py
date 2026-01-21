from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from uuid import UUID
import logging
import boto3
from botocore.exceptions import ClientError
import requests
from app.core.database import get_db
from app.models.job import Job, JobStatus
from app.models.user import User
from app.schemas.job import JobCreate, JobResponse
from app.tasks.document_repo import document_repository, add_code_comments
from app.core.config import settings
from app.core.s3 import get_s3_client

router = APIRouter()
logger = logging.getLogger(__name__)

def check_repo_write_access(github_url: str, access_token: str) -> bool:
    """
    Check if the user has write access to the repository using GitHub API.

    Returns True if user has write/push access, False otherwise.
    """
    try:
        # Extract owner and repo from URL
        # Example: https://github.com/facebook/react -> facebook/react
        parts = github_url.rstrip('/').split('/')
        if len(parts) < 2:
            return False

        owner = parts[-2]
        repo = parts[-1].replace('.git', '')

        # Check repo permissions using GitHub API
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }

        response = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers=headers,
            timeout=10
        )

        if response.status_code == 200:
            repo_data = response.json()
            # Check if user has push permission
            permissions = repo_data.get('permissions', {})
            return permissions.get('push', False)

        return False
    except Exception as e:
        logger.error(f"Error checking repo access: {str(e)}")
        return False


@router.post("/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(job_data: JobCreate, db: Session = Depends(get_db)):
    """
    Create a new documentation job for a GitHub repository.

    - **github_url**: The GitHub repository URL to document
    - **github_id**: Optional GitHub user ID (for authenticated users)
    - **access_token**: Optional GitHub access token (for checking repo access)

    This endpoint creates a job and queues it for background processing.
    """
    # Check if job already exists for this URL
    existing_job = db.query(Job).filter(Job.github_url == job_data.github_url).first()
    if existing_job:
        # If job failed, delete it and create a new one (allow retry)
        if existing_job.status == JobStatus.FAILED:
            logger.info(f"Deleting failed job {existing_job.id} for retry")
            db.delete(existing_job)
            db.commit()
            # Continue to create new job below
        else:
            # Return existing job if it's pending, processing, or completed
            return existing_job

    # Look up user if authenticated
    user_id = None
    has_write_access = False

    if job_data.github_id and job_data.access_token:
        user = db.query(User).filter(User.github_id == job_data.github_id).first()
        if user:
            user_id = user.id
            # Check if user has write access to the repository
            has_write_access = check_repo_write_access(job_data.github_url, job_data.access_token)
            logger.info(f"User {user.username} has write access to {job_data.github_url}: {has_write_access}")

    # Create new job
    new_job = Job(
        github_url=job_data.github_url,
        user_id=user_id,
        has_write_access=has_write_access
    )
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


@router.get("/jobs/{job_id}/commented-code")
async def get_commented_code(job_id: UUID, db: Session = Depends(get_db)):
    """
    Get the commented code JSON for a job (for repos without write access).

    This endpoint fetches the commented code JSON from S3 and returns it,
    for display in the side-by-side viewer.

    - **job_id**: The UUID of the job
    """
    # Get the job
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found"
        )

    # Check if job has write access (should be viewing PR instead)
    if job.has_write_access and job.pull_request_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This job has a pull request. View the PR instead."
        )

    # Check if documentation exists
    if not job.documentation_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Commented code not yet available for this job"
        )

    # Fetch from S3
    try:
        s3_client = get_s3_client()
        object_key = f"commented/{job_id}.json"

        response = s3_client.get_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=object_key
        )

        json_content = response['Body'].read().decode('utf-8')

        return Response(
            content=json_content,
            media_type="application/json",
            headers={
                "Content-Disposition": f'inline; filename="{job_id}.json"'
            }
        )

    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'NoSuchKey':
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Commented code file not found in storage"
            )
        else:
            logger.error(f"S3 error fetching commented code: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve commented code from storage"
            )
    except Exception as e:
        logger.error(f"Error fetching commented code: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving the commented code"
        )


@router.post("/jobs/{job_id}/add-comments", response_model=JobResponse)
async def trigger_comment_generation(job_id: UUID, db: Session = Depends(get_db)):
    """
    Trigger AI comment generation for an existing job.

    - **job_id**: The UUID of the job

    This endpoint queues a task to add AI-generated inline comments to the code.
    - If the user has write access: creates a PR with commented code
    - If the user doesn't have write access: stores commented code for viewing
    """
    # Get the job
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found"
        )

    # Check if the job is in a completed state
    if job.status not in [JobStatus.COMPLETED, JobStatus.PENDING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot add comments to a job with status: {job.status.value}"
        )

    # Queue the comment generation task
    try:
        task = add_code_comments.delay(str(job_id))
        logger.info(f"Queued comment generation task {task.id} for job {job_id}")

        # Reset job status to pending
        job.status = JobStatus.PENDING
        job.error_message = None
        db.commit()
        db.refresh(job)

        return job

    except Exception as e:
        logger.error(f"Failed to queue comment generation task for job {job_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to queue comment generation task"
        )
