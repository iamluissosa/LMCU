---
description: Cómo ejecutar la app ERP (frontend + backend) correctamente en Windows
---

# Ejecutar la App ERP en Windows

> **Problema conocido**: El comando `pnpm dev` usa Turbo TUI que en Windows puede crashear
> silenciosamente el proceso `api` (NestJS). Por eso se recomienda correr cada servicio
> en terminales separadas.

## Opción A - Terminales separadas (recomendado en Windows)

// turbo
1. En una terminal, levantar la API (NestJS en puerto 3001):
```powershell
pnpm --filter api dev
```

// turbo
2. En otra terminal, levantar el Frontend (Next.js en puerto 3000):
```powershell
pnpm --filter web dev
```

## Opción B - Turbo sin TUI (una sola terminal)

// turbo
1. Correr todo con la UI desactivada (evita el bug de TUI en Windows):
```powershell
pnpm turbo dev --ui=stream
```

## Verificar que todo está corriendo

// turbo
3. Confirmar que los puertos están activos:
```powershell
netstat -ano | findstr "LISTENING" | findstr ":300"
```

Debería mostrar:
- `0.0.0.0:3000` → Next.js Frontend  
- `[::]:3001` → NestJS API

## URLs

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| API      | http://localhost:3001 |
