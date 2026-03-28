# ============================================
# ERP LMCU - API Dockerfile (pnpm monorepo)
# ============================================
# Build optimizado para Railway.
# Se usa un solo runtime stage porque pnpm + Prisma
# genera el client dentro del virtual store (.pnpm/),
# lo que complica copiar entre stages multi-stage.

FROM node:22-slim

# Habilitar pnpm via corepack (mismo version que packageManager en root)
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# OpenSSL necesario para Prisma Client
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Paso 1: Copiar archivos de configuración del monorepo ──
# (Se copian primero para aprovechar Docker layer cache)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/database/package.json packages/database/
COPY packages/types/package.json packages/types/

# ── Paso 2: Instalar dependencias ───────────────────────────
RUN pnpm install --frozen-lockfile

# ── Paso 3: Copiar código fuente ────────────────────────────
COPY packages/database/ packages/database/
COPY packages/types/ packages/types/
COPY apps/api/ apps/api/

# ── Paso 4: Build pipeline (orden importa) ──────────────────
# 1. Generar Prisma Client (necesita schema.prisma + prisma CLI)
RUN pnpm --filter @repo/database generate

# 2. Compilar paquete de types compartido
RUN pnpm --filter @erp/types build

# 3. Compilar la API NestJS
RUN pnpm --filter api build

# ── Paso 5: Runtime ─────────────────────────────────────────
ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
