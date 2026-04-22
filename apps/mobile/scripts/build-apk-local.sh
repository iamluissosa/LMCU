#!/bin/bash
# ─────────────────────────────────────────────
# LMCU ERP - Build APK Local (Producción)
# ─────────────────────────────────────────────
# Uso: pnpm build:android:local
#      o directamente: bash scripts/build-apk-local.sh
#
# Requisitos:
#   - Node.js >= 18
#   - Java 17 (JAVA_HOME configurado)
#   - Android SDK (ANDROID_HOME configurado)
#   - EAS CLI autenticado (npx eas login)
#   - pnpm instalado globalmente
# ─────────────────────────────────────────────

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$(dirname "$MOBILE_DIR")")"
OUTPUT_DIR="$ROOT_DIR/artifacts"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
APK_NAME="lmcu-erp-${TIMESTAMP}.apk"

echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  LMCU ERP - Build APK Local (Producción)  ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""

# ─────────────────────────────────────────────
# 1. Verificar prerequisitos
# ─────────────────────────────────────────────
echo -e "${YELLOW}[1/6] Verificando prerequisitos...${NC}"

# Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js no está instalado${NC}"
  exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}  ✓ Node.js: $NODE_VERSION${NC}"

# pnpm
if ! command -v pnpm &> /dev/null; then
  echo -e "${RED}✗ pnpm no está instalado. Ejecuta: npm install -g pnpm${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ pnpm: $(pnpm -v)${NC}"

# Java
if ! command -v java &> /dev/null; then
  echo -e "${RED}✗ Java no está instalado${NC}"
  exit 1
fi
JAVA_VER=$(java -version 2>&1 | head -1)
echo -e "${GREEN}  ✓ Java: $JAVA_VER${NC}"

# JAVA_HOME
if [ -z "${JAVA_HOME:-}" ]; then
  # Intentar auto-detectar en macOS
  if [ -x "/usr/libexec/java_home" ]; then
    export JAVA_HOME=$(/usr/libexec/java_home -v 17 2>/dev/null || /usr/libexec/java_home -v 21 2>/dev/null || /usr/libexec/java_home 2>/dev/null)
  fi
fi
if [ -z "${JAVA_HOME:-}" ]; then
  echo -e "${RED}✗ JAVA_HOME no está configurado${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ JAVA_HOME: $JAVA_HOME${NC}"

# Android SDK
if [ -z "${ANDROID_HOME:-}" ] && [ -z "${ANDROID_SDK_ROOT:-}" ]; then
  # Auto-detectar ubicación estándar en macOS
  if [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
  fi
fi
ANDROID_SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [ -z "$ANDROID_SDK" ]; then
  echo -e "${RED}✗ ANDROID_HOME no está configurado${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Android SDK: $ANDROID_SDK${NC}"

echo ""

# ─────────────────────────────────────────────
# 2. Instalar dependencias del monorepo
# ─────────────────────────────────────────────
echo -e "${YELLOW}[2/6] Instalando dependencias...${NC}"
cd "$ROOT_DIR"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
echo -e "${GREEN}  ✓ Dependencias instaladas${NC}"
echo ""

# ─────────────────────────────────────────────
# 3. Verificar variables de entorno
# ─────────────────────────────────────────────
echo -e "${YELLOW}[3/6] Verificando variables de entorno...${NC}"
ENV_FILE="$MOBILE_DIR/.env"
if [ -f "$ENV_FILE" ]; then
  API_URL=$(grep EXPO_PUBLIC_API_URL "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
  echo -e "${GREEN}  ✓ .env encontrado${NC}"
  echo -e "${BLUE}    API_URL: $API_URL${NC}"
else
  echo -e "${RED}✗ Archivo .env no encontrado en $MOBILE_DIR${NC}"
  echo -e "${YELLOW}  Crea el archivo con: EXPO_PUBLIC_API_URL=https://tu-api.onrender.com${NC}"
  exit 1
fi

# Verificar que la URL no sea localhost (advertencia)
if echo "$API_URL" | grep -q "localhost"; then
  echo -e "${YELLOW}  ⚠ ADVERTENCIA: La API apunta a localhost. ¿Estás seguro?${NC}"
  echo -e "${YELLOW}    Para producción usa: EXPO_PUBLIC_API_URL=https://erp-lmcu-api-z1pc.onrender.com${NC}"
  read -p "  Continuar de todas formas? (y/N): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Verificar que el servidor responde
echo -e "${BLUE}  Verificando conectividad con la API...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health" --connect-timeout 10 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}  ✓ API responde correctamente (HTTP $HTTP_STATUS)${NC}"
elif [ "$HTTP_STATUS" = "000" ]; then
  echo -e "${YELLOW}  ⚠ No se pudo conectar a la API (puede estar en cold start)${NC}"
else
  echo -e "${YELLOW}  ⚠ API respondió con HTTP $HTTP_STATUS${NC}"
fi
echo ""

# ─────────────────────────────────────────────
# 4. Crear directorio de salida
# ─────────────────────────────────────────────
mkdir -p "$OUTPUT_DIR"

# ─────────────────────────────────────────────
# 5. Ejecutar build con EAS local
# ─────────────────────────────────────────────
echo -e "${YELLOW}[4/6] Construyendo APK con EAS Build Local...${NC}"
echo -e "${BLUE}  Esto puede tardar entre 3-8 minutos dependiendo de tu máquina.${NC}"
echo ""

cd "$MOBILE_DIR"

BUILD_LOG="$MOBILE_DIR/build_log_latest.txt"

# Ejecutar el build
npx -y -p eas-cli eas build \
  --platform android \
  --profile production \
  --local \
  --non-interactive 2>&1 | tee "$BUILD_LOG"

BUILD_EXIT_CODE=${PIPESTATUS[0]}

if [ "$BUILD_EXIT_CODE" -ne 0 ]; then
  echo -e "\n${RED}✗ Build falló con código de salida: $BUILD_EXIT_CODE${NC}"
  echo -e "${YELLOW}  Revisa el log completo en: $BUILD_LOG${NC}"
  exit 1
fi

echo ""

# ─────────────────────────────────────────────
# 6. Ubicar y mover el APK generado
# ─────────────────────────────────────────────
echo -e "${YELLOW}[5/6] Ubicando APK generado...${NC}"

# EAS genera el APK con nombre build-<timestamp>.apk en el directorio mobile
LATEST_APK=$(ls -t "$MOBILE_DIR"/build-*.apk 2>/dev/null | head -1)

if [ -n "$LATEST_APK" ]; then
  mv "$LATEST_APK" "$OUTPUT_DIR/$APK_NAME"
  echo -e "${GREEN}  ✓ APK movido a artifacts/${NC}"
else
  echo -e "${RED}✗ No se encontró el APK generado${NC}"
  echo -e "${YELLOW}  Revisa el log en: $BUILD_LOG${NC}"
  exit 1
fi

# ─────────────────────────────────────────────
# 7. Resumen final
# ─────────────────────────────────────────────
APK_SIZE=$(du -h "$OUTPUT_DIR/$APK_NAME" | cut -f1)

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ BUILD EXITOSO                          ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BLUE}APK:${NC}     $OUTPUT_DIR/$APK_NAME"
echo -e "  ${BLUE}Tamaño:${NC}  $APK_SIZE"
echo -e "  ${BLUE}API:${NC}     $API_URL"
echo -e "  ${BLUE}Log:${NC}     $BUILD_LOG"
echo ""
echo -e "  Para instalar en un dispositivo conectado:"
echo -e "  ${YELLOW}adb install $OUTPUT_DIR/$APK_NAME${NC}"
echo ""
echo -e "  Para instalar reemplazando versión anterior:"
echo -e "  ${YELLOW}adb install -r $OUTPUT_DIR/$APK_NAME${NC}"
echo ""
