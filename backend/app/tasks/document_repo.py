"""
Celery task for generating repository documentation and AI comments.
"""
import logging
from datetime import datetime
from app.celery_app import celery_app
from app.agents.documentation_agent import DocumentationAgent
from app.agents.comment_agent import CommentAgent
from app.core.database import SessionLocal
from app.models.job import Job, JobStatus
from app.models.user import User
from app.core.encryption import decrypt_token

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

        # Get user access token if available
        access_token = None
        if job.user_id:
            user = db.query(User).filter(User.id == job.user_id).first()
            if user and user.encrypted_access_token:
                try:
                    access_token = decrypt_token(user.encrypted_access_token)
                    logger.info(f"[Job {job_id}] Using authenticated clone with user's access token")
                except Exception as e:
                    logger.warning(f"[Job {job_id}] Failed to decrypt access token: {e}")

        # Create and run the documentation agent
        agent = DocumentationAgent()
        result = agent.run(
            job_id=str(job_id),
            github_url=job.github_url,
            access_token=access_token
        )

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


@celery_app.task(name="add_code_comments", bind=True)
def add_code_comments(self, job_id: str) -> dict:
    """
    Celery task to add AI-generated inline comments to code.

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

        logger.info(f"[Job {job_id}] Starting comment generation for {job.github_url}")
        logger.info(f"[Job {job_id}] User has write access: {job.has_write_access}")

        # Get user access token if available
        access_token = None
        if job.user_id:
            user = db.query(User).filter(User.id == job.user_id).first()
            if user and user.encrypted_access_token:
                try:
                    access_token = decrypt_token(user.encrypted_access_token)
                    logger.info(f"[Job {job_id}] Using authenticated clone with user's access token")
                except Exception as e:
                    logger.warning(f"[Job {job_id}] Failed to decrypt access token: {e}")

        # Create and run the comment agent
        agent = CommentAgent()
        result = agent.run(
            job_id=str(job_id),
            github_url=job.github_url,
            user_id=str(job.user_id) if job.user_id else None,
            has_write_access=job.has_write_access,
            access_token=access_token,
        )

        # Update job based on result
        if result["success"]:
            job.status = JobStatus.COMPLETED
            job.error_message = None

            if result.get("pr_url"):
                job.pull_request_url = result["pr_url"]
                logger.info(f"[Job {job_id}] Created PR: {result['pr_url']}")
            elif result.get("commented_code_url"):
                job.documentation_url = result["commented_code_url"]
                logger.info(f"[Job {job_id}] Saved commented code: {result['commented_code_url']}")

            logger.info(f"[Job {job_id}] Comment generation completed successfully")
        else:
            job.status = JobStatus.FAILED
            job.error_message = result.get("error", "Unknown error occurred")
            logger.error(f"[Job {job_id}] Comment generation failed: {job.error_message}")

        job.updated_at = datetime.utcnow()
        db.commit()

        return {
            "success": result["success"],
            "status": result["status"],
            "pr_url": result.get("pr_url"),
            "commented_code_url": result.get("commented_code_url"),
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
