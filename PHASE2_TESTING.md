# Phase 2 Testing Guide

Comprehensive testing checklist for the AI documentation agent.

## Pre-Test Setup

### 1. Verify Environment

```bash
# Check .env has API key
cat .env | grep ANTHROPIC_API_KEY

# Should show: ANTHROPIC_API_KEY=sk-ant-api03-...
```

### 2. Start All Services

```bash
# Stop and rebuild
docker-compose down
docker-compose up -d --build

# Wait for services to be healthy (30 seconds)
sleep 30

# Verify all services
docker-compose ps
```

Expected output:
```
codebase_postgres        healthy
codebase_redis           healthy
codebase_backend         running
codebase_celery_worker   running
```

## Test Suite

### Test 1: Celery Worker Connection ✓

**Purpose**: Verify Celery worker can connect to Redis.

```bash
# Check worker logs
docker-compose logs celery_worker | grep "Connected to redis"

# Expected: Should see connection messages
```

**Success Criteria**: No connection errors in logs.

---

### Test 2: API Key Validation ✓

**Purpose**: Verify Anthropic API key is valid.

```bash
# Test API key
docker-compose exec backend python << EOF
from app.core.config import settings
from anthropic import Anthropic

print(f"API Key configured: {'Yes' if settings.ANTHROPIC_API_KEY else 'No'}")
print(f"API Key length: {len(settings.ANTHROPIC_API_KEY)}")

try:
    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    print("✓ API key is valid")
except Exception as e:
    print(f"✗ API key error: {e}")
EOF
```

**Success Criteria**: Prints "✓ API key is valid"

---

### Test 3: Repository Clone ✓

**Purpose**: Test git clone functionality.

```bash
# Test clone tool
docker-compose exec celery_worker python << EOF
from app.tools.clone_repository import clone_repository
import shutil

result = clone_repository(
    "https://github.com/anthropics/anthropic-sdk-python",
    "test-clone"
)

print(f"Success: {result['success']}")
print(f"Path: {result.get('repo_path')}")
print(f"Branch: {result.get('metadata', {}).get('branch')}")
print(f"Error: {result.get('error')}")

# Cleanup
if result['success']:
    shutil.rmtree(result['repo_path'])
EOF
```

**Success Criteria**:
- `Success: True`
- Path exists
- Branch is "main" or "master"
- No error

---

### Test 4: File Scanner ✓

**Purpose**: Test directory scanning.

```bash
# First clone a repo
docker-compose exec celery_worker git clone --depth 1 \
  https://github.com/anthropics/anthropic-sdk-python /tmp/test-scan

# Then scan it
docker-compose exec celery_worker python << EOF
from app.tools.file_scanner import scan_directory

result = scan_directory("/tmp/test-scan")

print(f"Success: {result['success']}")
print(f"Total files: {result.get('stats', {}).get('total_files')}")
print(f"Code files: {result.get('stats', {}).get('code_files')}")
print(f"Error: {result.get('error')}")
EOF

# Cleanup
docker-compose exec celery_worker rm -rf /tmp/test-scan
```

**Success Criteria**:
- `Success: True`
- Total files > 0
- Code files > 0
- No error

---

### Test 5: Code Analyzer ✓

**Purpose**: Test Python code analysis.

```bash
# Create a test Python file
docker-compose exec celery_worker bash << 'EOF'
cat > /tmp/test_analysis.py << 'PYTHON'
"""Test module for analysis."""

import os
from typing import List

class TestClass:
    """A test class."""

    def method_one(self, arg1: str) -> None:
        """Test method."""
        pass

def test_function(x: int, y: int) -> int:
    """Add two numbers."""
    return x + y

PYTHON
EOF

# Analyze it
docker-compose exec celery_worker python << EOF
from app.tools.code_analyzer import analyze_code_file

result = analyze_code_file("/tmp/test_analysis.py")

print(f"Success: {result['success']}")
print(f"Language: {result.get('language')}")
print(f"Classes: {[c['name'] for c in result.get('classes', [])]}")
print(f"Functions: {[f['name'] for f in result.get('functions', [])]}")
print(f"Imports: {len(result.get('imports', []))}")
EOF

# Cleanup
docker-compose exec celery_worker rm /tmp/test_analysis.py
```

**Success Criteria**:
- `Success: True`
- Language is "python"
- Classes includes "TestClass"
- Functions includes "test_function"
- Imports count > 0

---

### Test 6: Documentation Generator ✓

**Purpose**: Test Claude API integration.

```bash
# Test doc generation with minimal data
docker-compose exec backend python << EOF
from app.tools.doc_generator import generate_documentation

file_tree = {
    "name": "test-repo",
    "type": "directory",
    "children": [
        {"name": "README.md", "type": "file", "size": 100}
    ]
}

stats = {
    "total_files": 1,
    "code_files": 0,
    "doc_files": 1
}

code_analysis = {"files": []}

result = generate_documentation(
    repo_name="test-repo",
    file_tree=file_tree,
    stats=stats,
    code_analysis=code_analysis,
    readme_content="Test repository"
)

print(f"Success: {result['success']}")
print(f"Doc length: {len(result.get('documentation', ''))}")
print(f"Input tokens: {result.get('usage', {}).get('input_tokens')}")
print(f"Output tokens: {result.get('usage', {}).get('output_tokens')}")
print(f"Error: {result.get('error')}")
EOF
```

**Success Criteria**:
- `Success: True`
- Doc length > 0
- Token counts present
- No error

---

### Test 7: LangGraph Agent ✓

**Purpose**: Test the full workflow.

**⚠️ Warning**: This test makes real API calls and costs money (~$0.10).

```bash
# Create a test job first
JOB_ID=$(curl -s -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/anthropics/anthropic-sdk-python"}' \
  | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

echo "Job ID: $JOB_ID"

# Wait for completion (30-120 seconds)
echo "Waiting for job to complete..."
for i in {1..30}; do
  STATUS=$(curl -s http://localhost:8000/api/v1/jobs/$JOB_ID | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  echo "Attempt $i: Status = $STATUS"

  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    break
  fi

  sleep 5
done

# Check final status
curl -s http://localhost:8000/api/v1/jobs/$JOB_ID | python -m json.tool

# View generated documentation
docker-compose exec celery_worker cat /tmp/docs/$JOB_ID.md | head -50
```

**Success Criteria**:
- Final status is "completed"
- No error_message
- Documentation file exists
- Documentation contains structured markdown

---

### Test 8: End-to-End API Test ✓

**Purpose**: Test the complete API flow.

```bash
# 1. Submit job
echo "=== Submitting Job ==="
RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/pallets/click"}')

echo "$RESPONSE" | python -m json.tool

JOB_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo -e "\nJob ID: $JOB_ID"

# 2. Wait and poll status
echo -e "\n=== Polling Status ==="
for i in {1..20}; do
  sleep 5
  STATUS_RESPONSE=$(curl -s http://localhost:8000/api/v1/jobs/$JOB_ID)
  STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

  echo "[$i] Status: $STATUS"

  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    echo -e "\n=== Final Result ==="
    echo "$STATUS_RESPONSE" | python -m json.tool
    break
  fi
done

# 3. List all jobs
echo -e "\n=== All Jobs ==="
curl -s http://localhost:8000/api/v1/jobs | python -m json.tool | head -20
```

**Success Criteria**:
- Job created successfully
- Status transitions: pending → processing → completed
- Final status is "completed"
- No error_message

---

### Test 9: Error Handling ✓

**Purpose**: Test error scenarios.

**Test 9a: Invalid Repository URL**

```bash
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/invalid/nonexistent-repo-12345"}' \
  -s | python -m json.tool

# Get job ID and wait
JOB_ID=$(curl -s -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/invalid/nonexistent-repo-12345"}' \
  | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

# Wait for failure (should be quick)
sleep 30

# Check status
curl -s http://localhost:8000/api/v1/jobs/$JOB_ID | python -m json.tool
```

**Success Criteria**:
- Status is "failed"
- error_message contains "Repository not found" or similar

**Test 9b: Duplicate Job**

```bash
# Submit same URL twice
URL="https://github.com/pallets/flask"

echo "First submission:"
curl -s -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d "{\"github_url\": \"$URL\"}" | python -m json.tool

echo -e "\nSecond submission (should fail):"
curl -s -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d "{\"github_url\": \"$URL\"}" | python -m json.tool
```

**Success Criteria**:
- First returns 201 Created
- Second returns 409 Conflict
- Error message mentions existing job

---

### Test 10: Concurrent Jobs ✓

**Purpose**: Test multiple jobs in parallel.

```bash
# Submit 3 jobs at once
echo "Submitting 3 concurrent jobs..."

JOB1=$(curl -s -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/requests/requests"}' \
  | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

JOB2=$(curl -s -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/psf/black"}' \
  | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

JOB3=$(curl -s -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/pytest-dev/pytest"}' \
  | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

echo "Job 1: $JOB1"
echo "Job 2: $JOB2"
echo "Job 3: $JOB3"

# Monitor progress
echo -e "\nMonitoring progress..."
for i in {1..30}; do
  sleep 5
  S1=$(curl -s http://localhost:8000/api/v1/jobs/$JOB1 | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  S2=$(curl -s http://localhost:8000/api/v1/jobs/$JOB2 | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  S3=$(curl -s http://localhost:8000/api/v1/jobs/$JOB3 | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

  echo "[$i] Job1: $S1 | Job2: $S2 | Job3: $S3"

  if [ "$S1" != "pending" ] && [ "$S1" != "processing" ] &&
     [ "$S2" != "pending" ] && [ "$S2" != "processing" ] &&
     [ "$S3" != "pending" ] && [ "$S3" != "processing" ]; then
    echo "All jobs completed!"
    break
  fi
done
```

**Success Criteria**:
- All 3 jobs eventually complete
- With concurrency=2, jobs are processed 2 at a time
- No jobs fail due to resource contention

---

### Test 11: Frontend Integration ✓

**Purpose**: Test frontend can submit and display jobs.

**Manual Test:**

1. Start frontend: `cd frontend && npm run dev`
2. Open http://localhost:3000
3. Submit: `https://github.com/anthropics/anthropic-sdk-python`
4. Verify:
   - ✓ Form submits successfully
   - ✓ Job status appears
   - ✓ Status updates automatically
   - ✓ Final status shows "Completed"

---

### Test 12: Performance Test ✓

**Purpose**: Measure processing time and resource usage.

```bash
# Submit a medium-sized repo
START=$(date +%s)

JOB_ID=$(curl -s -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/pallets/flask"}' \
  | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

echo "Job ID: $JOB_ID"
echo "Start time: $(date)"

# Wait for completion
while true; do
  STATUS=$(curl -s http://localhost:8000/api/v1/jobs/$JOB_ID | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    END=$(date +%s)
    DURATION=$((END - START))
    echo "End time: $(date)"
    echo "Duration: ${DURATION} seconds"
    break
  fi

  sleep 5
done

# Check resource usage
echo -e "\n=== Resource Usage ==="
docker stats --no-stream codebase_celery_worker
```

**Success Criteria**:
- Completes in < 5 minutes
- Memory usage < 2GB
- CPU usage reasonable

---

## Test Summary

Run all tests:

```bash
# Create a test script
cat > run_all_tests.sh << 'EOF'
#!/bin/bash

echo "======================================"
echo "Phase 2 Automated Test Suite"
echo "======================================"

# Test 1: Worker Connection
echo -e "\n[TEST 1] Celery Worker Connection"
docker-compose logs celery_worker | grep -q "Connected to redis" && echo "✓ PASS" || echo "✗ FAIL"

# Test 2: API Key
echo -e "\n[TEST 2] API Key Validation"
docker-compose exec -T backend python -c "from anthropic import Anthropic; Anthropic(); print('✓ PASS')" 2>&1 | grep -q "PASS" && echo "✓ PASS" || echo "✗ FAIL"

# Test 3: Health Check
echo -e "\n[TEST 3] API Health Check"
curl -s http://localhost:8000/health | grep -q "healthy" && echo "✓ PASS" || echo "✗ FAIL"

# Add more automated tests here...

echo -e "\n======================================"
echo "Test Suite Complete"
echo "======================================"
EOF

chmod +x run_all_tests.sh
./run_all_tests.sh
```

## Debugging Failed Tests

### Common Issues

**Issue**: Celery worker not starting

```bash
# Check logs
docker-compose logs celery_worker

# Common fixes:
docker-compose restart celery_worker
docker-compose up -d --build celery_worker
```

**Issue**: API key errors

```bash
# Verify API key
docker-compose exec backend env | grep ANTHROPIC

# Re-add to .env
echo "ANTHROPIC_API_KEY=your-key-here" >> .env
docker-compose restart backend celery_worker
```

**Issue**: Jobs stuck in pending

```bash
# Check worker is running
docker-compose ps celery_worker

# Check Redis connection
docker-compose logs celery_worker | grep "Connected to redis"

# Restart worker
docker-compose restart celery_worker
```

## Success Criteria Summary

Phase 2 is working correctly when:

- ✅ All 4 services are running
- ✅ API key is valid
- ✅ Repository clones successfully
- ✅ Files are scanned correctly
- ✅ Code is analyzed (Python/JS)
- ✅ Claude generates documentation
- ✅ Jobs complete end-to-end
- ✅ Errors are handled gracefully
- ✅ Concurrent jobs work
- ✅ Frontend integration works

## Next Steps

Once all tests pass:

1. Try different repositories
2. Monitor costs in Anthropic console
3. Optimize for your use case
4. Build Phase 3 features!

---

**Happy Testing!** 🧪
