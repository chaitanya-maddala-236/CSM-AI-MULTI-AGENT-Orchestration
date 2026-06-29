#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/backend"

# Use root-level .env if present; otherwise create from example
ROOT_ENV="$(dirname "$0")/.env"
if [ ! -f "$ROOT_ENV" ] && [ -f ".env.example" ]; then
  echo "📋 Creating .env from example..."
  cp .env.example "$ROOT_ENV"
  echo ""
  echo "⚠️  Please edit .env and add your AI provider key:"
  echo "   OPENAI_API_KEY=sk-...   OR"
  echo "   GROQ_API_KEY=gsk_...   OR"
  echo "   GEMINI_API_KEY=AIza..."
  echo ""
fi

if [ ! -d "venv" ]; then
  echo "🔧 Creating Python virtualenv..."
  python3 -m venv venv
fi

source venv/bin/activate
echo "📦 Installing dependencies..."
pip install -r requirements.txt -q

echo "🗄️  Initialising database..."
python -c "
import asyncio
from app.core.database import init_db
asyncio.run(init_db())
print('Database ready.')
"

echo "🌱 Seeding demo data..."
python -m app.utils.seed 2>/dev/null || echo "Seed skipped (run manually if needed)"

echo ""
echo "🚀 Starting backend on http://localhost:8000"
echo "   API docs: http://localhost:8000/docs"
echo ""
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
