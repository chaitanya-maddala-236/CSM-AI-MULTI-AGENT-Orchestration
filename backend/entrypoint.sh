#!/bin/bash
set -e

echo "🚀 Starting CS Copilot Backend..."

# Apply any schema patches (idempotent ALTER TABLE for new columns)
echo "🔧 Applying schema patches..."
python -c "
import asyncio, asyncpg, os

async def patch():
    url = os.environ.get('DATABASE_URL', '').replace('postgresql+asyncpg://', 'postgresql://')
    conn = await asyncpg.connect(url)
    patches = [
        \"ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb\",
        \"ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS outcome VARCHAR(20)\",
    ]
    for sql in patches:
        await conn.execute(sql)
        print(f'  ✓ {sql[:70]}...')
    await conn.close()

asyncio.run(patch())
" && echo "✅ Schema patches done" || echo "⚠️  Schema patch failed — continuing anyway"

# Run seed on first launch (seed() creates its own engine, checks nothing - always recreates)
# Use a simple flag file to avoid re-seeding on every container restart
SEED_FLAG="/app/.seeded"
if [ ! -f "$SEED_FLAG" ]; then
    echo "🌱 Seeding demo data (first launch)..."
    python -m app.utils.seed && touch "$SEED_FLAG" && echo "✅ Seed complete" || echo "⚠️  Seed failed — app will still start"
else
    echo "✅ Already seeded, skipping"
fi

# Start the application
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
