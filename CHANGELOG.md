# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

## [2.0.0] - 2026-02-17

### ✨ Sistema de Roles Jerárquico

- **Nuevo rol: Super Administrador (`super_admin`)**
  - Acceso completo a todas las funcionalidades del sistema
  - Único rol con permisos para agregar y eliminar usuarios
  - Puede crear otros super_admin

- **Rol Administrador actualizado**
  - Puede ver y editar usuarios existentes
  - NO puede agregar nuevos usuarios
  - NO puede eliminar usuarios
  - Mantiene acceso completo a platillos, órdenes y reportes

### 🔧 Cambios Técnicos

- Actualizado ENUM de la tabla `users` para incluir 'super_admin'
- Actualizada validación de roles en el endpoint de registro
- Actualizado array de roles permitidos en validaciones
- Migración automática de esquema de base de datos

### 📝 Documentación

- Creado archivo `ROLE_SYSTEM.md` con documentación completa del sistema de permisos
- Detallado permisos de cada rol
- Incluye ejemplos de queries SQL para gestión de roles

---

## [1.0.0] - 2025-10-23

### ✨ Características Principales

- Sistema de gestión de restaurante con 4 roles de usuario (Admin, Cajero, Mesero, Cocina)
- API REST completa con endpoints para platos, órdenes, usuarios y reportes
- Gestión de órdenes en tiempo real
- Sistema de reportes con generación de PDF
- Inicialización automática de base de datos MySQL

### 🚀 Despliegue y Configuración

- **Configuración de producción con Nginx y systemd**
  - Backend corre como servicio systemd optimizado para baja RAM (límite 200MB)
  - Frontend servido por Nginx en puerto 80
  - Proxy reverso de Nginx para API (/api/)
  - Servicios habilitados para arranque automático

- **CORS dinámico según entorno**
  - Soporta múltiples orígenes en desarrollo
  - CORS restrictivo en producción basado en FRONTEND_URL

- **Seguridad mejorada**
  - Variables de entorno en archivo .env (no commiteado)
  - Servicios corren como usuario www-data sin privilegios
  - Archivo .env.example como plantilla

### 📚 Documentación

- Guía completa de despliegue en `deploy/README_DEPLOY.md`
- README principal con instrucciones de desarrollo
- Script de verificación automática del despliegue
- Comentarios detallados en archivos de configuración
- Archivo .gitignore completo

### 🛠️ Archivos de Configuración

- `deploy/backend-restaurant.service` - Systemd unit para backend
- `deploy/nginx-restaurant.conf` - Configuración de Nginx con proxy
- `deploy/verify-deployment.sh` - Script de verificación del sistema
- `.env.example` - Plantilla de variables de entorno

### 🔧 Optimizaciones

- Límite de heap de Node.js a 128MB (--max-old-space-size)
- MemoryMax de 200MB en systemd para prevenir memory leaks
- Nginx sirve assets estáticos con caché optimizado
- Reinicio automático de servicios en caso de falla

### 🐛 Correcciones

- Corregido CORS en backend para soportar múltiples orígenes
- Eliminado servicio frontend-restaurant redundante (ahora solo Nginx)
- Corregidos permisos de .env a 600 para seguridad

### 📦 Dependencias

#### Backend
- express: ^4.18.2
- mysql2: ^3.9.1
- body-parser: ^1.20.2
- cors: ^2.8.5
- dotenv: ^16.4.5

### 🔒 Seguridad

- Puerto 3001 (backend) NO expuesto públicamente, solo accesible via Nginx
- Puerto 3000 (serve) cerrado en producción
- Credenciales MySQL en .env con permisos restrictivos (600)
- HTTPS recomendado para producción (documentado en guía)

---

## Notas de Versión

- **v1.0.0** representa el estado de producción estable del sistema
- Backend corriendo en 192.168.0.12:3001 (interno)
- Frontend accesible en http://192.168.0.12/ (público)
- Base de datos: MySQL/Railway

---

Para más detalles sobre cómo contribuir, ver [CONTRIBUTING.md](./CONTRIBUTING.md)
