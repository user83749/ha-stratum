# Build stage
FROM node:22 AS builder
WORKDIR /app

# Clone fresh from GitHub so no stale local files ever enter the image
ARG VERSION=main
RUN git clone --depth 1 --branch ${VERSION} https://github.com/user83749/ha-stratum . && \
  npm install --verbose && \
  npm run build && \
  npm prune --omit=dev

# Production stage
FROM node:22-alpine
WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.js .
COPY --from=builder /app/package.json .

COPY run.sh /app/run.sh
RUN chmod +x /app/run.sh

ENV PORT=5173 \
  NODE_ENV=production \
  ADDON=true

EXPOSE 5173
ENTRYPOINT ["/app/run.sh"]
