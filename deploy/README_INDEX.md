# 📚 Índice de Documentación - Restaurant App

Guía rápida de toda la documentación disponible en el proyecto.

---

## 🚀 Para Empezar

### Si eres nuevo en el proyecto
1. Lee primero: [`README.md`](../README.md) - Visión general del proyecto
2. Configuración local: [`README.md` - Sección Instalación](../README.md#-instalación-desarrollo)
3. Variables de entorno: [`.env.example`](../.env.example)

### Si vas a desplegar en producción
1. **Empieza aquí**: [`README_DEPLOY.md`](./README_DEPLOY.md) - Guía paso a paso completa
2. Script de verificación: [`verify-deployment.sh`](./verify-deployment.sh)
3. Resumen ejecutivo: [`DEPLOYMENT_SUMMARY.md`](./DEPLOYMENT_SUMMARY.md)

### Si vas a contribuir al proyecto
1. Lee: [`CONTRIBUTING.md`](../CONTRIBUTING.md) - Guía de contribución
2. Historial: [`CHANGELOG.md`](../CHANGELOG.md) - Qué ha cambiado

---

## 📖 Documentación Principal

| Archivo | Descripción | Audiencia |
|---------|-------------|-----------|
| [`README.md`](../README.md) | Documentación principal del proyecto | Todos |
| [`README_DEPLOY.md`](./README_DEPLOY.md) | Guía completa de despliegue | DevOps, Administradores |
| [`DEPLOYMENT_SUMMARY.md`](./DEPLOYMENT_SUMMARY.md) | Resumen ejecutivo del despliegue actual | Gerentes, DevOps |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Guía para contribuidores | Desarrolladores |
| [`CHANGELOG.md`](../CHANGELOG.md) | Historial de versiones y cambios | Todos |
| [`.env.example`](../.env.example) | Template de variables de entorno | Desarrolladores, DevOps |

---

## 🛠️ Archivos de Configuración

| Archivo | Descripción | Uso |
|---------|-------------|-----|
| [`backend-restaurant.service`](./backend-restaurant.service) | Systemd unit para backend | Copiar a `/etc/systemd/system/` |
| [`nginx-restaurant.conf`](./nginx-restaurant.conf) | Configuración de Nginx | Copiar a `/etc/nginx/sites-available/` |
| [`.gitignore`](../.gitignore) | Archivos ignorados por git | Automático |

---

## 🧰 Scripts y Herramientas

| Script | Descripción | Comando |
|--------|-------------|---------|
| [`verify-deployment.sh`](./verify-deployment.sh) | Verifica estado del despliegue | `./deploy/verify-deployment.sh` |

---

## 📋 Guías por Caso de Uso

### 🎯 "Quiero desarrollar localmente"
1. [`README.md` - Instalación](../README.md#-instalación-desarrollo)
2. [`.env.example`](../.env.example) - Configura tus variables
3. [`CONTRIBUTING.md`](../CONTRIBUTING.md) - Convenciones de código

### 🚀 "Quiero desplegar en servidor nuevo"
1. [`README_DEPLOY.md`](./README_DEPLOY.md) - Sigue todos los pasos
2. [`backend-restaurant.service`](./backend-restaurant.service) - Usa este template
3. [`nginx-restaurant.conf`](./nginx-restaurant.conf) - Usa este template
4. [`verify-deployment.sh`](./verify-deployment.sh) - Verifica que funciona

### 🔧 "Ya está desplegado, quiero verificar estado"
1. [`verify-deployment.sh`](./verify-deployment.sh) - Ejecuta este script
2. [`DEPLOYMENT_SUMMARY.md`](./DEPLOYMENT_SUMMARY.md) - Comandos útiles

### 🐛 "Algo no funciona"
1. [`README_DEPLOY.md` - Solución de Problemas](./README_DEPLOY.md#solución-de-problemas)
2. [`DEPLOYMENT_SUMMARY.md` - Comandos de Logs](./DEPLOYMENT_SUMMARY.md#-comandos-útiles-de-gestión)

### 📝 "Quiero contribuir código"
1. [`CONTRIBUTING.md`](../CONTRIBUTING.md) - Guía completa
2. [`README.md` - Estructura](../README.md#-estructura-del-proyecto)
3. [`CHANGELOG.md`](../CHANGELOG.md) - Qué ha cambiado

### 🔄 "Quiero actualizar el sistema"
1. [`README_DEPLOY.md` - Actualizar Frontend](./README_DEPLOY.md#actualizar-frontend)
2. [`README_DEPLOY.md` - Actualizar Backend](./README_DEPLOY.md#actualizar-backend)
3. [`DEPLOYMENT_SUMMARY.md` - Comandos](./DEPLOYMENT_SUMMARY.md#-comandos-útiles-de-gestión)

---

## 🎓 Tutoriales y Guías Específicas

### Configuración Inicial

```bash
# 1. Lee README principal
cat README.md

# 2. Copia template de variables
cp .env.example .env

# 3. Edita con tus valores
nano .env

# 4. Instala dependencias
npm install

# 5. Inicia en desarrollo
npm start
```

### Despliegue Completo

```bash
# 1. Lee guía de despliegue
cat deploy/README_DEPLOY.md

# 2. Sigue los 6 pasos de la guía
# (Ver README_DEPLOY.md para comandos exactos)

# 3. Verifica
./deploy/verify-deployment.sh
```

### Verificación Rápida

```bash
# Ejecuta script de verificación
./deploy/verify-deployment.sh

# O manualmente:
systemctl status backend-restaurant
systemctl status nginx
curl http://192.168.0.12/api/dishes
```

---

## 🔍 Búsqueda Rápida

### Encuentra información sobre...

- **Instalación de dependencias** → [`README.md`](../README.md#-instalación-desarrollo)
- **Variables de entorno** → [`.env.example`](../.env.example)
- **Despliegue con systemd** → [`README_DEPLOY.md` - Paso 3](./README_DEPLOY.md#paso-3-desplegar-backend-con-systemd)
- **Configurar Nginx** → [`README_DEPLOY.md` - Paso 5](./README_DEPLOY.md#paso-5-configurar-nginx)
- **HTTPS/SSL** → [`README_DEPLOY.md` - Paso 6](./README_DEPLOY.md#paso-6-https-con-lets-encrypt-recomendado-para-producción)
- **Solución de problemas** → [`README_DEPLOY.md` - Troubleshooting](./README_DEPLOY.md#solución-de-problemas)
- **Ver logs** → [`DEPLOYMENT_SUMMARY.md` - Comandos](./DEPLOYMENT_SUMMARY.md#-comandos-útiles-de-gestión)
- **Actualizar código** → [`README_DEPLOY.md` - Actualizar](./README_DEPLOY.md#actualizar-frontend)
- **Convenciones de código** → [`CONTRIBUTING.md` - Guía de Estilo](../CONTRIBUTING.md#guía-de-estilo)
- **Estado del despliegue** → [`DEPLOYMENT_SUMMARY.md`](./DEPLOYMENT_SUMMARY.md)
- **Comandos útiles** → [`DEPLOYMENT_SUMMARY.md` - Comandos](./DEPLOYMENT_SUMMARY.md#-comandos-útiles-de-gestión)
- **Arquitectura del sistema** → [`DEPLOYMENT_SUMMARY.md` - Arquitectura](./DEPLOYMENT_SUMMARY.md#-arquitectura-implementada)

---

## 📞 ¿Necesitas Ayuda?

### Por orden de prioridad:

1. **Busca en la documentación** - La mayoría de preguntas están respondidas aquí
2. **Ejecuta el script de verificación** - `./deploy/verify-deployment.sh`
3. **Revisa los logs** - `sudo journalctl -u backend-restaurant -f`
4. **Lee la sección de troubleshooting** - [`README_DEPLOY.md`](./README_DEPLOY.md#solución-de-problemas)
5. **Abre un issue** - Si nada de lo anterior funciona

---

## 📊 Estructura de la Documentación

```
BACKEND-RESTAURANT/
├── README.md                          ← 🎯 EMPIEZA AQUÍ
├── CHANGELOG.md                       ← Historial de cambios
├── CONTRIBUTING.md                    ← Guía de contribución
├── .env.example                       ← Template variables
├── .gitignore                         ← Config git
└── deploy/                            ← Documentación de despliegue
    ├── README_INDEX.md                ← Este archivo (índice)
    ├── README_DEPLOY.md               ← 📖 Guía de despliegue completa
    ├── DEPLOYMENT_SUMMARY.md          ← Resumen ejecutivo
    ├── backend-restaurant.service     ← Template systemd
    ├── nginx-restaurant.conf          ← Template Nginx
    └── verify-deployment.sh           ← Script de verificación
```

---

## 🔄 Última Actualización

**Fecha**: 23 de Octubre de 2025  
**Versión**: 1.0.0  
**Estado**: ✅ Producción

---

## ⭐ Documentos Clave

### Top 3 más importantes:

1. 🥇 [`README.md`](../README.md) - Documentación principal
2. 🥈 [`README_DEPLOY.md`](./README_DEPLOY.md) - Guía de despliegue
3. 🥉 [`verify-deployment.sh`](./verify-deployment.sh) - Verificación automática

### Para emergencias:

- 🚨 [`README_DEPLOY.md` - Troubleshooting](./README_DEPLOY.md#solución-de-problemas)
- 🔍 [`DEPLOYMENT_SUMMARY.md` - Comandos](./DEPLOYMENT_SUMMARY.md#-comandos-útiles-de-gestión)

---

**¿Algo no está claro?** Abre un issue con la etiqueta `documentation` y lo mejoraremos.
