# Build stage
FROM node:22 AS builder
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy the rest of the source
COPY . .

# Ensure no stale build files exist before building
RUN rm -rf build .svelte-kit node_modules/.cache

# Build the app
RUN npm run build

# Prune dev dependencies
RUN npm prune --omit=dev


# Production stage
FROM node:22-alpine
WORKDIR /app

# Copy only the necessary files for production
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.js .
COPY --from=builder /app/package.json .
COPY --from=builder /app/run.sh ./run.sh

RUN chmod +x ./run.sh

ENV PORT=5173 \
    NODE_ENV=production \
    ADDON=true

EXPOSE 5173

ENTRYPOINT ["/app/run.sh"]
