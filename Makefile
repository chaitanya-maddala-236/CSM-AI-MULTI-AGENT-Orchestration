# ============================================================
# CS Copilot — Developer shortcuts
# Usage: make <target>
# ============================================================

.PHONY: help up down logs seed test lint build clean

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ── Docker ───────────────────────────────────────────────────
up:  ## Start all services (detached)
	docker-compose up -d

down:  ## Stop all services
	docker-compose down

logs:  ## Tail backend logs
	docker-compose logs -f backend

build:  ## Rebuild all Docker images
	docker-compose build --no-cache

shell:  ## Open a shell in the backend container
	docker-compose exec backend bash

# ── Data ─────────────────────────────────────────────────────
seed:  ## Re-seed demo data in running backend container
	docker-compose exec backend python -m app.utils.seed

seed-local:  ## Seed demo data locally (backend must be running)
	cd backend && python -m app.utils.seed

seed-demo:  ## Seed the canonical 4-customer demo dataset
	docker-compose exec backend python -m app.utils.seed_demo

# ── Tests ────────────────────────────────────────────────────
test:  ## Run all backend tests
	cd backend && pytest tests/ -v

test-watch:  ## Run tests in watch mode (requires pytest-watch)
	cd backend && ptw tests/ -v

test-cov:  ## Run tests with coverage report
	cd backend && pytest tests/ -v --cov=app --cov-report=term-missing

# ── Local dev ────────────────────────────────────────────────
dev-backend:  ## Start backend locally (needs .env in root)
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:  ## Start frontend locally (http://localhost:5173)
	cd frontend/project && npm run dev

install-backend:  ## Install backend Python dependencies
	cd backend && pip install -r requirements.txt

install-frontend:  ## Install frontend npm packages
	cd frontend/project && npm install

install: install-backend install-frontend  ## Install all dependencies

# ── Lint ─────────────────────────────────────────────────────
lint:  ## Lint backend with ruff (install: pip install ruff)
	cd backend && ruff check app/ tests/

format:  ## Format backend with ruff
	cd backend && ruff format app/ tests/

# ── Cleanup ──────────────────────────────────────────────────
clean:  ## Remove containers, volumes, and caches
	docker-compose down -v
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
