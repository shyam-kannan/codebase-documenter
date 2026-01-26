# RepoFriend - AI-Powered GitHub Documentation Generator

> Transform any GitHub repository into comprehensive, professional documentation with a single click.

RepoFriend is a full-stack application that automatically analyzes GitHub repositories and generates intelligent, context-aware documentation using Claude AI. It supports both public and private repositories, with features including automated code comment generation, pull request creation, and cloud storage integration.

## 🎥 Demo Video

[![RepoFriend Demo](demoImage.png)](https://www.loom.com/share/18786b7a779148f9b7bf17962eae25cb)

*Click the image above to watch the full demo!*


## ✨ Key Features

- 🤖 **AI-Powered Documentation** - Claude Sonnet 4 generates comprehensive, human-readable documentation from repository analysis
- 💬 **Intelligent Code Comments** - Automatically adds inline comments to your codebase and creates pull requests
- 🔐 **Private Repository Support** - Full GitHub OAuth integration for accessing private repositories
- ☁️ **Cloud Storage** - Documentation automatically uploaded to Amazon S3 with public URLs
- 📊 **Real-Time Status Updates** - Live polling shows job progress from pending → processing → completed
- 🎨 **Beautiful UI** - Modern Next.js interface with dark mode support
- ⚡ **Background Processing** - Celery workers handle jobs asynchronously for optimal performance
- 🔄 **LangGraph Workflows** - Multi-step AI agent orchestrates clone → scan → analyze → generate workflow

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** with App Router and TypeScript
- **NextAuth.js** for GitHub OAuth authentication
- **Tailwind CSS** for styling with dark mode
- **React Markdown** with syntax highlighting
- **Framer Motion** for animations

### Backend
- **FastAPI** (Python 3.11) for REST API
- **LangGraph** for AI workflow orchestration
- **Claude API (Anthropic)** for documentation generation
- **Celery** for distributed background task processing
- **SQLAlchemy** ORM with PostgreSQL
- **GitPython** for repository cloning and analysis
- **AST parsing** for code structure extraction

### Infrastructure
- **PostgreSQL 15** for database
- **Redis 7** for task queue and caching
- **Amazon S3** for cloud storage
- **Docker & Docker Compose** for containerization

## 📋 Prerequisites

Before you begin, ensure you have the following:

- **Docker** and **Docker Compose** installed
- **Node.js 18+** (for local frontend development)
- **Python 3.11+** (for local backend development)
- **Anthropic API Key** - Get one at [https://console.anthropic.com/](https://console.anthropic.com/)
- **AWS Account** (for S3 storage) - Sign up at [https://aws.amazon.com/](https://aws.amazon.com/)
- **GitHub OAuth App** (for private repo access):
  1. Go to GitHub Settings → Developer settings → OAuth Apps
  2. Create a new OAuth App
  3. Set callback URL to `http://localhost:3000/api/auth/callback/github`
  4. Note the Client ID and Client Secret

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/codebase-documenter.git
cd codebase-documenter
```

### 2. Environment Variables Setup

#### Backend Environment Variables

Create a `.env` file in the root directory:

```bash
# Anthropic API (Required)
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# AWS S3 (Required for document storage)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name

# GitHub OAuth (Required for private repos)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_TOKEN=ghp_your-personal-access-token

# Database
DATABASE_URL=postgresql://codebase_user:codebase_password@postgres:5432/codebase_db
POSTGRES_USER=codebase_user
POSTGRES_PASSWORD=codebase_password
POSTGRES_DB=codebase_db

# Redis
REDIS_URL=redis://redis:6379/0

# API Configuration
CORS_ORIGINS=http://localhost:3000
```

#### Frontend Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-here  # Generate with: openssl rand -base64 32

# GitHub OAuth (same credentials as backend)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Start Backend Services with Docker

```bash
# Build and start all services (PostgreSQL, Redis, Backend, Celery Worker)
docker-compose up -d --build

# Verify all services are running
docker-compose ps

# Expected output:
# ✓ codebase_postgres (healthy)
# ✓ codebase_redis (healthy)
# ✓ codebase_backend (running on port 8000)
# ✓ codebase_celery_worker (running)
```

The backend API will be available at:
- **API**: [http://localhost:8000](http://localhost:8000)
- **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 4. Start Frontend Development Server

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at [http://localhost:3000](http://localhost:3000)

## 📖 Usage

### Generating Documentation

1. **Sign in** with your GitHub account
2. **Enter a repository URL** (e.g., `https://github.com/anthropics/anthropic-sdk-python`)
3. **Choose options**:
   - Generate documentation only
   - Generate documentation + AI comments (creates a PR)
4. **Monitor progress** in real-time as the job processes
5. **View results** once complete:
   - Read documentation in the browser
   - Download as PDF
   - View commented code (if selected)
   - Access the GitHub pull request

### From Saved Documentation

After generating documentation, you can:

- **View all saved documentation** from the "Saved Docs" page
- **Generate AI comments later** if you didn't select it initially
- **Download documentation** as PDF at any time
- **Share documentation URLs** (stored in S3)

## 🏗️ Project Structure

```
codebase-documenter/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # Next.js 14 App Router pages
│   │   │   ├── dashboard/   # Main documentation generation page
│   │   │   ├── documentation/[jobId]/  # Documentation viewer
│   │   │   ├── saved-documentation/    # Saved docs list
│   │   │   └── commented-code/[jobId]/ # Code with comments viewer
│   │   ├── components/      # React components
│   │   │   ├── SubmitUrlForm.tsx
│   │   │   └── JobStatus.tsx
│   │   └── hooks/           # Custom React hooks
│   └── package.json
├── backend/                 # FastAPI backend application
│   ├── app/
│   │   ├── api/v1/         # API endpoints
│   │   │   ├── jobs.py     # Job management endpoints
│   │   │   └── auth.py     # Authentication endpoints
│   │   ├── models/         # SQLAlchemy models
│   │   │   └── job.py
│   │   ├── tools/          # AI tools and utilities
│   │   │   ├── doc_generator.py      # Documentation generation
│   │   │   ├── code_commenter.py     # Code comment generation
│   │   │   └── repository_analyzer.py # Code analysis
│   │   ├── workflows/      # LangGraph workflow definitions
│   │   │   └── doc_workflow.py
│   │   ├── core/           # Core configuration
│   │   │   ├── config.py
│   │   │   └── database.py
│   │   ├── celery_app.py   # Celery configuration
│   │   └── main.py         # FastAPI application entry
│   ├── alembic/            # Database migrations
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml      # Docker services orchestration
└── README.md
```

## 🔗 API Endpoints

### Jobs API

#### `POST /api/v1/jobs`
Create a new documentation generation job.

**Request Body:**
```json
{
  "github_url": "https://github.com/owner/repo",
  "add_comments": false  // Optional: generate AI comments
}
```

**Response:**
```json
{
  "id": "uuid",
  "github_url": "https://github.com/owner/repo",
  "status": "pending",
  "documentation_url": null,
  "created_at": "2024-01-21T12:00:00Z"
}
```

#### `GET /api/v1/jobs/{job_id}`
Get job status and details.

**Response:**
```json
{
  "id": "uuid",
  "github_url": "https://github.com/owner/repo",
  "status": "completed",
  "documentation_url": "https://s3.amazonaws.com/bucket/docs/uuid.md",
  "commented_code_url": "https://s3.amazonaws.com/bucket/code/uuid.md",
  "pull_request_url": "https://github.com/owner/repo/pull/123",
  "created_at": "2024-01-21T12:00:00Z",
  "updated_at": "2024-01-21T12:02:30Z"
}
```

#### `GET /api/v1/jobs/{job_id}/documentation`
Retrieve the generated documentation (proxies S3).

#### `POST /api/v1/jobs/{job_id}/add-comments`
Trigger AI comment generation for an existing job.

### Authentication API

#### `POST /api/v1/auth/github`
Exchange GitHub OAuth code for backend session.

**Request Body:**
```json
{
  "access_token": "gho_github_access_token"
}
```

## 🔧 Development

### Backend Development

#### Run Database Migrations

```bash
# Create a new migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Apply migrations
docker-compose exec backend alembic upgrade head

# Rollback migration
docker-compose exec backend alembic downgrade -1
```

#### Access Database

```bash
docker-compose exec postgres psql -U codebase_user -d codebase_db
```

#### View Logs

```bash
# All services
docker-compose logs -f

# Backend API only
docker-compose logs -f backend

# Celery worker (shows AI workflow progress)
docker-compose logs -f celery_worker
```

#### Run Tests

```bash
cd backend
pytest
```

### Frontend Development

```bash
cd frontend

# Run development server with hot reload
npm run dev

# Build for production
npm run build

# Run production build locally
npm start

# Lint code
npm run lint

# Type check
npm run type-check
```

## 🐛 Troubleshooting

### Jobs Stuck in Pending

**Symptoms**: Jobs created but never progress to "processing"

**Solution**:
```bash
# Check Celery worker is running
docker-compose ps celery_worker

# View worker logs for errors
docker-compose logs celery_worker

# Restart worker
docker-compose restart celery_worker
```

### API Key Issues

**Symptoms**: Jobs fail with "API key invalid" or "Anthropic API error"

**Solution**:
```bash
# Verify API key is set
docker-compose exec backend env | grep ANTHROPIC_API_KEY

# Test API key validity
docker-compose exec backend python -c "from anthropic import Anthropic; client = Anthropic(); print('API key is valid')"
```

### S3 Upload Failures

**Symptoms**: Documentation completes but no S3 URL

**Solution**:
```bash
# Check AWS credentials
docker-compose exec backend env | grep AWS

# Verify S3 bucket access
docker-compose exec backend python -c "import boto3; s3 = boto3.client('s3'); print(s3.list_buckets())"
```

### Port Already in Use

**Symptoms**: Docker fails to start with "port is already allocated"

**Solution**:
```bash
# Stop all containers
docker-compose down

# Find process using port 8000 (Windows)
netstat -ano | findstr :8000

# Find process using port 8000 (Mac/Linux)
lsof -i :8000

# Kill the process or change port in docker-compose.yml
```

### Database Connection Issues

**Symptoms**: Backend can't connect to PostgreSQL

**Solution**:
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
```

## 💰 Cost Considerations

### Claude API Usage

Each documentation job costs approximately:
- **Small repo** (~50 files): $0.05 - $0.10
- **Medium repo** (~200 files): $0.15 - $0.30
- **Large repo** (~500+ files): $0.40 - $0.80

Monitor usage at: [https://console.anthropic.com/](https://console.anthropic.com/)

### AWS S3 Storage

- **Storage**: ~$0.023 per GB/month
- **Requests**: ~$0.005 per 1,000 PUT requests
- **Data transfer**: Free for first 100 GB/month

Average documentation file: 50-200 KB

## 📚 Additional Documentation

For more detailed technical information, see:

- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Architecture, development phases, and technical details
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Guidelines for contributing to the project *(coming soon)*

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Questions or Issues?** Open an issue on GitHub or reach out to the maintainers.
