#!/usr/bin/with-contenv bashio

export ADDON=true
export PORT=8099
export NODE_ENV=production
export HASS_PORT=$(bashio::core.port)
export EXPOSED_PORT=$(bashio::addon.port "8099/tcp")

bashio::log.info "Starting Stratum on port ${PORT}..."
bashio::log.info "HASS_PORT: ${HASS_PORT}"
bashio::log.info "EXPOSED_PORT: ${EXPOSED_PORT}"

exec node /app/server.js
