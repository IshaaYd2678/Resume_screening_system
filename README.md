# Intelligent Resume Screening System (IRSS) — Open Source Edition 2.0

100% open-source, self-hosted resume screening with local LLMs, no external APIs, no vendor lock-in.

## 🚀 Quick Start

```bash
# Clone and setup
git clone <repo> && cd Resume_screening_system
cp .env.example .env

# Start the entire stack (development)
docker compose up -d

# Run migrations
docker compose exec api alembic upgrade head

# Pull Ollama models (first run)
docker compose exec ollama ollama pull mistral:7b-instruct-q4_K_M
docker compose exec ollama ollama pull nomic-embed-text
docker compose exec ollama ollama pull llama3.1:8b-instruct-q4_K_M

# Access services
- Dashboard: https://localhost
- API Docs: http://localhost:8000/docs
- MinIO Console: http://localhost:9001 (minioadmin / change_me_in_production)
- Grafana: http://localhost:3001 (admin / admin)
- Jaeger: http://localhost:16686
```

## 📋 Architecture

### Services
- **api** (FastAPI 0.111+) — REST API + async task queue
- **worker** (Celery 5 + Redis) — Background processing
- **ollama** (ollama/ollama) — Local LLM inference
- **postgres** (PostgreSQL 16 + pgvector) — Primary DB + vector store
- **redis** (Redis 7) — Broker, cache, pub/sub
- **minio** (MinIO) — S3-compatible file storage
- **frontend** (React 18 + Vite) — SPA dashboard
- **caddy** (Caddy 2) — Reverse proxy + auto-HTTPS
- **prometheus** + **grafana** — Metrics & visualization
- **jaeger** — Distributed tracing
- **loki** + **promtail** — Log aggregation

All services communicate over an isolated Docker network. Zero external API calls.

## 📁 Project Structure

```
irss/
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── api/            # Route handlers
│   │   ├── core/           # Config, auth, database
│   │   ├── models/         # SQLAlchemy ORM
│   │   ├── schemas/        # Pydantic request/response
│   │   ├── nlp/            # Resume parsing, scoring, embedding
│   │   └── __main__.py     # Uvicorn entrypoint
│   ├── migrations/         # Alembic DB migrations
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile
├── frontend/               # React + TypeScript + Vite
├── infra/
│   ├── docker-compose.yml
│   ├── caddy/Caddyfile
│   ├── prometheus/
│   └── loki/
├── models/                 # Ollama model config
├── data/                   # Skills taxonomy, test data
├── tests/                  # Pytest suite
├── .env.example
└── README.md
```

## 🔑 Key Features

✅ **Resume Parsing**: PDF/DOCX extraction → JSON via local LLM (Mistral 7B)
✅ **Smart Scoring**: Skills + semantic + experience + education + keywords (5 dimensions)
✅ **Vector Search**: pgvector for ANN retrieval, HNSW indexes
✅ **Explainability (XAI)**: Per-dimension evidence, LLM narratives, highlight overlays
✅ **Async Processing**: Celery task chains for batch resume ingestion
✅ **Dashboard**: Job/candidate management, weight customization, PDF viewer
✅ **Observability**: Prometheus metrics, Grafana dashboards, Jaeger traces, Loki logs
✅ **Security**: JWT auth, bcrypt, TLS auto-cert, OWASP hardening
✅ **Scalability**: Celery workers scale horizontally; Ollama request queuing

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/jobs` | Create job opening |
| POST | `/api/v1/jobs/{id}/resumes` | Batch upload resumes |
| GET | `/api/v1/jobs/{id}/candidates` | Ranked candidates list |
| GET | `/api/v1/candidates/{id}` | Full profile + scores |
| GET | `/api/v1/candidates/{id}/explanation` | XAI narrative (streamed) |
| PATCH | `/api/v1/jobs/{id}/weights` | Update scoring weights |
| POST | `/api/v1/auth/token` | JWT login |
| GET | `/api/v1/health` | Health check |

Full docs at `http://localhost:8000/docs` (Swagger UI)

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI 0.111+, Uvicorn, Gunicorn
- **Database**: PostgreSQL 16 + pgvector
- **LLM**: Ollama + Mistral 7B / Llama 3.1 / Phi-3
- **NLP**: spaCy, sentence-transformers (all-MiniLM-L6-v2), scikit-learn, pdfminer.six, python-docx
- **Task Queue**: Celery 5 + Redis 7
- **ORM**: SQLAlchemy 2 + Alembic
- **Auth**: python-jose (JWT) + passlib (bcrypt)

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui, Tailwind CSS 3
- **State**: Zustand + TanStack Query
- **Charts**: Recharts, D3.js
- **Tables**: TanStack Table v8
- **PDF Viewer**: react-pdf

### DevOps
- **Containerization**: Docker + Docker Compose
- **Orchestration**: k3s (Kubernetes optional)
- **Reverse Proxy**: Caddy (auto-HTTPS)
- **Metrics**: Prometheus + Grafana OSS
- **Tracing**: OpenTelemetry + Jaeger
- **Logs**: Loki + Promtail

## 📦 Dependencies License

| License | Components |
|---------|-----------|
| MIT | FastAPI, React, SQLAlchemy, Celery, spaCy, pdfminer.six, python-docx, Ollama client |
| Apache-2.0 | sentence-transformers, Transformers, scikit-learn, Prometheus, Docker, Kubernetes, Mistral 7B, Llama 3.1 |
| BSD-2/BSD-3 | PostgreSQL, Redis, Pydantic, passlib, python-jose, Nginx, Recharts |
| AGPL-3.0 | Grafana OSS, Loki, MinIO (isolated infrastructure) |
| MPL-2.0 | Vault OSS, Terraform OSS |

**Note**: All core application code is built on permissively licensed software. AGPL components (Grafana, Loki, MinIO) are run as isolated services and do not restrict your application's license.

## 🚦 Development Sprints

- **Sprint 1**: Docker Compose, Postgres + pgvector, Auth API, CI
- **Sprint 2**: Resume parser (PDF/DOCX → Ollama JSON)
- **Sprint 3**: Embeddings (nomic-embed-text), pgvector storage, similarity scoring
- **Sprint 4**: Ranking engine, weight config, full REST API, Celery
- **Sprint 5**: XAI (evidence extraction, LLM narratives, highlighting)
- **Sprint 6**: Dashboard (upload UI, candidate table, score radar)
- **Sprint 7**: Detail view, PDF viewer, weight sliders, export
- **Sprint 8**: Observability tuning, security audit, docs, performance optimization

## ⚙️ System Requirements

### Development (CPU or GPU)
- **CPU-only**: 16 GB RAM, 4 cores (Mistral 7B tokenization slower but works)
- **GPU optional**: 8 GB VRAM (NVIDIA/AMD) for faster inference
- **Storage**: 50 GB free (Ollama models + resumes + system)

### Production (Kubernetes)
- **Minimum**: 3 nodes, 4 GB RAM each
- **Recommended**: 8 GB RAM, 2 cores per node; GPU node for Ollama
- **Persistent volume**: NFS/EBS for MinIO and Postgres

## 🔒 Security Hardening

✅ JWT authentication with bcrypt password hashing
✅ OWASP Top 10 defenses (SQL injection via SQLAlchemy parameterization, CSRF tokens, etc.)
✅ TLS auto-cert via Caddy
✅ PII encrypted at rest (configurable)
✅ Rate limiting on auth endpoints
✅ Input validation via Pydantic
✅ All data on-premise; no external APIs
✅ Docker network isolation
✅ .env secrets, never committed

## 📈 Performance Targets

- Single resume parse + score: ≤5s (CPU) / ≤2s (GPU)
- Batch 100 resumes: ≤10 min on 16 GB RAM CPU server
- Skill extraction F1: ≥0.85 with Mistral 7B
- Ranking quality (NDCG@10): ≥0.80

## 📚 Documentation

- `backend/README.md` — API development guide
- `frontend/README.md` — Dashboard development
- `infra/README.md` — Deployment & scaling
- `models/README.md` — Ollama model management
- `data/README.md` — Skills taxonomy usage

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Run tests: `pytest tests/`
4. Format code: `black . && ruff check --fix .`
5. Commit and push
6. Open a pull request

## 📝 License

All code and documentation released under **MIT License**. See [LICENSE](LICENSE) for details.

**Dependency Licenses**: All transitive dependencies conform to MIT, Apache-2.0, BSD-2/3, or LGPL. AGPL components (Grafana, Loki, MinIO) are infrastructure services, not bundled with application code.

---

**Built with ❤️ on 100% open source. No vendor lock-in. Self-hosted. Privacy first.**
