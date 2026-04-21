# Backend Development Guide

## Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_trf
```

## Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "your migration message"

# Apply migrations
alembic upgrade head

# Downgrade
alembic downgrade -1
```

## Running Locally

```bash
# Start API server
uvicorn app.main:app --reload

# In another terminal, start Celery worker
celery -A app.tasks worker --loglevel=info
```

## Project Structure

```
app/
├── api/              # API routes
│   ├── auth.py      # Authentication endpoints
│   ├── jobs.py      # Job management
│   ├── candidates.py # Candidate endpoints
│   └── health.py    # Health checks
├── core/            # Core configuration
│   ├── config.py    # Settings from env
│   ├── database.py  # DB connection
│   └── security.py  # Auth & crypto
├── models/          # SQLAlchemy ORM models
├── schemas/         # Pydantic validation schemas
├── nlp/             # NLP processing
│   ├── extraction.py  # PDF/DOCX text extraction
│   ├── parser.py      # LLM-based parsing
│   ├── embedding.py   # Text embeddings
│   ├── scorer.py      # Multi-dimensional scoring
│   ├── spacy_utils.py # spaCy NER fallback
│   └── ollama_client.py # Ollama REST client
├── tasks.py         # Celery task definitions
├── celery_app.py    # Celery configuration
└── main.py          # FastAPI app entrypoint
```

## Environment Variables

See `.env.example` for all required variables. Key ones:

- `POSTGRES_*`: Database connection
- `REDIS_URL`: Redis broker URL
- `JWT_SECRET_KEY`: JWT signing key (min 32 chars)
- `OLLAMA_BASE_URL`: Ollama server URL
- `MODEL_PARSE`: LLM for parsing (mistral:7b, llama3.1:8b)
- `MODEL_EXPLAIN`: LLM for explanations
- `MODEL_EMBED`: Embedding model (nomic-embed-text)

## NLP Pipeline

The system uses a multi-stage pipeline:

1. **Extraction** (`nlp/extraction.py`)
   - PDF: pdfminer.six or PyMuPDF
   - DOCX: python-docx
   - TXT: UTF-8 with encoding detection

2. **Parsing** (`nlp/parser.py`)
   - Primary: Ollama LLM (structured JSON output)
   - Fallback: spaCy NER + regex extraction

3. **Embedding** (`nlp/embedding.py`)
   - Model: nomic-embed-text (384 dims)
   - Storage: pgvector (PostgreSQL)
   - Index: HNSW for fast ANN

4. **Scoring** (`nlp/scorer.py`)
   - Skills: Jaccard + fuzzy matching
   - Semantic: Cosine similarity
   - Experience: Years + role matching
   - Education: Degree level + field
   - Keywords: TF-IDF overlap

## API Examples

### Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

### Create Job
```bash
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Python Developer",
    "jd_text": "...",
    "must_have_skills": ["python", "fastapi"],
    "min_experience_years": 5
  }'
```

### Get Job Candidates
```bash
curl http://localhost:8000/api/v1/jobs/{job_id}/candidates \
  -H "Authorization: Bearer <token>"
```

## Testing

```bash
# Run all tests
pytest tests/

# With coverage
pytest --cov=app tests/

# Specific test file
pytest tests/test_auth.py
```

## Debugging

### Enable debug logging
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Check Ollama connection
```bash
curl http://localhost:11434/api/tags
```

### Check database
```bash
docker compose exec postgres psql -U irss_admin -d irss_db
```

### Check Redis
```bash
docker compose exec redis redis-cli ping
```

## Performance Tips

1. **Batch resume processing**: Use Celery chords for parallel scoring
2. **Cache embeddings**: pgvector with HNSW indexes is very fast
3. **Optimize LLM calls**: Lower temperature for faster parsing
4. **Connection pooling**: SQLAlchemy handles this automatically
5. **Monitor Celery**: Use `celery -A app.tasks inspect active`
