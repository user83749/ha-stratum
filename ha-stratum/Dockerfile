# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies needed for node-gyp if any (optional but good practice)
RUN apk add --no-cache python3 make g++ git

COPY package*.json ./
RUN npm install

COPY . .

# Clear possible stale artifacts
RUN rm -rf build .svelte-kit

# Build with production env
RUN npm run build

# Prune dev dependencies before copying to production stage
RUN npm prune --omit=dev

# Production stage
FROM node:22-alpine
WORKDIR /app

# Copy the built output and prod dependencies
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.js .
COPY --from=builder /app/package.json .
COPY --from=builder /app/run.sh ./run.sh

RUN chmod +x ./run.sh

ENV PORT=8099 \
    NODE_ENV=production \
    ADDON=true

EXPOSE 8099

ENTRYPOINT ["/app/run.sh"]
