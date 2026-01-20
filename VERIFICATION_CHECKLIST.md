# Verification Checklist

Use this checklist to verify that your Phase 1 setup is complete and working correctly.

## Prerequisites

- [ ] Docker Desktop installed and running
- [ ] Node.js 18+ installed
- [ ] npm installed
- [ ] Git installed (optional, for version control)

## File Structure

Verify all files were created:

### Root Directory
- [ ] `.env.example`
- [ ] `.gitignore`
- [ ] `docker-compose.yml`
- [ ] `README.md`
- [ ] `QUICKSTART.md`
- [ ] `DEVELOPMENT.md`
- [ ] `PROJECT_STRUCTURE.md`
- [ ] `GET_STARTED.md`
- [ ] `VERIFICATION_CHECKLIST.md`
- [ ] `setup.sh`
- [ ] `setup.bat`

### Backend Directory
- [ ] `backend/requirements.txt`
- [ ] `backend/Dockerfile`
- [ ] `backend/.dockerignore`
- [ ] `backend/alembic.ini`
- [ ] `backend/alembic/env.py`
- [ ] `backend/alembic/script.py.mako`
- [ ] `backend/alembic/versions/__init__.py`
- [ ] `backend/alembic/versions/001_initial_migration.py`
- [ ] `backend/app/__init__.py`
- [ ] `backend/app/main.py`
- [ ] `backend/app/core/__init__.py`
- [ ] `backend/app/core/config.py`
- [ ] `backend/app/core/database.py`
- [ ] `backend/app/models/__init__.py`
- [ ] `backend/app/models/job.py`
- [ ] `backend/app/schemas/__init__.py`
- [ ] `backend/app/schemas/job.py`
- [ ] `backend/app/api/__init__.py`
- [ ] `backend/app/api/v1/__init__.py`
- [ ] `backend/app/api/v1/jobs.py`

### Frontend Directory
- [ ] `frontend/package.json`
- [ ] `frontend/tsconfig.json`
- [ ] `frontend/next.config.js`
- [ ] `frontend/tailwind.config.ts`
- [ ] `frontend/postcss.config.mjs`
- [ ] `frontend/.eslintrc.json`
- [ ] `frontend/.gitignore`
- [ ] `frontend/.env.local.example`
- [ ] `frontend/src/app/layout.tsx`
- [ ] `frontend/src/app/page.tsx`
- [ ] `frontend/src/app/globals.css`
- [ ] `frontend/src/components/SubmitUrlForm.tsx`
- [ ] `frontend/src/components/JobStatus.tsx`

## Setup Verification

### Step 1: Environment Configuration
- [ ] Created `.env` file from `.env.example`
- [ ] Created `frontend/.env.local` from `frontend/.env.local.example`
- [ ] Verified environment variables are correct

### Step 2: Backend Services
```bash
docker-compose up -d
```

- [ ] PostgreSQL container started successfully
- [ ] Redis container started successfully
- [ ] Backend container started successfully
- [ ] All containers show as "healthy" in `docker-compose ps`

### Step 3: Database Migration
```bash
docker-compose exec backend alembic upgrade head
```

- [ ] Migration ran without errors
- [ ] `jobs` table created in database

### Step 4: Frontend Setup
```bash
cd frontend
npm install
```

- [ ] Dependencies installed without errors
- [ ] `node_modules` directory created
- [ ] No security vulnerabilities reported

## Functionality Tests

### Backend API Tests

#### Test 1: Health Check
```bash
curl http://localhost:8000/health
```
- [ ] Returns `{"status": "healthy"}`

#### Test 2: API Root
```bash
curl http://localhost:8000/
```
- [ ] Returns API information with version

#### Test 3: API Documentation
- [ ] http://localhost:8000/docs loads successfully
- [ ] Swagger UI displays all endpoints
- [ ] Shows POST /api/v1/jobs endpoint
- [ ] Shows GET /api/v1/jobs/{job_id} endpoint
- [ ] Shows GET /api/v1/jobs endpoint

#### Test 4: Create Job
```bash
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/facebook/react"}'
```
- [ ] Returns 201 status code
- [ ] Returns job object with ID
- [ ] Status is "pending"
- [ ] GitHub URL matches input

#### Test 5: Get Job
```bash
# Use the ID from Test 4
curl http://localhost:8000/api/v1/jobs/{JOB_ID}
```
- [ ] Returns 200 status code
- [ ] Returns correct job data
- [ ] All fields are present

#### Test 6: List Jobs
```bash
curl http://localhost:8000/api/v1/jobs
```
- [ ] Returns 200 status code
- [ ] Returns array of jobs
- [ ] Contains the job created in Test 4

#### Test 7: Duplicate URL
```bash
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/facebook/react"}'
```
- [ ] Returns 409 status code
- [ ] Error message indicates duplicate

#### Test 8: Invalid Job ID
```bash
curl http://localhost:8000/api/v1/jobs/00000000-0000-0000-0000-000000000000
```
- [ ] Returns 404 status code
- [ ] Error message indicates not found

### Frontend Tests

#### Test 1: Frontend Starts
```bash
cd frontend
npm run dev
```
- [ ] Development server starts on port 3000
- [ ] No compilation errors
- [ ] http://localhost:3000 loads successfully

#### Test 2: UI Elements
- [ ] Page title displays: "Codebase Documentation System"
- [ ] GitHub URL input field is visible
- [ ] Submit button is visible and enabled
- [ ] Form has proper styling

#### Test 3: Submit GitHub URL
- [ ] Enter `https://github.com/facebook/react`
- [ ] Click "Generate Documentation"
- [ ] Success message appears
- [ ] Job status component appears below

#### Test 4: Job Status Display
- [ ] Job ID is displayed
- [ ] GitHub URL is displayed
- [ ] Status badge shows "pending"
- [ ] Created/Updated timestamps are shown
- [ ] Status badge has proper styling

#### Test 5: Invalid URL
- [ ] Enter `not-a-url`
- [ ] Browser validates URL format
- [ ] Form doesn't submit

#### Test 6: Empty Form
- [ ] Submit button is disabled when empty
- [ ] Or shows validation error on submit

#### Test 7: Dark Mode
- [ ] Switch system to dark mode
- [ ] Page adapts to dark theme
- [ ] All text is readable

### Database Tests

#### Test 1: Access Database
```bash
docker-compose exec postgres psql -U codebase_user -d codebase_db
```
- [ ] Successfully connects to database

#### Test 2: Check Tables
```sql
\dt
```
- [ ] `jobs` table exists
- [ ] `alembic_version` table exists

#### Test 3: Check Jobs Table Structure
```sql
\d jobs
```
- [ ] Has `id` column (uuid)
- [ ] Has `github_url` column (varchar)
- [ ] Has `status` column (enum)
- [ ] Has `error_message` column (varchar)
- [ ] Has `created_at` column (timestamp)
- [ ] Has `updated_at` column (timestamp)

#### Test 4: Query Jobs
```sql
SELECT * FROM jobs;
```
- [ ] Shows jobs created via API
- [ ] All fields have correct data

### Docker Tests

#### Test 1: Container Status
```bash
docker-compose ps
```
- [ ] postgres: Up and healthy
- [ ] redis: Up and healthy
- [ ] backend: Up

#### Test 2: Container Logs
```bash
docker-compose logs backend
```
- [ ] No error messages
- [ ] Shows Uvicorn startup
- [ ] Shows application started

#### Test 3: PostgreSQL Logs
```bash
docker-compose logs postgres
```
- [ ] No error messages
- [ ] Database initialized successfully

#### Test 4: Redis Logs
```bash
docker-compose logs redis
```
- [ ] No error messages
- [ ] Ready to accept connections

### CORS Tests

#### Test 1: Frontend to Backend
- [ ] Frontend can call POST /api/v1/jobs
- [ ] Frontend can call GET /api/v1/jobs/{id}
- [ ] No CORS errors in browser console

#### Test 2: Browser Console
- [ ] Open browser DevTools (F12)
- [ ] Submit a job from frontend
- [ ] Check Network tab
- [ ] No CORS errors
- [ ] Request/Response show correct data

## Performance Tests

### Backend Response Time
- [ ] API responds in < 100ms for health check
- [ ] Job creation responds in < 500ms
- [ ] Job retrieval responds in < 100ms

### Frontend Load Time
- [ ] Page loads in < 2 seconds
- [ ] No console errors
- [ ] All styles load correctly

## Integration Tests

### End-to-End Flow
1. [ ] Start all services
2. [ ] Open frontend in browser
3. [ ] Submit a GitHub URL
4. [ ] See success message
5. [ ] See job status appear
6. [ ] Verify job in database
7. [ ] Check job via API
8. [ ] Submit same URL again
9. [ ] See error about duplicate
10. [ ] All steps work smoothly

## Cleanup Tests

### Stop Services
```bash
docker-compose down
```
- [ ] All containers stop
- [ ] No errors

### Restart Services
```bash
docker-compose up -d
```
- [ ] All containers start
- [ ] Jobs still exist in database
- [ ] API still works

### Full Cleanup
```bash
docker-compose down -v
```
- [ ] All containers removed
- [ ] All volumes removed

## Common Issues Checklist

If tests fail, check:

### Backend Issues
- [ ] Docker is running
- [ ] Port 8000 is not in use
- [ ] Port 5432 is not in use
- [ ] Port 6379 is not in use
- [ ] `.env` file exists and is correct
- [ ] Database migration ran successfully

### Frontend Issues
- [ ] Node.js is installed
- [ ] Port 3000 is not in use
- [ ] `node_modules` exists
- [ ] `.env.local` file exists
- [ ] `NEXT_PUBLIC_API_URL` points to http://localhost:8000

### Connection Issues
- [ ] Backend is running (check http://localhost:8000/health)
- [ ] No firewall blocking ports
- [ ] CORS_ORIGINS includes http://localhost:3000
- [ ] Browser is not blocking requests

## Final Verification

Once all checkboxes are complete:

- [ ] All backend tests pass
- [ ] All frontend tests pass
- [ ] All database tests pass
- [ ] All Docker tests pass
- [ ] End-to-end flow works
- [ ] Documentation is clear and helpful

## Success Criteria

Your setup is successful if:

1. ✅ Backend API is accessible and responsive
2. ✅ Frontend loads and displays correctly
3. ✅ Can create jobs via frontend
4. ✅ Can view job status in real-time
5. ✅ Database persists data correctly
6. ✅ All Docker services are healthy
7. ✅ No CORS errors
8. ✅ No console errors

## Next Steps After Verification

Once everything passes:

1. Read [GET_STARTED.md](GET_STARTED.md) for usage guide
2. Review [DEVELOPMENT.md](DEVELOPMENT.md) for dev workflows
3. Check [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) to understand the codebase
4. Start building Phase 2 features!

---

**Checklist Complete?** Congratulations! Your Phase 1 foundation is solid and ready for development.

**Issues Found?** Check the troubleshooting section in [README.md](README.md) or [DEVELOPMENT.md](DEVELOPMENT.md).
