"""
LangGraph-based agent for adding AI-generated inline comments to code.
"""
import logging
from typing import TypedDict, Dict, Any, Optional, List
from pathlib import Path
from datetime import datetime
from langgraph.graph import StateGraph, END

from app.tools.clone_repository import clone_repository, cleanup_repository
from app.tools.file_scanner import get_code_files
from app.tools.comment_generator import generate_comments_for_multiple_files
from app.tools.github_pr import (
    create_branch_with_comments,
    push_branch_to_github,
    create_pull_request,
)
from app.core.s3 import upload_to_s3, check_s3_configuration
from app.core.encryption import decrypt_token
from app.core.database import SessionLocal
from app.models.user import User
import json

logger = logging.getLogger(__name__)


class CommentAgentState(TypedDict):
    """State for the comment generation agent workflow."""
    job_id: str
    github_url: str
    user_id: Optional[str]
    has_write_access: bool
    access_token: Optional[str]
    repo_path: Optional[str]
    file_list: Optional[List[Dict[str, Any]]]
    commented_files: Optional[List[Dict[str, str]]]
    branch_name: Optional[str]
    pr_url: Optional[str]
    commented_code_url: Optional[str]
    error: Optional[str]
    current_step: str
    status: str


class CommentAgent:
    """
    LangGraph agent for adding AI-generated comments to code.

    Two workflows:
    1. Has write access: Clone → Comment → Create branch → Push → Create PR
    2. No write access: Clone → Comment → Save to S3 for viewing
    """

    def __init__(self):
        """Initialize the comment agent."""
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """
        Build the LangGraph workflow.

        Returns:
            Compiled StateGraph
        """
        workflow = StateGraph(CommentAgentState)

        # Add nodes
        workflow.add_node("clone", self._clone_step)
        workflow.add_node("scan_and_comment", self._scan_and_comment_step)
        workflow.add_node("create_pr", self._create_pr_step)
        workflow.add_node("save_to_s3", self._save_to_s3_step)
        workflow.add_node("cleanup", self._cleanup_step)

        # Define edges
        workflow.set_entry_point("clone")
        workflow.add_edge("clone", "scan_and_comment")

        # Conditional routing based on write access
        workflow.add_conditional_edges(
            "scan_and_comment",
            self._route_after_comment,
            {
                "create_pr": "create_pr",
                "save_to_s3": "save_to_s3",
                "error": "cleanup",
            }
        )

        workflow.add_edge("create_pr", "cleanup")
        workflow.add_edge("save_to_s3", "cleanup")
        workflow.add_edge("cleanup", END)

        return workflow.compile()

    def _route_after_comment(self, state: CommentAgentState) -> str:
        """
        Route to PR creation or S3 save based on write access.

        Args:
            state: Current agent state

        Returns:
            Next node name
        """
        if state.get("error"):
            return "error"

        if state["has_write_access"]:
            return "create_pr"
        else:
            return "save_to_s3"

    def _clone_step(self, state: CommentAgentState) -> CommentAgentState:
        """
        Step 1: Clone the GitHub repository.

        Args:
            state: Current agent state

        Returns:
            Updated state
        """
        logger.info(f"[Job {state['job_id']}] Step 1: Cloning repository {state['github_url']}")
        state["current_step"] = "cloning"

        result = clone_repository(
            state["github_url"],
            state["job_id"],
            access_token=state.get("access_token")
        )

        if result["success"]:
            state["repo_path"] = result["repo_path"]
            logger.info(f"[Job {state['job_id']}] Successfully cloned to {result['repo_path']}")
        else:
            state["error"] = result["error"]
            state["status"] = "failed"
            logger.error(f"[Job {state['job_id']}] Clone failed: {result['error']}")

        return state

    def _scan_and_comment_step(self, state: CommentAgentState) -> CommentAgentState:
        """
        Step 2: Scan code files and generate comments.

        Args:
            state: Current agent state

        Returns:
            Updated state
        """
        if state.get("error"):
            return state

        logger.info(f"[Job {state['job_id']}] Step 2: Scanning and generating comments")
        state["current_step"] = "commenting"

        try:
            # Get all code files from the repository
            from app.tools.file_scanner import scan_directory

            scan_result = scan_directory(state["repo_path"])

            if not scan_result["success"]:
                state["error"] = scan_result["error"]
                state["status"] = "failed"
                return state

            code_files = get_code_files(scan_result["file_list"])

            # Limit to first 10 files to avoid timeout and excessive API costs
            code_files_to_comment = code_files[:10]

            logger.info(f"[Job {state['job_id']}] Found {len(code_files)} code files, commenting on {len(code_files_to_comment)}")

            # Read file contents and detect language
            files_with_content = []
            repo_path_obj = Path(state["repo_path"])

            for file_info in code_files_to_comment:
                try:
                    with open(file_info["path"], "r", encoding="utf-8") as f:
                        content = f.read()

                    # Get relative path from repo root
                    rel_path = Path(file_info["path"]).relative_to(repo_path_obj)

                    files_with_content.append({
                        "path": str(rel_path),
                        "abs_path": file_info["path"],
                        "content": content,
                        "language": file_info.get("type", "python"),
                    })
                except Exception as e:
                    logger.warning(f"Could not read file {file_info['path']}: {e}")

            if not files_with_content:
                state["error"] = "No code files found to comment"
                state["status"] = "failed"
                return state

            # Generate comments for all files
            logger.info(f"[Job {state['job_id']}] Generating comments for {len(files_with_content)} files")
            comment_result = generate_comments_for_multiple_files(files_with_content)

            if not comment_result["success"]:
                state["error"] = "Failed to generate comments for all files"
                state["status"] = "failed"
                return state

            # Prepare commented files for next step
            state["commented_files"] = []
            for file_result in comment_result["files"]:
                if "commented_code" in file_result:
                    state["commented_files"].append({
                        "path": file_result["path"],
                        "commented_code": file_result["commented_code"],
                        "original_code": file_result.get("original_code", ""),
                    })

            logger.info(f"[Job {state['job_id']}] Successfully commented {len(state['commented_files'])} files")

        except Exception as e:
            state["error"] = f"Error in scan and comment step: {str(e)}"
            state["status"] = "failed"
            logger.error(f"[Job {state['job_id']}] {state['error']}")

        return state

    def _create_pr_step(self, state: CommentAgentState) -> CommentAgentState:
        """
        Step 3a: Create branch, push, and create PR (for repos with write access).

        Args:
            state: Current agent state

        Returns:
            Updated state
        """
        if state.get("error"):
            return state

        logger.info(f"[Job {state['job_id']}] Step 3: Creating PR with commented code")
        state["current_step"] = "creating_pr"

        try:
            # Use access token from state
            if not state.get("access_token"):
                state["error"] = "Access token not available"
                state["status"] = "failed"
                return state

            access_token = state["access_token"]

            # Create branch name
            timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
            branch_name = f"ai-comments-{timestamp}"
            state["branch_name"] = branch_name

            # Create branch with commented files
            logger.info(f"[Job {state['job_id']}] Creating branch {branch_name}")
            branch_result = create_branch_with_comments(
                repo_path=state["repo_path"],
                branch_name=branch_name,
                commented_files=state["commented_files"],
                access_token=access_token,
            )

            if not branch_result["success"]:
                state["error"] = f"Failed to create branch: {branch_result['error']}"
                state["status"] = "failed"
                return state

            # Push branch to GitHub
            logger.info(f"[Job {state['job_id']}] Pushing branch to GitHub")
            push_result = push_branch_to_github(
                repo_path=state["repo_path"],
                branch_name=branch_name,
                access_token=access_token,
                github_url=state["github_url"],
            )

            if not push_result["success"]:
                state["error"] = f"Failed to push branch: {push_result['error']}"
                state["status"] = "failed"
                return state

            # Create pull request
            logger.info(f"[Job {state['job_id']}] Creating pull request")
            pr_result = create_pull_request(
                github_url=state["github_url"],
                branch_name=branch_name,
                access_token=access_token,
            )

            if pr_result["success"]:
                state["pr_url"] = pr_result["pr_url"]
                state["status"] = "completed"
                logger.info(f"[Job {state['job_id']}] Successfully created PR: {pr_result['pr_url']}")
            else:
                state["error"] = f"Failed to create PR: {pr_result['error']}"
                state["status"] = "failed"

        except Exception as e:
            state["error"] = f"Error creating PR: {str(e)}"
            state["status"] = "failed"
            logger.error(f"[Job {state['job_id']}] {state['error']}")

        return state

    def _save_to_s3_step(self, state: CommentAgentState) -> CommentAgentState:
        """
        Step 3b: Save commented code to S3 (for repos without write access).

        Args:
            state: Current agent state

        Returns:
            Updated state
        """
        if state.get("error"):
            return state

        logger.info(f"[Job {state['job_id']}] Step 3: Saving commented code to S3")
        state["current_step"] = "saving_to_s3"

        try:
            # Create JSON with original and commented code for side-by-side view
            commented_data = {
                "github_url": state["github_url"],
                "generated_at": datetime.utcnow().isoformat(),
                "files": state["commented_files"],
            }

            # Save to local file first
            output_path = Path("/tmp/commented") / f"{state['job_id']}.json"
            output_path.parent.mkdir(parents=True, exist_ok=True)

            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(commented_data, f, indent=2)

            logger.info(f"[Job {state['job_id']}] Saved commented code locally")

            # Upload to S3 if configured
            if check_s3_configuration():
                logger.info(f"[Job {state['job_id']}] Uploading to S3")
                # Upload to a different S3 path for commented code
                s3_url = upload_to_s3(
                    str(output_path),
                    state["job_id"],
                    key_prefix="commented"
                )

                if s3_url:
                    state["commented_code_url"] = s3_url
                    state["status"] = "completed"
                    logger.info(f"[Job {state['job_id']}] Successfully uploaded to S3")
                else:
                    state["error"] = "Failed to upload to S3"
                    state["status"] = "failed"
            else:
                state["error"] = "S3 not configured"
                state["status"] = "failed"

        except Exception as e:
            state["error"] = f"Error saving to S3: {str(e)}"
            state["status"] = "failed"
            logger.error(f"[Job {state['job_id']}] {state['error']}")

        return state

    def _cleanup_step(self, state: CommentAgentState) -> CommentAgentState:
        """
        Step 4: Clean up cloned repository.

        Args:
            state: Current agent state

        Returns:
            Updated state
        """
        logger.info(f"[Job {state['job_id']}] Step 4: Cleaning up")
        state["current_step"] = "cleanup"

        cleanup_repository(state["job_id"])

        logger.info(f"[Job {state['job_id']}] Workflow completed with status: {state['status']}")
        return state

    def run(
        self,
        job_id: str,
        github_url: str,
        user_id: Optional[str],
        has_write_access: bool,
        access_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Run the comment generation workflow.

        Args:
            job_id: The job ID
            github_url: The GitHub repository URL
            user_id: The user ID (if authenticated)
            has_write_access: Whether user has write access to the repo
            access_token: GitHub access token for authentication

        Returns:
            Final state dictionary
        """
        logger.info(f"[Job {job_id}] Starting comment generation workflow for {github_url}")
        logger.info(f"[Job {job_id}] Write access: {has_write_access}")

        # Initialize state
        initial_state = CommentAgentState(
            job_id=job_id,
            github_url=github_url,
            user_id=user_id,
            has_write_access=has_write_access,
            access_token=access_token,
            repo_path=None,
            file_list=None,
            commented_files=None,
            branch_name=None,
            pr_url=None,
            commented_code_url=None,
            error=None,
            current_step="initializing",
            status="processing",
        )

        try:
            # Run the graph
            final_state = self.graph.invoke(initial_state)

            return {
                "success": final_state["status"] == "completed",
                "status": final_state["status"],
                "pr_url": final_state.get("pr_url"),
                "commented_code_url": final_state.get("commented_code_url"),
                "error": final_state.get("error"),
            }

        except Exception as e:
            error_msg = f"Unexpected error in workflow: {str(e)}"
            logger.error(f"[Job {job_id}] {error_msg}", exc_info=True)
            return {
                "success": False,
                "status": "failed",
                "pr_url": None,
                "commented_code_url": None,
                "error": error_msg,
            }
