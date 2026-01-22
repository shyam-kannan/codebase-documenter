# Development Documentation

## Table of Contents
1. [Development Phases](#development-phases)
2. [Architecture Overview](#architecture-overview)
3. [Database Schema](#database-schema)
4. [API Endpoints Reference](#api-endpoints-reference)
5. [LangGraph Workflows](#langgraph-workflows)
6. [Authentication Flow](#authentication-flow)
7. [Storage Strategy](#storage-strategy)
8. [Development Patterns](#development-patterns)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Future Roadmap](#future-roadmap)
12. [Technical Gotchas](#technical-gotchas)

---

## Development Phases

### Phase 1: Foundation (Complete)
**Goal**: Full-stack foundation with Docker containerization

**What Was Built**:
- Next.js 14 frontend with TypeScript and Tailwind CSS
- FastAPI backend with PostgreSQL and Redis
- Docker Compose orchestration for all services
- Job management API (Create, Read, List)
- Real-time job status polling (5s refresh)
- Database migrations with Alembic
- Health checks and auto-restart for containers

**Key Files**: 44 files including backend API, frontend components, Docker configs, and 7 documentation guides

### Phase 2: AI Documentation Engine (Complete)
**Goal**: Intelligent documentation generation with Claude AI

**What Was Built**:
- Claude Sonnet 4 integration for AI-powered documentation
- LangGraph workflow orchestration (6-step process)
- Celery background job processing with Redis broker
- 4 specialized tools: Repository Cloner, File Scanner, Code Analyzer, Documentation Generator
- Support for Python and JavaScript/TypeScript code analysis
- Comprehensive error handling and logging

**Key Components**:
- `doc_generator.py` - Claude API integration with smart prompts
- `documentation_agent.py` - LangGraph workflow manager
- `document_repo.py` - Celery task implementation
- Agent tools in `backend/app/tools/`

### Phase 3: Cloud Storage & Viewer (Complete)
**Goal**: Persistent cloud storage and documentation access

**What Was Built**:
- Amazon S3 integration for documentation storage
- Public URLs for shareable documentation
- Frontend "View Documentation" button
- Database migration for `documentation_url` column
- Graceful fallback when S3 not configured
- Local backup storage in `/tmp/docs/`

**Key Features**:
- Automatic S3 upload after generation
- Public-read ACL for accessible docs
- CORS-friendly proxy endpoint
- Cost-effective storage (~$0.01 per 1,000 docs)

### Phase 4: Authentication & Advanced Features (In Progress)
**Goal**: GitHub OAuth and enhanced capabilities

**What Was Built**:
- User authentication model with encrypted tokens
- GitHub repository write access detection
- Pull request creation capability
- AI-powered inline code commenting

---

## Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│              Next.js 14 + TypeScript + Tailwind              │
│                    http://localhost:3000                     │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTP/REST
                  ↓
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                         │
│                    http://localhost:8000                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ API Endpoints: /api/v1/jobs, /health, /docs          │   │
│  └──────────────────────────────────────────────────────┘   │
└──────┬────────────────────┬────────────────────┬────────────┘
       │                    │                    │
       ↓                    ↓                    ↓
┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐
│  PostgreSQL │    │    Redis    │    │   Celery Workers    │
│   Database  │    │ Task Queue  │    │  (2 concurrent)     │
│   Port 5432 │    │  Port 6379  │    │                     │
└─────────────┘    └─────────────┘    │  ┌──────────────┐   │
                                       │  │  LangGraph   │   │
                                       │  │   Workflow   │   │
                                       │  └──────┬───────┘   │
                                       │         │           │
                                       │    ┌────▼────┐      │
                                       │    │ Tools:  │      │
                                       │    │ Clone   │      │
                                       │    │ Scan    │      │
                                       │    │ Analyze │      │
                                       │    │Generate │      │
                                       │    └────┬────┘      │
                                       │         │           │
                                       └─────────┼───────────┘
                                                 │
                                                 ↓
                                    ┌────────────────────────┐
                                    │    Claude Sonnet 4     │
                                    │  Anthropic API         │
                                    └────────────────────────┘
                                                 │
                                                 ↓
                                    ┌────────────────────────┐
                                    │      Amazon S3         │
                                    │  Documentation Storage │
                                    └────────────────────────┘
```

### Component Responsibilities

**Frontend (Next.js)**:
- GitHub URL submission form with validation
- Job status polling and display
- Documentation viewer with markdown rendering
- Responsive UI with dark mode support

**Backend (FastAPI)**:
- RESTful API with automatic OpenAPI docs
- Job creation and status management
- Database operations with SQLAlchemy ORM
- Celery task queuing
- S3 proxy endpoints for CORS-free access

**PostgreSQL**:
- Persistent storage for jobs and users
- Transactional integrity
- Full-text search capabilities (future)

**Redis**:
- Celery task queue broker
- Job result backend
- Caching layer (future)

**Celery Workers**:
- Background job processing
- LangGraph workflow execution
- Repository cloning and analysis
- Claude API calls for documentation

**LangGraph Agent**:
- Multi-step workflow orchestration
- State management across steps
- Error propagation and recovery
- Tool coordination

**Claude API**:
- AI-powered documentation generation
- Code understanding and explanation
- Repository analysis and insights

**Amazon S3**:
- Persistent documentation storage
- Public URL generation
- Scalable and cost-effective

---

## Database Schema

### `users` Table
Stores authenticated GitHub users and OAuth tokens.

```sql
CREATE TABLE users (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    github_id               VARCHAR UNIQUE NOT NULL,
    username                VARCHAR NOT NULL,
    email                   VARCHAR,
    name                    VARCHAR,
    avatar_url              VARCHAR,
    encrypted_access_token  VARCHAR NOT NULL,  -- Never log or expose
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_github_id ON users(github_id);
```

**Key Fields**:
- `github_id`: GitHub user identifier (e.g., "12345678")
- `encrypted_access_token`: Encrypted OAuth token for API calls
- `username`: GitHub username (e.g., "octocat")

### `jobs` Table
Stores documentation generation jobs and their status.

```sql
CREATE TABLE jobs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    github_url          VARCHAR UNIQUE NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
                        -- ENUM: pending, processing, completed, failed
    error_message       VARCHAR,
    documentation_url   VARCHAR,           -- S3 URL
    user_id             UUID REFERENCES users(id),
    has_write_access    BOOLEAN DEFAULT FALSE NOT NULL,
    pull_request_url    VARCHAR,           -- GitHub PR URL if created
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_github_url ON jobs(github_url);
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
```

**Key Fields**:
- `github_url`: Full repository URL (must be unique)
- `status`: Current job state (tracks workflow progress)
- `documentation_url`: Public S3 URL to generated docs
- `has_write_access`: Whether user can create PRs
- `pull_request_url`: GitHub PR URL if comments were committed

**Relationships**:
- `jobs.user_id` → `users.id` (many-to-one)

---

## API Endpoints Reference

Base URL: `http://localhost:8000`

### Health & Documentation

#### `GET /`
Returns API information.

**Response**:
```json
{
  "name": "Codebase Documentation API",
  "version": "1.0.0"
}
```

#### `GET /health`
Health check endpoint.

**Response**: `200 OK` with `{"status": "healthy"}`

#### `GET /docs`
Interactive Swagger UI documentation.

#### `GET /redoc`
Alternative ReDoc documentation.

### Job Management

#### `POST /api/v1/jobs`
Create a new documentation job.

**Request**:
```json
{
  "github_url": "https://github.com/facebook/react",
  "github_id": "12345678",        // Optional - for authenticated users
  "access_token": "gho_xxxxx"     // Optional - for write access check
}
```

**Response** (`201 Created`):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "github_url": "https://github.com/facebook/react",
  "status": "pending",
  "error_message": null,
  "documentation_url": null,
  "has_write_access": false,
  "pull_request_url": null,
  "created_at": "2024-01-19T12:00:00Z",
  "updated_at": "2024-01-19T12:00:00Z"
}
```

**Behavior**:
- Returns existing job if URL already processed (unless failed)
- Queues Celery task for background processing
- Checks write access if `access_token` provided

#### `GET /api/v1/jobs/{job_id}`
Get job status by ID.

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "github_url": "https://github.com/facebook/react",
  "status": "completed",
  "error_message": null,
  "documentation_url": "https://bucket.s3.us-east-1.amazonaws.com/docs/550e8400.md",
  "has_write_access": true,
  "pull_request_url": "https://github.com/facebook/react/pull/123",
  "created_at": "2024-01-19T12:00:00Z",
  "updated_at": "2024-01-19T12:05:00Z"
}
```

#### `GET /api/v1/jobs`
List all jobs with pagination.

**Query Parameters**:
- `skip`: Number of records to skip (default: 0)
- `limit`: Max records to return (default: 100)

**Response**:
```json
[
  { "id": "...", "github_url": "...", "status": "completed", ... },
  { "id": "...", "github_url": "...", "status": "processing", ... }
]
```

#### `DELETE /api/v1/jobs/{job_id}`
Delete a job.

**Response**: `204 No Content`

**Note**: S3 files are NOT automatically deleted to prevent data loss.

#### `GET /api/v1/jobs/{job_id}/documentation`
Fetch documentation markdown via proxy (avoids CORS).

**Response**: Markdown file with `Content-Type: text/markdown`

#### `GET /api/v1/jobs/{job_id}/commented-code`
Fetch commented code JSON (for non-PR jobs).

**Response**: JSON file with commented code structure

#### `POST /api/v1/jobs/{job_id}/add-comments`
Trigger AI comment generation for existing job.

**Response**: Updated job with status reset to `pending`

---

## LangGraph Workflows

### Documentation Generation Workflow

The system uses LangGraph to orchestrate a 6-step workflow:

```
START → Clone → Scan → Analyze → Generate → Save → Cleanup → END
```

#### Workflow State

```python
class AgentState(TypedDict):
    job_id: str                    # Unique job identifier
    github_url: str                # Repository URL
    access_token: Optional[str]    # GitHub token for private repos
    repo_path: Optional[str]       # Local clone path
    repo_metadata: Dict            # Git metadata (branch, commit, etc.)
    file_tree: Dict                # Hierarchical file structure
    file_list: List                # Flat file list
    stats: Dict                    # Repository statistics
    code_analysis: Dict            # Extracted code structure
    documentation: str             # Generated markdown
    documentation_url: str         # S3 URL
    error: Optional[str]           # Error message if failed
    current_step: str              # Current workflow step
    status: str                    # Overall status
```

#### Step 1: Clone Repository

**Tool**: `clone_repository(github_url, job_id, access_token?)`

**Actions**:
- Shallow clone (depth=1) for speed
- Extract git metadata (branch, commit SHA, author)
- Handle private repositories with access token
- Store in `/tmp/repos/{job_id}/`

**Output**:
```python
{
    "success": True,
    "repo_path": "/tmp/repos/abc-123",
    "metadata": {
        "branch": "main",
        "commit_sha": "abc123...",
        "commit_message": "...",
        "author": "..."
    }
}
```

#### Step 2: Scan Directory

**Tool**: `scan_directory(repo_path)`

**Actions**:
- Recursive directory traversal (max depth: 10)
- File categorization (code, docs, config)
- Build hierarchical tree structure
- Ignore directories: `.git`, `node_modules`, `venv`, etc.
- Calculate statistics

**Output**:
```python
{
    "success": True,
    "file_tree": { "type": "directory", "children": [...] },
    "file_list": [
        {"name": "main.py", "path": "/tmp/repos/abc/main.py", "size": 1024}
    ],
    "stats": {
        "total_files": 150,
        "code_files": 80,
        "doc_files": 10,
        "config_files": 15,
        "total_size_bytes": 524288
    }
}
```

#### Step 3: Analyze Code

**Tool**: `analyze_multiple_files(file_paths)`

**Actions**:
- Parse up to 20 code files (performance limit)
- Extract classes, functions, imports using AST (Python) or regex (JavaScript)
- Capture docstrings and line numbers
- Handle syntax errors gracefully

**Output**:
```python
{
    "successful": 15,
    "failed": 0,
    "files": [
        {
            "path": "src/main.py",
            "analysis": {
                "success": True,
                "language": "python",
                "classes": [
                    {"name": "MyClass", "docstring": "...", "methods": [...]}
                ],
                "functions": [
                    {"name": "main", "args": ["argv"], "line_number": 42}
                ],
                "imports": [
                    {"type": "import", "module": "os"},
                    {"type": "from_import", "module": "pathlib", "name": "Path"}
                ]
            }
        }
    ]
}
```

#### Step 4: Generate Documentation

**Tool**: `generate_documentation(repo_name, file_tree, stats, code_analysis, readme_content)`

**Actions**:
- Build comprehensive prompt with repo context
- Call Claude Sonnet 4 API (`claude-sonnet-4-20250514`)
- Request structured documentation (15 sections)
- Adapt format based on repository type (frontend, backend, library, etc.)
- Track token usage

**Prompt Sections**:
- Repository statistics
- File structure (formatted tree)
- Code analysis summary
- Existing README content
- Configuration files
- Detailed documentation requirements

**Output**:
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

#### Step 5: Save Documentation

**Tool**: Local file write + `upload_to_s3(file_path, job_id)`

**Actions**:
- Save markdown to `/tmp/docs/{job_id}.md`
- Check S3 configuration
- Upload to S3 with public-read ACL
- Generate public URL
- Store URL in state

**S3 Configuration**:
- Bucket: `${S3_BUCKET_NAME}`
- Key: `docs/{job_id}.md`
- Content-Type: `text/markdown`
- ACL: `public-read`
- Metadata: `job-id`, `content-type`

#### Step 6: Cleanup

**Tool**: `cleanup_repository(job_id)`

**Actions**:
- Remove cloned repository from `/tmp/repos/{job_id}/`
- Free disk space
- Log completion

**Result**: Workflow complete with final status (`completed` or `failed`)

---

## Authentication Flow

### GitHub OAuth with NextAuth (Phase 4+)

```
User clicks "Sign in with GitHub"
         ↓
NextAuth redirects to GitHub OAuth
         ↓
User authorizes app (scopes: read:user, repo)
         ↓
GitHub returns auth code
         ↓
NextAuth exchanges code for access token
         ↓
Backend receives user profile + encrypted token
         ↓
Create/update user in database
         ↓
Return session to frontend
         ↓
Frontend stores session in cookie
         ↓
Subsequent requests include access token
```

### Token Usage

**Frontend to Backend**:
```javascript
// Submit job with authentication
fetch('/api/v1/jobs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    github_url: 'https://github.com/owner/repo',
    github_id: user.github_id,
    access_token: session.accessToken  // Encrypted in DB
  })
})
```

**Backend Permission Check**:
```python
# Check if user has write access to repo
def check_repo_write_access(github_url: str, access_token: str) -> bool:
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(
        f"https://api.github.com/repos/{owner}/{repo}",
        headers=headers
    )
    permissions = response.json().get('permissions', {})
    return permissions.get('push', False)
```

**Security**:
- Tokens encrypted at rest in database
- Never logged or exposed in responses
- Scoped to minimum required permissions
- Automatically refreshed by NextAuth

---

## Storage Strategy

### S3 Bucket Organization

```
s3://codebase-docs-prod/
├── docs/
│   ├── {job-id-1}.md
│   ├── {job-id-2}.md
│   └── {job-id-3}.md
├── commented/
│   ├── {job-id-1}.json
│   └── {job-id-2}.json
└── pull-requests/
    └── {job-id-3}/
        ├── file1.py
        └── file2.js
```

### Local Backup Storage

**Documentation**: `/tmp/docs/{job_id}.md`
**Repositories**: `/tmp/repos/{job_id}/` (temporary, cleaned after processing)

### Access Patterns

**Public Documentation**:
- S3 ACL: `public-read`
- Anyone with URL can view
- No authentication required

**Commented Code** (No PR):
- S3 ACL: `public-read`
- Accessed via proxy endpoint `/api/v1/jobs/{job_id}/commented-code`

**Pull Requests** (Write Access):
- Created directly in GitHub repository
- Access controlled by GitHub permissions

### Cost Optimization

**Storage**: ~$0.023/GB/month (Standard tier)
**Uploads**: $0.005 per 1,000 PUT requests
**Downloads**: First 100GB/month FREE

**Typical Costs**:
- 1,000 documentation files (50KB each) = 50MB = $0.001/month
- 1,000 uploads = $0.005
- **Total: ~$0.01/month for 1,000 repositories**

---

## Development Patterns

### Error Handling

**Pattern**: Explicit error objects with graceful degradation

```python
# Tool pattern
def some_tool(input: str) -> Dict[str, Any]:
    try:
        result = perform_operation(input)
        return {
            "success": True,
            "data": result,
            "error": None
        }
    except Exception as e:
        logger.error(f"Tool failed: {str(e)}")
        return {
            "success": False,
            "data": None,
            "error": str(e)
        }

# Workflow pattern
if state.get("error"):
    return state  # Skip step if previous error

result = some_tool(state["input"])
if not result["success"]:
    state["error"] = result["error"]
    state["status"] = "failed"
    return state
```

### Polling Strategy

**Frontend**: Auto-refresh job status every 5 seconds for pending/processing jobs

```typescript
useEffect(() => {
  if (job.status === 'pending' || job.status === 'processing') {
    const interval = setInterval(() => {
      fetchJobStatus(job.id)
    }, 5000)  // 5 seconds
    return () => clearInterval(interval)
  }
}, [job.status])
```

### State Management

**Backend**: Database as single source of truth
```python
# Update job status atomically
job.status = JobStatus.PROCESSING
db.commit()
db.refresh(job)
```

**Frontend**: React state with SWR-like polling
```typescript
const [job, setJob] = useState<Job | null>(null)
const [loading, setLoading] = useState(true)
```

### Logging

**Pattern**: Structured logging with job context

```python
logger.info(f"[Job {job_id}] Step 1: Cloning repository {github_url}")
logger.error(f"[Job {job_id}] Clone failed: {error_msg}")
```

**Levels**:
- `INFO`: Normal workflow progress
- `WARNING`: Non-fatal issues (S3 unavailable, file skipped)
- `ERROR`: Failures requiring attention

### Configuration

**Pattern**: Environment-based with sensible defaults

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://redis:6379/0"
    ANTHROPIC_API_KEY: str
    S3_BUCKET_NAME: str | None = None  # Optional
    AWS_REGION: str = "us-east-1"

    class Config:
        env_file = ".env"
```

---

## Testing

### Backend Testing (pytest)

**Setup**:
```bash
cd backend
pip install pytest pytest-asyncio
pytest
```

**Test Structure**:
```
backend/tests/
├── conftest.py           # Fixtures
├── test_api/
│   ├── test_jobs.py      # API endpoint tests
│   └── test_health.py
├── test_tools/
│   ├── test_clone.py     # Tool unit tests
│   ├── test_scanner.py
│   └── test_analyzer.py
└── test_agents/
    └── test_workflow.py  # LangGraph tests
```

**Example Test**:
```python
def test_create_job(client, db_session):
    response = client.post("/api/v1/jobs", json={
        "github_url": "https://github.com/test/repo"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
    assert data["github_url"] == "https://github.com/test/repo"
```

### Frontend Testing (Jest + React Testing Library)

**Setup**:
```bash
cd frontend
npm install --save-dev jest @testing-library/react
npm test
```

**Test Structure**:
```
frontend/src/
├── __tests__/
│   ├── components/
│   │   ├── SubmitUrlForm.test.tsx
│   │   └── JobStatus.test.tsx
│   └── pages/
│       └── index.test.tsx
```

**Example Test**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import SubmitUrlForm from '@/components/SubmitUrlForm'

test('submits GitHub URL', async () => {
  render(<SubmitUrlForm />)
  const input = screen.getByPlaceholderText(/github url/i)
  const button = screen.getByRole('button', { name: /submit/i })

  fireEvent.change(input, { target: { value: 'https://github.com/test/repo' }})
  fireEvent.click(button)

  expect(await screen.findByText(/job created/i)).toBeInTheDocument()
})
```

### Integration Testing

**Manual Test Workflow**:
```bash
# 1. Start services
docker-compose up -d

# 2. Create job
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/anthropics/anthropic-sdk-python"}'

# 3. Monitor logs
docker-compose logs -f celery_worker

# 4. Check status
curl http://localhost:8000/api/v1/jobs/{job_id}

# 5. Verify S3 upload
aws s3 ls s3://bucket-name/docs/
```

---

## Deployment

### Production Checklist

- [ ] Set all environment variables in `.env`
- [ ] Update `CORS_ORIGINS` to production frontend URL
- [ ] Configure S3 bucket with public-read policy
- [ ] Set up AWS IAM user with S3 permissions
- [ ] Generate secure `DATABASE_PASSWORD`
- [ ] Enable PostgreSQL connection pooling
- [ ] Configure Redis persistence (AOF)
- [ ] Set Celery worker concurrency based on CPU cores
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Set up database backups (pg_dump cron job)
- [ ] Configure log aggregation (CloudWatch, Datadog)
- [ ] Set up monitoring and alerts
- [ ] Enable rate limiting on API endpoints
- [ ] Document disaster recovery procedures

### Docker Production Setup

**docker-compose.prod.yml**:
```yaml
version: '3.8'

services:
  backend:
    image: codebase-documenter-backend:latest
    restart: always
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - S3_BUCKET_NAME=${S3_BUCKET_NAME}
    command: gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker

  celery_worker:
    image: codebase-documenter-backend:latest
    restart: always
    command: celery -A app.celery_app worker --concurrency=4

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
```

### Environment Variables

**Required**:
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=redis://host:6379/0

# AI
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# AWS S3
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
S3_BUCKET_NAME=codebase-docs-prod
AWS_REGION=us-east-1
```

**Optional**:
```bash
# API Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
CORS_ORIGINS=https://app.example.com,https://www.example.com

# PostgreSQL
POSTGRES_USER=codebase_user
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=codebase_db
```

### Database Migrations

```bash
# Generate migration
docker-compose exec backend alembic revision --autogenerate -m "Add new column"

# Apply migrations
docker-compose exec backend alembic upgrade head

# Rollback
docker-compose exec backend alembic downgrade -1
```

---

## Future Roadmap

### Phase 5: Enhanced Documentation Features
**Timeline**: Q2 2024

**Planned Features**:
- [ ] In-app markdown renderer with syntax highlighting
- [ ] Table of contents auto-generation
- [ ] Full-text search within documentation
- [ ] Export to PDF, HTML, DOCX
- [ ] Documentation versioning (track updates)
- [ ] Custom documentation templates
- [ ] Multi-language code analysis (Java, Go, Rust, C++)
- [ ] Incremental updates (re-generate only changed files)

### Phase 6: Collaboration & Sharing
**Timeline**: Q3 2024

**Planned Features**:
- [ ] Team workspaces with shared jobs
- [ ] Documentation commenting and annotations
- [ ] Embed documentation in external sites (iframe)
- [ ] Short URL generation for sharing
- [ ] Webhook notifications when docs ready
- [ ] Slack/Discord integration
- [ ] Public documentation galleries
- [ ] Analytics (views, popular repos)

### Phase 7: Enterprise Features
**Timeline**: Q4 2024

**Planned Features**:
- [ ] Self-hosted deployment option
- [ ] SAML/SSO authentication
- [ ] Role-based access control (RBAC)
- [ ] Audit logs
- [ ] SLA guarantees (priority queue)
- [ ] Dedicated resources per organization
- [ ] Custom branding
- [ ] Compliance certifications (SOC 2, GDPR)
- [ ] On-premise AI models (no external API)
- [ ] Batch processing for multiple repos

### Technical Enhancements

**Performance**:
- [ ] Caching layer for repeated repositories
- [ ] CDN integration (CloudFront) for S3 docs
- [ ] Parallel file analysis (multi-threading)
- [ ] Redis caching for code analysis results
- [ ] Database query optimization with indexes

**Reliability**:
- [ ] Automatic retry logic for failed jobs
- [ ] Circuit breaker for external APIs
- [ ] Graceful degradation when services down
- [ ] Blue-green deployment strategy
- [ ] Canary releases for new features

**Observability**:
- [ ] Distributed tracing (OpenTelemetry)
- [ ] Real-time metrics dashboard
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (New Relic)
- [ ] Cost tracking and optimization

---

## Technical Gotchas

### Common Issues and Solutions

#### 1. Celery Worker Not Starting

**Symptom**: Tasks stay in `pending` status forever

**Diagnosis**:
```bash
docker-compose logs celery_worker
```

**Common Causes**:
- Redis not accessible: Check `REDIS_URL`
- Import errors in task code: Look for Python exceptions
- Missing environment variables: Verify `.env` file

**Solution**:
```bash
# Restart worker
docker-compose restart celery_worker

# Check Redis connection
docker-compose exec backend python -c "from app.celery_app import celery_app; print(celery_app.broker_connection())"
```

#### 2. S3 Upload Fails with "Access Denied"

**Symptom**: Job completes but `documentation_url` is null

**Diagnosis**:
```bash
docker-compose logs celery_worker | grep -i s3
```

**Common Causes**:
- Invalid AWS credentials
- Bucket doesn't exist
- IAM user lacks `s3:PutObject` permission
- Bucket policy blocks public access

**Solution**:
```bash
# Test credentials
aws s3 ls s3://your-bucket-name

# Set correct bucket policy (allow public read)
aws s3api put-bucket-policy --bucket your-bucket-name --policy file://bucket-policy.json
```

#### 3. Git Clone Fails for Private Repos

**Symptom**: Jobs fail with "Repository not found" error

**Diagnosis**:
```bash
docker-compose logs celery_worker | grep -i "git command failed"
```

**Cause**: Private repositories require authentication

**Solution**: Pass `access_token` when creating job
```bash
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "github_url": "https://github.com/private/repo",
    "access_token": "ghp_xxxxxxxxxxxx"
  }'
```

#### 4. Claude API Rate Limits

**Symptom**: Documentation generation fails with 429 error

**Diagnosis**: Check Anthropic Console for rate limit status

**Solution**:
- Implement exponential backoff
- Reduce `max_tokens` in prompt
- Request rate limit increase from Anthropic
- Cache analysis results to reduce API calls

#### 5. Frontend Can't Access S3 URLs (CORS)

**Symptom**: Browser console shows CORS error when loading documentation

**Solution**: Use proxy endpoint instead
```typescript
// Instead of direct S3 URL
const url = job.documentation_url

// Use proxy endpoint
const url = `/api/v1/jobs/${job.id}/documentation`
```

#### 6. Database Connection Pool Exhausted

**Symptom**: Requests timeout with "connection pool exhausted"

**Diagnosis**:
```bash
docker-compose exec postgres psql -U codebase_user -d codebase_db \
  -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
```

**Solution**: Increase connection pool size
```python
# In database.py
engine = create_engine(
    DATABASE_URL,
    pool_size=20,        # Increase from default 5
    max_overflow=10      # Allow 10 overflow connections
)
```

#### 7. Docker Volumes Fill Up Disk

**Symptom**: "No space left on device" errors

**Diagnosis**:
```bash
docker system df  # Check disk usage
```

**Solution**:
```bash
# Clean up old clones
docker-compose exec celery_worker rm -rf /tmp/repos/*

# Prune unused Docker resources
docker system prune -a --volumes
```

#### 8. Job Status Stuck in "processing"

**Symptom**: Job never completes or fails

**Diagnosis**:
```bash
# Check worker logs
docker-compose logs celery_worker | grep "Job {job_id}"

# Check if task exists in Redis
docker-compose exec redis redis-cli
> LRANGE celery 0 -1
```

**Common Causes**:
- Worker crashed mid-processing
- Task timeout (default 1 hour)
- Unhandled exception in workflow

**Solution**:
```bash
# Manually update job status
docker-compose exec postgres psql -U codebase_user -d codebase_db \
  -c "UPDATE jobs SET status='failed', error_message='Worker timeout' WHERE id='job-id';"

# Restart worker
docker-compose restart celery_worker
```

### Performance Tips

**1. Optimize Code Analysis**:
- Limit to 20 most important files
- Skip large generated files (minified JS, compiled binaries)
- Use shallow git clone (depth=1)

**2. Reduce Claude API Costs**:
- Truncate README to 3000 chars
- Limit file tree depth for large repos
- Cache analysis results in Redis

**3. Speed Up Job Processing**:
- Increase Celery worker concurrency
- Use SSD volumes for Docker
- Enable PostgreSQL connection pooling

**4. Database Optimization**:
- Add indexes on frequently queried columns
- Use database connection pooling
- Implement read replicas for high traffic

### Security Best Practices

**1. Never Log Secrets**:
```python
# BAD
logger.info(f"Using token: {access_token}")

# GOOD
logger.info("Using provided access token")
```

**2. Encrypt Sensitive Data**:
```python
# Store encrypted OAuth tokens
from cryptography.fernet import Fernet
encrypted_token = fernet.encrypt(token.encode())
```

**3. Validate Input**:
```python
# Validate GitHub URLs
if not re.match(r'^https://github\.com/[\w-]+/[\w-]+$', url):
    raise ValueError("Invalid GitHub URL")
```

**4. Rate Limiting**:
```python
# Add rate limiting to API endpoints
from slowapi import Limiter
limiter.limit("10/minute")(create_job)
```

---

**Last Updated**: January 2024
**Maintainers**: Development Team
**Version**: 1.0.0
