# Quick Start Guide

This guide will help you get the Codebase Documentation System up and running in under 5 minutes.

## Prerequisites

Make sure you have installed:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- [Node.js 18+](https://nodejs.org/)

## Automated Setup (Recommended)

### Windows
```bash
setup.bat
```

### Mac/Linux
```bash
chmod +x setup.sh
./setup.sh
```

The setup script will:
1. Create environment files
2. Install frontend dependencies
3. Start Docker services (PostgreSQL, Redis, Backend)
4. Run database migrations

## Manual Setup

If you prefer to set up manually:

### 1. Environment Configuration
```bash
# Copy environment files
cp .env.example .env
cd frontend
cp .env.local.example .env.local
cd ..
```

### 2. Start Backend Services
```bash
# Start Docker containers
docker-compose up -d

# Wait for services to start (about 10 seconds)

# Run database migrations
docker-compose exec backend alembic upgrade head
```

### 3. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 4. Start Frontend Development Server
```bash
npm run dev
```

## Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Test the Application

1. Open http://localhost:3000
2. Enter a GitHub repository URL (e.g., `https://github.com/facebook/react`)
3. Click "Generate Documentation"
4. Watch the job status update in real-time

## Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Restart services
docker-compose restart
```

### Port conflicts
If port 8000 or 5432 is already in use:

1. Stop the service using that port
2. Or modify the ports in `docker-compose.yml`

### Database connection errors
```bash
# Ensure PostgreSQL is running
docker-compose ps postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Frontend can't connect to backend
1. Check that backend is running: http://localhost:8000/health
2. Verify `NEXT_PUBLIC_API_URL` in `frontend/.env.local`

## Stopping the Application

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

## Next Steps

- Explore the API documentation at http://localhost:8000/docs
- Check the main [README.md](README.md) for detailed documentation
- Review the project structure in each directory
