# ─── Frontend ──────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ─── Backend ──────────────────────────────────────────────────────────
FROM node:20-alpine AS backend
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY backend/ ./
RUN npm run build

# ─── Production image ─────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Copy backend (includes express in node_modules)
COPY --from=backend /app/dist ./dist
COPY --from=backend /app/node_modules ./node_modules
COPY --from=backend /app/package.json ./

# Copy frontend static files
COPY --from=frontend-build /app/frontend/dist ./public

# Tells backend where to find the frontend
ENV STATIC_DIR=/app/public

EXPOSE 4000

# Create storage + ensure writable
RUN mkdir -p /app/storage && chmod 777 /app/storage

CMD ["node", "dist/index.js"]
