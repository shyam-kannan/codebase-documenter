# Development Guide

This guide contains common commands and workflows for developing the Codebase Documentation System.

## Table of Contents
- [Quick Commands](#quick-commands)
- [Backend Development](#backend-development)
- [Frontend Development](#frontend-development)
- [Database Management](#database-management)
- [Docker Management](#docker-management)
- [Testing](#testing)
- [Debugging](#debugging)

## Quick Commands

### Start Everything
```bash
# Using setup script (recommended for first time)
./setup.sh        # Mac/Linux
setup.bat         # Windows

# Manual start
docker-compose up -d
cd frontend && npm run dev
```

### Stop Everything
```bash
docker-compose down
```

### Restart Everything
```bash
docker-compose restart
```

## Backend Development

### Start Backend Only
```bash
docker-compose up -d postgres redis backend
```

### View Backend Logs
```bash
# Follow logs
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Access Backend Container
```bash
docker-compose exec backend bash
```

### Run Backend Commands
```bash
# Inside container
docker-compose exec backend <command>

# Examples
docker-compose exec backend python -c "from app.core.database import engine; print(engine)"
docker-compose exec backend alembic current
```

### Install New Python Package
```bash
# Add to requirements.txt first, then:
docker-compose exec backend pip install <package-name>

# Or rebuild the container
docker-compose up -d --build backend
```

### Format Backend Code
```bash
cd backend

# Install dev dependencies (optional)
pip install black isort flake8

# Format with black
black app/

# Sort imports
isort app/

# Check code quality
flake8 app/
```

## Frontend Development

### Start Frontend Dev Server
```bash
cd frontend
npm run dev
```

### Build Frontend for Production
```bash
cd frontend
npm run build
npm start
```

### Install New Package
```bash
cd frontend
npm install <package-name>
```

### Lint Frontend Code
```bash
cd frontend
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Type Check
```bash
cd frontend
npx tsc --noEmit
```

## Database Management

### Run Migrations

#### Apply All Pending Migrations
```bash
docker-compose exec backend alembic upgrade head
```

#### Create New Migration
```bash
# Auto-generate from model changes
docker-compose exec backend alembic revision --autogenerate -m "description of changes"

# Create empty migration
docker-compose exec backend alembic revision -m "description"
```

#### Rollback Migration
```bash
# Rollback one migration
docker-compose exec backend alembic downgrade -1

# Rollback to specific version
docker-compose exec backend alembic downgrade <revision_id>

# Rollback all migrations
docker-compose exec backend alembic downgrade base
```

#### Check Current Migration Version
```bash
docker-compose exec backend alembic current
```

#### View Migration History
```bash
docker-compose exec backend alembic history
```

### Access Database

#### Using psql
```bash
docker-compose exec postgres psql -U codebase_user -d codebase_db
```

#### Common SQL Queries
```sql
-- List all tables
\dt

-- Describe jobs table
\d jobs

-- Count jobs by status
SELECT status, COUNT(*) FROM jobs GROUP BY status;

-- View recent jobs
SELECT * FROM jobs ORDER BY created_at DESC LIMIT 10;

-- Delete all jobs (be careful!)
TRUNCATE jobs;
```

#### Using Python
```bash
docker-compose exec backend python

# Then in Python:
from app.core.database import SessionLocal
from app.models.job import Job

db = SessionLocal()
jobs = db.query(Job).all()
print(jobs)
```

### Database Backup & Restore

#### Backup
```bash
# Backup to file
docker-compose exec -T postgres pg_dump -U codebase_user codebase_db > backup.sql

# Backup with custom format (compressed)
docker-compose exec -T postgres pg_dump -U codebase_user -Fc codebase_db > backup.dump
```

#### Restore
```bash
# From SQL file
docker-compose exec -T postgres psql -U codebase_user codebase_db < backup.sql

# From custom format
docker-compose exec -T postgres pg_restore -U codebase_user -d codebase_db backup.dump
```

#### Reset Database
```bash
# Stop backend
docker-compose stop backend

# Drop and recreate database
docker-compose exec postgres psql -U codebase_user -c "DROP DATABASE codebase_db;"
docker-compose exec postgres psql -U codebase_user -c "CREATE DATABASE codebase_db;"

# Run migrations
docker-compose exec backend alembic upgrade head

# Start backend
docker-compose start backend
```

## Docker Management

### View Running Services
```bash
docker-compose ps
```

### View Service Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f backend
```

### Restart Services
```bash
# All services
docker-compose restart

# Specific service
docker-compose restart backend
docker-compose restart postgres
```

### Rebuild Services
```bash
# Rebuild backend
docker-compose up -d --build backend

# Rebuild all
docker-compose up -d --build
```

### Clean Up

#### Remove Containers
```bash
# Stop and remove containers
docker-compose down

# Remove containers and volumes (deletes all data!)
docker-compose down -v

# Remove containers, volumes, and images
docker-compose down -v --rmi all
```

#### Remove Orphaned Volumes
```bash
docker volume prune
```

#### Remove Unused Images
```bash
docker image prune -a
```

### Check Resource Usage
```bash
docker stats
```

## Testing

### Backend Tests
```bash
# Install pytest first (add to requirements.txt)
docker-compose exec backend pip install pytest pytest-asyncio httpx

# Run tests
docker-compose exec backend pytest

# Run with coverage
docker-compose exec backend pytest --cov=app

# Run specific test file
docker-compose exec backend pytest tests/test_jobs.py
```

### Frontend Tests
```bash
cd frontend

# Install testing libraries
npm install --save-dev @testing-library/react @testing-library/jest-dom jest

# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

### API Testing with curl

#### Create Job
```bash
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/facebook/react"}'
```

#### Get Job
```bash
# Replace JOB_ID with actual ID
curl http://localhost:8000/api/v1/jobs/JOB_ID
```

#### List Jobs
```bash
curl http://localhost:8000/api/v1/jobs
```

#### Health Check
```bash
curl http://localhost:8000/health
```

## Debugging

### Backend Debugging

#### Enable Debug Mode
```python
# In app/main.py, add:
import logging
logging.basicConfig(level=logging.DEBUG)
```

#### Add Breakpoints (with pdb)
```python
# Add this line where you want to break
import pdb; pdb.set_trace()

# Then access the container
docker-compose exec backend bash
```

#### View SQL Queries
```python
# In app/core/database.py, add echo=True
engine = create_engine(settings.DATABASE_URL, echo=True)
```

### Frontend Debugging

#### Enable Verbose Logging
```typescript
// Add console.log statements
console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);
console.log("Response:", response);
```

#### Use React DevTools
Install the React DevTools browser extension for debugging components.

#### Network Inspection
Use browser DevTools (F12) > Network tab to inspect API calls.

### Common Issues

#### Port Already in Use
```bash
# Find process using port 8000
# Windows
netstat -ano | findstr :8000

# Mac/Linux
lsof -i :8000

# Kill the process or change the port in docker-compose.yml
```

#### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

#### Frontend Can't Connect to Backend
1. Check backend is running: http://localhost:8000/health
2. Verify CORS settings in backend/app/main.py
3. Check NEXT_PUBLIC_API_URL in frontend/.env.local

## Environment Variables

### Backend (.env)
```bash
DATABASE_URL=postgresql://user:password@host:port/db
REDIS_URL=redis://host:port/0
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Performance Monitoring

### Monitor Backend Performance
```bash
# Install py-spy
docker-compose exec backend pip install py-spy

# Profile the application
docker-compose exec backend py-spy top --pid 1
```

### Monitor Database Performance
```sql
-- Enable query logging in PostgreSQL
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- View slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;
```

## Git Workflow

### Before Committing
```bash
# Backend
cd backend
black app/
flake8 app/

# Frontend
cd frontend
npm run lint
npx tsc --noEmit

# Test everything works
docker-compose up -d
cd frontend && npm run dev
```

### Commit Message Format
```
type: subject

body

Examples:
feat: add job deletion endpoint
fix: resolve CORS issue with frontend
docs: update API documentation
refactor: improve database connection handling
```

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
