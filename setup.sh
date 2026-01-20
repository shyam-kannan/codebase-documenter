#!/bin/bash

# Codebase Documentation System - Setup Script
# This script sets up the entire project for local development

set -e

echo "=================================="
echo "Codebase Documentation System"
echo "Setup Script"
echo "=================================="
echo ""

# Check for required tools
echo "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ All prerequisites are installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
else
    echo "ℹ️  .env file already exists"
fi
echo ""

# Setup frontend
echo "Setting up frontend..."
cd frontend

if [ ! -f .env.local ]; then
    echo "Creating frontend .env.local file..."
    cp .env.local.example .env.local
    echo "✅ .env.local file created"
fi

echo "Installing frontend dependencies..."
npm install
echo "✅ Frontend dependencies installed"
cd ..
echo ""

# Start backend services
echo "Starting backend services (PostgreSQL, Redis, Backend API)..."
docker-compose up -d
echo "✅ Backend services started"
echo ""

# Wait for services to be healthy
echo "Waiting for services to be ready..."
sleep 10

# Run database migrations
echo "Running database migrations..."
docker-compose exec -T backend alembic upgrade head
echo "✅ Database migrations completed"
echo ""

echo "=================================="
echo "✅ Setup completed successfully!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Backend API is running at: http://localhost:8000"
echo "2. API docs available at: http://localhost:8000/docs"
echo "3. To start the frontend, run:"
echo "   cd frontend && npm run dev"
echo "4. Frontend will be available at: http://localhost:3000"
echo ""
echo "To view backend logs: docker-compose logs -f backend"
echo "To stop services: docker-compose down"
echo ""
