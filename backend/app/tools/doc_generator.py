"""
Tool to generate documentation using Claude API.
"""
import logging
from typing import Dict, List, Any, Optional
from anthropic import Anthropic
from app.core.config import settings

logger = logging.getLogger(__name__)


def generate_documentation(
    repo_name: str,
    file_tree: Dict[str, Any],
    stats: Dict[str, Any],
    code_analysis: Dict[str, Any],
    readme_content: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generate comprehensive documentation using Claude API.

    Args:
        repo_name: Name of the repository
        file_tree: File tree structure
        stats: Repository statistics
        code_analysis: Code analysis results
        readme_content: Content of README file if available

    Returns:
        Dict containing:
            - success: Whether generation was successful
            - documentation: Generated markdown documentation
            - error: Error message if failed
    """
    try:
        # Initialize Anthropic client
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        # Prepare the prompt
        prompt = _build_documentation_prompt(
            repo_name, file_tree, stats, code_analysis, readme_content
        )

        logger.info(f"Generating documentation for {repo_name} using Claude API")

        # Call Claude API
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8000,
            temperature=0.3,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
        )

        # Extract the documentation from the response
        documentation = message.content[0].text

        logger.info(f"Successfully generated documentation for {repo_name}")

        return {
            "success": True,
            "documentation": documentation,
            "error": None,
            "usage": {
                "input_tokens": message.usage.input_tokens,
                "output_tokens": message.usage.output_tokens,
            },
        }

    except Exception as e:
        error_msg = f"Error generating documentation: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "documentation": None,
            "error": error_msg,
        }


def _build_documentation_prompt(
    repo_name: str,
    file_tree: Dict[str, Any],
    stats: Dict[str, Any],
    code_analysis: Dict[str, Any],
    readme_content: Optional[str],
) -> str:
    """
    Build the prompt for Claude API.

    Args:
        repo_name: Name of the repository
        file_tree: File tree structure
        stats: Repository statistics
        code_analysis: Code analysis results
        readme_content: README content if available

    Returns:
        Formatted prompt string
    """
    prompt = f"""You are a technical documentation expert. Generate comprehensive, well-structured documentation for the following codebase.

# Repository: {repo_name}

## Repository Statistics
- Total Files: {stats.get('total_files', 0)}
- Code Files: {stats.get('code_files', 0)}
- Documentation Files: {stats.get('doc_files', 0)}
- Configuration Files: {stats.get('config_files', 0)}
- Total Size: {_format_bytes(stats.get('total_size_bytes', 0))}

## File Structure
{_format_file_tree(file_tree)}

## Code Analysis
{_format_code_analysis(code_analysis)}
"""

    if readme_content:
        prompt += f"""
## Existing README
{readme_content[:2000]}  # Truncate to avoid token limits
"""

    prompt += """

## Task
Generate comprehensive documentation for this codebase in markdown format. Include:

1. **Overview**: Brief description of what this codebase does
2. **Architecture**: High-level architecture and main components
3. **Key Files**: Description of the most important files and their purposes
4. **Getting Started**: How to set up and run the project (if apparent from structure)
5. **Project Structure**: Detailed explanation of the directory structure
6. **Key Components**: Main classes, functions, and modules with their purposes
7. **Dependencies**: Notable dependencies and what they're used for
8. **API/Interfaces**: Public APIs or interfaces if applicable
9. **Development Notes**: Any important patterns, conventions, or practices

Format the documentation in clean, readable markdown. Be concise but comprehensive. Focus on helping developers understand the codebase quickly.
"""

    return prompt


def _format_file_tree(tree: Dict[str, Any], indent: int = 0) -> str:
    """
    Format file tree for display in prompt.

    Args:
        tree: File tree structure
        indent: Current indentation level

    Returns:
        Formatted string representation
    """
    if not tree:
        return ""

    lines = []
    prefix = "  " * indent

    if tree.get("type") == "directory":
        lines.append(f"{prefix}- {tree.get('name')}/")
        for child in tree.get("children", [])[:50]:  # Limit children to avoid token overflow
            lines.append(_format_file_tree(child, indent + 1))
    else:
        size = tree.get("size", 0)
        lines.append(f"{prefix}- {tree.get('name')} ({_format_bytes(size)})")

    return "\n".join(lines)


def _format_code_analysis(analysis: Dict[str, Any]) -> str:
    """
    Format code analysis results for prompt.

    Args:
        analysis: Code analysis results

    Returns:
        Formatted string
    """
    if not analysis or not analysis.get("files"):
        return "No code analysis available."

    lines = ["Key code files analyzed:"]

    # Show up to 10 most important files
    for file_info in analysis.get("files", [])[:10]:
        file_path = file_info.get("path", "unknown")
        file_analysis = file_info.get("analysis", {})

        if not file_analysis.get("success"):
            continue

        lines.append(f"\n### {file_path}")

        # Classes
        classes = file_analysis.get("classes", [])
        if classes:
            lines.append(f"  Classes: {', '.join([c.get('name', '') for c in classes[:5]])}")

        # Functions
        functions = file_analysis.get("functions", [])
        if functions:
            lines.append(f"  Functions: {', '.join([f.get('name', '') for f in functions[:10]])}")

        # Imports
        imports = file_analysis.get("imports", [])
        if imports:
            import_summary = []
            for imp in imports[:5]:
                if imp.get("type") == "import":
                    import_summary.append(imp.get("module", ""))
                elif imp.get("type") == "from_import":
                    import_summary.append(f"{imp.get('module', '')}.{imp.get('name', '')}")
            if import_summary:
                lines.append(f"  Key Imports: {', '.join(import_summary)}")

    return "\n".join(lines)


def _format_bytes(bytes_size: int) -> str:
    """
    Format bytes into human-readable size.

    Args:
        bytes_size: Size in bytes

    Returns:
        Formatted string (e.g., "1.5 KB")
    """
    for unit in ["B", "KB", "MB", "GB"]:
        if bytes_size < 1024.0:
            return f"{bytes_size:.1f} {unit}"
        bytes_size /= 1024.0
    return f"{bytes_size:.1f} TB"


def generate_summary(documentation: str, max_length: int = 500) -> str:
    """
    Generate a brief summary from full documentation.

    Args:
        documentation: Full documentation text
        max_length: Maximum length of summary

    Returns:
        Brief summary
    """
    # Extract first paragraph or first max_length characters
    paragraphs = documentation.split("\n\n")
    if paragraphs:
        summary = paragraphs[0]
        if len(summary) > max_length:
            summary = summary[:max_length] + "..."
        return summary
    return documentation[:max_length] + "..." if len(documentation) > max_length else documentation
