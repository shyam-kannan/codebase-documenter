# Phase 2 Complete - AI Documentation Agent

## Overview

Phase 2 adds intelligent documentation generation capabilities using Claude AI, LangGraph workflow orchestration, and Celery for background job processing. The system can now automatically clone GitHub repositories, analyze their structure, and generate comprehensive documentation.

## What's New in Phase 2

### 🤖 AI-Powered Documentation Generation
- **Claude Sonnet 4 Integration**: Uses Anthropic's latest model for high-quality documentation
- **LangGraph Workflow**: Multi-step agent that orchestrates the entire process
- **Intelligent Analysis**: Extracts classes, functions, imports, and project structure
- **Contextual Documentation**: Generates docs based on actual codebase analysis

### ⚡ Background Job Processing
- **Celery Workers**: Async task processing with Redis backend
- **Real-time Status Updates**: Jobs update from pending → processing → completed/failed
- **Error Handling**: Comprehensive error tracking and logging
- **Scalable**: Multiple workers can process jobs in parallel

### 🔧 Agent Tools
Four specialized tools power the documentation workflow:
1. **Repository Cloner**: Clones GitHub repos with metadata extraction
2. **File Scanner**: Recursively scans and categorizes files
3. **Code Analyzer**: Extracts structure from Python and JavaScript files
4. **Documentation Generator**: Creates comprehensive markdown docs with Claude

### 📊 LangGraph Workflow

The agent follows a 6-step workflow:

```
1. Clone → 2. Scan → 3. Analyze → 4. Generate → 5. Save → 6. Cleanup
```

Each step updates the job status and handles errors gracefully.

## New Files Created (15 files)

### Backend Core
1. `backend/app/celery_app.py` - Celery configuration
2. `backend/app/core/config.py` - Updated with ANTHROPIC_API_KEY

### Agent Tools (`backend/app/tools/`)
3. `backend/app/tools/__init__.py`
4. `backend/app/tools/clone_repository.py` - Git clone functionality
5. `backend/app/tools/file_scanner.py` - Directory scanning
6. `backend/app/tools/code_analyzer.py` - Code structure extraction
7. `backend/app/tools/doc_generator.py` - Claude API integration

### LangGraph Agent (`backend/app/agents/`)
8. `backend/app/agents/__init__.py`
9. `backend/app/agents/documentation_agent.py` - Main workflow orchestrator

### Celery Tasks (`backend/app/tasks/`)
10. `backend/app/tasks/__init__.py`
11. `backend/app/tasks/document_repo.py` - Background task implementation

### Updated Files
12. `backend/requirements.txt` - Added Celery, GitPython, Anthropic, LangGraph
13. `backend/app/api/v1/jobs.py` - Queue tasks on job creation
14. `docker-compose.yml` - Added Celery worker service
15. `.env.example` - Added ANTHROPIC_API_KEY

## Architecture

### Workflow Diagram

```
User submits GitHub URL (Frontend)
         ↓
API creates Job in database
         ↓
Celery task queued (Redis)
         ↓
Celery worker picks up task
         ↓
┌────────────────────────────┐
│  LangGraph Agent Workflow  │
├────────────────────────────┤
│ 1. Clone Repository        │ ← GitPython
│ 2. Scan Files             │ ← File tree analysis
│ 3. Analyze Code           │ ← AST/Regex parsing
│ 4. Generate Docs          │ ← Claude API
│ 5. Save Documentation     │ ← Local storage
│ 6. Cleanup               │ ← Remove temp files
└────────────────────────────┘
         ↓
Job status updated to completed
         ↓
Frontend polls and displays result
```

### Component Interaction

```
┌─────────────┐
│  Frontend   │ (Next.js)
└─────┬───────┘
      │ HTTP POST /api/v1/jobs
      ↓
┌─────────────┐
│   FastAPI   │
│   Backend   │
└─────┬───────┘
      │ Queue task
      ↓
┌─────────────┐
│    Redis    │ (Task Queue + Broker)
└─────┬───────┘
      │ Dequeue
      ↓
┌─────────────┐
│   Celery    │
│   Worker    │
└─────┬───────┘
      │ Execute
      ↓
┌─────────────┐
│  LangGraph  │
│    Agent    │
└─────┬───────┘
      │ Orchestrate
      ↓
┌─────────────────────────────────┐
│  Tools: Clone, Scan, Analyze,   │
│  Generate (with Claude API)     │
└─────────────────────────────────┘
```

## How It Works

### 1. Job Submission
```python
# User submits GitHub URL via frontend
POST /api/v1/jobs
{
  "github_url": "https://github.com/facebook/react"
}

# Backend creates job and queues Celery task
job = Job(github_url=url, status="pending")
document_repository.delay(job.id)
```

### 2. Background Processing
```python
# Celery worker executes task
@celery_app.task
def document_repository(job_id):
    # Update status to processing
    job.status = "processing"

    # Run LangGraph agent
    agent = DocumentationAgent()
    result = agent.run(job_id, github_url)

    # Update final status
    job.status = "completed" or "failed"
```

### 3. LangGraph Workflow
```python
# Agent orchestrates 6 steps
workflow = StateGraph(AgentState)
workflow.add_node("clone", clone_step)
workflow.add_node("scan", scan_step)
workflow.add_node("analyze", analyze_step)
workflow.add_node("generate", generate_step)
workflow.add_node("save", save_step)
workflow.add_node("cleanup", cleanup_step)

# Each step updates state and handles errors
result = workflow.invoke(initial_state)
```

### 4. Claude Integration
```python
# Generate documentation using Claude
client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=8000,
    messages=[{
        "role": "user",
        "content": build_prompt(repo_data)
    }]
)
documentation = message.content[0].text
```

## Setup Instructions

### 1. Update Environment Variables

Add your Anthropic API key to `.env`:

```bash
# Copy from example
cp .env.example .env

# Edit .env and add your API key
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

Get your API key from: https://console.anthropic.com/

### 2. Rebuild Backend Container

```bash
# Stop services
docker-compose down

# Rebuild with new dependencies
docker-compose up -d --build
```

This will:
- Install new Python packages (celery, gitpython, anthropic, langgraph)
- Start the Celery worker
- Create shared volumes for repos and docs

### 3. Verify Services

```bash
# Check all services are running
docker-compose ps

# Expected output:
# - codebase_postgres (healthy)
# - codebase_redis (healthy)
# - codebase_backend (running)
# - codebase_celery_worker (running)
```

### 4. Test the Workflow

```bash
# Submit a job
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/anthropics/anthropic-sdk-python"}'

# Response will include job_id
# {
#   "id": "abc-123-...",
#   "status": "pending",
#   ...
# }

# Check status (will change to processing, then completed)
curl http://localhost:8000/api/v1/jobs/{job_id}
```

### 5. View Logs

```bash
# Celery worker logs
docker-compose logs -f celery_worker

# Backend logs
docker-compose logs -f backend
```

## API Updates

### POST /api/v1/jobs (Updated)

Now queues a background Celery task:

**Request:**
```json
{
  "github_url": "https://github.com/owner/repo"
}
```

**Response:**
```json
{
  "id": "uuid",
  "github_url": "https://github.com/owner/repo",
  "status": "pending",
  "created_at": "2024-01-19T12:00:00Z",
  "updated_at": "2024-01-19T12:00:00Z"
}
```

**Workflow:**
1. Job created with status "pending"
2. Celery task queued immediately
3. Worker picks up task and changes status to "processing"
4. Agent runs workflow (clone → scan → analyze → generate → save)
5. Status changes to "completed" or "failed"
6. Documentation saved to `/tmp/docs/{job_id}.md`

## Configuration

### Celery Settings

Configured in `backend/app/celery_app.py`:

```python
celery_app.conf.update(
    task_serializer="json",
    task_time_limit=3600,        # 1 hour max
    task_soft_time_limit=3300,   # 55 min soft limit
    worker_prefetch_multiplier=1, # One task at a time
    worker_max_tasks_per_child=50,
)
```

### Docker Services

```yaml
celery_worker:
  # Same image as backend
  build: ./backend

  # Environment variables
  environment:
    - ANTHROPIC_API_KEY
    - DATABASE_URL
    - REDIS_URL

  # Shared volumes for repos and docs
  volumes:
    - repos_data:/tmp/repos
    - docs_data:/tmp/docs

  # Worker command
  command: celery -A app.celery_app worker --loglevel=info --concurrency=2
```

## Tool Capabilities

### 1. Repository Cloner (`clone_repository.py`)

**Features:**
- Shallow clone for faster downloads
- Extracts git metadata (branch, commit, author)
- Error handling for invalid repos
- Cleanup function for temp files

**Output:**
```python
{
    "success": True,
    "repo_path": "/tmp/repos/job-id",
    "metadata": {
        "branch": "main",
        "commit_sha": "abc123...",
        "commit_message": "...",
        "author": "..."
    }
}
```

### 2. File Scanner (`file_scanner.py`)

**Features:**
- Recursive directory traversal
- File categorization (code, docs, config)
- Ignores common directories (node_modules, .git, etc.)
- Size and count statistics
- Hierarchical tree structure

**Output:**
```python
{
    "success": True,
    "file_tree": {...},  # Nested structure
    "file_list": [...],  # Flat list
    "stats": {
        "total_files": 150,
        "code_files": 80,
        "doc_files": 10,
        "config_files": 15
    }
}
```

### 3. Code Analyzer (`code_analyzer.py`)

**Features:**
- Python AST parsing (classes, functions, imports, docstrings)
- JavaScript/TypeScript regex parsing (ES6 classes, arrow functions, imports)
- Line numbers for easy reference
- Handles syntax errors gracefully

**Python Analysis:**
```python
{
    "success": True,
    "language": "python",
    "classes": [
        {
            "name": "MyClass",
            "docstring": "...",
            "methods": [...],
            "line_number": 10
        }
    ],
    "functions": [...],
    "imports": [...]
}
```

**JavaScript Analysis:**
```python
{
    "success": True,
    "language": "javascript",
    "classes": [...],
    "functions": [
        {
            "name": "fetchData",
            "args": ["url", "options"],
            "type": "arrow_function"
        }
    ],
    "imports": [...]
}
```

### 4. Documentation Generator (`doc_generator.py`)

**Features:**
- Claude Sonnet 4 API integration
- Comprehensive prompt with repo context
- Markdown formatting
- Token usage tracking
- Error handling

**Generated Documentation Includes:**
1. Overview of the codebase
2. Architecture description
3. Key files and their purposes
4. Getting started guide
5. Project structure explanation
6. Key components documentation
7. Dependencies list
8. API/Interfaces (if applicable)
9. Development notes

**Output:**
```python
{
    "success": True,
    "documentation": "# Repository Name\n\n## Overview\n...",
    "usage": {
        "input_tokens": 5000,
        "output_tokens": 3000
    }
}
```

## LangGraph Agent Details

### State Management

The agent maintains state across workflow steps:

```python
class AgentState(TypedDict):
    job_id: str                    # Job identifier
    github_url: str                # Repository URL
    repo_path: Optional[str]       # Cloned repo location
    repo_metadata: Optional[Dict]  # Git metadata
    file_tree: Optional[Dict]      # Directory structure
    file_list: Optional[list]      # Flat file list
    stats: Optional[Dict]          # Repository statistics
    code_analysis: Optional[Dict]  # Code analysis results
    documentation: Optional[str]   # Generated docs
    error: Optional[str]           # Error message
    current_step: str              # Current workflow step
    status: str                    # Overall status
```

### Workflow Steps

Each step is a function that:
1. Receives current state
2. Performs its task
3. Updates state
4. Returns updated state
5. Errors propagate to final status

**Example Step:**
```python
def _clone_step(self, state: AgentState) -> AgentState:
    logger.info(f"[Job {state['job_id']}] Cloning repository")
    state["current_step"] = "cloning"

    result = clone_repository(state["github_url"], state["job_id"])

    if result["success"]:
        state["repo_path"] = result["repo_path"]
        state["repo_metadata"] = result["metadata"]
    else:
        state["error"] = result["error"]
        state["status"] = "failed"

    return state
```

## Error Handling

### Comprehensive Error Coverage

1. **Git Clone Errors**: Invalid URL, access denied, network issues
2. **File System Errors**: Permission denied, disk full
3. **Parse Errors**: Invalid Python syntax, malformed JS
4. **API Errors**: Invalid API key, rate limits, timeouts
5. **Database Errors**: Connection issues, transaction failures

### Error Propagation

```python
# Each tool returns success/error
result = clone_repository(url, job_id)
if not result["success"]:
    state["error"] = result["error"]
    state["status"] = "failed"
    # Workflow continues but skips remaining steps

# Final task updates database
job.status = "failed"
job.error_message = state["error"]
```

### Example Error Messages

```
- "Git command failed: Repository not found"
- "Error scanning directory: Permission denied"
- "Error analyzing Python file: Syntax error at line 42"
- "Error generating documentation: API key invalid"
```

## Performance Considerations

### Optimization Strategies

1. **Shallow Clone**: Only downloads latest commit
   ```python
   git.Repo.clone_from(url, path, depth=1, single_branch=True)
   ```

2. **File Limit**: Analyzes max 20 code files
   ```python
   code_files_to_analyze = code_files[:20]
   ```

3. **Max Depth**: Limits directory traversal to 10 levels
   ```python
   if depth > max_depth:
       return {"error": "Max depth reached"}
   ```

4. **Token Limits**: Truncates README to 2000 chars
   ```python
   readme_content[:2000]
   ```

5. **Concurrent Workers**: 2 Celery workers in parallel
   ```yaml
   command: celery worker --concurrency=2
   ```

### Resource Limits

- Task timeout: 1 hour (3600 seconds)
- Soft timeout: 55 minutes (3300 seconds)
- Max tokens per API call: 8000
- Max files scanned: 1000
- Max code files analyzed: 20

## Storage

### Temporary Storage

**Cloned Repositories:**
- Location: `/tmp/repos/{job_id}/`
- Docker volume: `repos_data`
- Cleanup: After workflow completion

**Generated Documentation:**
- Location: `/tmp/docs/{job_id}.md`
- Docker volume: `docs_data`
- Persistence: Permanent (for now)

### Future: S3 Storage

Placeholder in `_save_step()` for S3 upload:

```python
# TODO: Implement S3 upload
# s3_client.upload_file(
#     f"/tmp/docs/{job_id}.md",
#     bucket_name,
#     f"docs/{job_id}.md"
# )
```

## Monitoring & Debugging

### View Celery Worker Logs

```bash
# Real-time logs
docker-compose logs -f celery_worker

# Filter for specific job
docker-compose logs celery_worker | grep "Job abc-123"
```

### Check Job Status

```bash
# Via API
curl http://localhost:8000/api/v1/jobs/{job_id}

# Via database
docker-compose exec postgres psql -U codebase_user -d codebase_db \
  -c "SELECT id, status, error_message FROM jobs WHERE id='abc-123';"
```

### Inspect Generated Documentation

```bash
# Access worker container
docker-compose exec celery_worker bash

# View generated doc
cat /tmp/docs/{job_id}.md
```

### Monitor Redis Queue

```bash
# Access Redis
docker-compose exec redis redis-cli

# Check queue length
LLEN celery

# View pending tasks
LRANGE celery 0 -1
```

## Common Issues & Solutions

### Issue: Celery worker not starting

**Solution:**
```bash
# Check logs
docker-compose logs celery_worker

# Common causes:
# 1. Redis not accessible - check REDIS_URL
# 2. Import errors - rebuild container
# 3. Missing API key - check ANTHROPIC_API_KEY
```

### Issue: Tasks stuck in pending

**Solution:**
```bash
# Verify worker is running
docker-compose ps celery_worker

# Restart worker
docker-compose restart celery_worker

# Check Redis connection
docker-compose exec backend python -c "from app.celery_app import celery_app; print(celery_app.broker_connection())"
```

### Issue: Documentation generation fails

**Solution:**
```bash
# Check API key
docker-compose exec backend env | grep ANTHROPIC

# Verify API key works
docker-compose exec backend python -c "from anthropic import Anthropic; client = Anthropic(); print('OK')"

# Check rate limits in Claude console
```

### Issue: Repository clone fails

**Solution:**
```bash
# Test git clone manually
docker-compose exec celery_worker git clone --depth 1 https://github.com/owner/repo /tmp/test

# Common causes:
# 1. Private repo - needs authentication
# 2. Invalid URL - check format
# 3. Network issues - check connectivity
```

## Testing Phase 2

### 1. Test Small Repository

```bash
# Submit a small, well-documented repo
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/anthropics/anthropic-sdk-python"}'

# Should complete in 1-2 minutes
```

### 2. Test Python Repository

```bash
# Test Python analysis
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/pallets/flask"}'
```

### 3. Test JavaScript Repository

```bash
# Test JS analysis
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/expressjs/express"}'
```

### 4. Test Error Handling

```bash
# Invalid URL
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/invalid/nonexistent-repo-xyz"}'

# Should fail gracefully with error message
```

## Next Steps (Phase 3)

Phase 2 provides the foundation for intelligent documentation generation. Future enhancements:

### Planned Features

1. **S3 Storage**: Upload docs to S3 instead of local filesystem
2. **Documentation Viewer**: Frontend page to view generated docs
3. **Advanced Analysis**: Support for more languages (Java, Go, Rust)
4. **Incremental Updates**: Re-generate only changed files
5. **Custom Templates**: User-defined documentation templates
6. **Webhooks**: Notify users when documentation is ready
7. **Rate Limiting**: Prevent API abuse
8. **Caching**: Cache analysis results for faster re-runs
9. **Metrics**: Track token usage, processing time, success rates
10. **Testing**: Unit tests for all tools and agents

### Architecture Enhancements

1. **Multi-stage Approval**: User review before final generation
2. **Streaming**: Stream documentation as it's generated
3. **Batch Processing**: Process multiple repos at once
4. **Priority Queue**: VIP users get faster processing
5. **Retry Logic**: Automatic retries for transient failures

## Success Metrics

Your Phase 2 is successful because:

1. ✅ **Background Processing** - Jobs don't block API requests
2. ✅ **AI Integration** - Claude generates intelligent documentation
3. ✅ **Workflow Orchestration** - LangGraph manages complex multi-step process
4. ✅ **Error Handling** - Failures are caught and reported
5. ✅ **Scalability** - Multiple workers can process jobs in parallel
6. ✅ **Monitoring** - Comprehensive logging at every step
7. ✅ **Real-time Updates** - Job status updates throughout workflow
8. ✅ **Code Analysis** - Extracts meaningful structure from code

## Cost Considerations

### Claude API Costs

Approximate costs per repository:
- Input tokens: ~3,000-8,000 (repository data)
- Output tokens: ~2,000-5,000 (generated docs)
- Cost per job: ~$0.05-0.15 (Claude Sonnet 4 pricing)

### Optimization Tips

1. **Cache Analysis**: Store analysis results to avoid re-processing
2. **Limit File Count**: Analyze most important files first
3. **Batch Requests**: Combine multiple small repos
4. **Use Cheaper Models**: Switch to Haiku for simple repos

## Conclusion

Phase 2 transforms the codebase documenter from a simple job tracker into an intelligent documentation system powered by AI. The LangGraph workflow orchestrates complex multi-step processes, Celery handles background processing, and Claude generates high-quality documentation.

**You're now ready to:**
- Process GitHub repositories automatically
- Generate AI-powered documentation
- Scale to handle multiple concurrent jobs
- Build advanced features on this solid foundation

---

**🎉 Phase 2 Complete!**

Start testing with real repositories and see the AI documentation magic happen! 🚀
