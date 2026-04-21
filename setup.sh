#!/bin/bash

# IRSS Setup Script
# This script sets up the entire Intelligent Resume Screening System

set -e

echo "🚀 Starting IRSS Setup..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✓ .env file created"
    echo "⚠️  Please update .env with your configuration before proceeding"
    echo ""
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✓ Docker and Docker Compose are installed"
echo ""

# Start services
echo "🐳 Starting Docker services..."
cd infra
docker compose up -d postgres redis ollama minio
echo "✓ Core services started"
echo ""

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check PostgreSQL
echo "🔍 Checking PostgreSQL..."
until docker compose exec -T postgres pg_isready -U irss_admin > /dev/null 2>&1; do
    echo "   Waiting for PostgreSQL..."
    sleep 2
done
echo "✓ PostgreSQL is ready"

# Check Redis
echo "🔍 Checking Redis..."
until docker compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    echo "   Waiting for Redis..."
    sleep 2
done
echo "✓ Redis is ready"

# Check Ollama
echo "🔍 Checking Ollama..."
until curl -s http://localhost:11434/api/tags > /dev/null 2>&1; do
    echo "   Waiting for Ollama..."
    sleep 2
done
echo "✓ Ollama is ready"

# Pull Ollama models
echo "📥 Pulling Ollama models (this may take a while)..."
echo "   Pulling mistral:7b-instruct-q4_K_M..."
docker compose exec ollama ollama pull mistral:7b-instruct-q4_K_M &
PID1=$!

echo "   Pulling nomic-embed-text..."
docker compose exec ollama ollama pull nomic-embed-text &
PID2=$!

echo "   Pulling llama3.1:8b-instruct-q4_K_M..."
docker compose exec ollama ollama pull llama3.1:8b-instruct-q4_K_M &
PID3=$!

# Wait for all model pulls to complete
wait $PID1 $PID2 $PID3
echo "✓ All models pulled"
echo ""

# Start API and worker
echo "🚀 Starting API and Worker services..."
docker compose up -d api worker
echo "✓ API and Worker started"
echo ""

# Wait for API to be ready
echo "⏳ Waiting for API to be ready..."
sleep 5
until curl -s http://localhost:8000/api/v1/health > /dev/null 2>&1; do
    echo "   Waiting for API..."
    sleep 2
done
echo "✓ API is ready"
echo ""

# Run migrations
echo "🗄️  Running database migrations..."
docker compose exec -T api alembic upgrade head
echo "✓ Migrations completed"
echo ""

# Start frontend
echo "🎨 Starting Frontend..."
docker compose up -d frontend
echo "✓ Frontend started"
echo ""

# Start observability stack (optional)
echo "📊 Starting observability stack..."
docker compose up -d prometheus grafana jaeger loki promtail
echo "✓ Observability stack started"
echo ""

# Start Caddy reverse proxy
echo "🌐 Starting Caddy reverse proxy..."
docker compose up -d caddy
echo "✓ Caddy started"
echo ""

cd ..

echo "✅ IRSS Setup Complete!"
echo ""
echo "🌐 Access the services:"
echo "   Dashboard:    http://localhost:3000"
echo "   API Docs:     http://localhost:8000/docs"
echo "   Grafana:      http://localhost:3001 (admin/admin)"
echo "   Jaeger:       http://localhost:16686"
echo "   MinIO:        http://localhost:9001 (minioadmin/change_me_in_production)"
echo ""
echo "📝 Next steps:"
echo "   1. Create a user account via API or register in the UI"
echo "   2. Create a job posting"
echo "   3. Upload resumes"
echo "   4. View ranked candidates"
echo ""
echo "🔧 Useful commands:"
echo "   View logs:    cd infra && docker compose logs -f"
echo "   Stop all:     cd infra && docker compose down"
echo "   Restart:      cd infra && docker compose restart"
echo ""
