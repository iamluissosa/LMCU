# ============================================
# ERP LMCU - API Dockerfile (pnpm monorepo)
# ============================================
# Multi-stage build para producción optimizada.
# Railway detectará este Dockerfile automáticamente.

# ── Stage 1: Base con pnpm ──────────────────
FROM node:22-slim AS base

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Stage 2: Instalar dependencias ──────────
FROM base AS deps

# Copiar archivos de configuración del monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/database/package.json packages/database/
COPY packages/types/package.json packages/types/

# Instalar TODAS las dependencias (necesitamos devDeps para build)
RUN pnpm install --frozen-lockfile

# ── Stage 3: Build ──────────────────────────
FROM deps AS build

# Copiar todo el código fuente
COPY packages/database/ packages/database/
COPY packages/types/ packages/types/
COPY apps/api/ apps/api/

# 1. Generar Prisma Client
RUN pnpm --filter @repo/database generate

# 2. Compilar paquete de types compartido
RUN pnpm --filter @erp/types build

# 3. Compilar la API NestJS
RUN pnpm --filter api build

# ── Stage 4: Producción ─────────────────────
FROM node:22-slim AS production

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar archivos de configuración del monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/database/package.json packages/database/
COPY packages/types/package.json packages/types/

# Instalar solo dependencias de producción
RUN pnpm install --frozen-lockfile --prod

# Copiar Prisma schema y regenerar client en producción
COPY packages/database/prisma/ packages/database/prisma/
COPY packages/database/index.ts packages/database/index.ts
RUN pnpm --filter @repo/database generate

# Copiar artefactos compilados
COPY --from=build /app/packages/types/dist/ packages/types/dist/
COPY --from=build /app/apps/api/dist/ apps/api/dist/

# Configuración de la app
ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
