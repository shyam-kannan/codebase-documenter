# Phase 2 Quick Start Guide

Get your AI documentation system running in 5 minutes!

## Prerequisites

- ✅ Phase 1 is set up and working
- ✅ Docker and Docker Compose installed
- ✅ Anthropic API key (get one at https://console.anthropic.com/)

## Setup (5 Minutes)

### Step 1: Add API Key (1 min)

```bash
# Open .env file
nano .env

# Add your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here

# Save and exit (Ctrl+X, Y, Enter)
```

### Step 2: Rebuild Services (3 min)

```bash
# Stop existing services
docker-compose down

# Rebuild with new dependencies
docker-compose up -d --build

# This will:
# - Install Celery, GitPython, Anthropic, LangGraph
# - Start Celery worker
# - Create shared volumes
```

### Step 3: Verify (1 min)

```bash
# Check all services are running
docker-compose ps

# You should see 4 services:
# ✓ codebase_postgres (healthy)
# ✓ codebase_redis (healthy)
# ✓ codebase_backend (running)
# ✓ codebase_celery_worker (running)
```

## Test It Out

### Quick Test

```bash
# Submit a small repository
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/anthropics/anthropic-sdk-python"}'

# Copy the job ID from response
# Example: "id": "abc-123-def-456"
```

### Watch Progress

```bash
# Terminal 1: Watch Celery worker logs
docker-compose logs -f celery_worker

# Terminal 2: Check job status
curl http://localhost:8000/api/v1/jobs/{JOB_ID}
```

You'll see the status change:
1. `"pending"` - Job created
2. `"processing"` - Worker started
3. `"completed"` - Documentation generated!

### View Documentation

```bash
# Access the worker container
docker-compose exec celery_worker bash

# View generated documentation
cat /tmp/docs/{JOB_ID}.md

# Exit container
exit
```

## Using the Frontend

### Start Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:3000

### Submit a Job

1. Enter GitHub URL: `https://github.com/anthropics/anthropic-sdk-python`
2. Click "Generate Documentation"
3. Watch the status update in real-time!

## What Happens Behind the Scenes

```
1. Clone Repository
   ↓
2. Scan Files (finds 150 files)
   ↓
3. Analyze Code (extracts classes, functions)
   ↓
4. Generate Docs (Claude AI writes documentation)
   ↓
5. Save Results (/tmp/docs/{job_id}.md)
   ↓
6. Cleanup (removes cloned repo)
```

Total time: 30 seconds - 2 minutes depending on repo size.

## Example Repositories to Try

### Small & Fast (30-60 seconds)
- `https://github.com/anthropics/anthropic-sdk-python`
- `https://github.com/pallets/click`
- `https://github.com/kennethreitz/requests`

### Medium (1-2 minutes)
- `https://github.com/psf/requests`
- `https://github.com/pallets/flask`
- `https://github.com/encode/httpx`

### Large (2-5 minutes)
- `https://github.com/django/django`
- `https://github.com/pytorch/pytorch`
- `https://github.com/microsoft/vscode`

## Monitoring

### View Logs

```bash
# Celery worker (shows full workflow)
docker-compose logs -f celery_worker

# Backend API
docker-compose logs -f backend

# All services
docker-compose logs -f
```

### Check Queue

```bash
# Access Redis
docker-compose exec redis redis-cli

# See pending jobs
LLEN celery

# Exit Redis
exit
```

### Database Queries

```bash
# Access database
docker-compose exec postgres psql -U codebase_user -d codebase_db

# Check recent jobs
SELECT id, status, created_at FROM jobs ORDER BY created_at DESC LIMIT 5;

# Count by status
SELECT status, COUNT(*) FROM jobs GROUP BY status;

# Exit database
\q
```

## Troubleshooting

### Celery Worker Not Running

```bash
# Check logs
docker-compose logs celery_worker

# Restart worker
docker-compose restart celery_worker
```

### API Key Error

```bash
# Verify API key is set
docker-compose exec backend env | grep ANTHROPIC

# Test API key
docker-compose exec backend python -c "
from anthropic import Anthropic
client = Anthropic()
print('API key is valid!')
"
```

### Job Stuck in Pending

```bash
# Check worker is processing
docker-compose logs celery_worker | grep "Task document_repository"

# Restart worker
docker-compose restart celery_worker
```

### Clone Failed

Common causes:
- **Private repo**: System only supports public repos
- **Invalid URL**: Check URL format
- **Network issue**: Check internet connection

```bash
# Test git clone manually
docker-compose exec celery_worker git clone --depth 1 https://github.com/owner/repo /tmp/test
```

## Configuration

### Adjust Worker Concurrency

Edit `docker-compose.yml`:

```yaml
celery_worker:
  command: celery -A app.celery_app worker --loglevel=info --concurrency=4
  # Change concurrency=2 to concurrency=4 for more parallel jobs
```

### Adjust Timeouts

Edit `backend/app/celery_app.py`:

```python
celery_app.conf.update(
    task_time_limit=7200,       # 2 hours instead of 1
    task_soft_time_limit=6600,  # 1h 50m soft limit
)
```

### Change Log Level

```yaml
celery_worker:
  command: celery -A app.celery_app worker --loglevel=debug
  # Change info to debug for more detailed logs
```

## API Usage

### Create Job

```bash
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/owner/repo"}'
```

**Response:**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "github_url": "https://github.com/owner/repo",
  "status": "pending",
  "error_message": null,
  "created_at": "2024-01-19T12:00:00Z",
  "updated_at": "2024-01-19T12:00:00Z"
}
```

### Check Status

```bash
curl http://localhost:8000/api/v1/jobs/f47ac10b-58cc-4372-a567-0e02b2c3d479
```

**Status Values:**
- `pending` - Queued, waiting for worker
- `processing` - Worker is generating documentation
- `completed` - Documentation ready!
- `failed` - Error occurred (check error_message)

## Performance Tips

### For Faster Processing

1. **Small repos**: Complete in 30-60 seconds
2. **Increase concurrency**: More workers = more parallel jobs
3. **Use SSD**: Faster cloning and file operations

### For Better Quality

1. **Well-documented repos**: Claude generates better docs
2. **Python/JS repos**: Better code analysis
3. **Recent commits**: Latest code analyzed

## Cost Management

### Estimate Costs

Each job uses:
- Input tokens: 3,000-8,000
- Output tokens: 2,000-5,000
- Cost: ~$0.05-0.15 per job

### Monitor Usage

Check Anthropic console: https://console.anthropic.com/

### Reduce Costs

1. Test with small repos first
2. Set up rate limiting (Phase 3)
3. Cache results for re-runs

## Next Steps

✅ Phase 2 is working! Now you can:

1. **Explore Generated Docs**: Check `/tmp/docs/` for output
2. **Try Different Repos**: Test with various languages
3. **Build Frontend Viewer**: Display docs in web UI (Phase 3)
4. **Add S3 Storage**: Persistent storage (Phase 3)
5. **Monitor Metrics**: Track success rates and costs

## Resources

- **Phase 2 Details**: See [PHASE2_SUMMARY.md](PHASE2_SUMMARY.md)
- **API Documentation**: http://localhost:8000/docs
- **Claude API Docs**: https://docs.anthropic.com/
- **LangGraph Docs**: https://langchain-ai.github.io/langgraph/

## Support

Having issues?

1. Check logs: `docker-compose logs -f`
2. Review [PHASE2_SUMMARY.md](PHASE2_SUMMARY.md) troubleshooting section
3. Verify all services are healthy: `docker-compose ps`

---

**🎉 You're ready to generate AI-powered documentation!**

Start with a small repo and watch the magic happen! 🚀
