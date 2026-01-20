# Phase 3 Complete - S3 Storage & Documentation Viewer

## Overview

Phase 3 adds cloud storage for generated documentation using Amazon S3 and a beautiful documentation viewer in the frontend. Generated documentation is now automatically uploaded to S3 and accessible via public URLs, with a convenient "View Documentation" button in the UI.

## What's New in Phase 3

### ☁️ S3 Cloud Storage
- **Automatic Upload**: Documentation uploaded to S3 after generation
- **Public URLs**: Each job gets a persistent, shareable documentation URL
- **Local Backup**: Files still saved locally to `/tmp/docs/` as backup
- **Graceful Fallback**: System works even without S3 configuration

### 🎨 Documentation Viewer
- **View Button**: Beautiful button to open documentation in new tab
- **Direct Access**: Click to instantly view generated markdown
- **URL Display**: Shows the S3 URL below the button
- **Responsive Design**: Works on all screen sizes

### 🔒 Configuration Management
- **AWS Credentials**: Secure environment-based configuration
- **S3 Bucket Setup**: Configurable bucket name and region
- **Health Checks**: Automatic validation of S3 configuration

## Files Created & Modified

### New Files (2)

1. **[backend/app/core/s3.py](backend/app/core/s3.py)** - S3 integration module
   - `upload_to_s3()` - Upload documentation with public-read ACL
   - `delete_from_s3()` - Delete documentation
   - `check_s3_configuration()` - Validate AWS setup
   - `get_s3_url()` - Generate S3 URLs

2. **[backend/alembic/versions/002_add_documentation_url.py](backend/alembic/versions/002_add_documentation_url.py)** - Database migration
   - Adds `documentation_url` column to jobs table

### Modified Files (8)

1. **[backend/requirements.txt](backend/requirements.txt)** - Added boto3==1.35.86

2. **[backend/app/core/config.py](backend/app/core/config.py)** - Added AWS settings:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `S3_BUCKET_NAME`
   - `AWS_REGION`

3. **[backend/app/models/job.py](backend/app/models/job.py)** - Added `documentation_url` field

4. **[backend/app/schemas/job.py](backend/app/schemas/job.py)** - Added `documentation_url` to `JobResponse`

5. **[backend/app/agents/documentation_agent.py](backend/app/agents/documentation_agent.py)**:
   - Import S3 functions
   - Add `documentation_url` to state
   - Upload to S3 in `_save_step()`
   - Return URL in result

6. **[backend/app/tasks/document_repo.py](backend/app/tasks/document_repo.py)**:
   - Save `documentation_url` to database
   - Log S3 URL when available

7. **[frontend/src/components/JobStatus.tsx](frontend/src/components/JobStatus.tsx)**:
   - Add `documentation_url` to Job interface
   - Show "View Documentation" button when completed
   - Display S3 URL
   - Beautiful icon and styling

8. **[.env.example](.env.example)** - Added AWS environment variables

9. **[docker-compose.yml](docker-compose.yml)** - Added AWS env vars to backend and celery worker

## Architecture

### Updated Workflow

```
1. Clone Repository
   ↓
2. Scan Files
   ↓
3. Analyze Code
   ↓
4. Generate Documentation (Claude AI)
   ↓
5. Save Step:
   ├─ Save to /tmp/docs/{job_id}.md (local backup)
   ├─ Upload to S3 ← NEW!
   └─ Store S3 URL in database ← NEW!
   ↓
6. Cleanup
   ↓
7. Frontend displays "View Documentation" button ← NEW!
```

### S3 Upload Flow

```python
# In documentation_agent.py _save_step()

1. Save locally to /tmp/docs/{job_id}.md
   ↓
2. Check if S3 is configured
   ↓
3. If configured:
   ├─ Upload file to S3
   ├─ Set ContentType='text/markdown'
   ├─ Set ACL='public-read'
   └─ Get public URL
   ↓
4. Store URL in state["documentation_url"]
   ↓
5. Return URL to task
   ↓
6. Task saves URL to job.documentation_url
   ↓
7. Frontend fetches job and displays button
```

## S3 Integration Details

### Upload Function

```python
def upload_to_s3(file_path: str, job_id: str) -> Optional[str]:
    """Upload documentation to S3 and return public URL."""

    # S3 object key
    object_key = f"docs/{job_id}.md"

    # Upload with settings
    s3_client.put_object(
        Bucket=settings.S3_BUCKET_NAME,
        Key=object_key,
        Body=file_data,
        ContentType='text/markdown',    # Proper content type
        ACL='public-read',              # Public access
        CacheControl='max-age=3600',    # 1 hour cache
        Metadata={
            'job-id': job_id,
            'content-type': 'documentation'
        }
    )

    # Return public URL
    return f"https://{bucket}.s3.{region}.amazonaws.com/{object_key}"
```

### Configuration Check

```python
def check_s3_configuration() -> bool:
    """Validate S3 is properly configured."""

    # Check credentials
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY:
        return False

    # Check bucket exists and is accessible
    s3_client.head_bucket(Bucket=S3_BUCKET_NAME)

    return True
```

## Setup Instructions

### 1. Create S3 Bucket

#### Option A: AWS Console

1. Go to https://console.aws.amazon.com/s3/
2. Click "Create bucket"
3. Enter bucket name (e.g., `codebase-docs-prod`)
4. Choose region (e.g., `us-east-1`)
5. Uncheck "Block all public access" (we need public read)
6. Acknowledge the warning
7. Click "Create bucket"

#### Option B: AWS CLI

```bash
# Create bucket
aws s3 mb s3://codebase-docs-prod --region us-east-1

# Allow public read access
aws s3api put-bucket-acl --bucket codebase-docs-prod --acl public-read

# Set bucket policy for public read
cat > bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::codebase-docs-prod/docs/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy --bucket codebase-docs-prod --policy file://bucket-policy.json
```

### 2. Create IAM User

1. Go to https://console.aws.amazon.com/iam/
2. Click "Users" → "Add user"
3. Enter username: `codebase-documenter-service`
4. Select "Access key - Programmatic access"
5. Click "Next: Permissions"
6. Click "Attach policies directly"
7. Search and select `AmazonS3FullAccess` (or create custom policy below)
8. Click "Next" → "Create user"
9. **Save the Access Key ID and Secret Access Key**

#### Custom IAM Policy (Recommended)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::codebase-docs-prod",
        "arn:aws:s3:::codebase-docs-prod/*"
      ]
    }
  ]
}
```

### 3. Update Environment Variables

Edit your `.env` file:

```bash
# Add AWS credentials
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=your-secret-key-here
S3_BUCKET_NAME=codebase-docs-prod
AWS_REGION=us-east-1
```

### 4. Run Database Migration

```bash
# Apply the migration to add documentation_url column
docker-compose exec backend alembic upgrade head
```

### 5. Rebuild and Restart

```bash
# Rebuild to install boto3
docker-compose down
docker-compose up -d --build
```

### 6. Test S3 Integration

```bash
# Submit a test job
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/anthropics/anthropic-sdk-python"}'

# Wait for completion (30-60 seconds)
# Check the result
curl http://localhost:8000/api/v1/jobs/{JOB_ID}

# Should see documentation_url in response:
# "documentation_url": "https://codebase-docs-prod.s3.us-east-1.amazonaws.com/docs/{JOB_ID}.md"
```

## Frontend UI Updates

### View Documentation Button

The JobStatus component now shows this beautiful button when documentation is ready:

```tsx
{job.status === "completed" && job.documentation_url && (
  <div>
    <label>Documentation</label>
    <a
      href={job.documentation_url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors duration-200"
    >
      <DocumentIcon className="w-5 h-5 mr-2" />
      View Documentation
    </a>
    <p className="text-xs text-gray-500 mt-2">
      {job.documentation_url}
    </p>
  </div>
)}
```

**Features:**
- Blue button with document icon
- Opens in new tab
- Hover effect
- Smooth transitions
- Shows S3 URL below

## API Response Updates

### Before Phase 3

```json
{
  "id": "abc-123",
  "github_url": "https://github.com/owner/repo",
  "status": "completed",
  "error_message": null,
  "created_at": "2024-01-19T12:00:00Z",
  "updated_at": "2024-01-19T12:05:00Z"
}
```

### After Phase 3

```json
{
  "id": "abc-123",
  "github_url": "https://github.com/owner/repo",
  "status": "completed",
  "error_message": null,
  "documentation_url": "https://my-bucket.s3.us-east-1.amazonaws.com/docs/abc-123.md",
  "created_at": "2024-01-19T12:00:00Z",
  "updated_at": "2024-01-19T12:05:00Z"
}
```

## Database Schema Updates

### jobs table (Updated)

```sql
ALTER TABLE jobs ADD COLUMN documentation_url VARCHAR NULL;
```

**New Column:**
- `documentation_url` (String, Nullable) - S3 URL to generated documentation

**Example Values:**
- `https://my-bucket.s3.us-east-1.amazonaws.com/docs/abc-123.md`
- `NULL` (if job failed or S3 not configured)

## Error Handling

### Graceful Fallback

The system handles S3 errors gracefully:

```python
# Check S3 configuration
if check_s3_configuration():
    # Upload to S3
    s3_url = upload_to_s3(file_path, job_id)

    if s3_url:
        state["documentation_url"] = s3_url
        logger.info("Successfully uploaded to S3")
    else:
        logger.warning("S3 upload failed, saved locally only")
else:
    logger.warning("S3 not configured, saved locally only")

# Job still completes successfully!
state["status"] = "completed"
```

**Behavior:**
- ✅ If S3 configured: Upload and set URL
- ✅ If S3 fails: Log warning, job still succeeds
- ✅ If S3 not configured: Skip upload, job still succeeds
- ✅ Documentation always saved locally as backup

### Error Scenarios

| Scenario | Behavior | Job Status |
|----------|----------|------------|
| S3 credentials missing | Skip S3 upload | completed |
| S3 bucket doesn't exist | Skip S3 upload, log error | completed |
| S3 permission denied | Skip S3 upload, log error | completed |
| Network error during upload | Skip S3 upload, log error | completed |
| Local save fails | Set job to failed | failed |

## Cost Considerations

### S3 Costs

**Storage:**
- $0.023 per GB/month (Standard)
- Average doc size: 50KB
- 1,000 docs = 50MB = ~$0.001/month

**Requests:**
- PUT: $0.005 per 1,000 requests
- GET: $0.0004 per 1,000 requests
- 1,000 uploads = $0.005

**Data Transfer:**
- First 100GB/month: FREE
- After: $0.09 per GB

**Total for 1,000 docs/month:**
- Storage: $0.001
- Upload: $0.005
- Viewing (100 views): FREE
- **Total: ~$0.01/month**

Very affordable! 💰

## Configuration Options

### Bucket Policy (Public Read)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/docs/*"
    }
  ]
}
```

### CORS Configuration (If needed)

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

### Lifecycle Policy (Optional - Auto-delete old docs)

```json
{
  "Rules": [
    {
      "Id": "DeleteOldDocs",
      "Status": "Enabled",
      "Prefix": "docs/",
      "Expiration": {
        "Days": 90
      }
    }
  ]
}
```

## Testing

### Test S3 Configuration

```bash
# Check S3 is configured
docker-compose exec backend python << EOF
from app.core.s3 import check_s3_configuration

if check_s3_configuration():
    print("✓ S3 is configured correctly")
else:
    print("✗ S3 configuration invalid")
EOF
```

### Test Upload

```bash
# Create a test file
docker-compose exec backend bash << 'EOF'
echo "# Test Documentation" > /tmp/test.md
echo "This is a test." >> /tmp/test.md
EOF

# Test upload
docker-compose exec backend python << EOF
from app.core.s3 import upload_to_s3

url = upload_to_s3("/tmp/test.md", "test-upload")
if url:
    print(f"✓ Upload successful: {url}")
else:
    print("✗ Upload failed")
EOF
```

### Test Full Workflow

```bash
# Submit a job
JOB_ID=$(curl -s -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/pallets/click"}' \
  | jq -r '.id')

# Wait for completion
sleep 120

# Check for documentation_url
curl -s http://localhost:8000/api/v1/jobs/$JOB_ID | jq '.documentation_url'

# Should return S3 URL or null
```

## Monitoring

### View S3 Logs

```bash
# Check worker logs for S3 activity
docker-compose logs celery_worker | grep -i "s3\|upload"
```

### S3 Bucket Contents

```bash
# List all documentation files
aws s3 ls s3://codebase-docs-prod/docs/

# Count total files
aws s3 ls s3://codebase-docs-prod/docs/ | wc -l

# Get total size
aws s3 ls s3://codebase-docs-prod/docs/ --recursive --summarize | grep "Total Size"
```

### Check Database

```bash
# Count jobs with documentation URLs
docker-compose exec postgres psql -U codebase_user -d codebase_db << EOF
SELECT
  COUNT(*) FILTER (WHERE documentation_url IS NOT NULL) as with_url,
  COUNT(*) FILTER (WHERE documentation_url IS NULL AND status = 'completed') as without_url,
  COUNT(*) as total
FROM jobs;
EOF
```

## Troubleshooting

### Issue: S3 upload fails with "Access Denied"

**Solution:**
```bash
# Check IAM permissions
aws iam get-user-policy --user-name codebase-documenter-service --policy-name S3Access

# Verify bucket policy allows uploads
aws s3api get-bucket-policy --bucket codebase-docs-prod
```

### Issue: Documentation URL is null

**Possible causes:**
1. S3 not configured (check logs)
2. Upload failed (check worker logs)
3. Migration not run (run `alembic upgrade head`)

### Issue: Can't access S3 URL (403 Forbidden)

**Solution:**
```bash
# Make bucket public-read
aws s3api put-bucket-acl --bucket codebase-docs-prod --acl public-read

# Or set bucket policy (see above)
```

### Issue: "Bucket does not exist"

**Solution:**
```bash
# Create bucket
aws s3 mb s3://codebase-docs-prod --region us-east-1

# Verify
aws s3 ls | grep codebase-docs-prod
```

## Security Considerations

### Recommendations

1. **IAM Permissions**: Use minimum required permissions (custom policy)
2. **Bucket Access**: Only allow public read on `/docs/*` prefix
3. **Credentials**: Never commit AWS credentials to git
4. **Encryption**: Enable S3 server-side encryption (optional)
5. **Versioning**: Enable S3 versioning for backup (optional)

### Enable Encryption

```bash
aws s3api put-bucket-encryption \
  --bucket codebase-docs-prod \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

## What's Next (Phase 4 Ideas)

### Enhanced Documentation Viewer
- [ ] In-app markdown renderer (no external tab)
- [ ] Syntax highlighting for code blocks
- [ ] Table of contents navigation
- [ ] Search within documentation
- [ ] Download as PDF option

### Advanced S3 Features
- [ ] CDN integration (CloudFront)
- [ ] Custom domain (docs.yoursite.com)
- [ ] Versioning (keep multiple versions)
- [ ] Analytics (track views)

### Documentation Management
- [ ] Regenerate documentation
- [ ] Delete documentation
- [ ] Share via short URL
- [ ] Embed in iframe
- [ ] Export formats (PDF, HTML, DOCX)

## Success Criteria

Phase 3 is successful because:

1. ✅ **Cloud Storage** - Documentation stored in S3
2. ✅ **Public URLs** - Each job gets shareable link
3. ✅ **UI Integration** - Beautiful view button
4. ✅ **Graceful Fallback** - Works without S3
5. ✅ **Database Migration** - Proper schema update
6. ✅ **Error Handling** - Robust failure handling
7. ✅ **Cost Effective** - ~$0.01 per 1,000 docs
8. ✅ **Production Ready** - Secure, monitored, tested

## Summary

Phase 3 completes the core documentation system with:
- ☁️ Cloud storage via Amazon S3
- 🔗 Public, shareable documentation URLs
- 🎨 Beautiful "View Documentation" button
- 📊 Database tracking of URLs
- 🔒 Secure AWS integration
- 💰 Cost-effective storage (~$0.01/1000 docs)

Your documentation system now provides a complete end-to-end experience from repository submission to viewing beautiful AI-generated documentation!

---

**🎉 Phase 3 Complete!**

Start using S3 storage by adding your AWS credentials and enjoy cloud-hosted documentation! 🚀
