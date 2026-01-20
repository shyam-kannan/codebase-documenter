# API Examples

This document contains example API requests and responses for testing the Codebase Documentation System.

## Base URL

```
http://localhost:8000
```

## Authentication

Phase 1 does not require authentication. Future phases may implement API keys or JWT tokens.

## Content Type

All requests should use:
```
Content-Type: application/json
```

---

## Core Endpoints

### 1. Health Check

Check if the API is running.

**Request:**
```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "healthy"
}
```

**Status Code:** `200 OK`

---

### 2. API Information

Get API version and information.

**Request:**
```bash
curl http://localhost:8000/
```

**Response:**
```json
{
  "message": "Codebase Documentation API",
  "version": "1.0.0",
  "docs": "/docs"
}
```

**Status Code:** `200 OK`

---

## Job Management Endpoints

### 3. Create New Job

Submit a GitHub repository URL for documentation generation.

**Request:**
```bash
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "github_url": "https://github.com/facebook/react"
  }'
```

**Request Body:**
```json
{
  "github_url": "https://github.com/facebook/react"
}
```

**Success Response:**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "github_url": "https://github.com/facebook/react",
  "status": "pending",
  "error_message": null,
  "created_at": "2024-01-19T12:00:00.000Z",
  "updated_at": "2024-01-19T12:00:00.000Z"
}
```

**Status Code:** `201 Created`

**Error Response (Duplicate URL):**
```json
{
  "detail": "Job already exists for this repository. Job ID: f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

**Status Code:** `409 Conflict`

**Error Response (Invalid Request):**
```json
{
  "detail": [
    {
      "loc": ["body", "github_url"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**Status Code:** `422 Unprocessable Entity`

---

### 4. Get Job by ID

Retrieve the status and details of a specific job.

**Request:**
```bash
curl http://localhost:8000/api/v1/jobs/f47ac10b-58cc-4372-a567-0e02b2c3d479
```

**Success Response:**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "github_url": "https://github.com/facebook/react",
  "status": "pending",
  "error_message": null,
  "created_at": "2024-01-19T12:00:00.000Z",
  "updated_at": "2024-01-19T12:00:00.000Z"
}
```

**Status Code:** `200 OK`

**Error Response (Not Found):**
```json
{
  "detail": "Job with ID f47ac10b-58cc-4372-a567-0e02b2c3d479 not found"
}
```

**Status Code:** `404 Not Found`

**Error Response (Invalid UUID):**
```json
{
  "detail": [
    {
      "loc": ["path", "job_id"],
      "msg": "value is not a valid uuid",
      "type": "type_error.uuid"
    }
  ]
}
```

**Status Code:** `422 Unprocessable Entity`

---

### 5. List All Jobs

Retrieve a list of all jobs with pagination.

**Request:**
```bash
# Default (first 100 jobs)
curl http://localhost:8000/api/v1/jobs

# With pagination
curl "http://localhost:8000/api/v1/jobs?skip=0&limit=10"
```

**Query Parameters:**
- `skip` (optional): Number of records to skip (default: 0)
- `limit` (optional): Maximum number of records to return (default: 100)

**Success Response:**
```json
[
  {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "github_url": "https://github.com/facebook/react",
    "status": "pending",
    "error_message": null,
    "created_at": "2024-01-19T12:00:00.000Z",
    "updated_at": "2024-01-19T12:00:00.000Z"
  },
  {
    "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    "github_url": "https://github.com/vercel/next.js",
    "status": "processing",
    "error_message": null,
    "created_at": "2024-01-19T11:30:00.000Z",
    "updated_at": "2024-01-19T11:35:00.000Z"
  },
  {
    "id": "b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e",
    "github_url": "https://github.com/microsoft/vscode",
    "status": "completed",
    "error_message": null,
    "created_at": "2024-01-19T11:00:00.000Z",
    "updated_at": "2024-01-19T11:25:00.000Z"
  },
  {
    "id": "c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f",
    "github_url": "https://github.com/invalid/repo",
    "status": "failed",
    "error_message": "Repository not found or access denied",
    "created_at": "2024-01-19T10:30:00.000Z",
    "updated_at": "2024-01-19T10:31:00.000Z"
  }
]
```

**Status Code:** `200 OK`

**Empty Response:**
```json
[]
```

**Status Code:** `200 OK`

---

## Job Status Values

Jobs can have one of four status values:

| Status | Description |
|--------|-------------|
| `pending` | Job created, waiting to be processed |
| `processing` | Job is currently being processed |
| `completed` | Job finished successfully |
| `failed` | Job failed with an error |

---

## Example Workflows

### Complete Job Creation and Monitoring

#### Step 1: Create a Job
```bash
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/pytorch/pytorch"}'
```

**Response:**
```json
{
  "id": "d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a",
  "github_url": "https://github.com/pytorch/pytorch",
  "status": "pending",
  "error_message": null,
  "created_at": "2024-01-19T13:00:00.000Z",
  "updated_at": "2024-01-19T13:00:00.000Z"
}
```

#### Step 2: Check Job Status
```bash
curl http://localhost:8000/api/v1/jobs/d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a
```

**Response (Still Pending):**
```json
{
  "id": "d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a",
  "github_url": "https://github.com/pytorch/pytorch",
  "status": "pending",
  "error_message": null,
  "created_at": "2024-01-19T13:00:00.000Z",
  "updated_at": "2024-01-19T13:00:00.000Z"
}
```

#### Step 3: Poll Until Complete
```bash
# Poll every 5 seconds
while true; do
  curl http://localhost:8000/api/v1/jobs/d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a
  sleep 5
done
```

---

## Using with JavaScript/TypeScript

### Create Job (Frontend Example)

```typescript
async function createJob(githubUrl: string) {
  const response = await fetch('http://localhost:8000/api/v1/jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ github_url: githubUrl }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create job');
  }

  return await response.json();
}

// Usage
try {
  const job = await createJob('https://github.com/facebook/react');
  console.log('Job created:', job.id);
} catch (error) {
  console.error('Error:', error.message);
}
```

### Get Job Status

```typescript
async function getJobStatus(jobId: string) {
  const response = await fetch(`http://localhost:8000/api/v1/jobs/${jobId}`);

  if (!response.ok) {
    throw new Error('Job not found');
  }

  return await response.json();
}

// Usage
const job = await getJobStatus('f47ac10b-58cc-4372-a567-0e02b2c3d479');
console.log('Status:', job.status);
```

### Poll Job Status

```typescript
async function pollJobStatus(jobId: string, interval = 5000) {
  return new Promise((resolve, reject) => {
    const poll = setInterval(async () => {
      try {
        const job = await getJobStatus(jobId);

        if (job.status === 'completed') {
          clearInterval(poll);
          resolve(job);
        } else if (job.status === 'failed') {
          clearInterval(poll);
          reject(new Error(job.error_message || 'Job failed'));
        }

        console.log('Current status:', job.status);
      } catch (error) {
        clearInterval(poll);
        reject(error);
      }
    }, interval);
  });
}

// Usage
try {
  const job = await pollJobStatus('f47ac10b-58cc-4372-a567-0e02b2c3d479');
  console.log('Job completed!', job);
} catch (error) {
  console.error('Job failed:', error.message);
}
```

---

## Using with Python

### Create Job

```python
import requests

def create_job(github_url):
    response = requests.post(
        'http://localhost:8000/api/v1/jobs',
        json={'github_url': github_url}
    )

    if response.status_code == 201:
        return response.json()
    else:
        raise Exception(f"Failed to create job: {response.text}")

# Usage
job = create_job('https://github.com/facebook/react')
print(f"Job created: {job['id']}")
```

### Get Job Status

```python
def get_job_status(job_id):
    response = requests.get(f'http://localhost:8000/api/v1/jobs/{job_id}')

    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Job not found: {job_id}")

# Usage
job = get_job_status('f47ac10b-58cc-4372-a567-0e02b2c3d479')
print(f"Status: {job['status']}")
```

### Poll Job Status

```python
import time

def poll_job_status(job_id, interval=5):
    while True:
        job = get_job_status(job_id)
        print(f"Current status: {job['status']}")

        if job['status'] == 'completed':
            return job
        elif job['status'] == 'failed':
            raise Exception(f"Job failed: {job['error_message']}")

        time.sleep(interval)

# Usage
try:
    job = poll_job_status('f47ac10b-58cc-4372-a567-0e02b2c3d479')
    print("Job completed successfully!")
except Exception as e:
    print(f"Error: {e}")
```

---

## Testing with Postman

### Import Collection

Create a new Postman collection with these requests:

1. **Health Check**
   - Method: GET
   - URL: `http://localhost:8000/health`

2. **Create Job**
   - Method: POST
   - URL: `http://localhost:8000/api/v1/jobs`
   - Body (JSON):
     ```json
     {
       "github_url": "https://github.com/facebook/react"
     }
     ```

3. **Get Job**
   - Method: GET
   - URL: `http://localhost:8000/api/v1/jobs/{{job_id}}`
   - Variable: Create a `job_id` variable from Step 2 response

4. **List Jobs**
   - Method: GET
   - URL: `http://localhost:8000/api/v1/jobs?skip=0&limit=10`

---

## Error Codes Reference

| Status Code | Meaning | Common Causes |
|------------|---------|---------------|
| 200 | OK | Request successful |
| 201 | Created | Job created successfully |
| 404 | Not Found | Job ID doesn't exist |
| 409 | Conflict | Duplicate GitHub URL |
| 422 | Unprocessable Entity | Invalid request data |
| 500 | Internal Server Error | Server-side error |

---

## Response Time Benchmarks

Expected response times (approximate):

- Health Check: < 50ms
- Create Job: < 200ms
- Get Job: < 100ms
- List Jobs: < 150ms

---

## Rate Limiting

Phase 1 does not implement rate limiting. Future phases may add:
- Per-IP rate limits
- Per-user rate limits (with authentication)
- Job creation limits

---

## Next Steps

Once Phase 2 is implemented, additional endpoints will include:

- `PATCH /api/v1/jobs/{job_id}` - Update job status
- `DELETE /api/v1/jobs/{job_id}` - Delete job
- `GET /api/v1/jobs/{job_id}/documentation` - Get generated documentation
- `GET /api/v1/jobs/{job_id}/files` - List repository files
- `POST /api/v1/jobs/{job_id}/regenerate` - Regenerate documentation

---

For interactive API documentation, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
