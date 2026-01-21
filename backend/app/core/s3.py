"""
S3 integration for storing generated documentation.
"""
import logging
from typing import Optional
from pathlib import Path
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from app.core.config import settings

logger = logging.getLogger(__name__)


def get_s3_client():
    """
    Create and return an S3 client.

    Returns:
        boto3.client: Configured S3 client

    Raises:
        NoCredentialsError: If AWS credentials are not configured
    """
    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        return s3_client
    except NoCredentialsError as e:
        logger.error("AWS credentials not found")
        raise


def upload_to_s3(file_path: str, job_id: str, key_prefix: str = "docs") -> Optional[str]:
    """
    Upload a documentation file to S3 and return the public URL.

    Args:
        file_path: Path to the local file
        job_id: The job ID (used for S3 object key)
        key_prefix: Prefix for the S3 object key (default: "docs")

    Returns:
        str: Public URL of the uploaded file, or None if upload failed

    Raises:
        FileNotFoundError: If the file doesn't exist
        ClientError: If there's an error uploading to S3
    """
    try:
        # Verify file exists
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        # Get S3 client
        s3_client = get_s3_client()

        # Determine content type based on file extension
        suffix = path.suffix.lower()
        content_type_map = {
            '.md': 'text/markdown',
            '.json': 'application/json',
            '.txt': 'text/plain',
        }
        content_type = content_type_map.get(suffix, 'application/octet-stream')

        # S3 object key (filename in bucket)
        object_key = f"{key_prefix}/{job_id}{suffix}"

        # Upload the file
        logger.info(f"Uploading {file_path} to S3 bucket {settings.S3_BUCKET_NAME}")

        with open(file_path, 'rb') as file_data:
            s3_client.put_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=object_key,
                Body=file_data,
                ContentType=content_type,
                #ACL='public-read',
                CacheControl='max-age=3600',  # Cache for 1 hour
                Metadata={
                    'job-id': job_id,
                    'content-type': key_prefix
                }
            )

        # Construct the public URL
        public_url = f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{object_key}"

        logger.info(f"Successfully uploaded to S3: {public_url}")
        return public_url

    except FileNotFoundError as e:
        logger.error(f"File not found: {str(e)}")
        raise

    except NoCredentialsError as e:
        logger.error("AWS credentials not configured")
        return None

    except ClientError as e:
        error_code = e.response['Error']['Code']
        logger.error(f"S3 upload failed with error {error_code}: {str(e)}")
        return None

    except Exception as e:
        logger.error(f"Unexpected error uploading to S3: {str(e)}")
        return None


def delete_from_s3(job_id: str) -> bool:
    """
    Delete a documentation file from S3.

    Args:
        job_id: The job ID

    Returns:
        bool: True if deletion was successful, False otherwise
    """
    try:
        s3_client = get_s3_client()
        object_key = f"docs/{job_id}.md"

        logger.info(f"Deleting {object_key} from S3 bucket {settings.S3_BUCKET_NAME}")

        s3_client.delete_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=object_key
        )

        logger.info(f"Successfully deleted {object_key} from S3")
        return True

    except ClientError as e:
        logger.error(f"Failed to delete from S3: {str(e)}")
        return False

    except Exception as e:
        logger.error(f"Unexpected error deleting from S3: {str(e)}")
        return False


def check_s3_configuration() -> bool:
    """
    Check if S3 is properly configured.

    Returns:
        bool: True if S3 is configured and accessible, False otherwise
    """
    try:
        # Check if credentials are set
        if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
            logger.warning("AWS credentials not configured")
            return False

        if not settings.S3_BUCKET_NAME:
            logger.warning("S3 bucket name not configured")
            return False

        # Try to list objects (head bucket)
        s3_client = get_s3_client()
        s3_client.head_bucket(Bucket=settings.S3_BUCKET_NAME)

        logger.info("S3 configuration is valid")
        return True

    except NoCredentialsError:
        logger.warning("AWS credentials not found")
        return False

    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == '404':
            logger.error(f"S3 bucket {settings.S3_BUCKET_NAME} does not exist")
        elif error_code == '403':
            logger.error(f"Access denied to S3 bucket {settings.S3_BUCKET_NAME}")
        else:
            logger.error(f"S3 configuration check failed: {str(e)}")
        return False

    except Exception as e:
        logger.error(f"Unexpected error checking S3 configuration: {str(e)}")
        return False


def get_s3_url(job_id: str) -> str:
    """
    Get the S3 URL for a job's documentation.

    Args:
        job_id: The job ID

    Returns:
        str: The S3 URL
    """
    object_key = f"docs/{job_id}.md"
    return f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{object_key}"
