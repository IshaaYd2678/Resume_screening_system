# 🚀 START HERE - IRSS Quick Setup

Welcome to the Intelligent Resume Screening System (IRSS)! This guide will get you up and running in under 20 minutes.

## What is IRSS?

IRSS is a 100% open-source, self-hosted resume screening system that uses local LLMs (no external APIs) to:
- Parse resumes from PDF/DOCX/TXT files
- Extract candidate information using AI
- Score candidates across 5 dimensions
- Rank candidates with explainable AI
- Provide a beautiful dashboard for recruiters

## Prerequisites

Before you start, make sure you have:

- ✅ **Docker Desktop** installed and running
  - Download: https://www.docker.com/products/docker-desktop
  - Minimum: 16 GB RAM, 50 GB disk space
- ✅ **Git** (to clone the repository)
- ✅ **Windows 10/11, macOS, or Linux**

## 3-Step Setup

### Step 1: Clone and Configure (2 minutes)

```bash
# Clone the repository
git clone <your-repo-url>
cd Resume_screening_system

# Copy environment file
cp .env.example .env

# (Optional) Edit .env if you want to customize settings
```

### Step 2: Run Setup Script (15 minutes)

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

The script will:
1. Start Docker services (PostgreSQL, Redis, Ollama, MinIO)
2. Download AI models (this takes the most time)
3. Run database migrations
4. Start the API and worker
5. Start the frontend
6. Start monitoring tools

**☕ Grab a coffee while models download (10-15 minutes)**

### Step 3: Create Account and Start Using (3 minutes)

1. **Create your account:**
   - Open http://localhost:8000/docs
   - Find `POST /api/v1/auth/register`
   - Click "Try it out"
   - Enter your email and password
   - Click "Execute"

2. **Login to dashboard:**
   - Open http://localhost:3000
   - Login with your credentials

3. **Create your first job:**
   - Click "New Job"
   - Fill in job details
   - Add required skills

4. **Upload resumes:**
   - Select your job
   - Click "Upload Resumes"
   - Select PDF/DOCX/TXT files
   - Wait for processing (2-5 seconds per resume)

5. **View ranked candidates:**
   - See candidates sorted by score
   - Click on a candidate to see details
   - View explanation of why they scored that way

## 🌐 Access Your Services

After setup, you can access:

| Service | URL | Purpose |
|---------|-----|---------|
| **Dashboard** | http://localhost:3000 | Main UI for recruiters |
| **API Docs** | http://localhost:8000/docs | Interactive API documentation |
| **Grafana** | http://localhost:3001 | Metrics and dashboards (admin/admin) |
| **Jaeger** | http://localhost:16686 | Distributed tracing |
| **MinIO** | http://localhost:9001 | File storage console |

## 📊 How It Works

```
1. Upload Resume (PDF/DOCX/TXT)
         ↓
2. Extract Text
         ↓
3. Parse with AI (Mistral 7B)
   - Name, email, phone
   - Skills, experience, education
         ↓
4. Generate Embedding (nomic-embed-text)
         ↓
5. Score Candidate (5 dimensions):
   - Skills Match (30%)
   - Semantic Similarity (25%)
   - Experience Alignment (25%)
   - Education Fit (10%)
   - Keyword Density (10%)
         ↓
6. Rank and Display
```

## 🎯 Example Usage

### Create a Job for "Senior Python Developer"

```json
{
  "title": "Senior Python Developer",
  "jd_text": "We're looking for an experienced Python developer with FastAPI and PostgreSQL experience...",
  "must_have_skills": ["python", "fastapi", "postgresql", "docker"],
  "nice_to_have_skills": ["kubernetes", "react", "aws"],
  "min_experience_years": 5
}
```

### Upload Resumes

- Drag and drop PDF/DOCX files
- System automatically processes them
- View results in real-time

### View Results

Candidates are ranked by composite score:
- **Top (80-100)**: Excellent match
- **Strong (60-79)**: Good match
- **Moderate (40-59)**: Partial match
- **Weak (0-39)**: Poor match

Each candidate shows:
- Overall score
- Dimension breakdown
- Matched skills
- Missing skills
- Experience summary
- AI-generated explanation

## 🔧 Common Commands

```bash
# View logs
cd infra
docker compose logs -f

# Stop all services
docker compose down

# Restart services
docker compose restart

# Check service status
docker compose ps

# View API logs only
docker compose logs -f api

# View worker logs
docker compose logs -f worker
```

## 🐛 Troubleshooting

### "Docker is not running"
- Start Docker Desktop
- Wait for it to fully start
- Try again

### "Port already in use"
- Check if another service is using the port
- Stop the conflicting service
- Or change the port in docker-compose.yml

### "Models not downloading"
- Check internet connection
- Models are large (2-4 GB each)
- Wait patiently or check logs:
  ```bash
  docker compose logs -f ollama
  ```

### "API returns 500 errors"
- Check API logs: `docker compose logs -f api`
- Check worker logs: `docker compose logs -f worker`
- Verify Ollama is running: `curl http://localhost:11434/api/tags`

### "Database connection failed"
- Check PostgreSQL: `docker compose logs -f postgres`
- Restart: `docker compose restart postgres api`
- Re-run migrations: `docker compose exec api alembic upgrade head`

## 📚 Documentation

- **QUICKSTART.md** - Detailed setup guide
- **README.md** - Full project documentation
- **PROJECT_STATUS.md** - Implementation details
- **DEPLOYMENT.md** - Production deployment
- **COMPLETION_SUMMARY.md** - What's been built

## 🎓 Learning Resources

### Understanding the Code

- **Backend:** `backend/app/` - FastAPI application
- **Frontend:** `frontend/src/` - React application
- **NLP:** `backend/app/nlp/` - AI processing
- **Tasks:** `backend/app/tasks.py` - Background jobs

### Key Technologies

- **FastAPI** - Modern Python web framework
- **React** - Frontend UI library
- **Ollama** - Local LLM inference
- **PostgreSQL + pgvector** - Database with vector search
- **Celery** - Distributed task queue
- **Docker** - Containerization

## 🚀 Next Steps

1. **Explore the API:**
   - Visit http://localhost:8000/docs
   - Try different endpoints
   - See request/response examples

2. **Customize Scoring:**
   - Adjust dimension weights
   - See how rankings change
   - Find the best weights for your use case

3. **Monitor Performance:**
   - Check Grafana dashboards
   - View traces in Jaeger
   - Monitor resource usage

4. **Scale Up:**
   - Add more Celery workers
   - Process resumes faster
   - Handle more concurrent users

5. **Deploy to Production:**
   - See DEPLOYMENT.md
   - Configure for your infrastructure
   - Set up monitoring and alerts

## 💡 Tips

- **Start small:** Upload 5-10 resumes first to test
- **Check logs:** If something fails, logs tell you why
- **Be patient:** First model download takes time
- **Experiment:** Try different scoring weights
- **Monitor:** Use Grafana to see system health

## 🤝 Getting Help

- **Check logs:** `docker compose logs -f`
- **Health check:** http://localhost:8000/api/v1/health
- **Documentation:** Read the guides in this repo
- **Issues:** Open a GitHub issue with logs

## ✅ Verification

Run the verification script to check everything is set up correctly:

```bash
python test_setup.py
```

This checks:
- ✅ All required files exist
- ✅ Environment variables are configured
- ✅ Docker Compose is valid
- ✅ API endpoints are defined
- ✅ Frontend pages exist

## 🎉 You're Ready!

If you've completed the setup, you now have:

- ✅ A fully functional resume screening system
- ✅ Local AI models (no external API costs)
- ✅ Complete observability stack
- ✅ Production-ready architecture
- ✅ Scalable infrastructure

**Start screening resumes smarter, not harder!**

---

**Questions?** Check the documentation or open an issue.

**Ready to deploy?** See DEPLOYMENT.md for production setup.

**Want to contribute?** See CONTRIBUTING.md (coming soon).

---

Made with ❤️ using 100% open source software.
