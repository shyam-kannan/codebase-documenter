"""
Tool for creating GitHub pull requests with commented code.
"""
import logging
import os
import subprocess
from typing import Dict, Any, List
from pathlib import Path
import requests

logger = logging.getLogger(__name__)


def configure_git_identity(repo_path: str, access_token: str) -> Dict[str, Any]:
    """
    Configure git user identity using GitHub API to fetch user info.

    Args:
        repo_path: Path to the cloned repository
        access_token: GitHub access token

    Returns:
        Dict with success status and user info
    """
    try:
        # Fetch authenticated user's GitHub profile
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

        response = requests.get(
            "https://api.github.com/user",
            headers=headers,
            timeout=10,
        )

        if response.status_code != 200:
            # Fallback to default identity if API call fails
            logger.warning(f"Failed to fetch GitHub user info: {response.text}")
            name = "AI Code Documenter"
            email = "noreply@ai-code-documenter.com"
        else:
            user_data = response.json()
            name = user_data.get("name") or user_data.get("login", "AI Code Documenter")
            # GitHub doesn't always expose email, use noreply format
            email = user_data.get("email") or f"{user_data.get('id')}+{user_data.get('login')}@users.noreply.github.com"

        logger.info(f"Configuring git identity: {name} <{email}>")

        # Configure git identity
        result = subprocess.run(
            ["git", "config", "user.name", name],
            cwd=repo_path,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            return {
                "success": False,
                "error": f"Failed to set git user.name: {result.stderr}",
            }

        result = subprocess.run(
            ["git", "config", "user.email", email],
            cwd=repo_path,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            return {
                "success": False,
                "error": f"Failed to set git user.email: {result.stderr}",
            }

        logger.info(f"Successfully configured git identity")

        return {
            "success": True,
            "name": name,
            "email": email,
        }

    except Exception as e:
        error_msg = f"Error configuring git identity: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "error": error_msg,
        }


def create_branch_with_comments(
    repo_path: str,
    branch_name: str,
    commented_files: List[Dict[str, str]],
    access_token: str = None,
) -> Dict[str, Any]:
    """
    Create a new git branch and commit commented files.

    Args:
        repo_path: Path to the cloned repository
        branch_name: Name of the new branch
        commented_files: List of dicts with 'path' and 'commented_code' keys
        access_token: GitHub access token for configuring git identity

    Returns:
        Dict with success status and branch info
    """
    try:
        repo_path_obj = Path(repo_path)

        # Configure git identity before making commits
        if access_token:
            identity_result = configure_git_identity(repo_path, access_token)
            if not identity_result["success"]:
                logger.warning(f"Failed to configure git identity: {identity_result.get('error')}")
                # Continue anyway with a fallback identity
                subprocess.run(["git", "config", "user.name", "AI Code Documenter"], cwd=repo_path)
                subprocess.run(["git", "config", "user.email", "noreply@ai-code-documenter.com"], cwd=repo_path)

        # Create and checkout new branch
        result = subprocess.run(
            ["git", "checkout", "-b", branch_name],
            cwd=repo_path,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            return {
                "success": False,
                "error": f"Failed to create branch: {result.stderr}",
            }

        logger.info(f"Created branch {branch_name}")

        # Write commented files
        for file_info in commented_files:
            file_path = repo_path_obj / file_info["path"]
            file_path.parent.mkdir(parents=True, exist_ok=True)

            with open(file_path, "w", encoding="utf-8") as f:
                f.write(file_info["commented_code"])

            logger.info(f"Updated file: {file_info['path']}")

        # Stage all changes
        result = subprocess.run(
            ["git", "add", "-A"],
            cwd=repo_path,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            return {
                "success": False,
                "error": f"Failed to stage changes: {result.stderr}",
            }

        # Commit changes
        commit_message = "Add AI-generated inline code comments\n\nAutomatically generated comprehensive code comments to improve code readability and understanding."

        result = subprocess.run(
            ["git", "commit", "-m", commit_message],
            cwd=repo_path,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            return {
                "success": False,
                "error": f"Failed to commit changes: {result.stderr}",
            }

        logger.info(f"Committed changes to {branch_name}")

        return {
            "success": True,
            "branch_name": branch_name,
            "files_updated": len(commented_files),
        }

    except Exception as e:
        error_msg = f"Error creating branch with comments: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "error": error_msg,
        }


def push_branch_to_github(
    repo_path: str,
    branch_name: str,
    access_token: str,
    github_url: str,
) -> Dict[str, Any]:
    """
    Push branch to GitHub using user's access token.

    Args:
        repo_path: Path to the cloned repository
        branch_name: Name of the branch to push
        access_token: GitHub access token
        github_url: Original GitHub URL

    Returns:
        Dict with success status
    """
    try:
        # Parse owner and repo from URL
        parts = github_url.rstrip('/').replace('.git', '').split('/')
        owner = parts[-2]
        repo = parts[-1]

        # Set up authenticated remote URL
        auth_url = f"https://x-access-token:{access_token}@github.com/{owner}/{repo}.git"

        # Add or update remote
        subprocess.run(
            ["git", "remote", "remove", "auth_origin"],
            cwd=repo_path,
            capture_output=True,
        )

        result = subprocess.run(
            ["git", "remote", "add", "auth_origin", auth_url],
            cwd=repo_path,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            return {
                "success": False,
                "error": f"Failed to add remote: {result.stderr}",
            }

        # Push branch
        result = subprocess.run(
            ["git", "push", "-u", "auth_origin", branch_name],
            cwd=repo_path,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            return {
                "success": False,
                "error": f"Failed to push branch: {result.stderr}",
            }

        logger.info(f"Successfully pushed branch {branch_name} to GitHub")

        return {
            "success": True,
            "branch_name": branch_name,
        }

    except Exception as e:
        error_msg = f"Error pushing branch to GitHub: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "error": error_msg,
        }


def create_pull_request(
    github_url: str,
    branch_name: str,
    access_token: str,
    title: str = "Add AI-generated inline code comments",
    body: str = None,
) -> Dict[str, Any]:
    """
    Create a pull request on GitHub.

    Args:
        github_url: Original GitHub repository URL
        branch_name: Name of the branch with changes
        access_token: GitHub access token
        title: PR title
        body: PR description

    Returns:
        Dict with success status and PR URL
    """
    try:
        # Parse owner and repo from URL
        parts = github_url.rstrip('/').replace('.git', '').split('/')
        owner = parts[-2]
        repo = parts[-1]

        if not body:
            body = """## AI-Generated Code Comments

This pull request adds comprehensive inline comments to improve code readability and understanding.

### What was added:
- Function and method documentation
- Inline comments explaining complex logic
- Parameter and return value descriptions

### How it was generated:
Comments were automatically generated using Claude AI, which analyzed the codebase and added meaningful explanations throughout the code.

### Review Notes:
Please review the comments to ensure they accurately describe the code's functionality. Feel free to modify or remove any comments as needed.

---
*Generated by AI Code Documenter*
"""

        # Create PR using GitHub API
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

        # Get default branch
        repo_response = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers=headers,
            timeout=10,
        )

        if repo_response.status_code != 200:
            return {
                "success": False,
                "error": f"Failed to fetch repository info: {repo_response.text}",
            }

        default_branch = repo_response.json()["default_branch"]

        # Create pull request
        pr_data = {
            "title": title,
            "body": body,
            "head": branch_name,
            "base": default_branch,
        }

        pr_response = requests.post(
            f"https://api.github.com/repos/{owner}/{repo}/pulls",
            headers=headers,
            json=pr_data,
            timeout=10,
        )

        if pr_response.status_code == 201:
            pr_url = pr_response.json()["html_url"]
            pr_number = pr_response.json()["number"]

            logger.info(f"Successfully created PR #{pr_number}: {pr_url}")

            return {
                "success": True,
                "pr_url": pr_url,
                "pr_number": pr_number,
            }
        else:
            return {
                "success": False,
                "error": f"Failed to create PR: {pr_response.text}",
            }

    except Exception as e:
        error_msg = f"Error creating pull request: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "error": error_msg,
        }
