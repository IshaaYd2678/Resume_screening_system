.PHONY: help dev prod test lint format clean stop restart logs

# Colors
BLUE := \033[0;34m
GREEN := \033[0;32m
RED := \033[0;31m
NC := \033[0m # No Color

help:
	@echo "$(BLUE)IRSS - Intelligent Resume Screening System$(NC)"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make dev          Start development stack"
	@echo "  make logs         View logs from all services"
	@echo "  make stop         Stop all services"
	@echo "  make restart      Restart all services"
	@echo ""
	@echo "$(GREEN)Database:$(NC)"
	@echo "  make migrate      Run database migrations"
	@echo "  make migrate-new  Create new migration"
	@echo ""
	@echo "$(GREEN)Testing:$(NC)"
	@echo "  make test         Run pytest suite"
	@echo "  make test-cov     Run tests with coverage"
	@echo ""
	@echo "$(GREEN)Code Quality:$(NC)"
	@echo "  make lint         Run linter (ruff)"
	@echo "  make format       Format code (black, ruff)"
	@echo "  make type-check   Run type checker (mypy)"
	@echo ""
	@echo "$(GREEN)Cleanup:$(NC)"
	@echo "  make clean        Remove Python cache files"
	@echo "  make clean-db     Reset database"

dev:
	@echo "$(GREEN)Starting IRSS development stack...$(NC)"
	cd infra && docker compose up -d
	@echo "$(GREEN)Waiting for services to be ready...$(NC)"
	sleep 5
	@echo "$(GREEN)Running migrations...$(NC)"
	cd infra && docker compose exec -T api alembic upgrade head
	@echo "$(GREEN)Pulling Ollama models...$(NC)"
	cd infra && docker compose exec ollama ollama pull mistral:7b-instruct-q4_K_M &
	cd infra && docker compose exec ollama ollama pull nomic-embed-text &
	cd infra && docker compose exec ollama ollama pull llama3.1:8b-instruct-q4_K_M &
	@echo "$(GREEN)✓ Stack ready!$(NC)"
	@echo "  API Docs: http://localhost:8000/docs"
	@echo "  Dashboard: http://localhost:3000"
	@echo "  Grafana: http://localhost:3001 (admin/admin)"

prod:
	@echo "$(GREEN)Starting IRSS production stack...$(NC)"
	cd infra && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
	@echo "$(GREEN)✓ Production stack started$(NC)"

logs:
	cd infra && docker compose logs -f

stop:
	@echo "$(RED)Stopping IRSS stack...$(NC)"
	cd infra && docker compose down
	@echo "$(RED)✓ Stopped$(NC)"

restart:
	@echo "$(BLUE)Restarting IRSS stack...$(NC)"
	cd infra && docker compose restart
	@echo "$(GREEN)✓ Restarted$(NC)"

migrate:
	@echo "$(GREEN)Running migrations...$(NC)"
	cd infra && docker compose exec api alembic upgrade head

migrate-new:
	@echo "$(BLUE)Enter migration message:$(NC)"
	@read msg; cd infra && docker compose exec api alembic revision --autogenerate -m "$$msg"

test:
	@echo "$(GREEN)Running tests...$(NC)"
	cd backend && pytest tests/ -v

test-cov:
	@echo "$(GREEN)Running tests with coverage...$(NC)"
	cd backend && pytest tests/ --cov=app --cov-report=html

lint:
	@echo "$(GREEN)Linting code...$(NC)"
	cd backend && ruff check app/ && echo "$(GREEN)✓ Linting passed$(NC)"

format:
	@echo "$(GREEN)Formatting code...$(NC)"
	cd backend && black app/ && ruff check --fix app/
	@echo "$(GREEN)✓ Formatted$(NC)"

type-check:
	@echo "$(GREEN)Type checking...$(NC)"
	cd backend && mypy app/

clean:
	@echo "$(RED)Cleaning Python cache...$(NC)"
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	@echo "$(GREEN)✓ Cleaned$(NC)"

clean-db:
	@echo "$(RED)Resetting database...$(NC)"
	cd infra && docker compose exec postgres dropdb -U irss_admin irss_db
	cd infra && docker compose exec postgres createdb -U irss_admin irss_db
	@echo "$(GREEN)✓ Database reset$(NC)"
	make migrate

shell:
	@echo "$(BLUE)Opening Python shell...$(NC)"
	cd backend && python -c "from app.core.database import SessionLocal; from app.models import *; db = SessionLocal(); import code; code.interact(local=locals())"

shell-db:
	@echo "$(BLUE)Opening PostgreSQL shell...$(NC)"
	cd infra && docker compose exec postgres psql -U irss_admin -d irss_db

celery-monitor:
	@echo "$(BLUE)Opening Celery monitor...$(NC)"
	cd backend && celery -A app.tasks inspect active
