# ============================================
# ERP LMCU - API Dockerfile
# ============================================
# Build context: /apps/api (Railway rootDirectory)
# Runs as a standalone NestJS app from the api directory.

FROM node:22-slim

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# OpenSSL required for Prisma Client
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Step 1: Copy package manifest and install dependencies ──
COPY package.json ./

RUN pnpm install --frozen-lockfile

# ── Step 2: Copy source and build ───────────────────────────
COPY . .

RUN pnpm build

# ── Step 3: Runtime ─────────────────────────────────────────
ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/main.js"]
