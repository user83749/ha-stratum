ARG BUILD_FROM=homeassistant/amd64-base-node:20
FROM $BUILD_FROM AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Final stage
FROM $BUILD_FROM
WORKDIR /app

# Copy built assets and dependencies
COPY --from=build-stage /app/build ./build
COPY --from=build-stage /app/node_modules ./node_modules
COPY package.json server.js ./

# HA Add-on support
ENV ADDON=true
ENV NODE_ENV=production
ENV PORT=5173
EXPOSE 5173

# Entry point
COPY run.sh /app/run.sh
RUN chmod +x /app/run.sh
ENTRYPOINT ["/app/run.sh"]
