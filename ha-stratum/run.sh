#!/usr/bin/env sh
set -e

echo "[Stratum] Starting Home Assistant Add-on..."

# The Home Assistant add-on environment provides persistent storage at /data
# Check if /data/dashboard.json exists; if not, initialize with an empty config if needed
if [ ! -f "/data/dashboard.json" ]; then
    echo "[Stratum] /data/dashboard.json not found. Initializing storage..."
    # You might want to copy a default dashboard.json here if one exists
fi

export ADDON=true
export PORT=5173
export NODE_ENV=production

echo "[Stratum] Booting server.js..."
node server.js
