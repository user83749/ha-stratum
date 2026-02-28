# Build stage
FROM node:20-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Final stage
FROM node:20-alpine
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
