# Project Structure

## Overview

```
codebase-documenter/
├── frontend/                    # Next.js 14 Frontend Application
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   │   ├── globals.css     # Global styles with Tailwind
│   │   │   ├── layout.tsx      # Root layout component
│   │   │   └── page.tsx        # Home page
│   │   └── components/         # React components
│   │       ├── SubmitUrlForm.tsx   # Form to submit GitHub URLs
│   │       └── JobStatus.tsx       # Component to display job status
│   ├── .env.local.example      # Frontend environment variables template
│   ├── .eslintrc.json          # ESLint configuration
│   ├── .gitignore              # Frontend-specific gitignore
│   ├── next.config.js          # Next.js configuration
│   ├── package.json            # Node dependencies
│   ├── postcss.config.mjs      # PostCSS configuration
│   ├── tailwind.config.ts      # Tailwind CSS configuration
│   └── tsconfig.json           # TypeScript configuration
│
├── backend/                     # FastAPI Backend Application
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── jobs.py     # Job endpoints (POST, GET)
│   │   ├── core/
│   │   │   ├── config.py       # Application settings
│   │   │   └── database.py     # Database connection setup
│   │   ├── models/
│   │   │   └── job.py          # SQLAlchemy Job model
│   │   ├── schemas/
│   │   │   └── job.py          # Pydantic schemas
│   │   └── main.py             # FastAPI application entry point
│   ├── alembic/
│   │   ├── versions/
│   │   │   └── 001_initial_migration.py  # Initial database migration
│   │   ├── env.py              # Alembic environment configuration
│   │   └── script.py.mako      # Migration template
│   ├── .dockerignore           # Docker ignore file
│   ├── alembic.ini             # Alembic configuration
│   ├── Dockerfile              # Backend Docker image
│   └── requirements.txt        # Python dependencies
│
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore file
├── docker-compose.yml           # Docker Compose configuration
├── README.md                    # Main documentation
├── QUICKSTART.md                # Quick start guide
├── PROJECT_STRUCTURE.md         # This file
├── setup.sh                     # Setup script (Mac/Linux)
└── setup.bat                    # Setup script (Windows)
```

## Component Descriptions

### Frontend (`frontend/`)

#### Pages
- **[page.tsx](frontend/src/app/page.tsx)** - Main landing page with form and job status display
- **[layout.tsx](frontend/src/app/layout.tsx)** - Root layout with metadata and font configuration

#### Components
- **[SubmitUrlForm.tsx](frontend/src/components/SubmitUrlForm.tsx)** - Form component for submitting GitHub repository URLs
  - Validates URL input
  - Calls POST /api/v1/jobs endpoint
  - Displays success/error messages
  - Triggers job status display on success

- **[JobStatus.tsx](frontend/src/components/JobStatus.tsx)** - Displays job information and status
  - Polls job status every 5 seconds if pending/processing
  - Shows job details (ID, URL, status, timestamps)
  - Color-coded status badges
  - Displays error messages if job fails

#### Configuration Files
- **[tailwind.config.ts](frontend/tailwind.config.ts)** - Tailwind CSS configuration with dark mode support
- **[tsconfig.json](frontend/tsconfig.json)** - TypeScript compiler configuration
- **[next.config.js](frontend/next.config.js)** - Next.js configuration
- **[package.json](frontend/package.json)** - Dependencies and scripts

### Backend (`backend/`)

#### API Layer (`app/api/v1/`)
- **[jobs.py](backend/app/api/v1/jobs.py)** - Job management endpoints
  - `POST /api/v1/jobs` - Create new documentation job
  - `GET /api/v1/jobs/{job_id}` - Get job status by ID
  - `GET /api/v1/jobs` - List all jobs with pagination

#### Core (`app/core/`)
- **[config.py](backend/app/core/config.py)** - Application configuration using Pydantic Settings
  - Database URL
  - Redis URL
  - CORS origins
  - Server settings

- **[database.py](backend/app/core/database.py)** - SQLAlchemy setup
  - Database engine creation
  - Session management
  - Dependency injection for database sessions

#### Models (`app/models/`)
- **[job.py](backend/app/models/job.py)** - SQLAlchemy Job model
  - Fields: id, github_url, status, error_message, created_at, updated_at
  - JobStatus enum: pending, processing, completed, failed

#### Schemas (`app/schemas/`)
- **[job.py](backend/app/schemas/job.py)** - Pydantic schemas for request/response validation
  - `JobCreate` - Request schema for creating jobs
  - `JobResponse` - Response schema for job data
  - `JobStatus` - Status enum

#### Main Application
- **[main.py](backend/app/main.py)** - FastAPI application
  - CORS middleware configuration
  - Router registration
  - Health check endpoints

#### Database Migrations (`alembic/`)
- **[001_initial_migration.py](backend/alembic/versions/001_initial_migration.py)** - Creates jobs table
- **[env.py](backend/alembic/env.py)** - Alembic environment setup

### Infrastructure

#### Docker
- **[docker-compose.yml](docker-compose.yml)** - Orchestrates all services
  - PostgreSQL 15 database
  - Redis 7 cache
  - FastAPI backend with auto-reload
  - Health checks for all services

- **[backend/Dockerfile](backend/Dockerfile)** - Backend container image
  - Python 3.11 slim base
  - System dependencies (gcc, postgresql-client)
  - Python package installation
  - Application code

#### Configuration
- **[.env.example](.env.example)** - Environment variables template
  - Database credentials
  - Redis connection
  - Backend settings
  - CORS configuration

### Setup Scripts
- **[setup.sh](setup.sh)** - Automated setup for Mac/Linux
- **[setup.bat](setup.bat)** - Automated setup for Windows

Both scripts:
1. Check for required tools (Docker, Node.js)
2. Create environment files
3. Install frontend dependencies
4. Start Docker services
5. Run database migrations

## Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom React components
- **State Management**: React hooks (useState, useEffect)

### Backend
- **Framework**: FastAPI (Python 3.11)
- **ORM**: SQLAlchemy 2.0
- **Validation**: Pydantic v2
- **Migrations**: Alembic
- **Server**: Uvicorn with auto-reload

### Database & Cache
- **Database**: PostgreSQL 15
- **Cache**: Redis 7

### DevOps
- **Containerization**: Docker & Docker Compose
- **Development**: Hot reload for both frontend and backend

## API Endpoints

### Backend API (http://localhost:8000)

#### Health & Info
- `GET /` - API information
- `GET /health` - Health check

#### Jobs
- `POST /api/v1/jobs` - Create new job
  - Body: `{ "github_url": "string" }`
  - Returns: Job object with ID and status

- `GET /api/v1/jobs/{job_id}` - Get job by ID
  - Returns: Job object with current status

- `GET /api/v1/jobs` - List all jobs
  - Query params: `skip` (default: 0), `limit` (default: 100)
  - Returns: Array of job objects

#### Documentation
- `GET /docs` - Interactive API documentation (Swagger UI)
- `GET /redoc` - Alternative API documentation (ReDoc)

## Database Schema

### jobs table
```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY,
    github_url VARCHAR UNIQUE NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    error_message VARCHAR NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_jobs_id ON jobs(id);
CREATE INDEX ix_jobs_github_url ON jobs(github_url);
```

## Development Workflow

1. **Backend changes**: Auto-reloads via Uvicorn
2. **Frontend changes**: Auto-reloads via Next.js Fast Refresh
3. **Database schema changes**:
   ```bash
   # Create migration
   docker-compose exec backend alembic revision --autogenerate -m "description"

   # Apply migration
   docker-compose exec backend alembic upgrade head
   ```

## Port Mapping

- `3000` - Frontend (Next.js)
- `8000` - Backend (FastAPI)
- `5432` - PostgreSQL
- `6379` - Redis
