@echo off
REM Codebase Documentation System - Setup Script for Windows
REM This script sets up the entire project for local development

echo ==================================
echo Codebase Documentation System
echo Setup Script (Windows)
echo ==================================
echo.

REM Check for required tools
echo Checking prerequisites...

where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo X Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)

where docker-compose >nul 2>nul
if %errorlevel% neq 0 (
    echo X Docker Compose is not installed. Please install Docker Desktop first.
    exit /b 1
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo X Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

echo + All prerequisites are installed
echo.

REM Create .env file if it doesn't exist
if not exist .env (
    echo Creating .env file from .env.example...
    copy .env.example .env
    echo + .env file created
) else (
    echo i .env file already exists
)
echo.

REM Setup frontend
echo Setting up frontend...
cd frontend

if not exist .env.local (
    echo Creating frontend .env.local file...
    copy .env.local.example .env.local
    echo + .env.local file created
)

echo Installing frontend dependencies...
call npm install
echo + Frontend dependencies installed
cd ..
echo.

REM Start backend services
echo Starting backend services (PostgreSQL, Redis, Backend API)...
docker-compose up -d
echo + Backend services started
echo.

REM Wait for services to be healthy
echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Run database migrations
echo Running database migrations...
docker-compose exec -T backend alembic upgrade head
echo + Database migrations completed
echo.

echo ==================================
echo + Setup completed successfully!
echo ==================================
echo.
echo Next steps:
echo 1. Backend API is running at: http://localhost:8000
echo 2. API docs available at: http://localhost:8000/docs
echo 3. To start the frontend, run:
echo    cd frontend
echo    npm run dev
echo 4. Frontend will be available at: http://localhost:3000
echo.
echo To view backend logs: docker-compose logs -f backend
echo To stop services: docker-compose down
echo.
pause
