"""
Tool to analyze code files and extract structure information.
"""
import ast
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path
import re

logger = logging.getLogger(__name__)


def analyze_code_file(file_path: str) -> Dict[str, Any]:
    """
    Analyze a code file and extract structure information.

    Args:
        file_path: Path to the code file

    Returns:
        Dict containing:
            - success: Whether analysis was successful
            - language: Detected language
            - classes: List of classes found
            - functions: List of functions found
            - imports: List of imports
            - docstring: Module-level docstring
            - error: Error message if failed
    """
    try:
        path = Path(file_path)
        extension = path.suffix.lower()

        if extension == ".py":
            return _analyze_python_file(file_path)
        elif extension in [".js", ".jsx", ".ts", ".tsx"]:
            return _analyze_javascript_file(file_path)
        else:
            return {
                "success": False,
                "language": "unknown",
                "error": f"Unsupported file type: {extension}",
            }

    except Exception as e:
        error_msg = f"Error analyzing file {file_path}: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "language": "unknown",
            "error": error_msg,
        }


def _analyze_python_file(file_path: str) -> Dict[str, Any]:
    """
    Analyze a Python file using AST.

    Args:
        file_path: Path to the Python file

    Returns:
        Dict with analysis results
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            source_code = f.read()

        # Parse the AST
        tree = ast.parse(source_code)

        classes = []
        functions = []
        imports = []
        module_docstring = ast.get_docstring(tree)

        for node in ast.walk(tree):
            # Extract classes
            if isinstance(node, ast.ClassDef):
                class_info = {
                    "name": node.name,
                    "docstring": ast.get_docstring(node),
                    "methods": [],
                    "line_number": node.lineno,
                }

                # Extract methods
                for item in node.body:
                    if isinstance(item, ast.FunctionDef):
                        class_info["methods"].append({
                            "name": item.name,
                            "docstring": ast.get_docstring(item),
                            "args": [arg.arg for arg in item.args.args],
                            "line_number": item.lineno,
                        })

                classes.append(class_info)

            # Extract top-level functions
            elif isinstance(node, ast.FunctionDef):
                # Check if it's a top-level function (not a method)
                if isinstance(getattr(node, "parent", None), ast.Module) or not hasattr(node, "parent"):
                    functions.append({
                        "name": node.name,
                        "docstring": ast.get_docstring(node),
                        "args": [arg.arg for arg in node.args.args],
                        "line_number": node.lineno,
                    })

            # Extract imports
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append({
                        "type": "import",
                        "module": alias.name,
                        "alias": alias.asname,
                    })

            elif isinstance(node, ast.ImportFrom):
                module = node.module or ""
                for alias in node.names:
                    imports.append({
                        "type": "from_import",
                        "module": module,
                        "name": alias.name,
                        "alias": alias.asname,
                    })

        return {
            "success": True,
            "language": "python",
            "classes": classes,
            "functions": functions,
            "imports": imports,
            "docstring": module_docstring,
            "error": None,
        }

    except SyntaxError as e:
        return {
            "success": False,
            "language": "python",
            "error": f"Syntax error in Python file: {str(e)}",
        }

    except Exception as e:
        return {
            "success": False,
            "language": "python",
            "error": f"Error analyzing Python file: {str(e)}",
        }


def _analyze_javascript_file(file_path: str) -> Dict[str, Any]:
    """
    Analyze a JavaScript/TypeScript file using regex patterns.
    Note: This is a simple regex-based approach. For production,
    consider using a proper JS parser like esprima or babel.

    Args:
        file_path: Path to the JS/TS file

    Returns:
        Dict with analysis results
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            source_code = f.read()

        classes = []
        functions = []
        imports = []

        # Extract classes (ES6 class syntax)
        class_pattern = r"class\s+(\w+)(?:\s+extends\s+(\w+))?\s*{"
        for match in re.finditer(class_pattern, source_code):
            classes.append({
                "name": match.group(1),
                "extends": match.group(2),
            })

        # Extract functions
        # Function declarations
        func_pattern = r"function\s+(\w+)\s*\((.*?)\)"
        for match in re.finditer(func_pattern, source_code):
            functions.append({
                "name": match.group(1),
                "args": [arg.strip() for arg in match.group(2).split(",") if arg.strip()],
                "type": "function_declaration",
            })

        # Arrow functions assigned to const/let/var
        arrow_pattern = r"(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\((.*?)\)\s*=>"
        for match in re.finditer(arrow_pattern, source_code):
            functions.append({
                "name": match.group(1),
                "args": [arg.strip() for arg in match.group(2).split(",") if arg.strip()],
                "type": "arrow_function",
            })

        # Extract imports
        # ES6 imports
        import_pattern = r"import\s+(?:{([^}]+)}|(\w+))\s+from\s+['\"]([^'\"]+)['\"]"
        for match in re.finditer(import_pattern, source_code):
            if match.group(1):  # Named imports
                names = [n.strip() for n in match.group(1).split(",")]
                imports.append({
                    "type": "named_import",
                    "names": names,
                    "from": match.group(3),
                })
            else:  # Default import
                imports.append({
                    "type": "default_import",
                    "name": match.group(2),
                    "from": match.group(3),
                })

        # Require imports (CommonJS)
        require_pattern = r"(?:const|let|var)\s+(?:{([^}]+)}|(\w+))\s*=\s*require\(['\"]([^'\"]+)['\"]\)"
        for match in re.finditer(require_pattern, source_code):
            if match.group(1):  # Destructured require
                names = [n.strip() for n in match.group(1).split(",")]
                imports.append({
                    "type": "require_destructured",
                    "names": names,
                    "from": match.group(3),
                })
            else:  # Regular require
                imports.append({
                    "type": "require",
                    "name": match.group(2),
                    "from": match.group(3),
                })

        return {
            "success": True,
            "language": "javascript",
            "classes": classes,
            "functions": functions,
            "imports": imports,
            "error": None,
        }

    except Exception as e:
        return {
            "success": False,
            "language": "javascript",
            "error": f"Error analyzing JavaScript file: {str(e)}",
        }


def analyze_multiple_files(file_paths: List[str]) -> Dict[str, Any]:
    """
    Analyze multiple code files and aggregate results.

    Args:
        file_paths: List of file paths to analyze

    Returns:
        Dict with aggregated analysis results
    """
    results = {
        "total_files": len(file_paths),
        "successful": 0,
        "failed": 0,
        "files": [],
    }

    for file_path in file_paths:
        analysis = analyze_code_file(file_path)

        if analysis.get("success"):
            results["successful"] += 1
        else:
            results["failed"] += 1

        results["files"].append({
            "path": file_path,
            "analysis": analysis,
        })

    return results
