# Codebase Documentation System

An AI-powered full-stack application that automatically generates comprehensive documentation from GitHub repositories using Claude Sonnet 4, LangGraph workflows, and intelligent code analysis.

## 🎉 Phase 2 Complete - AI Documentation Agent

The system now features:
- 🤖 **AI-Powered Documentation**: Claude Sonnet 4 generates intelligent, context-aware documentation
- 🔄 **LangGraph Workflows**: Multi-step agent orchestrates clone → scan → analyze → generate
- ⚡ **Background Processing**: Celery workers handle jobs asynchronously
- 📊 **Code Analysis**: Automatic extraction of classes, functions, and structure
- 🚀 **Production Ready**: Error handling, logging, and scalable architecture

## Project Structure

```
codebase-documenter/
├── frontend/          # Next.js 14 frontend application
├── backend/           # FastAPI backend application
├── infrastructure/    # Docker and deployment configs
├── docker-compose.yml # Docker Compose setup
└── .env.example       # Environment variables template
```

## Tech Stack

### Frontend
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- React 18

### Backend
- FastAPI (Python 3.11)
- SQLAlchemy (ORM)
- PostgreSQL (Database)
- Redis (Task Queue)
- Alembic (Migrations)
- **Celery** (Background Jobs)
- **LangGraph** (AI Workflow)
- **Claude API** (Documentation Generation)

### Infrastructure
- Docker & Docker Compose
- PostgreSQL 15
- Redis 7

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)
- **Anthropic API Key** (for AI documentation generation) - Get one at https://console.anthropic.com/

## Quick Start

### Phase 1 & 2 Setup

### 1. Clone and Setup Environment

```bash
# Copy environment variables
cp .env.example .env

# Edit .env and add your Anthropic API key
# ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

### 2. Start All Services with Docker

```bash
# Build and start all services (PostgreSQL, Redis, Backend, Celery Worker)
docker-compose up -d --build

# Check services are running (should see 4 services)
docker-compose ps

# Expected output:
# ✓ codebase_postgres (healthy)
# ✓ codebase_redis (healthy)
# ✓ codebase_backend (running)
# ✓ codebase_celery_worker (running)

# View backend logs
docker-compose logs -f backend

# View Celery worker logs
docker-compose logs -f celery_worker
```

The backend API will be available at http://localhost:8000

API Documentation: http://localhost:8000/docs

**🎉 AI Documentation is now active!** Submit a GitHub URL and watch as the system:
1. Clones the repository
2. Scans the file structure
3. Analyzes the code
4. Generates comprehensive documentation with Claude AI

### 3. Setup Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at http://localhost:3000

## Development

### Backend Development

#### Run migrations

```bash
# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Apply migrations
docker-compose exec backend alembic upgrade head
```

#### Access database

```bash
docker-compose exec postgres psql -U codebase_user -d codebase_db
```

#### Run tests

```bash
cd backend
pytest
```

### Frontend Development

```bash
cd frontend

# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Lint code
npm run lint
```

## How It Works (Phase 2 Workflow)

When you submit a GitHub repository:

```
1. 📝 Job Created → Status: "pending"
   ↓
2. 🔄 Celery Task Queued
   ↓
3. 👷 Worker Picks Up Task → Status: "processing"
   ↓
4. 🤖 LangGraph Agent Workflow:
   ├─ Clone repository with GitPython
   ├─ Scan directory structure
   ├─ Analyze code (Python/JS)
   ├─ Generate docs with Claude AI
   ├─ Save to /tmp/docs/{job_id}.md
   └─ Cleanup temporary files
   ↓
5. ✅ Status: "completed" (or "failed" with error)
```

Total time: 30 seconds - 5 minutes depending on repository size.

## API Endpoints

### POST /api/v1/jobs
Submit a GitHub repository URL for AI-powered documentation generation.

**Request Body:**
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
  "created_at": "2024-01-19T12:00:00Z"
}
```

**What happens next:**
- Celery task is queued immediately
- Worker processes job in background
- Status changes: pending → processing → completed

### GET /api/v1/jobs/{job_id}
Check the status of a documentation job.

**Response:**
```json
{
  "id": "uuid",
  "github_url": "https://github.com/owner/repo",
  "status": "processing",
  "created_at": "2024-01-19T12:00:00Z",
  "updated_at": "2024-01-19T12:01:00Z"
}
```

## Database Schema

### jobs table
- `id` (UUID, Primary Key)
- `github_url` (String, Unique)
- `status` (Enum: pending, processing, completed, failed)
- `error_message` (String, Nullable)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Status Flow:**
- `pending` - Job created, waiting for worker
- `processing` - Worker is generating documentation
- `completed` - Documentation ready (/tmp/docs/{job_id}.md)
- `failed` - Error occurred (check error_message)

## Environment Variables

Key environment variables (see `.env.example` for all):

```bash
# Required for Phase 2
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here  # Get from https://console.anthropic.com/

# Database
DATABASE_URL=postgresql://codebase_user:codebase_password@postgres:5432/codebase_db

# Redis (Task Queue)
REDIS_URL=redis://redis:6379/0

# CORS
CORS_ORIGINS=http://localhost:3000
```

## Phase 2 Documentation

Comprehensive guides for Phase 2:

- **[PHASE2_QUICKSTART.md](PHASE2_QUICKSTART.md)** - Get Phase 2 running in 5 minutes
- **[PHASE2_SUMMARY.md](PHASE2_SUMMARY.md)** - Complete Phase 2 documentation
- **[PHASE2_TESTING.md](PHASE2_TESTING.md)** - Testing guide for all components
- **[API_EXAMPLES.md](API_EXAMPLES.md)** - API request/response examples

## Monitoring & Logs

### View Logs

```bash
# Celery worker (shows AI workflow progress)
docker-compose logs -f celery_worker

# Backend API
docker-compose logs -f backend

# All services
docker-compose logs -f
```

### Check Job Status

```bash
# Via API
curl http://localhost:8000/api/v1/jobs/{job_id}

# Via database
docker-compose exec postgres psql -U codebase_user -d codebase_db \
  -c "SELECT id, status, error_message FROM jobs ORDER BY created_at DESC LIMIT 10;"
```

### View Generated Documentation

```bash
# Access worker container
docker-compose exec celery_worker bash

# View documentation
cat /tmp/docs/{job_id}.md

# List all generated docs
ls -lh /tmp/docs/
```

## Troubleshooting

### Celery Worker Not Starting
```bash
# Check logs
docker-compose logs celery_worker

# Verify Redis connection
docker-compose exec celery_worker python -c "from app.celery_app import celery_app; print('OK')"

# Restart worker
docker-compose restart celery_worker
```

### API Key Issues
```bash
# Check API key is set
docker-compose exec backend env | grep ANTHROPIC

# Verify key is valid
docker-compose exec backend python -c "from anthropic import Anthropic; Anthropic(); print('Valid')"
```

### Jobs Stuck in Pending
```bash
# Check worker is running
docker-compose ps celery_worker

# Check Redis queue
docker-compose exec redis redis-cli LLEN celery

# Restart worker
docker-compose restart celery_worker
```

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Rebuild
docker-compose up -d --build backend

# Rebuild backend
docker-compose up -d --build backend
```

### Database connection issues
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres
```

### Port already in use
```bash
# Stop all services
docker-compose down

# Check what's using the port
# On Windows:
netstat -ano | findstr :8000
# On Mac/Linux:
lsof -i :8000
```

## Example Repositories to Try

Start with these to test the system:

### Small & Fast (30-60 seconds)
```bash
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/anthropics/anthropic-sdk-python"}'
```

### Medium (1-2 minutes)
```bash
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/pallets/flask"}'
```

### Large (2-5 minutes)
```bash
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/django/django"}'
```

## Architecture Overview

### Phase 2 Components

```
Frontend (Next.js)
       ↓ HTTP
FastAPI Backend
       ↓ Queue Task
Redis (Broker)
       ↓ Dequeue
Celery Worker
       ↓ Execute
LangGraph Agent
       ├─ Clone (GitPython)
       ├─ Scan (File Analysis)
       ├─ Analyze (AST/Regex)
       └─ Generate (Claude API)
       ↓
Documentation Output
```

### Key Technologies

- **LangGraph**: Workflow orchestration
- **Celery**: Distributed task queue
- **Claude Sonnet 4**: AI documentation generation
- **GitPython**: Repository cloning
- **AST/Regex**: Code structure extraction

## Cost Considerations

Each job costs approximately:
- **Input tokens**: 3,000-8,000
- **Output tokens**: 2,000-5,000
- **Total cost**: ~$0.05-0.15 per repository

Monitor usage at: https://console.anthropic.com/

## Project Phases

### ✅ Phase 1 - Complete
- Frontend UI with Next.js
- Backend API with FastAPI
- Database with PostgreSQL
- Job tracking system

### ✅ Phase 2 - Complete
- **AI Documentation Generation** with Claude
- **LangGraph Workflow** orchestration
- **Celery Background Processing**
- **Code Analysis** (Python/JavaScript)
- **Error Handling** & logging

### 🔜 Phase 3 - Planned
- S3 storage for documentation
- Documentation viewer in frontend
- Advanced code analysis (more languages)
- Webhooks & notifications
- User authentication
- Rate limiting
- Caching & optimization

## Next Steps (Phase 3+)
- Implement LLM-based documentation generation
- Add authentication and user management
- Deploy to production environment

## License

MIT
