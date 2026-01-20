# Phase 3 Quick Start - S3 Storage Setup

Get cloud-hosted documentation running in 10 minutes!

## Prerequisites

- ✅ Phase 2 is running
- ✅ AWS account (free tier works!)
- ✅ 10 minutes of setup time

## Setup (10 Minutes)

### Step 1: Create S3 Bucket (3 min)

**Using AWS Console:**

1. Go to https://console.aws.amazon.com/s3/
2. Click "Create bucket"
3. Name: `codebase-docs-prod` (must be globally unique)
4. Region: `us-east-1` (or your preferred region)
5. **Uncheck** "Block all public access"
6. Check "I acknowledge..."
7. Click "Create bucket"

### Step 2: Set Bucket Policy (2 min)

1. Click on your bucket name
2. Go to "Permissions" tab
3. Scroll to "Bucket policy"
4. Click "Edit"
5. Paste this policy:

```json
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
```

6. Click "Save changes"

### Step 3: Create IAM User (3 min)

1. Go to https://console.aws.amazon.com/iam/
2. Click "Users" → "Create user"
3. Username: `codebase-service`
4. Click "Next"
5. Select "Attach policies directly"
6. Search for and select: `AmazonS3FullAccess`
7. Click "Next" → "Create user"
8. Click on the username
9. Go to "Security credentials" tab
10. Click "Create access key"
11. Select "Application running outside AWS"
12. Click "Next" → "Create access key"
13. **COPY both keys** (you won't see the secret again!)

### Step 4: Add to Environment (1 min)

Edit your `.env` file:

```bash
# Add these lines (with your actual values)
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=your-secret-key-here-40-characters
S3_BUCKET_NAME=codebase-docs-prod
AWS_REGION=us-east-1
```

### Step 5: Run Migration (1 min)

```bash
# Apply database migration
docker-compose exec backend alembic upgrade head

# Should see: "Running upgrade 001 -> 002, Add documentation_url to jobs table"
```

### Step 6: Rebuild Services (2 min)

```bash
# Rebuild to install boto3
docker-compose down
docker-compose up -d --build

# Wait for services to start
sleep 30

# Verify all services running
docker-compose ps
```

## Test It Out

### Quick Test

```bash
# Submit a small repo
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/anthropics/anthropic-sdk-python"}'

# Copy the job ID from response

# Wait 30-60 seconds, then check status
curl http://localhost:8000/api/v1/jobs/{JOB_ID}

# Look for "documentation_url" in response!
```

### Frontend Test

1. Open http://localhost:3000
2. Enter: `https://github.com/anthropics/anthropic-sdk-python`
3. Click "Generate Documentation"
4. Wait ~60 seconds
5. See the beautiful "View Documentation" button appear!
6. Click it to view your AI-generated docs in S3

## Verify S3 Upload

### Check Logs

```bash
# Watch worker upload to S3
docker-compose logs celery_worker | grep -i "s3\|upload"

# Should see:
# "Uploading documentation to S3"
# "Successfully uploaded to S3: https://..."
```

### Check S3 Bucket

```bash
# Using AWS CLI
aws s3 ls s3://codebase-docs-prod/docs/

# Should show your .md files
```

## What You Get

### Before Phase 3
```json
{
  "status": "completed",
  "documentation_url": null
}
```

### After Phase 3
```json
{
  "status": "completed",
  "documentation_url": "https://codebase-docs-prod.s3.us-east-1.amazonaws.com/docs/abc-123.md"
}
```

### In the UI

**Before:** Just status badge

**After:** Status badge + **"View Documentation"** button!

## Troubleshooting

### Issue: "Access Denied" when uploading

**Fix:**
```bash
# Check bucket policy is set (Step 2)
# Check IAM user has S3FullAccess
```

### Issue: documentation_url is null

**Check:**
```bash
# 1. Are AWS credentials in .env?
cat .env | grep AWS

# 2. Did migration run?
docker-compose exec backend alembic current

# 3. Check worker logs
docker-compose logs celery_worker | tail -50
```

### Issue: Can't access S3 URL (403)

**Fix:**
```bash
# Make sure bucket policy allows public read
# Check the policy in Step 2
```

### Issue: Bucket name taken

**Fix:**
```bash
# Use a unique name like:
# codebase-docs-yourname-2024
# Update bucket name in .env
```

## Cost

Very cheap! For 1,000 documentation jobs:

- **Storage** (50KB each): ~$0.001/month
- **Upload requests**: ~$0.005/month
- **Viewing** (first 100GB): FREE

**Total: ~$0.01/month for 1,000 docs** 💰

## Without S3 (Optional)

Phase 3 works without S3:

1. Don't add AWS credentials
2. System saves docs locally only
3. `documentation_url` will be `null`
4. No "View Documentation" button
5. Still works perfectly!

## Security Notes

### ✅ Do This:
- Use IAM user (not root account)
- Keep credentials in .env (never commit!)
- Only allow public read on `/docs/*` prefix
- Use custom IAM policy (not FullAccess) in production

### ❌ Don't Do This:
- Commit .env to git
- Use root AWS credentials
- Make entire bucket public
- Share access keys

## Next Steps

Once Phase 3 is working:

1. **Generate docs** for your favorite repos
2. **Share S3 URLs** with your team
3. **Monitor costs** in AWS Console
4. **Consider CDN** (CloudFront) for faster access
5. **Plan Phase 4** features!

## Advanced Options

### Use Custom Domain

Instead of:
```
https://codebase-docs-prod.s3.us-east-1.amazonaws.com/docs/abc.md
```

Use:
```
https://docs.yoursite.com/abc.md
```

**Setup:**
1. Create CloudFront distribution
2. Point to S3 bucket
3. Add custom domain
4. Update `get_s3_url()` in `backend/app/core/s3.py`

### Enable Versioning

Keep all versions of documentation:

```bash
aws s3api put-bucket-versioning \
  --bucket codebase-docs-prod \
  --versioning-configuration Status=Enabled
```

### Auto-Delete Old Docs

Delete docs older than 90 days:

```bash
# Create lifecycle policy
cat > lifecycle.json << EOF
{
  "Rules": [{
    "Id": "DeleteOldDocs",
    "Status": "Enabled",
    "Prefix": "docs/",
    "Expiration": {"Days": 90}
  }]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket codebase-docs-prod \
  --lifecycle-configuration file://lifecycle.json
```

## Support

### Check Configuration

```bash
# Test S3 connection
docker-compose exec backend python << EOF
from app.core.s3 import check_s3_configuration
print("S3 configured:", check_s3_configuration())
EOF
```

### View All Docs

```bash
# List all uploaded documentation
aws s3 ls s3://codebase-docs-prod/docs/ --recursive --human-readable
```

### Download a Doc

```bash
# Download locally
aws s3 cp s3://codebase-docs-prod/docs/{JOB_ID}.md ./

# View in terminal
curl https://codebase-docs-prod.s3.us-east-1.amazonaws.com/docs/{JOB_ID}.md
```

## Checklist

- [ ] S3 bucket created
- [ ] Bucket policy set for public read
- [ ] IAM user created with S3 access
- [ ] Access keys copied
- [ ] AWS credentials in .env
- [ ] Migration run (`alembic upgrade head`)
- [ ] Services rebuilt (`docker-compose up -d --build`)
- [ ] Test job submitted
- [ ] `documentation_url` present in response
- [ ] "View Documentation" button shows in UI
- [ ] Can open and view documentation

## Success!

If you can:
- ✅ Submit a job
- ✅ See `documentation_url` in response
- ✅ Click "View Documentation" button
- ✅ View docs in your browser

**Phase 3 is working perfectly!** 🎉

---

**Total Setup Time: 10 minutes**

**Cost: ~$0.01 per 1,000 docs**

**Result: Beautiful cloud-hosted documentation!** ☁️✨
