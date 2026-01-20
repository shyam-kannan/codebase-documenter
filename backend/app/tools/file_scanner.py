"""
Tool to scan directory structure and identify files.
"""
import os
import logging
from typing import Dict, List, Any, Set
from pathlib import Path

logger = logging.getLogger(__name__)

# Files and directories to ignore
IGNORE_DIRS = {
    ".git", ".svn", ".hg",
    "node_modules", "__pycache__", ".pytest_cache",
    "venv", "env", ".env", "virtualenv",
    ".idea", ".vscode", ".vs",
    "build", "dist", ".next", "out",
    "coverage", ".coverage", "htmlcov",
    ".egg-info", "*.egg-info",
}

IGNORE_FILES = {
    ".DS_Store", "Thumbs.db", ".gitignore",
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
}

# File extensions to analyze
CODE_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx",
    ".java", ".c", ".cpp", ".h", ".hpp",
    ".go", ".rs", ".rb", ".php",
    ".cs", ".swift", ".kt", ".scala",
}

DOC_EXTENSIONS = {
    ".md", ".rst", ".txt", ".adoc",
}

CONFIG_EXTENSIONS = {
    ".json", ".yaml", ".yml", ".toml", ".ini", ".cfg",
    ".env", ".example",
}


def scan_directory(repo_path: str, max_files: int = 1000) -> Dict[str, Any]:
    """
    Recursively scan a directory and build a file tree.

    Args:
        repo_path: Path to the repository
        max_files: Maximum number of files to scan

    Returns:
        Dict containing:
            - success: Whether the scan was successful
            - file_tree: Hierarchical structure of the repository
            - file_list: Flat list of all files with metadata
            - stats: Statistics about the repository
            - error: Error message if failed
    """
    try:
        repo_path_obj = Path(repo_path)
        if not repo_path_obj.exists():
            return {
                "success": False,
                "file_tree": None,
                "file_list": None,
                "stats": None,
                "error": f"Repository path does not exist: {repo_path}",
            }

        file_list = []
        stats = {
            "total_files": 0,
            "total_dirs": 0,
            "code_files": 0,
            "doc_files": 0,
            "config_files": 0,
            "other_files": 0,
            "total_size_bytes": 0,
        }

        # Build file tree and list
        file_tree = _build_tree(repo_path_obj, file_list, stats, max_files)

        logger.info(f"Scanned {stats['total_files']} files in {repo_path}")

        return {
            "success": True,
            "file_tree": file_tree,
            "file_list": file_list,
            "stats": stats,
            "error": None,
        }

    except Exception as e:
        error_msg = f"Error scanning directory: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "file_tree": None,
            "file_list": None,
            "stats": None,
            "error": error_msg,
        }


def _build_tree(
    path: Path,
    file_list: List[Dict[str, Any]],
    stats: Dict[str, int],
    max_files: int,
    depth: int = 0,
    max_depth: int = 10,
) -> Dict[str, Any]:
    """
    Recursively build file tree structure.

    Args:
        path: Current path to process
        file_list: List to append file metadata to
        stats: Statistics dictionary to update
        max_files: Maximum number of files to process
        depth: Current recursion depth
        max_depth: Maximum recursion depth

    Returns:
        Dict representing the tree structure
    """
    if depth > max_depth:
        return {"name": path.name, "type": "directory", "error": "Max depth reached"}

    if stats["total_files"] >= max_files:
        return {"name": path.name, "type": "directory", "error": "Max files reached"}

    tree = {
        "name": path.name,
        "type": "directory" if path.is_dir() else "file",
        "path": str(path.relative_to(path.parent.parent)),
    }

    if path.is_file():
        # Get file metadata
        file_ext = path.suffix.lower()
        file_size = path.stat().st_size

        # Categorize file
        file_type = "other"
        if file_ext in CODE_EXTENSIONS:
            file_type = "code"
            stats["code_files"] += 1
        elif file_ext in DOC_EXTENSIONS:
            file_type = "documentation"
            stats["doc_files"] += 1
        elif file_ext in CONFIG_EXTENSIONS:
            file_type = "config"
            stats["config_files"] += 1
        else:
            stats["other_files"] += 1

        tree["size"] = file_size
        tree["extension"] = file_ext
        tree["file_type"] = file_type

        # Add to file list
        file_list.append({
            "path": str(path),
            "relative_path": str(path.relative_to(path.parent.parent)),
            "name": path.name,
            "extension": file_ext,
            "size": file_size,
            "type": file_type,
        })

        stats["total_files"] += 1
        stats["total_size_bytes"] += file_size

    elif path.is_dir():
        # Skip ignored directories
        if path.name in IGNORE_DIRS:
            tree["ignored"] = True
            return tree

        stats["total_dirs"] += 1
        children = []

        try:
            for child in sorted(path.iterdir()):
                # Skip ignored files
                if child.name in IGNORE_FILES:
                    continue

                # Skip hidden files (except .env files which might be important)
                if child.name.startswith(".") and child.name not in {".env", ".env.example"}:
                    continue

                child_tree = _build_tree(child, file_list, stats, max_files, depth + 1, max_depth)
                children.append(child_tree)

        except PermissionError:
            tree["error"] = "Permission denied"

        tree["children"] = children

    return tree


def get_code_files(file_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Filter and return only code files from the file list.

    Args:
        file_list: List of all files

    Returns:
        List of code files only
    """
    return [f for f in file_list if f["type"] == "code"]


def get_important_files(file_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Get important files (README, docs, config) from the file list.

    Args:
        file_list: List of all files

    Returns:
        List of important files
    """
    important_names = {"readme.md", "readme.txt", "readme", "contributing.md", "license", "license.md"}
    important_files = []

    for f in file_list:
        if f["name"].lower() in important_names or f["type"] in ["documentation", "config"]:
            important_files.append(f)

    return important_files
