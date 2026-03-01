#!/usr/bin/env sh
set -e

echo "[Stratum] Starting..."

export ADDON=true
export PORT=5173
export NODE_ENV=production

if [ -n "$SUPERVISOR_TOKEN" ]; then
  export SUPERVISOR_TOKEN
fi

echo "Starting Stratum..."
node /app/server.js
