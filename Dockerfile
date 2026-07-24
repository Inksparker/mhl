# ─── Frontend ──────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ─── Backend Build (needs devDeps for TypeScript) ─────────────────────
FROM node:20-alpine AS backend-build
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# ─── Production image ─────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Copy backend compiled output
COPY --from=backend-build /app/dist ./dist
COPY --from=backend-build /app/package.json ./

# Install only production dependencies
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# Copy frontend static files
COPY --from=frontend-build /app/frontend/dist ./public

# Tells backend where to find the frontend
ENV STATIC_DIR=/app/public

EXPOSE 4000

# Create storage + ensure writable
RUN mkdir -p /app/storage && chmod 777 /app/storage

CMD ["node", "dist/index.js"]
