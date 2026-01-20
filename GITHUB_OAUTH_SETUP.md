# GitHub OAuth Setup Guide

## Phase 1: GitHub OAuth Integration - COMPLETED

### What We've Implemented:

1. **Installed Packages:**
   - `next-auth@4.24.5` - Authentication for Next.js
   - `@octokit/rest` - GitHub API client

2. **Created Files:**
   - `/frontend/src/app/api/auth/[...nextauth]/route.ts` - NextAuth API route
   - `/frontend/src/types/next-auth.d.ts` - TypeScript type definitions
   - `/frontend/src/app/auth/signin/page.tsx` - Custom sign-in page
   - `/frontend/src/components/SessionProvider.tsx` - Session provider wrapper
   - `/frontend/src/components/AuthButton.tsx` - Login/logout button component
   - `/frontend/.env.local.example` - Environment variables template

3. **Updated Files:**
   - `/frontend/src/app/layout.tsx` - Added SessionProvider
   - `/frontend/src/app/page.tsx` - Added AuthButton to header

### Setup Instructions:

#### Step 1: Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: AI Code Documentation
   - **Homepage URL**: http://localhost:3000 (for development)
   - **Authorization callback URL**: http://localhost:3000/api/auth/callback/github
4. Click "Register application"
5. Copy the **Client ID**
6. Click "Generate a new client secret" and copy the **Client Secret**

#### Step 2: Configure Environment Variables

1. Create `/frontend/.env.local` file:

```bash
# Generate a secret with: openssl rand -base64 32
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=http://localhost:3000

# From your GitHub OAuth App
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

2. Generate the NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

#### Step 3: Test the Authentication

1. Start the frontend:
```bash
cd frontend
npm run dev
```

2. Visit http://localhost:3000
3. Click "Sign in with GitHub" in the top right
4. Authorize the app
5. You should see your GitHub profile in the header

### What's Granted:

The OAuth app requests these scopes:
- `repo` - Full access to repositories (needed to create branches and PRs)
- `read:user` - Read user profile data
- `user:email` - Read user email

### How It Works:

1. User clicks "Sign in with GitHub"
2. Redirected to GitHub OAuth authorization
3. User authorizes the app
4. GitHub redirects back with an authorization code
5. NextAuth exchanges code for access token
6. Access token is stored in the session (JWT)
7. Session includes: `accessToken`, `githubId`, `username`, user profile

### Next Steps (Phase 2-4):

- [ ] Backend: Create user model and store OAuth tokens
- [ ] Backend: Add endpoint to check repository write access
- [ ] Backend: Implement AI comment generation workflow
- [ ] Backend: Implement GitHub branch/PR creation
- [ ] Frontend: Add code commenting UI
- [ ] Frontend: Add side-by-side code viewer

