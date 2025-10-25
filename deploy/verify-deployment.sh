#!/bin/bash
# Script de verificación rápida del despliegue de Restaurant App
# 
# Uso: ./verify-deployment.sh
# 
# Este script verifica que todos los servicios estén corriendo correctamente

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     VERIFICACIÓN DE DESPLIEGUE - RESTAURANT APP              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para checks
check_service() {
    local service=$1
    local name=$2
    
    if systemctl is-active --quiet "$service"; then
        echo -e "${GREEN}✓${NC} $name está activo"
        if systemctl is-enabled --quiet "$service"; then
            echo -e "  ${GREEN}✓${NC} Habilitado para arranque automático"
        else
            echo -e "  ${YELLOW}⚠${NC} No está habilitado para arranque automático"
        fi
    else
        echo -e "${RED}✗${NC} $name NO está activo"
        return 1
    fi
}

check_port() {
    local port=$1
    local name=$2
    
    if ss -ltn | grep -q ":$port "; then
        echo -e "${GREEN}✓${NC} Puerto $port ($name) está escuchando"
    else
        echo -e "${RED}✗${NC} Puerto $port ($name) NO está escuchando"
        return 1
    fi
}

check_http() {
    local url=$1
    local name=$2
    
    if curl -sf "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name responde correctamente"
    else
        echo -e "${RED}✗${NC} $name NO responde"
        return 1
    fi
}

# 1. Backend Service
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Backend Service (systemd)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_service "backend-restaurant.service" "Backend Restaurant"
check_port 3001 "Backend API"

# Test backend API
if check_http "http://localhost:3001/api/dishes" "Backend API (/api/dishes)"; then
    DISHES=$(curl -s http://localhost:3001/api/dishes | head -c 80)
    echo -e "  Respuesta: ${DISHES}..."
fi

# Memory usage
MEMORY=$(systemctl show backend-restaurant.service --property=MemoryCurrent --value 2>/dev/null)
if [ -n "$MEMORY" ] && [ "$MEMORY" != "0" ]; then
    MEMORY_MB=$((MEMORY / 1024 / 1024))
    echo -e "  Memoria en uso: ${MEMORY_MB}MB"
fi

echo ""

# 2. Nginx
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Nginx Web Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_service "nginx.service" "Nginx"
check_port 80 "HTTP"

# Test nginx frontend
FRONTEND_URL="http://192.168.0.12/"
if check_http "$FRONTEND_URL" "Frontend (Nginx)"; then
    echo -e "  URL: $FRONTEND_URL"
fi

# Test nginx API proxy
API_URL="http://192.168.0.12/api/dishes"
if check_http "$API_URL" "API Proxy (/api/dishes)"; then
    DISHES=$(curl -s "$API_URL" | head -c 80)
    echo -e "  Respuesta: ${DISHES}..."
fi

echo ""

# 3. Configuration Files
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Archivos de Configuración"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "/etc/systemd/system/backend-restaurant.service" ]; then
    echo -e "${GREEN}✓${NC} /etc/systemd/system/backend-restaurant.service existe"
else
    echo -e "${RED}✗${NC} /etc/systemd/system/backend-restaurant.service NO existe"
fi

if [ -f "/etc/nginx/sites-enabled/restaurant" ]; then
    echo -e "${GREEN}✓${NC} /etc/nginx/sites-enabled/restaurant existe"
else
    echo -e "${RED}✗${NC} /etc/nginx/sites-enabled/restaurant NO existe"
fi

if [ -f "/var/www/BACKEND-RESTAURANT/.env" ]; then
    echo -e "${GREEN}✓${NC} /var/www/BACKEND-RESTAURANT/.env existe"
else
    echo -e "${YELLOW}⚠${NC} /var/www/BACKEND-RESTAURANT/.env NO existe"
fi

if [ -d "/var/www/html/restaurant" ] && [ -f "/var/www/html/restaurant/index.html" ]; then
    echo -e "${GREEN}✓${NC} Frontend build en /var/www/html/restaurant"
else
    echo -e "${RED}✗${NC} Frontend build NO encontrado en /var/www/html/restaurant"
fi

echo ""

# 4. Security Checks
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Verificaciones de Seguridad"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check port 3000 is NOT listening (should be closed)
if ! ss -ltn | grep -q ":3000 "; then
    echo -e "${GREEN}✓${NC} Puerto 3000 está cerrado (correcto)"
else
    echo -e "${YELLOW}⚠${NC} Puerto 3000 está abierto (debería estar cerrado si usas solo Nginx)"
fi

# Check frontend-restaurant service doesn't exist
if ! systemctl list-unit-files | grep -q "frontend-restaurant.service"; then
    echo -e "${GREEN}✓${NC} Servicio frontend-restaurant NO existe (correcto, usando Nginx)"
else
    echo -e "${YELLOW}⚠${NC} Servicio frontend-restaurant existe (puede estar deshabilitado)"
fi

# Check .env is not world-readable
if [ -f "/var/www/BACKEND-RESTAURANT/.env" ]; then
    PERMS=$(stat -c %a /var/www/BACKEND-RESTAURANT/.env 2>/dev/null || echo "000")
    if [ "$PERMS" = "600" ] || [ "$PERMS" = "640" ]; then
        echo -e "${GREEN}✓${NC} Permisos de .env son seguros ($PERMS)"
    else
        echo -e "${YELLOW}⚠${NC} Permisos de .env: $PERMS (recomendado: 600)"
        echo -e "  Ejecuta: chmod 600 /var/www/BACKEND-RESTAURANT/.env"
    fi
fi

echo ""

# 5. Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Resumen"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Count errors (simplified)
ERRORS=0

systemctl is-active --quiet backend-restaurant.service || ((ERRORS++))
systemctl is-active --quiet nginx.service || ((ERRORS++))
ss -ltn | grep -q ":3001 " || ((ERRORS++))
ss -ltn | grep -q ":80 " || ((ERRORS++))
curl -sf http://localhost:3001/api/dishes > /dev/null 2>&1 || ((ERRORS++))

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ Todos los checks pasaron correctamente${NC}"
    echo -e ""
    echo -e "Tu aplicación está corriendo en:"
    echo -e "  ${GREEN}→${NC} Frontend: http://192.168.0.12/"
    echo -e "  ${GREEN}→${NC} API: http://192.168.0.12/api/"
    echo -e ""
    echo -e "Para ver logs:"
    echo -e "  Backend: sudo journalctl -u backend-restaurant -f"
    echo -e "  Nginx: sudo tail -f /var/log/nginx/error.log"
else
    echo -e "${RED}✗ Se encontraron $ERRORS problema(s)${NC}"
    echo -e ""
    echo -e "Revisa los logs para más detalles:"
    echo -e "  Backend: sudo journalctl -u backend-restaurant -n 50"
    echo -e "  Nginx: sudo tail -30 /var/log/nginx/error.log"
    exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                  VERIFICACIÓN COMPLETA                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
