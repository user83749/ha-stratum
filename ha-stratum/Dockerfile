# Build stage - Use Debian for robust cross-architecture compilation of native modules (Tailwind 4/LightningCSS)
FROM node:22-bullseye AS builder
WORKDIR /app

# Install build tools for native dependencies
RUN apt-get update && apt-get install -y python3 make g++ git && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

# Build for production (CSR only, no SSR)
RUN npm run build

# Prune dev dependencies before copying to production stage
RUN npm prune --omit=dev


# Production stage - Final image is Alpine for HASS Add-on performance
FROM node:22-alpine
WORKDIR /app

# Copy the built output and prod dependencies
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.js .
COPY --from=builder /app/package.json .
COPY --from=builder /app/run.sh ./run.sh

RUN chmod +x ./run.sh

# Port must match HASS Ingress configuration (8099)
ENV PORT=8099 \
    NODE_ENV=production \
    ADDON=true

EXPOSE 8099

ENTRYPOINT ["/app/run.sh"]
