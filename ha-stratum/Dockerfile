# Build stage — use full node:20 for reliable npm install on all arches
FROM node:20 AS builder
WORKDIR /app

# Copy all files and build
COPY . .
RUN npm install --verbose && \
    npm run build && \
    npm prune --omit=dev

# Production stage — slim alpine image
FROM node:20-alpine
WORKDIR /app

# Copy only what's needed to run
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.js .
COPY --from=builder /app/package.json .

# Environment
ENV PORT=5173 \
    NODE_ENV=production \
    ADDON=true

EXPOSE 5173

# Entry point
COPY run.sh /app/run.sh
RUN chmod +x /app/run.sh
ENTRYPOINT ["/app/run.sh"]
