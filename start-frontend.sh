#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/frontend/project"

if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

echo ""
echo "🚀 Starting frontend on http://localhost:5173"
echo ""
npm run dev
