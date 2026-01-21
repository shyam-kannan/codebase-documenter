"""
Tool to clone GitHub repositories.
"""
import os
import shutil
import logging
from typing import Dict, Any
from pathlib import Path
import git
from git.exc import GitCommandError, InvalidGitRepositoryError

logger = logging.getLogger(__name__)


def clone_repository(github_url: str, job_id: str, access_token: str = None) -> Dict[str, Any]:
    """
    Clone a GitHub repository to a local directory.

    Args:
        github_url: The GitHub repository URL
        job_id: The job ID (used for directory naming)
        access_token: Optional GitHub access token for private repositories

    Returns:
        Dict containing:
            - success: Whether the clone was successful
            - repo_path: Path to the cloned repository
            - error: Error message if failed
            - metadata: Repository metadata (branch, commit, etc.)
    """
    repo_base_path = Path("/tmp/repos")
    repo_path = repo_base_path / job_id

    try:
        # Create base directory if it doesn't exist
        repo_base_path.mkdir(parents=True, exist_ok=True)

        # Remove existing directory if present
        if repo_path.exists():
            logger.info(f"Removing existing repository at {repo_path}")
            shutil.rmtree(repo_path)

        # Construct clone URL with authentication if token provided
        clone_url = github_url
        if access_token:
            # Parse the URL to inject the token
            # Convert https://github.com/owner/repo.git to https://x-access-token:{token}@github.com/owner/repo.git
            if github_url.startswith("https://github.com/"):
                clone_url = github_url.replace(
                    "https://github.com/",
                    f"https://x-access-token:{access_token}@github.com/"
                )
                logger.info(f"Using authenticated clone for private repository")
            else:
                logger.warning(f"Access token provided but URL format not recognized: {github_url}")

        # Clone the repository
        logger.info(f"Cloning repository to {repo_path}")
        repo = git.Repo.clone_from(
            clone_url,
            repo_path,
            depth=1,  # Shallow clone for faster download
            single_branch=True,  # Only clone the default branch
        )

        # Get repository metadata
        metadata = {
            "branch": repo.active_branch.name,
            "commit_sha": repo.head.commit.hexsha,
            "commit_message": repo.head.commit.message.strip(),
            "commit_date": repo.head.commit.committed_datetime.isoformat(),
            "author": str(repo.head.commit.author),
        }

        logger.info(f"Successfully cloned repository to {repo_path}")
        return {
            "success": True,
            "repo_path": str(repo_path),
            "error": None,
            "metadata": metadata,
        }

    except GitCommandError as e:
        error_msg = f"Git command failed: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "repo_path": None,
            "error": error_msg,
            "metadata": None,
        }

    except InvalidGitRepositoryError as e:
        error_msg = f"Invalid Git repository: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "repo_path": None,
            "error": error_msg,
            "metadata": None,
        }

    except Exception as e:
        error_msg = f"Unexpected error cloning repository: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "repo_path": None,
            "error": error_msg,
            "metadata": None,
        }


def cleanup_repository(job_id: str) -> bool:
    """
    Clean up a cloned repository.

    Args:
        job_id: The job ID

    Returns:
        True if cleanup was successful, False otherwise
    """
    repo_path = Path("/tmp/repos") / job_id

    try:
        if repo_path.exists():
            logger.info(f"Cleaning up repository at {repo_path}")
            shutil.rmtree(repo_path)
            return True
        else:
            logger.warning(f"Repository path {repo_path} does not exist")
            return False

    except Exception as e:
        logger.error(f"Error cleaning up repository: {str(e)}")
        return False
