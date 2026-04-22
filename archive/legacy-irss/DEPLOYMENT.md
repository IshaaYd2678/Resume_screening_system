# Deployment Guide

## Local Development

```bash
# 1. Clone repository
git clone <repo-url>
cd Resume_screening_system

# 2. Copy environment
cp .env.example .env

# 3. Start stack
make dev

# 4. Access services
- Dashboard: http://localhost:3000
- API Docs: http://localhost:8000/docs
- Grafana: http://localhost:3001 (admin/admin)
```

## Testing

```bash
# Run tests
make test

# With coverage
make test-cov

# Type checking
make type-check

# Code formatting
make format
```

## Docker Compose Deployment

### Single Machine (Development)
```bash
cd infra
docker compose up -d

# Run migrations
docker compose exec api alembic upgrade head

# Pull models
docker compose exec ollama ollama pull mistral:7b-instruct-q4_K_M
docker compose exec ollama ollama pull nomic-embed-text
```

### Production (with optimization)

1. **Setup environment**
```bash
# .env.production
ENVIRONMENT=production
DEBUG=false
RELOAD=false
POSTGRES_PASSWORD=<strong-password>
MINIO_ROOT_PASSWORD=<strong-password>
JWT_SECRET_KEY=<random-64-chars>
```

2. **Deploy**
```bash
docker compose -f infra/docker-compose.yml \
               -f infra/docker-compose.prod.yml \
               up -d
```

3. **Verify**
```bash
docker compose ps
docker compose logs api
```

## Kubernetes Deployment (k3s)

### Prerequisites
```bash
# Install k3s on your server
curl -sfL https://get.k3s.io | sh -

# Install kubectl locally
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
```

### Deploy IRSS Stack
```bash
# 1. Create namespace
kubectl create namespace irss

# 2. Create secrets
kubectl -n irss create secret generic irss-secrets \
  --from-literal=postgres-password=<password> \
  --from-literal=jwt-secret=<secret> \
  --from-literal=minio-password=<password>

# 3. Deploy services
kubectl -n irss apply -f k8s/postgres.yaml
kubectl -n irss apply -f k8s/redis.yaml
kubectl -n irss apply -f k8s/ollama.yaml
kubectl -n irss apply -f k8s/minio.yaml
kubectl -n irss apply -f k8s/api.yaml
kubectl -n irss apply -f k8s/worker.yaml
kubectl -n irss apply -f k8s/frontend.yaml

# 4. Monitor
kubectl -n irss get pods
kubectl -n irss logs -f deployment/api
```

## Scaling

### Horizontal Scaling (Multiple Workers)
```bash
# Docker Compose
docker compose up -d --scale worker=3

# Kubernetes
kubectl -n irss scale deployment/worker --replicas=3
```

### Resource Limits
```yaml
resources:
  requests:
    memory: "2Gi"
    cpu: "1000m"
  limits:
    memory: "4Gi"
    cpu: "2000m"
```

## Monitoring & Observability

### Prometheus Metrics
- Available at: http://localhost:9090
- Pre-configured scrapers for API, database, Redis

### Grafana Dashboards
- URL: http://localhost:3001
- Default: admin/admin
- Pre-built dashboards for:
  - API performance
  - Database queries
  - Celery jobs
  - System resources

### Jaeger Traces
- URL: http://localhost:16686
- Search traces by service
- View end-to-end request flow

### Logs (Loki)
- Query: http://localhost:3001 (via Grafana)
- Search by job name, error level, duration

## Backup & Disaster Recovery

### Database Backup
```bash
# Automated daily backup
0 2 * * * docker compose exec -T postgres pg_dump -U irss_admin irss_db | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz

# Manual backup
docker compose exec postgres pg_dump -U irss_admin irss_db > backup.sql

# Restore
cat backup.sql | docker compose exec -T postgres psql -U irss_admin irss_db
```

### MinIO Backup
```bash
# Install mc (MinIO client)
curl https://dl.min.io/client/mc/release/linux-amd64/mc --create-dirs -o ~/minio-binaries/mc
chmod +x ~/minio-binaries/mc

# Backup bucket
mc mirror minio/irss-resumes /backups/minio/

# Restore
mc mirror /backups/minio/ minio/irss-resumes
```

### Volume Backup
```bash
# Backup all volumes
tar czf backup-volumes.tar.gz postgres_data/ redis_data/ minio_data/ ollama_data/

# Restore
tar xzf backup-volumes.tar.gz
docker compose up -d
```

## Security Hardening

### SSL/TLS
```bash
# Auto-HTTPS via Caddy (dev uses self-signed, production uses Let's Encrypt)
CADDY_ACME_CA=https://acme-v02.api.letsencrypt.org/directory
CADDY_EMAIL=admin@example.com
docker compose up -d caddy
```

### Secrets Management
```bash
# Option 1: Docker Secrets (Swarm mode)
echo 'your-secret' | docker secret create jwt_secret -

# Option 2: Vault (recommended for production)
# See vault-setup.sh

# Option 3: Environment (dev only)
# Note: Never commit to git
export JWT_SECRET_KEY=<random>
```

### Network Isolation
```bash
# Only expose Caddy (port 80/443) to internet
# Keep internal services on docker network
docker network create irss_internal --driver bridge --opt "com.docker.network.bridge.enable_ip_masquerade"="false"
```

### Authentication
```bash
# All API endpoints require JWT token
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/jobs

# Rotate JWT secret regularly
JWT_SECRET_KEY=<new-secret> docker compose up -d api worker
```

## Performance Tuning

### PostgreSQL
```sql
-- Check slow queries
SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC;

-- Optimize indexes
ANALYZE;
VACUUM ANALYZE;

-- Check connection pool
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
```

### Redis
```bash
# Monitor commands
redis-cli MONITOR

# Check memory usage
redis-cli INFO memory

# Optimize: Enable persistence
appendonly yes
appendfsync everysec
```

### Ollama
```bash
# Check loaded models
curl http://localhost:11434/api/tags

# Monitor inference
# Check logs: docker logs irss_ollama

# Optimize: Adjust batch size and context window
MODEL_BATCH_SIZE=128 MODEL_NUM_CTX=2048
```

## Troubleshooting

### Service won't start
```bash
# Check logs
docker compose logs -f service_name

# Verify health
docker compose ps

# Rebuild
docker compose down
docker compose up -d --build
```

### Database issues
```bash
# Connect to database
docker compose exec postgres psql -U irss_admin -d irss_db

# Check connections
SELECT * FROM pg_stat_activity;

# Restart PostgreSQL
docker compose restart postgres
```

### OOM (Out of Memory)
```bash
# Check memory usage
docker stats

# Increase Docker memory limit
# Edit /etc/docker/daemon.json:
{
  "memory": "8g",
  "memory-swap": "8g"
}

# Restart docker
systemctl restart docker
```

### Ollama models not loading
```bash
# Check available space
df -h /root/.ollama

# Pull models manually
docker compose exec ollama ollama pull mistral:7b-instruct-q4_K_M

# Check logs
docker compose logs ollama
```

## Rollback

```bash
# Tag current state
git tag v2.0.1

# Rollback to previous version
git checkout v2.0.0
docker compose down
docker compose up -d --build

# Database migrations (if needed)
docker compose exec api alembic downgrade -1
```

## Cost Optimization

### Reduce Resource Usage
- Use Q4 quantized models (vs full precision)
- CPU inference only (vs GPU)
- Smaller embedding model (384 dims vs 1536)
- Connection pooling reduces latency

### Auto-scaling (Kubernetes)
```yaml
autoscaling:
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

### Reserved Instances (AWS/GCP)
- 30-50% savings for committed capacity
- Use for stable base load

## Support & Maintenance

### Logs
```bash
# Stream all logs
docker compose logs -f

# Specific service
docker compose logs -f api

# Last 100 lines
docker compose logs --tail 100
```

### Version Upgrade
```bash
# Check current versions
docker images | grep irss

# Pull latest
docker compose pull

# Restart
docker compose up -d

# Verify
docker compose ps
```

### Security Updates
```bash
# Update base images
docker pull postgres:16
docker pull redis:7
docker pull node:20

# Rebuild all services
docker compose down
docker compose up -d --build
```
