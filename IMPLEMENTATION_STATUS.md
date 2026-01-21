# AI Code Commenting Feature - Implementation Status

## ✅ Phase 1: GitHub OAuth Integration - COMPLETE
- NextAuth.js setup with GitHub provider
- Login/logout UI components
- Session management with JWT
- OAuth scopes: `repo`, `read:user`, `user:email`

## 🚧 Phase 2: Backend User Model & Token Storage - IN PROGRESS

### Completed:
1. ✅ Created `User` model (`backend/app/models/user.py`)
2. ✅ Updated `Job` model with user relationship, `has_write_access`, and `pull_request_url` fields
3. ✅ Created database migration (`backend/alembic/versions/003_add_users_and_auth.py`)
4. ✅ Created user Pydantic schemas (`backend/app/schemas/user.py`)
5. ✅ Created encryption utilities (`backend/app/core/encryption.py`)
6. ✅ Created auth endpoints (`backend/app/api/v1/auth.py`)
7. ✅ Added cryptography package to requirements

### TODO - Backend:
1. ⏳ Run the database migration:
   ```bash
   cd backend
   alembic upgrade head
   ```

2. ⏳ Install new Python dependency:
   ```bash
   pip install cryptography==42.0.0
   ```

3. ⏳ Restart the backend server

### TODO - Frontend:
1. ⏳ Create API client hook for authentication (`frontend/src/hooks/useAuth.ts`)
2. ⏳ Update SubmitUrlForm to send user session data
3. ⏳ Call `/api/v1/auth/login` when user logs in via GitHub
4. ⏳ Send GitHub token with job creation requests

## 📋 Phase 3: Repository Access Check - NOT STARTED

### Plan:
1. Create endpoint: `GET /api/v1/repos/check-access?github_url={url}&user_id={id}`
2. Use GitHub API with user's token to check:
   - Repository exists
   - User has write permissions (`push` access)
3. Store result in `Job.has_write_access` field
4. Use Octokit library for GitHub API calls

## 📋 Phase 4: AI Comment Generation & PR Creation - NOT STARTED

### Plan - Own Repo Flow (has write access):
1. Create new Celery task: `add_inline_comments`
2. Clone repository
3. Use Claude API to analyze code files
4. Generate inline comments for:
   - Function/method signatures
   - Complex logic blocks
   - Class definitions
5. Create branch: `ai-documentation-comments`
6. Commit changes with AI comments
7. Push branch to GitHub
8. Create Pull Request via GitHub API
9. Store PR URL in `Job.pull_request_url`

### Plan - Public Repo Flow (no write access):
1. Generate AI comments but don't push
2. Store annotated files in S3 (separate bucket/folder)
3. Create side-by-side viewer component in frontend
4. Add toggle between original and commented code

## Files Created/Modified:

### Backend:
- `app/models/user.py` (new)
- `app/models/job.py` (modified)
- `app/schemas/user.py` (new)
- `app/api/v1/auth.py` (new)
- `app/core/encryption.py` (new)
- `app/main.py` (modified)
- `alembic/versions/003_add_users_and_auth.py` (new)
- `requirements.txt` (modified)

### Frontend:
- `src/app/api/auth/[...nextauth]/route.ts` (new)
- `src/types/next-auth.d.ts` (new)
- `src/app/auth/signin/page.tsx` (new)
- `src/components/SessionProvider.tsx` (new)
- `src/components/AuthButton.tsx` (new)
- `src/app/layout.tsx` (modified)
- `src/app/page.tsx` (modified)
- `.env.local` (new)

## Next Steps:

1. **Run migrations** to create users table
2. **Install backend dependencies**
3. **Create frontend auth hook** to sync session with backend
4. **Test the full auth flow**
5. **Implement repository access checking** (Phase 3)
6. **Implement AI commenting workflow** (Phase 4)
