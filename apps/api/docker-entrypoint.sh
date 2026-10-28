#!/bin/sh
set -e
cd /app
echo "Running Prisma migrate deploy…"
pnpm --filter @flowforge/db exec prisma migrate deploy
if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "Seeding database…"
  pnpm --filter @flowforge/db seed || true
fi
export API_PORT="${PORT:-${API_PORT:-3001}}"
echo "Starting API on ${API_PORT}…"
exec node apps/api/dist/server.js
