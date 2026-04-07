#!/bin/sh
set -e

echo "[startup] Waiting for PostgreSQL to be ready..."

# Wait up to 30 seconds for postgres
RETRIES=30
until node -e "
  import('postgres').then(m => {
    const sql = m.default(process.env.DATABASE_URL);
    sql\`SELECT 1\`.then(() => { sql.end(); process.exit(0); })
      .catch(() => { sql.end(); process.exit(1); });
  });
" 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    echo "[startup] ERROR: PostgreSQL not reachable after 30s"
    exit 1
  fi
  echo "[startup] Postgres not ready, retrying in 1s... ($RETRIES attempts left)"
  sleep 1
done

echo "[startup] PostgreSQL is ready."

echo "[startup] Pushing database schema..."
cd /app/packages/cloud
npx drizzle-kit push --force

echo "[startup] Starting cloud server..."
cd /app
node packages/cloud/dist/index.js
