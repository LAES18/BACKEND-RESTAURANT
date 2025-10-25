# Guía de Despliegue - Restaurant App

Esta guía documenta el proceso completo para desplegar la aplicación Restaurant en un servidor Linux usando **systemd** (backend) y **Nginx** (frontend).

## Arquitectura de Despliegue

- **Backend**: Node.js/Express corriendo como servicio systemd en puerto 3001
- **Frontend**: Build estático (React/Vite) servido por Nginx en puerto 80/443
- **Base de Datos**: MySQL (configurada via variables de entorno)
- **Proxy reverso**: Nginx maneja `/api/*` y lo envía al backend

## Prerequisitos

```bash
# Instalar dependencias del sistema (si no están)
sudo apt update
sudo apt install -y nodejs npm nginx mysql-server

# Verificar versiones
node --version  # >= 16.x recomendado
npm --version
nginx -v
```

## Paso 1: Configurar Variables de Entorno

Crea o edita `/var/www/BACKEND-RESTAURANT/.env` con tus credenciales:

```env
# MySQL Configuration
MYSQLHOST=localhost
MYSQLUSER=tu_usuario
MYSQLPASSWORD=tu_contraseña_segura
MYSQLDATABASE=restaurant_db
MYSQLPORT=3306

# Server Configuration
PORT=3001
NODE_ENV=production

# Frontend URL (para CORS)
FRONTEND_URL=http://192.168.0.12
```

**⚠️ IMPORTANTE**: Nunca commitees este archivo a git. Ya está en `.gitignore`.

## Paso 2: Instalar Dependencias del Backend

```bash
cd /var/www/BACKEND-RESTAURANT
npm ci --omit=dev  # Instala solo dependencias de producción
```

## Paso 3: Desplegar Backend con systemd

```bash
# Copiar unit file
sudo cp /var/www/BACKEND-RESTAURANT/deploy/backend-restaurant.service /etc/systemd/system/

# Recargar systemd y habilitar servicio
sudo systemctl daemon-reload
sudo systemctl enable backend-restaurant.service
sudo systemctl start backend-restaurant.service

# Verificar estado
sudo systemctl status backend-restaurant.service

# Ver logs en vivo
sudo journalctl -u backend-restaurant -f
```

**Verificación del backend**:
```bash
# Debe responder con lista de platos
curl http://localhost:3001/api/dishes
```

## Paso 4: Construir y Desplegar Frontend

```bash
# Instalar dependencias y construir
cd /var/www/FRONEND-RESTAURANT
npm ci
npm run build

# Copiar build a directorio de Nginx
sudo mkdir -p /var/www/html/restaurant
sudo cp -r dist/* /var/www/html/restaurant/
sudo chown -R www-data:www-data /var/www/html/restaurant
```

## Paso 5: Configurar Nginx

```bash
# Copiar configuración de sitio
sudo cp /var/www/BACKEND-RESTAURANT/deploy/nginx-restaurant.conf /etc/nginx/sites-available/restaurant

# Editar si necesitas cambiar IP o dominio
sudo nano /etc/nginx/sites-available/restaurant
# Cambia 'listen 80;' a 'listen TU_IP:80;' si quieres bind específico
# Cambia 'server_name _;' a tu dominio si tienes uno

# Habilitar sitio
sudo ln -sf /etc/nginx/sites-available/restaurant /etc/nginx/sites-enabled/restaurant

# (Opcional) Deshabilitar sitio default si causa conflictos
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar sintaxis y recargar
sudo nginx -t
sudo systemctl reload nginx
```

**Verificación de Nginx**:
```bash
# Frontend debe servir index.html
curl -I http://192.168.0.12/

# API debe proxy al backend
curl http://192.168.0.12/api/dishes
```

## Paso 6: HTTPS con Let's Encrypt (Recomendado para Producción)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado (requiere dominio apuntando a tu servidor)
sudo certbot --nginx -d tudominio.com -d www.tudominio.com

# Certbot configurará automáticamente Nginx para HTTPS
# y programará renovación automática
```

## Gestión de Servicios

### Backend (systemd)

```bash
# Ver estado
sudo systemctl status backend-restaurant

# Reiniciar
sudo systemctl restart backend-restaurant

# Detener
sudo systemctl stop backend-restaurant

# Deshabilitar arranque automático
sudo systemctl disable backend-restaurant

# Ver logs
sudo journalctl -u backend-restaurant -n 100 --no-pager
sudo journalctl -u backend-restaurant -f  # Seguir en tiempo real
```

### Frontend (Nginx)

```bash
# Ver estado de Nginx
sudo systemctl status nginx

# Recargar configuración (sin downtime)
sudo systemctl reload nginx

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Actualizar Frontend

Cuando hagas cambios en el código del frontend:

```bash
cd /var/www/FRONEND-RESTAURANT
git pull  # o como obtengas el código nuevo
npm ci
npm run build
sudo cp -r dist/* /var/www/html/restaurant/
sudo chown -R www-data:www-data /var/www/html/restaurant
# No es necesario recargar Nginx, los archivos se actualizan inmediatamente
```

### Actualizar Backend

Cuando hagas cambios en el código del backend:

```bash
cd /var/www/BACKEND-RESTAURANT
git pull  # o como obtengas el código nuevo
npm ci --omit=dev
sudo systemctl restart backend-restaurant
sudo journalctl -u backend-restaurant -f  # Verificar que inició sin errores
```

## Solución de Problemas

### Backend no inicia

```bash
# Ver logs detallados
sudo journalctl -u backend-restaurant -n 50 --no-pager

# Verificar que .env existe y tiene los valores correctos
cat /var/www/BACKEND-RESTAURANT/.env

# Probar manualmente
cd /var/www/BACKEND-RESTAURANT
node index.js
# Si funciona manual pero no con systemd, revisar permisos
```

### Nginx devuelve 502 Bad Gateway

```bash
# Verificar que backend está corriendo
sudo systemctl status backend-restaurant
curl http://localhost:3001/api/dishes

# Verificar logs de Nginx
sudo tail -f /var/log/nginx/error.log

# Verificar proxy_pass en configuración
sudo nginx -t
```

### Frontend no carga o muestra página en blanco

```bash
# Verificar que dist/ fue copiado correctamente
ls -la /var/www/html/restaurant/

# Debe tener: index.html, assets/, etc.

# Verificar permisos
sudo chown -R www-data:www-data /var/www/html/restaurant

# Ver consola del navegador para errores de API
# Si API falla, verificar CORS en backend .env:
# FRONTEND_URL debe coincidir con la URL desde donde accedes
```

### Puerto 3001 ya en uso

```bash
# Ver qué está usando el puerto
sudo ss -ltnp | grep :3001

# Si es otro proceso, mátalo o cambia PORT en .env
# Luego reinicia el servicio
sudo systemctl restart backend-restaurant
```

## Configuración de Firewall (Recomendado)

```bash
# Permitir solo HTTP, HTTPS y SSH
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# NO abrir puerto 3001 externamente (backend solo debe ser accesible via Nginx)
```

## Optimización de Recursos (Servidor con Poca RAM)

El archivo `backend-restaurant.service` ya incluye:
- `--max-old-space-size=128`: Limita heap de Node.js a 128MB
- `MemoryMax=200M`: systemd mata el proceso si excede 200MB

Si necesitas ajustar:

```bash
sudo nano /etc/systemd/system/backend-restaurant.service
# Edita ExecStart y MemoryMax según tu RAM disponible
sudo systemctl daemon-reload
sudo systemctl restart backend-restaurant
```

## Monitoreo Básico

```bash
# Ver uso de memoria/CPU del backend
sudo systemctl status backend-restaurant

# Ver todos los servicios relacionados
sudo systemctl status backend-restaurant nginx mysql

# Ver puertos en escucha
sudo ss -ltnp | grep -E ':(80|443|3001)'

# Ver procesos de Node
ps aux | grep node
```

## Alternativa: Servir Frontend con `serve` en Puerto 3000

Si por alguna razón necesitas servir el frontend con un servidor Node.js en lugar de Nginx (no recomendado para producción por mayor consumo de RAM):

```bash
# Instalar serve globalmente o usar el del proyecto
cd /var/www/FRONEND-RESTAURANT
npm install --save-dev serve

# Crear unit file para frontend
sudo tee /etc/systemd/system/frontend-restaurant.service > /dev/null << 'EOF'
[Unit]
Description=Frontend Restaurant Static Server (serve) on port 3000
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/FRONEND-RESTAURANT
ExecStart=/usr/bin/node /var/www/FRONEND-RESTAURANT/node_modules/serve/build/main.js -s dist -l tcp://192.168.0.12:3000
Restart=on-failure
RestartSec=5
MemoryMax=150M
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Habilitar y arrancar
sudo systemctl daemon-reload
sudo systemctl enable --now frontend-restaurant.service
sudo systemctl status frontend-restaurant.service

# Acceder en http://192.168.0.12:3000
```

**Para volver a Nginx** (recomendado):
```bash
sudo systemctl stop frontend-restaurant.service
sudo systemctl disable frontend-restaurant.service
sudo rm -f /etc/systemd/system/frontend-restaurant.service
sudo systemctl daemon-reload
# El frontend seguirá disponible via Nginx en puerto 80
```

## Notas de Seguridad

1. **Variables de entorno**: Nunca commites `.env` a git
2. **Permisos**: El backend corre como `www-data` (sin privilegios)
3. **Firewall**: Cierra puerto 3001 externamente, solo accesible via Nginx
4. **HTTPS**: Usa Certbot para producción (encripta tráfico)
5. **Credenciales MySQL**: Usa contraseñas fuertes, limita acceso remoto
6. **Actualizaciones**: Mantén Node.js, npm, nginx y sistema operativo actualizados

## Verificación Final del Despliegue

```bash
# 1. Backend corriendo y respondiendo
curl http://localhost:3001/api/dishes

# 2. Nginx sirviendo frontend
curl -I http://192.168.0.12/

# 3. Proxy API funcionando via Nginx
curl http://192.168.0.12/api/dishes

# 4. Servicios habilitados para arranque automático
sudo systemctl is-enabled backend-restaurant  # debe decir "enabled"
sudo systemctl is-enabled nginx               # debe decir "enabled"

# 5. Ver estado general
sudo systemctl status backend-restaurant nginx
```

Si todos estos pasos responden correctamente, ¡tu aplicación está desplegada y lista! 🚀

---

**Última actualización**: Octubre 2025  
**Configuración recomendada**: Nginx (frontend) + systemd (backend)
