"""
LangGraph-based documentation agent that orchestrates the documentation workflow.
"""
import logging
from typing import TypedDict, Annotated, Dict, Any, Optional
from pathlib import Path
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages

from app.tools.clone_repository import clone_repository, cleanup_repository
from app.tools.file_scanner import scan_directory, get_code_files
from app.tools.code_analyzer import analyze_multiple_files
from app.tools.doc_generator import generate_documentation

logger = logging.getLogger(__name__)


class AgentState(TypedDict):
    """State for the documentation agent workflow."""
    job_id: str
    github_url: str
    repo_path: Optional[str]
    repo_metadata: Optional[Dict[str, Any]]
    file_tree: Optional[Dict[str, Any]]
    file_list: Optional[list]
    stats: Optional[Dict[str, Any]]
    code_analysis: Optional[Dict[str, Any]]
    documentation: Optional[str]
    error: Optional[str]
    current_step: str
    status: str


class DocumentationAgent:
    """
    LangGraph agent for generating documentation from GitHub repositories.

    Workflow:
    1. Clone repository
    2. Scan directory structure
    3. Analyze code files
    4. Generate documentation with Claude
    5. Save results (placeholder for S3)
    """

    def __init__(self):
        """Initialize the documentation agent."""
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """
        Build the LangGraph workflow.

        Returns:
            Compiled StateGraph
        """
        workflow = StateGraph(AgentState)

        # Add nodes
        workflow.add_node("clone", self._clone_step)
        workflow.add_node("scan", self._scan_step)
        workflow.add_node("analyze", self._analyze_step)
        workflow.add_node("generate", self._generate_step)
        workflow.add_node("save", self._save_step)
        workflow.add_node("cleanup", self._cleanup_step)

        # Define edges
        workflow.set_entry_point("clone")
        workflow.add_edge("clone", "scan")
        workflow.add_edge("scan", "analyze")
        workflow.add_edge("analyze", "generate")
        workflow.add_edge("generate", "save")
        workflow.add_edge("save", "cleanup")
        workflow.add_edge("cleanup", END)

        return workflow.compile()

    def _clone_step(self, state: AgentState) -> AgentState:
        """
        Step 1: Clone the GitHub repository.

        Args:
            state: Current agent state

        Returns:
            Updated state
        """
        logger.info(f"[Job {state['job_id']}] Step 1: Cloning repository {state['github_url']}")
        state["current_step"] = "cloning"

        result = clone_repository(state["github_url"], state["job_id"])

        if result["success"]:
            state["repo_path"] = result["repo_path"]
            state["repo_metadata"] = result["metadata"]
            logger.info(f"[Job {state['job_id']}] Successfully cloned to {result['repo_path']}")
        else:
            state["error"] = result["error"]
            state["status"] = "failed"
            logger.error(f"[Job {state['job_id']}] Clone failed: {result['error']}")

        return state

    def _scan_step(self, state: AgentState) -> AgentState:
        """
        Step 2: Scan the directory structure.

        Args:
            state: Current agent state

        Returns:
            Updated state
        """
        if state.get("error"):
            return state

        logger.info(f"[Job {state['job_id']}] Step 2: Scanning directory structure")
        state["current_step"] = "scanning"

        result = scan_directory(state["repo_path"])

        if result["success"]:
            state["file_tree"] = result["file_tree"]
            state["file_list"] = result["file_list"]
            state["stats"] = result["stats"]
            logger.info(
                f"[Job {state['job_id']}] Found {result['stats']['total_files']} files"
            )
        else:
            state["error"] = result["error"]
            state["status"] = "failed"
            logger.error(f"[Job {state['job_id']}] Scan failed: {result['error']}")

        return state

    def _analyze_step(self, state: AgentState) -> AgentState:
        """
        Step 3: Analyze code files.

        Args:
            state: Current agent state

        Returns:
            Updated state
        """
        if state.get("error"):
            return state

        logger.info(f"[Job {state['job_id']}] Step 3: Analyzing code files")
        state["current_step"] = "analyzing"

        # Get code files to analyze
        code_files = get_code_files(state["file_list"])

        # Limit to first 20 files to avoid timeout
        code_files_to_analyze = code_files[:20]
        file_paths = [f["path"] for f in code_files_to_analyze]

        if file_paths:
            logger.info(f"[Job {state['job_id']}] Analyzing {len(file_paths)} code files")
            result = analyze_multiple_files(file_paths)
            state["code_analysis"] = result
            logger.info(
                f"[Job {state['job_id']}] Analyzed {result['successful']} files successfully"
            )
        else:
            logger.warning(f"[Job {state['job_id']}] No code files found to analyze")
            state["code_analysis"] = {"files": []}

        return state

    def _generate_step(self, state: AgentState) -> AgentState:
        """
        Step 4: Generate documentation using Claude API.

        Args:
            state: Current agent state

        Returns:
            Updated state
        """
        if state.get("error"):
            return state

        logger.info(f"[Job {state['job_id']}] Step 4: Generating documentation with Claude")
        state["current_step"] = "generating"

        # Extract repo name from URL
        repo_name = state["github_url"].rstrip("/").split("/")[-1]

        # Look for README file
        readme_content = None
        for file_info in state["file_list"]:
            if file_info["name"].lower() in ["readme.md", "readme.txt", "readme"]:
                try:
                    with open(file_info["path"], "r", encoding="utf-8") as f:
                        readme_content = f.read()
                    break
                except Exception as e:
                    logger.warning(f"Could not read README: {e}")

        # Generate documentation
        result = generate_documentation(
            repo_name=repo_name,
            file_tree=state["file_tree"],
            stats=state["stats"],
            code_analysis=state["code_analysis"],
            readme_content=readme_content,
        )

        if result["success"]:
            state["documentation"] = result["documentation"]
            logger.info(
                f"[Job {state['job_id']}] Generated {len(result['documentation'])} chars of documentation"
            )
        else:
            state["error"] = result["error"]
            state["status"] = "failed"
            logger.error(f"[Job {state['job_id']}] Generation failed: {result['error']}")

        return state

    def _save_step(self, state: AgentState) -> AgentState:
        """
        Step 5: Save documentation (placeholder for S3 upload).

        Args:
            state: Current agent state

        Returns:
            Updated state
        """
        if state.get("error"):
            return state

        logger.info(f"[Job {state['job_id']}] Step 5: Saving documentation")
        state["current_step"] = "saving"

        # TODO: Implement S3 upload or database storage
        # For now, save to local file as placeholder
        try:
            output_path = Path("/tmp/docs") / f"{state['job_id']}.md"
            output_path.parent.mkdir(parents=True, exist_ok=True)

            with open(output_path, "w", encoding="utf-8") as f:
                f.write(state["documentation"])

            logger.info(f"[Job {state['job_id']}] Saved documentation to {output_path}")
            state["status"] = "completed"

        except Exception as e:
            error_msg = f"Failed to save documentation: {str(e)}"
            state["error"] = error_msg
            state["status"] = "failed"
            logger.error(f"[Job {state['job_id']}] {error_msg}")

        return state

    def _cleanup_step(self, state: AgentState) -> AgentState:
        """
        Step 6: Clean up cloned repository.

        Args:
            state: Current agent state

        Returns:
            Updated state
        """
        logger.info(f"[Job {state['job_id']}] Step 6: Cleaning up")
        state["current_step"] = "cleanup"

        # Clean up the cloned repository
        cleanup_repository(state["job_id"])

        logger.info(f"[Job {state['job_id']}] Workflow completed with status: {state['status']}")
        return state

    def run(self, job_id: str, github_url: str) -> Dict[str, Any]:
        """
        Run the documentation generation workflow.

        Args:
            job_id: The job ID
            github_url: The GitHub repository URL

        Returns:
            Final state dictionary
        """
        logger.info(f"[Job {job_id}] Starting documentation workflow for {github_url}")

        # Initialize state
        initial_state = AgentState(
            job_id=job_id,
            github_url=github_url,
            repo_path=None,
            repo_metadata=None,
            file_tree=None,
            file_list=None,
            stats=None,
            code_analysis=None,
            documentation=None,
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
                "documentation": final_state.get("documentation"),
                "error": final_state.get("error"),
                "metadata": {
                    "repo_metadata": final_state.get("repo_metadata"),
                    "stats": final_state.get("stats"),
                },
            }

        except Exception as e:
            error_msg = f"Unexpected error in workflow: {str(e)}"
            logger.error(f"[Job {job_id}] {error_msg}", exc_info=True)
            return {
                "success": False,
                "status": "failed",
                "documentation": None,
                "error": error_msg,
                "metadata": None,
            }
