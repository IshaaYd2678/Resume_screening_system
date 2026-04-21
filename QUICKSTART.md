# IRSS Quick Start Guide

This guide will help you get the Intelligent Resume Screening System up and running in minutes.

## Prerequisites

- Docker Desktop installed and running
- At least 16 GB RAM available
- 50 GB free disk space
- Windows 10/11, macOS, or Linux

## Setup Steps

### 1. Clone and Configure

```bash
# Clone the repository (if not already done)
git clone <repo-url>
cd Resume_screening_system

# Copy environment file
cp .env.example .env

# (Optional) Edit .env to customize settings
```

### 2. Run Setup Script

**On Windows (PowerShell):**
```powershell
.\setup.ps1
```

**On Linux/macOS:**
```bash
chmod +x setup.sh
./setup.sh
```

**Or use Make:**
```bash
make dev
```

The setup script will:
- Start all Docker services
- Pull required Ollama models (mistral, llama3.1, nomic-embed-text)
- Run database migrations
- Start the API, worker, and frontend

This process takes 10-20 minutes on first run (model downloads are large).

### 3. Create Your First User

**Option A: Via API (Swagger UI)**

1. Open http://localhost:8000/docs
2. Find `POST /api/v1/auth/register`
3. Click "Try it out"
4. Enter:
   ```json
   {
     "email": "admin@example.com",
     "password": "admin123"
   }
   ```
5. Click "Execute"

**Option B: Via curl**

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}'
```

### 4. Login to Dashboard

1. Open http://localhost:3000
2. Login with your credentials
3. You're ready to go!

## Usage Workflow

### Create a Job Posting

1. Click "New Job" in the dashboard
2. Fill in:
   - Job Title (e.g., "Senior Python Developer")
   - Job Description
   - Must-have skills (e.g., ["python", "fastapi", "postgresql"])
   - Nice-to-have skills (optional)
   - Minimum years of experience
3. Click "Create"

### Upload Resumes

1. Select the job you created
2. Click "Upload Resumes"
3. Select PDF, DOCX, or TXT files
4. Click "Upload"

The system will automatically:
- Extract text from files
- Parse candidate information using LLM
- Generate embeddings
- Score candidates across 5 dimensions
- Rank candidates by composite score

### View Results

1. Navigate to the job's candidate list
2. See ranked candidates with scores
3. Click on a candidate to view:
   - Full profile
   - Dimension scores (skills, semantic, experience, education, keywords)
   - Explanation (why they scored this way)
   - Matched and missing skills

### Adjust Scoring Weights

1. Go to job settings
2. Adjust dimension weights:
   - Skills: 30% (default)
   - Semantic: 25%
   - Experience: 25%
   - Education: 10%
   - Keywords: 10%
3. Save - candidates will be re-ranked automatically

## Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Dashboard | http://localhost:3000 | Your user account |
| API Docs | http://localhost:8000/docs | - |
| Grafana | http://localhost:3001 | admin / admin |
| Jaeger Tracing | http://localhost:16686 | - |
| MinIO Console | http://localhost:9001 | minioadmin / change_me_in_production |
| Prometheus | http://localhost:9090 | - |

## Troubleshooting

### Services won't start

```bash
# Check Docker is running
docker ps

# View logs
cd infra
docker compose logs -f

# Restart services
docker compose restart
```

### Ollama models not loading

```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Manually pull models
docker compose exec ollama ollama pull mistral:7b-instruct-q4_K_M
docker compose exec ollama ollama pull nomic-embed-text
docker compose exec ollama ollama pull llama3.1:8b-instruct-q4_K_M
```

### Database connection errors

```bash
# Check PostgreSQL
docker compose exec postgres psql -U irss_admin -d irss_db

# Re-run migrations
docker compose exec api alembic upgrade head
```

### API returns 500 errors

```bash
# Check API logs
docker compose logs -f api

# Check worker logs
docker compose logs -f worker

# Restart API
docker compose restart api worker
```

### Frontend not loading

```bash
# Check frontend logs
docker compose logs -f frontend

# Rebuild frontend
docker compose up -d --build frontend
```

## Stopping the System

```bash
cd infra
docker compose down

# To also remove volumes (WARNING: deletes all data)
docker compose down -v
```

## Next Steps

- Read the full [README.md](README.md) for architecture details
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- Explore the API at http://localhost:8000/docs
- Monitor metrics in Grafana at http://localhost:3001

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check the documentation in the `docs/` folder
- Review logs: `docker compose logs -f`

---

**Happy Screening! 🚀**
