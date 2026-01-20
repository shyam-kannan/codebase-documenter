"""
Celery task for generating repository documentation.
"""
import logging
from datetime import datetime
from app.celery_app import celery_app
from app.agents.documentation_agent import DocumentationAgent
from app.core.database import SessionLocal
from app.models.job import Job, JobStatus

logger = logging.getLogger(__name__)


@celery_app.task(name="document_repository", bind=True)
def document_repository(self, job_id: str) -> dict:
    """
    Celery task to generate documentation for a repository.

    Args:
        job_id: The UUID of the job to process

    Returns:
        Dict with task result information
    """
    db = SessionLocal()

    try:
        # Get the job from database
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found in database")
            return {
                "success": False,
                "error": f"Job {job_id} not found",
            }

        # Update job status to processing
        job.status = JobStatus.PROCESSING
        job.updated_at = datetime.utcnow()
        db.commit()

        logger.info(f"[Job {job_id}] Starting documentation generation for {job.github_url}")

        # Create and run the documentation agent
        agent = DocumentationAgent()
        result = agent.run(job_id=str(job_id), github_url=job.github_url)

        # Update job based on result
        if result["success"]:
            job.status = JobStatus.COMPLETED
            job.error_message = None
            job.documentation_url = result.get("documentation_url")
            logger.info(f"[Job {job_id}] Documentation generation completed successfully")
            if job.documentation_url:
                logger.info(f"[Job {job_id}] Documentation URL: {job.documentation_url}")
        else:
            job.status = JobStatus.FAILED
            job.error_message = result.get("error", "Unknown error occurred")
            logger.error(f"[Job {job_id}] Documentation generation failed: {job.error_message}")

        job.updated_at = datetime.utcnow()
        db.commit()

        return {
            "success": result["success"],
            "status": result["status"],
            "error": result.get("error"),
        }

    except Exception as e:
        # Handle unexpected errors
        error_msg = f"Unexpected error in task: {str(e)}"
        logger.error(f"[Job {job_id}] {error_msg}", exc_info=True)

        # Update job status to failed
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            if job:
                job.status = JobStatus.FAILED
                job.error_message = error_msg
                job.updated_at = datetime.utcnow()
                db.commit()
        except Exception as db_error:
            logger.error(f"Failed to update job status: {db_error}")

        return {
            "success": False,
            "error": error_msg,
        }

    finally:
        db.close()


@celery_app.task(name="cleanup_old_jobs")
def cleanup_old_jobs(days: int = 30) -> dict:
    """
    Celery task to clean up old completed/failed jobs.

    Args:
        days: Number of days to keep jobs (default: 30)

    Returns:
        Dict with cleanup result information
    """
    db = SessionLocal()

    try:
        from datetime import timedelta

        cutoff_date = datetime.utcnow() - timedelta(days=days)

        # Find old jobs
        old_jobs = (
            db.query(Job)
            .filter(
                Job.status.in_([JobStatus.COMPLETED, JobStatus.FAILED]),
                Job.updated_at < cutoff_date,
            )
            .all()
        )

        count = len(old_jobs)

        # Delete old jobs
        for job in old_jobs:
            db.delete(job)

        db.commit()

        logger.info(f"Cleaned up {count} old jobs older than {days} days")

        return {
            "success": True,
            "deleted_count": count,
        }

    except Exception as e:
        error_msg = f"Error cleaning up old jobs: {str(e)}"
        logger.error(error_msg, exc_info=True)
        db.rollback()

        return {
            "success": False,
            "error": error_msg,
        }

    finally:
        db.close()
