"""
Tool for generating inline comments for code files using Claude API.
"""
import logging
from typing import Dict, Any, List
from concurrent.futures import ThreadPoolExecutor, as_completed
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

        prompt = f"""You are an expert code documentation assistant. Add strategic, high-value comments to this {language} code.

CRITICAL RULES:
1. DO NOT comment on: imports, simple variable declarations, basic getters/setters, or obvious code
2. FOCUS ON: complex logic, business rules, algorithms, non-obvious decisions, edge cases, and WHY (not what)
3. Add comprehensive docstrings for functions/classes: purpose, parameters, return values, side effects, exceptions
4. Only add inline comments for tricky/non-obvious parts that would confuse readers
5. Skip trivial comments like "this imports X" or "set variable to Y"
6. Explain the reasoning and intent, not just what the code does
7. Keep comments concise but meaningful
8. Use appropriate comment syntax for {language}
9. Preserve all original code exactly as-is - DO NOT modify the code itself

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
    files: List[Dict[str, str]],
    max_workers: int = 4
) -> Dict[str, Any]:
    """
    Generate inline comments for multiple code files in parallel.

    Args:
        files: List of dicts with 'path', 'content', and 'language' keys
        max_workers: Maximum number of concurrent API requests (default: 4)

    Returns:
        Dict with results for each file
    """
    results = {
        "success": True,
        "files": [],
        "successful": 0,
        "failed": 0,
    }

    # Process files in parallel using ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_file = {
            executor.submit(
                generate_inline_comments,
                file_info["path"],
                file_info["content"],
                file_info.get("language", "python")
            ): file_info
            for file_info in files
        }

        # Collect results as they complete
        for future in as_completed(future_to_file):
            file_info = future_to_file[future]
            try:
                result = future.result()

                if result["success"]:
                    results["files"].append({
                        "path": file_info["path"],
                        "commented_code": result["commented_code"],
                        "original_code": result["original_code"],
                    })
                    results["successful"] += 1
                    logger.info(f"Successfully commented {file_info['path']}")
                else:
                    results["files"].append({
                        "path": file_info["path"],
                        "error": result["error"],
                    })
                    results["failed"] += 1
                    logger.warning(f"Failed to comment {file_info['path']}: {result.get('error')}")

            except Exception as e:
                error_msg = f"Unexpected error processing {file_info['path']}: {str(e)}"
                logger.error(error_msg)
                results["files"].append({
                    "path": file_info["path"],
                    "error": error_msg,
                })
                results["failed"] += 1

    results["success"] = results["failed"] == 0

    return results
