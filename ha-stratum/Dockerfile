# ha base image
ARG BUILD_FROM

# first stage — use node:22 (same as ha-fusion)
FROM node:22 AS builder
WORKDIR /app

# Clone fresh from GitHub — no stale local files ever get into the image
RUN git clone --depth 1 https://github.com/user83749/ha-stratum . && \
  npm install --verbose && \
  npm run build && \
  npm prune --omit=dev

# second stage — use HA base image
FROM $BUILD_FROM
WORKDIR /rootfs

# Copy only what's needed to run
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.js .
COPY --from=builder /app/package.json .

# Copy entrypoint
COPY run.sh /

# Install node and set up persistent data symlink
RUN apk add --no-cache nodejs-current && \
  ln -s /rootfs/data /data && \
  chmod a+x /run.sh

# Environment
ENV PORT=5173 \
  NODE_ENV=production \
  ADDON=true

CMD [ "/run.sh" ]
