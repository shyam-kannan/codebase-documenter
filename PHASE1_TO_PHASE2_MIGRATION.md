# Migrating from Phase 1 to Phase 2

Quick guide to upgrade your Phase 1 installation to Phase 2 with AI documentation capabilities.

## What's Changed

### New Services
- **Celery Worker**: Background job processor
- **Shared Volumes**: For cloned repos and generated docs

### New Dependencies
- `celery==5.3.6` - Task queue
- `gitpython==3.1.40` - Git operations
- `anthropic==0.40.0` - Claude API
- `langgraph==0.2.59` - Workflow orchestration
- `langchain-core==0.3.29` - LangChain core
- `langchain-anthropic==0.3.9` - Anthropic integration

### Modified Files
- `backend/requirements.txt` - Added new dependencies
- `backend/app/core/config.py` - Added ANTHROPIC_API_KEY
- `backend/app/api/v1/jobs.py` - Queue Celery tasks
- `docker-compose.yml` - Added Celery worker service
- `.env.example` - Added ANTHROPIC_API_KEY

### New Files (15 total)
- Agent tools (4 files in `backend/app/tools/`)
- LangGraph agent (2 files in `backend/app/agents/`)
- Celery tasks (2 files in `backend/app/tasks/`)
- Celery config (1 file)
- Documentation (3 files)

## Migration Steps (5 Minutes)

### Step 1: Backup Your Data (Optional)

```bash
# Backup your database
docker-compose exec -T postgres pg_dump -U codebase_user codebase_db > backup.sql

# Or just note your existing jobs
docker-compose exec postgres psql -U codebase_user -d codebase_db \
  -c "SELECT COUNT(*) FROM jobs;"
```

### Step 2: Stop Phase 1 Services

```bash
# Stop all running services
docker-compose down

# Your database data is preserved in the postgres_data volume
```

### Step 3: Get Your Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to "API Keys"
4. Create a new key
5. Copy the key (starts with `sk-ant-api03-`)

### Step 4: Update Environment File

```bash
# Edit your .env file
nano .env  # or use your preferred editor

# Add the following line:
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here

# Save and exit
```

Your `.env` should now include:

```bash
# Existing Phase 1 variables
DATABASE_URL=postgresql://codebase_user:codebase_password@postgres:5432/codebase_db
POSTGRES_USER=codebase_user
POSTGRES_PASSWORD=codebase_password
POSTGRES_DB=codebase_db
REDIS_URL=redis://redis:6379/0
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
BACKEND_RELOAD=true
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:8000

# NEW: Phase 2 variable
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
```

### Step 5: Pull Phase 2 Code

If you're using git:

```bash
# Pull latest changes
git pull origin main

# Or if you have the Phase 2 files in a different location,
# copy them to your project directory
```

If you created Phase 1 manually, ensure you have all the new Phase 2 files:
- All files in `backend/app/tools/`
- All files in `backend/app/agents/`
- All files in `backend/app/tasks/`
- Updated `backend/app/celery_app.py`
- Updated files mentioned above

### Step 6: Rebuild and Start Services

```bash
# Rebuild containers with new dependencies
docker-compose up -d --build

# This will:
# - Install new Python packages
# - Start PostgreSQL (with existing data)
# - Start Redis
# - Start Backend API
# - Start NEW Celery Worker

# Wait 30 seconds for everything to initialize
sleep 30
```

### Step 7: Verify Migration

```bash
# Check all 4 services are running
docker-compose ps

# Expected output:
# codebase_postgres        Up (healthy)
# codebase_redis           Up (healthy)
# codebase_backend         Up
# codebase_celery_worker   Up

# Check Celery worker connected to Redis
docker-compose logs celery_worker | grep "Connected to redis"

# Verify API key is set
docker-compose exec backend env | grep ANTHROPIC_API_KEY

# Test API is still working
curl http://localhost:8000/health
```

### Step 8: Test Phase 2 Functionality

```bash
# Submit a test job
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/anthropics/anthropic-sdk-python"}'

# Save the job ID from the response

# Watch the Celery worker process it
docker-compose logs -f celery_worker

# After 30-60 seconds, check status
curl http://localhost:8000/api/v1/jobs/{JOB_ID}

# Status should be "completed"
```

## Verify Your Existing Data

Your Phase 1 jobs should still be in the database:

```bash
# Check existing jobs
docker-compose exec postgres psql -U codebase_user -d codebase_db \
  -c "SELECT id, github_url, status FROM jobs ORDER BY created_at DESC LIMIT 5;"

# Count jobs by status
docker-compose exec postgres psql -U codebase_user -d codebase_db \
  -c "SELECT status, COUNT(*) FROM jobs GROUP BY status;"
```

All your Phase 1 jobs will remain in "pending" status since they weren't processed. This is expected - Phase 2 will process new jobs with AI documentation.

## Rollback (If Needed)

If something goes wrong, you can rollback:

```bash
# Stop Phase 2 services
docker-compose down

# Restore from backup (if you made one)
docker-compose up -d postgres
docker-compose exec -T postgres psql -U codebase_user -d codebase_db < backup.sql

# Or just revert code changes
git checkout HEAD~1  # Go back one commit

# Start Phase 1 again
docker-compose up -d
```

## Common Migration Issues

### Issue: Celery worker fails to start

**Cause**: Missing API key or Redis connection issue

**Solution**:
```bash
# Check logs
docker-compose logs celery_worker

# Verify API key
docker-compose exec backend env | grep ANTHROPIC

# Restart worker
docker-compose restart celery_worker
```

### Issue: Build fails with dependency errors

**Cause**: Docker cache or package conflicts

**Solution**:
```bash
# Clean rebuild
docker-compose down
docker-compose build --no-cache backend
docker-compose up -d
```

### Issue: Jobs stuck in pending

**Cause**: Worker not picking up tasks

**Solution**:
```bash
# Check worker is running
docker-compose ps celery_worker

# Check Redis queue
docker-compose exec redis redis-cli LLEN celery

# Restart worker
docker-compose restart celery_worker
```

### Issue: API key invalid

**Cause**: Wrong key or typo

**Solution**:
```bash
# Double-check your API key
# It should start with: sk-ant-api03-

# Update .env file
nano .env

# Restart services
docker-compose restart backend celery_worker
```

## Differences in Behavior

### Phase 1 → Phase 2 Changes

| Aspect | Phase 1 | Phase 2 |
|--------|---------|---------|
| Job Creation | Instant (DB only) | Instant + Task queued |
| Job Processing | None | Background worker |
| Status Updates | Manual | Automatic (pending→processing→completed) |
| Documentation | None | AI-generated |
| Time | Instant | 30s - 5min |
| Cost | Free | ~$0.05-0.15 per job |

### API Changes

**No breaking changes!** All Phase 1 endpoints work exactly the same.

The only difference:
- Phase 1: Creating a job just saves to DB
- Phase 2: Creating a job saves to DB **and** queues background task

Your frontend code requires **no changes**.

## Testing After Migration

Run through this checklist:

- [ ] All 4 services running (`docker-compose ps`)
- [ ] Backend health check passes (`curl http://localhost:8000/health`)
- [ ] Can create new jobs via API
- [ ] Celery worker picks up jobs
- [ ] Jobs transition: pending → processing → completed
- [ ] Generated documentation exists (`/tmp/docs/{job_id}.md`)
- [ ] Frontend still works (`http://localhost:3000`)
- [ ] Previous jobs still visible in database
- [ ] No error messages in logs

## Cost Management

Phase 2 uses Claude API, which costs money. Here's how to manage costs during testing:

1. **Start Small**: Test with small repositories first
2. **Monitor Usage**: Check https://console.anthropic.com/
3. **Set Budget**: Set spending limits in Anthropic console
4. **Estimate First**: 1 job ≈ $0.05-0.15

Example costs:
- 10 test jobs: ~$0.50-1.50
- 100 jobs: ~$5-15
- 1000 jobs: ~$50-150

## What's Next

Now that you have Phase 2 running:

1. **Read the docs**: Check out [PHASE2_SUMMARY.md](PHASE2_SUMMARY.md)
2. **Try examples**: Test with various repositories
3. **Monitor costs**: Keep an eye on API usage
4. **Explore features**: Check generated documentation quality
5. **Plan Phase 3**: Think about what you want next!

## Getting Help

If you run into issues:

1. **Check logs**: `docker-compose logs -f`
2. **Review docs**: See [PHASE2_SUMMARY.md](PHASE2_SUMMARY.md)
3. **Run tests**: Follow [PHASE2_TESTING.md](PHASE2_TESTING.md)
4. **Verify setup**: Use [PHASE2_QUICKSTART.md](PHASE2_QUICKSTART.md)

## Summary

Migration is straightforward:

1. ✅ Stop Phase 1
2. ✅ Add ANTHROPIC_API_KEY to .env
3. ✅ Pull Phase 2 code
4. ✅ Run `docker-compose up -d --build`
5. ✅ Test with a repository

Total time: **5 minutes** ⏱️

---

**Welcome to Phase 2!** 🎉

Your system can now generate intelligent, AI-powered documentation! 🚀
