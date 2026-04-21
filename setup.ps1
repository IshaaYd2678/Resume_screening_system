# IRSS Setup Script for Windows
# This script sets up the entire Intelligent Resume Screening System

Write-Host "🚀 Starting IRSS Setup..." -ForegroundColor Green
Write-Host ""

# Check if .env exists
if (!(Test-Path .env)) {
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✓ .env file created" -ForegroundColor Green
    Write-Host "⚠️  Please update .env with your configuration before proceeding" -ForegroundColor Yellow
    Write-Host ""
}

# Check Docker
try {
    docker --version | Out-Null
    Write-Host "✓ Docker is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

try {
    docker compose version | Out-Null
    Write-Host "✓ Docker Compose is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose is not available. Please update Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Start services
Write-Host "🐳 Starting Docker services..." -ForegroundColor Cyan
Set-Location infra
docker compose up -d postgres redis ollama minio
Write-Host "✓ Core services started" -ForegroundColor Green
Write-Host ""

# Wait for services to be ready
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check PostgreSQL
Write-Host "🔍 Checking PostgreSQL..." -ForegroundColor Cyan
$retries = 0
while ($retries -lt 30) {
    try {
        docker compose exec -T postgres pg_isready -U irss_admin 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { break }
    } catch {}
    Write-Host "   Waiting for PostgreSQL..." -ForegroundColor Gray
    Start-Sleep -Seconds 2
    $retries++
}
Write-Host "✓ PostgreSQL is ready" -ForegroundColor Green

# Check Redis
Write-Host "🔍 Checking Redis..." -ForegroundColor Cyan
$retries = 0
while ($retries -lt 30) {
    try {
        docker compose exec -T redis redis-cli ping 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { break }
    } catch {}
    Write-Host "   Waiting for Redis..." -ForegroundColor Gray
    Start-Sleep -Seconds 2
    $retries++
}
Write-Host "✓ Redis is ready" -ForegroundColor Green

# Check Ollama
Write-Host "🔍 Checking Ollama..." -ForegroundColor Cyan
$retries = 0
while ($retries -lt 30) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) { break }
    } catch {}
    Write-Host "   Waiting for Ollama..." -ForegroundColor Gray
    Start-Sleep -Seconds 2
    $retries++
}
Write-Host "✓ Ollama is ready" -ForegroundColor Green
Write-Host ""

# Pull Ollama models
Write-Host "📥 Pulling Ollama models (this may take a while)..." -ForegroundColor Cyan
Write-Host "   Pulling mistral:7b-instruct-q4_K_M..." -ForegroundColor Gray
docker compose exec ollama ollama pull mistral:7b-instruct-q4_K_M

Write-Host "   Pulling nomic-embed-text..." -ForegroundColor Gray
docker compose exec ollama ollama pull nomic-embed-text

Write-Host "   Pulling llama3.1:8b-instruct-q4_K_M..." -ForegroundColor Gray
docker compose exec ollama ollama pull llama3.1:8b-instruct-q4_K_M

Write-Host "✓ All models pulled" -ForegroundColor Green
Write-Host ""

# Start API and worker
Write-Host "🚀 Starting API and Worker services..." -ForegroundColor Cyan
docker compose up -d api worker
Write-Host "✓ API and Worker started" -ForegroundColor Green
Write-Host ""

# Wait for API to be ready
Write-Host "⏳ Waiting for API to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
$retries = 0
while ($retries -lt 30) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/health" -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) { break }
    } catch {}
    Write-Host "   Waiting for API..." -ForegroundColor Gray
    Start-Sleep -Seconds 2
    $retries++
}
Write-Host "✓ API is ready" -ForegroundColor Green
Write-Host ""

# Run migrations
Write-Host "🗄️  Running database migrations..." -ForegroundColor Cyan
docker compose exec -T api alembic upgrade head
Write-Host "✓ Migrations completed" -ForegroundColor Green
Write-Host ""

# Start frontend
Write-Host "🎨 Starting Frontend..." -ForegroundColor Cyan
docker compose up -d frontend
Write-Host "✓ Frontend started" -ForegroundColor Green
Write-Host ""

# Start observability stack (optional)
Write-Host "📊 Starting observability stack..." -ForegroundColor Cyan
docker compose up -d prometheus grafana jaeger loki promtail
Write-Host "✓ Observability stack started" -ForegroundColor Green
Write-Host ""

# Start Caddy reverse proxy
Write-Host "🌐 Starting Caddy reverse proxy..." -ForegroundColor Cyan
docker compose up -d caddy
Write-Host "✓ Caddy started" -ForegroundColor Green
Write-Host ""

Set-Location ..

Write-Host "✅ IRSS Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access the services:" -ForegroundColor Cyan
Write-Host "   Dashboard:    http://localhost:3000"
Write-Host "   API Docs:     http://localhost:8000/docs"
Write-Host "   Grafana:      http://localhost:3001 (admin/admin)"
Write-Host "   Jaeger:       http://localhost:16686"
Write-Host "   MinIO:        http://localhost:9001 (minioadmin/change_me_in_production)"
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Create a user account via API or register in the UI"
Write-Host "   2. Create a job posting"
Write-Host "   3. Upload resumes"
Write-Host "   4. View ranked candidates"
Write-Host ""
Write-Host "🔧 Useful commands:" -ForegroundColor Cyan
Write-Host "   View logs:    cd infra; docker compose logs -f"
Write-Host "   Stop all:     cd infra; docker compose down"
Write-Host "   Restart:      cd infra; docker compose restart"
Write-Host ""
