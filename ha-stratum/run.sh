#!/usr/bin/env sh
set -e

echo "[Stratum] Starting Home Assistant Add-on..."

# ── Persistent storage ───────────────────────────────────────────────────────
if [ ! -f "/data/dashboard.json" ]; then
    echo "[Stratum] /data/dashboard.json not found. Initializing storage..."
fi

# ── Environment ──────────────────────────────────────────────────────────────
export ADDON=true
export PORT=5173
export NODE_ENV=production

# The Supervisor automatically injects SUPERVISOR_TOKEN when
# homeassistant_api: true is set in config.yaml.
# We just forward it so server.js can use it.
if [ -n "$SUPERVISOR_TOKEN" ]; then
    echo "[Stratum] Supervisor API token detected."
    export SUPERVISOR_TOKEN
fi

# ── Boot ─────────────────────────────────────────────────────────────────────
echo "[Stratum] Booting server.js..."
exec node server.js
