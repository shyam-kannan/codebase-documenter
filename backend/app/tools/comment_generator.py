"""
Tool for generating inline comments for code files using Claude API.
"""
import logging
from typing import Dict, Any, List
from anthropic import Anthropic
from app.core.config import settings

logger = logging.getLogger(__name__)


def generate_inline_comments(file_path: str, file_content: str, language: str) -> Dict[str, Any]:
    """
    Generate inline comments for a code file using Claude API.

    Args:
        file_path: Path to the file (for context)
        file_content: Content of the file
        language: Programming language of the file

    Returns:
        Dict with success status and commented code
    """
    try:
        if not settings.ANTHROPIC_API_KEY:
            return {
                "success": False,
                "error": "Anthropic API key not configured",
            }

        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        prompt = f"""You are a helpful coding assistant. Add inline comments to the following {language} code to explain what it does.

Guidelines for comments:
1. Add comments above functions/methods explaining their purpose, parameters, and return values
2. Add inline comments for complex logic or non-obvious code sections
3. Keep comments concise and meaningful
4. Don't over-comment obvious code
5. Use the appropriate comment syntax for {language}
6. Preserve all original code exactly as-is
7. Only add comments, do not modify the code itself

File: {file_path}

```{language}
{file_content}
```

Return ONLY the commented code, with no additional explanation or markdown formatting."""

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        commented_code = response.content[0].text

        # Remove markdown code blocks if Claude added them
        if commented_code.startswith("```"):
            lines = commented_code.split("\n")
            # Remove first line (```language) and last line (```)
            commented_code = "\n".join(lines[1:-1]) if len(lines) > 2 else commented_code

        return {
            "success": True,
            "commented_code": commented_code,
            "original_code": file_content,
        }

    except Exception as e:
        error_msg = f"Error generating comments for {file_path}: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "error": error_msg,
        }


def generate_comments_for_multiple_files(
    files: List[Dict[str, str]]
) -> Dict[str, Any]:
    """
    Generate inline comments for multiple code files.

    Args:
        files: List of dicts with 'path', 'content', and 'language' keys

    Returns:
        Dict with results for each file
    """
    results = {
        "success": True,
        "files": [],
        "successful": 0,
        "failed": 0,
    }

    for file_info in files:
        logger.info(f"Generating comments for {file_info['path']}")

        result = generate_inline_comments(
            file_path=file_info["path"],
            file_content=file_info["content"],
            language=file_info.get("language", "python"),
        )

        if result["success"]:
            results["files"].append({
                "path": file_info["path"],
                "commented_code": result["commented_code"],
                "original_code": result["original_code"],
            })
            results["successful"] += 1
        else:
            results["files"].append({
                "path": file_info["path"],
                "error": result["error"],
            })
            results["failed"] += 1

    results["success"] = results["failed"] == 0

    return results
