# Infrastructure Guide

## Docker Compose Services

The stack includes 11 services:

### Core Services
- **api**: FastAPI backend (port 8000)
- **worker**: Celery async tasks
- **frontend**: React SPA (port 3000)

### Data & Storage
- **postgres**: PostgreSQL 16 with pgvector
- **redis**: Redis 7 (cache, broker)
- **minio**: S3-compatible storage (port 9000/9001)

### LLM & Inference
- **ollama**: Local LLM server (port 11434)

### Infrastructure
- **caddy**: Reverse proxy + HTTPS (ports 80/443)
- **prometheus**: Metrics (port 9090)
- **grafana**: Dashboards (port 3001)
- **jaeger**: Distributed tracing (port 16686)
- **loki**: Log aggregation (port 3100)
- **promtail**: Log collector

## Quick Start

```bash
# Copy environment
cp .env.example .env

# Start stack
docker compose up -d

# Wait for services to be healthy
docker compose ps

# Run migrations
docker compose exec api alembic upgrade head

# Pull Ollama models
docker compose exec ollama ollama pull mistral:7b-instruct-q4_K_M
docker compose exec ollama ollama pull nomic-embed-text
docker compose exec ollama ollama pull llama3.1:8b-instruct-q4_K_M
```

## Accessing Services

- **API Docs**: http://localhost:8000/docs
- **Dashboard**: https://localhost (or http://localhost via Caddy)
- **MinIO Console**: http://localhost:9001
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **Jaeger**: http://localhost:16686
- **Loki**: http://localhost:3100

## Scaling

### Horizontal Scaling (Multiple Workers)
```bash
docker compose up -d --scale worker=3
```

### Load Testing
```bash
# With locust
pip install locust
locust -f locustfile.py
```

## Monitoring

### Prometheus Queries
```
# API request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Database connection pool usage
pg_stat_activity_current_query_active_seconds
```

### Grafana Dashboards
Pre-configured dashboards for:
- API performance
- Database queries
- Redis cache hit rate
- Celery task metrics

### Jaeger Traces
Distributed traces show end-to-end request flow:
```
api → postgres (SQL)
api → redis (cache)
api → ollama (LLM)
api → minio (upload)
celery → ollama
celery → postgres
```

## Logs

View logs from services:
```bash
# API logs
docker compose logs -f api

# Worker logs
docker compose logs -f worker

# All services
docker compose logs -f

# Follow specific container
docker compose logs -f postgres
```

Access via Loki/Grafana at http://localhost:3001

## Backup & Recovery

### Backup PostgreSQL
```bash
docker compose exec postgres pg_dump -U irss_admin irss_db > backup.sql
```

### Restore PostgreSQL
```bash
docker compose exec -T postgres psql -U irss_admin irss_db < backup.sql
```

### Backup MinIO
```bash
docker compose exec minio mc mirror minio/irss-resumes ./minio-backup
```

## Troubleshooting

### Service won't start
```bash
# Check logs
docker compose logs api

# Restart service
docker compose restart api

# Full rebuild
docker compose down
docker compose up -d --build
```

### Database connection errors
```bash
# Check if postgres is running
docker compose ps postgres

# Test connection
docker compose exec postgres pg_isready -U irss_admin
```

### Ollama models not available
```bash
# Pull models again
docker compose exec ollama ollama pull mistral:7b-instruct-q4_K_M

# List available models
docker compose exec ollama ollama list
```

### Redis connection issues
```bash
# Test connection
docker compose exec redis redis-cli ping

# Clear cache
docker compose exec redis redis-cli FLUSHALL
```

## Production Deployment

### Kubernetes (k3s)
```bash
# Install k3s
curl -sfL https://get.k3s.io | sh -

# Deploy using kubectl
kubectl apply -f k8s/
```

### Environment Setup
```bash
# Use strong JWT secret
export JWT_SECRET_KEY=$(openssl rand -hex 32)

# Use Vault for secrets in production
docker compose -f docker-compose.prod.yml up -d
```

### SSL/TLS
Caddy auto-generates certificates via Let's Encrypt (production)
or self-signed (development)

### Resource Limits
Set resource limits in docker-compose for production:
```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

## Performance Tuning

### PostgreSQL
- Increase `max_connections`: 100 → 200
- Enable `shared_preload_libraries` for extensions
- Tune `work_mem` and `maintenance_work_mem`
- Monitor with `pg_stat_statements`

### Redis
- Increase `maxmemory` policy
- Use persistence (RDB snapshotting)
- Enable `lazyfree-lazy-eviction`

### Ollama
- Adjust batch size: `num_batch`
- Control context window: `num_ctx`
- Set GPU allocation: `gpu_layers`

## Security Hardening

```bash
# Change all default passwords
export POSTGRES_PASSWORD=<strong-password>
export MINIO_ROOT_PASSWORD=<strong-password>
export JWT_SECRET_KEY=<random-64-chars>

# Enable TLS
CADDY_ENVIRONMENT=production docker compose up -d

# Disable unnecessary ports
# Use iptables or firewall rules to restrict access

# Regular updates
docker compose pull
docker compose up -d
```
