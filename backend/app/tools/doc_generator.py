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
    # Check if this is a large repository
    total_files = stats.get('total_files', 0)
    is_large_repo = total_files > 50

    prompt = f"""You are a technical documentation expert. Generate comprehensive, well-structured documentation for the following codebase.

# Repository: {repo_name}

## Repository Statistics
- Total Files: {stats.get('total_files', 0)}
- Code Files: {stats.get('code_files', 0)}
- Documentation Files: {stats.get('doc_files', 0)}
- Configuration Files: {stats.get('config_files', 0)}
- Total Size: {_format_bytes(stats.get('total_size_bytes', 0))}

## File Structure
{_format_file_tree(file_tree, max_depth=4 if is_large_repo else 10)}

## Code Analysis
{_format_code_analysis(code_analysis, is_large_repo)}
"""

    if readme_content:
        prompt += f"""
## Existing README
{readme_content[:3000]}
"""

    prompt += """

## Task
You are creating documentation comprehensive enough that a new engineer could clone the repo and get it running without external help.

**CRITICAL: Analyze the repository type and adapt your documentation structure accordingly.**

### Core Documentation Structure (ALWAYS INCLUDE):

1. **Overview**
   - What this project does and its key value proposition
   - Primary use case or problem it solves
   - Current status (production-ready, experimental, etc.)

2. **Architecture**
   - Tech stack summary (languages, frameworks, databases, tools)
   - High-level system design and how components interact
   - Key architectural decisions and design patterns used
   - Data flow and request lifecycle

3. **Getting Started**
   - Prerequisites (Node.js version, Python version, system requirements, etc.)
   - Step-by-step installation instructions
   - First-time setup (database initialization, seed data, etc.)
   - How to run in development mode
   - How to verify the setup is working

4. **Environment Variables**
   - Complete list of every environment variable
   - What each variable does and why it's needed
   - Where to obtain API keys or credentials
   - Example values and format
   - Note any .env.example file or missing critical env vars

5. **Scripts & Commands**
   - Explain ALL scripts from package.json, requirements.txt, Makefile, etc.
   - What each script does and when to use it
   - Build commands for production
   - Development commands (watch mode, hot reload, etc.)

6. **Project Structure**
   - Directory layout with clear explanations
   - Purpose of each major folder
   - Where to find specific types of files (components, utils, config, tests, etc.)

7. **Key Files**
   - List the 5-10 most important files
   - Brief explanation of each file's purpose
   - Entry points and configuration files

8. **Core Components/Modules**
   - Main features and functionality
   - How major components work together
   - Business logic organization

9. **Dependencies**
   - Major libraries and frameworks used
   - What each dependency does and why it was chosen
   - Any unusual or noteworthy dependencies

10. **API Documentation** (if applicable)
    - All endpoints/routes with methods and paths
    - Request/response formats
    - Authentication/authorization requirements
    - Public interfaces or exported functions

11. **Development Patterns**
    - Code organization conventions
    - State management approach (Redux, Context, Vuex, etc.)
    - Styling approach (CSS modules, Tailwind, styled-components, etc.)
    - Error handling patterns
    - Any established coding standards

12. **Build & Deployment**
    - How to build for production
    - Output artifacts and where they go
    - Deployment process or platform
    - Environment-specific configurations

13. **Testing**
    - How to run tests (if tests exist)
    - Test structure and organization
    - Coverage expectations
    - If NO tests exist, note this clearly

14. **Troubleshooting**
    - Common setup issues and solutions
    - Known gotchas or pitfalls
    - How to debug common problems

15. **Performance Considerations**
    - Optimizations implemented
    - Best practices followed
    - Caching strategies
    - Any performance-critical sections

### Smart Adaptations Based on Repository Type:

**For Frontend Apps (React, Vue, Angular, etc.):**
- Emphasize: component architecture, routing, state management, UI patterns
- Include: page structure, styling approach, asset management
- Document: component props/interfaces, reusable utilities

**For Backend APIs (Express, FastAPI, Django, etc.):**
- Emphasize: endpoints, middleware, database schemas, auth flow
- Include: request/response formats, error handling, validation
- Document: database models, migration strategy, API versioning

**For Full-Stack Apps:**
- Clearly separate frontend and backend sections
- Document: how frontend and backend communicate
- Include: shared types/interfaces, API contracts

**For Libraries/Packages:**
- Emphasize: public API, usage examples, exports
- Include: installation from npm/pip, import statements
- Document: API reference, common use cases

**For Mobile Apps:**
- Include: platform-specific setup (iOS/Android)
- Document: build configurations, signing, deployment
- Include: device testing, emulator setup

### Special Guidelines:

**For Large Repos (100+ files):**
- Focus on high-level architecture and patterns
- Group similar files (e.g., "50+ API route handlers in /api/routes/")
- Prioritize entry points and core business logic
- Still provide complete setup/deployment instructions
- Focus on "what" and "why" over line-by-line "how"

**AI Decision Making:**
- Identify the repository type and adapt structure accordingly
- Highlight unique or interesting architectural decisions
- Flag missing critical files (e.g., "⚠️ No README found", "⚠️ No .env.example provided")
- Note if common best practices are missing (tests, error handling, etc.)
- Suggest improvements where obvious gaps exist

**Quality Standards:**
- Be specific and actionable, not vague
- Include actual command examples, not placeholders
- Explain WHY things are done, not just WHAT they are
- Make it comprehensive enough for complete self-service setup
- Use clear headings and formatting for easy navigation

Format the documentation in clean, readable markdown with proper heading hierarchy.
"""

    return prompt


def _format_file_tree(tree: Dict[str, Any], indent: int = 0, max_depth: int = 10) -> str:
    """
    Format file tree for display in prompt.

    Args:
        tree: File tree structure
        indent: Current indentation level
        max_depth: Maximum depth to traverse

    Returns:
        Formatted string representation
    """
    if not tree or indent > max_depth:
        return ""

    lines = []
    prefix = "  " * indent

    if tree.get("type") == "directory":
        lines.append(f"{prefix}- {tree.get('name')}/")
        # Limit children based on depth
        max_children = 30 if indent < 2 else 15
        for child in tree.get("children", [])[:max_children]:
            child_str = _format_file_tree(child, indent + 1, max_depth)
            if child_str:
                lines.append(child_str)
    else:
        size = tree.get("size", 0)
        lines.append(f"{prefix}- {tree.get('name')} ({_format_bytes(size)})")

    return "\n".join(lines)


def _format_code_analysis(analysis: Dict[str, Any], is_large_repo: bool = False) -> str:
    """
    Format code analysis results for prompt.

    Args:
        analysis: Code analysis results
        is_large_repo: Whether this is a large repository (50+ files)

    Returns:
        Formatted string
    """
    if not analysis or not analysis.get("files"):
        return "No code analysis available."

    files = analysis.get("files", [])

    if is_large_repo:
        # For large repos, provide a high-level summary grouped by type
        lines = ["Code structure summary (grouped by component type):"]

        # Group files by directory/component
        components = {}
        for file_info in files[:20]:  # Limit to first 20 files
            file_path = file_info.get("path", "unknown")
            # Extract component name from path (first directory)
            parts = file_path.split("/")
            component = parts[0] if len(parts) > 1 else "root"

            if component not in components:
                components[component] = {
                    "files": [],
                    "classes": [],
                    "functions": []
                }

            components[component]["files"].append(parts[-1])

            file_analysis = file_info.get("analysis", {})
            if file_analysis.get("success"):
                classes = file_analysis.get("classes", [])
                functions = file_analysis.get("functions", [])
                components[component]["classes"].extend([c.get('name', '') for c in classes[:3]])
                components[component]["functions"].extend([f.get('name', '') for f in functions[:3]])

        # Format grouped summary
        for component, data in list(components.items())[:8]:  # Top 8 components
            lines.append(f"\n### {component}/")
            lines.append(f"  Files: {', '.join(data['files'][:5])}")
            if data['classes']:
                lines.append(f"  Key Classes: {', '.join(data['classes'][:5])}")
            if data['functions']:
                lines.append(f"  Key Functions: {', '.join(data['functions'][:5])}")
    else:
        # For smaller repos, show detailed analysis
        lines = ["Key code files analyzed:"]

        for file_info in files[:15]:  # Show up to 15 files
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
