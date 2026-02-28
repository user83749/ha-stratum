#!/usr/bin/with-contenv bashio

export HASS_PORT=$(bashio::core.port)
export EXPOSED_PORT=$(bashio::addon.port "5173/tcp")

echo "[Stratum] Starting..."
node /rootfs/server.js
