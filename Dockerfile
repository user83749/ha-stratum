# Global ARG must be before first FROM to be usable in FROM instructions
ARG BUILD_FROM=ghcr.io/hassio-addons/base-nodejs:0.2.5

# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++ git

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build && npm prune --omit=dev

# Production stage — HA injects the correct base image via BUILD_FROM build-arg
# hadolint ignore=DL3006
FROM ${BUILD_FROM}

WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.js .
COPY --from=builder /app/package.json .
COPY run.sh /run.sh

RUN chmod a+x /run.sh && \
    mkdir -p /data

ENV PORT=8099 \
    NODE_ENV=production \
    ADDON=true

EXPOSE 8099

CMD ["/run.sh"]
