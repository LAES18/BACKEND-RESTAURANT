# Guía de Contribución

¡Gracias por tu interés en contribuir al proyecto Restaurant App! 🎉

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Cómo Contribuir](#cómo-contribuir)
- [Configuración del Entorno de Desarrollo](#configuración-del-entorno-de-desarrollo)
- [Guía de Estilo](#guía-de-estilo)
- [Proceso de Pull Request](#proceso-de-pull-request)
- [Reportar Bugs](#reportar-bugs)
- [Sugerir Mejoras](#sugerir-mejoras)

## Código de Conducta

Este proyecto y todos los participantes están gobernados por un código de conducta. Al participar, se espera que mantengas un ambiente respetuoso y profesional.

## Cómo Contribuir

### Tipos de Contribuciones que Buscamos

- 🐛 **Reportes de bugs** con pasos claros para reproducir
- ✨ **Nuevas características** que añadan valor al proyecto
- 📝 **Mejoras de documentación**
- 🎨 **Mejoras de UI/UX**
- ⚡ **Optimizaciones de rendimiento**
- 🔒 **Mejoras de seguridad**
- ✅ **Tests automatizados**

## Configuración del Entorno de Desarrollo

### 1. Fork y Clone

```bash
# Fork el repositorio en GitHub primero, luego:
git clone https://github.com/TU_USUARIO/BACKEND-RESTAURANT.git
cd BACKEND-RESTAURANT
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

```bash
cp .env.example .env
# Edita .env con tus credenciales locales de MySQL
```

### 4. Configurar Base de Datos

```bash
# Crea una base de datos local para desarrollo
mysql -u root -p
CREATE DATABASE restaurant_db_dev;
exit;

# El backend creará las tablas automáticamente al iniciar
```

### 5. Iniciar en Modo Desarrollo

```bash
npm run dev
# o
npm start
```

### 6. Verificar que Funciona

```bash
curl http://localhost:3001/api/dishes
# Debe devolver un array JSON
```

## Guía de Estilo

### JavaScript/Node.js

- Usa **ES6+** siempre que sea posible
- Indentación: **2 espacios**
- Punto y coma: **sí, siempre**
- Nombres de variables: **camelCase**
- Nombres de constantes: **UPPER_SNAKE_CASE** para valores inmutables
- Usa **async/await** en lugar de callbacks cuando sea posible

#### Ejemplo

```javascript
// ✅ Bien
async function getDishes() {
  try {
    const [dishes] = await db.execute('SELECT * FROM dishes');
    return dishes;
  } catch (error) {
    console.error('Error fetching dishes:', error);
    throw error;
  }
}

// ❌ Mal
function getDishes(callback) {
  db.execute('SELECT * FROM dishes', function(err, dishes) {
    if (err) callback(err);
    else callback(null, dishes);
  });
}
```

### Estructura de Código

- Una función hace **una cosa**
- Funciones pequeñas (máximo 30-40 líneas)
- Extrae lógica compleja a funciones auxiliares
- Comenta **por qué**, no **qué** hace el código

### Mensajes de Commit

Usa [Conventional Commits](https://www.conventionalcommits.org/):

```
tipo(alcance): descripción corta

Descripción más detallada si es necesario.

Fixes #123
```

**Tipos:**
- `feat`: Nueva característica
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Formato, punto y coma, etc (no afecta código)
- `refactor`: Refactorización sin cambiar funcionalidad
- `perf`: Mejora de rendimiento
- `test`: Añadir o corregir tests
- `chore`: Cambios en build, CI, etc

**Ejemplos:**

```bash
git commit -m "feat(api): add pagination to dishes endpoint"
git commit -m "fix(cors): allow multiple origins in production"
git commit -m "docs(deploy): add troubleshooting section"
```

## Proceso de Pull Request

### 1. Crea una Rama

```bash
git checkout -b feature/nombre-descriptivo
# o
git checkout -b fix/descripcion-del-bug
```

### 2. Haz tus Cambios

- Escribe código limpio y bien comentado
- Asegúrate de que todo funciona localmente
- Actualiza la documentación si es necesario

### 3. Commit tus Cambios

```bash
git add .
git commit -m "feat(api): add new endpoint for order statistics"
```

### 4. Actualiza tu Rama

```bash
# Antes de hacer push, asegúrate de tener los últimos cambios
git fetch origin
git rebase origin/main
```

### 5. Push y Crea Pull Request

```bash
git push origin feature/nombre-descriptivo
```

Luego ve a GitHub y crea un Pull Request.

### 6. Descripción del Pull Request

Tu PR debe incluir:

- **Descripción clara** de qué cambia y por qué
- **Capturas de pantalla** si hay cambios visuales
- **Referencias a issues** relacionados (`Fixes #123`)
- **Checklist de testing** que hayas realizado

**Template del PR:**

```markdown
## Descripción
Breve descripción de los cambios.

## Tipo de cambio
- [ ] Bug fix
- [ ] Nueva característica
- [ ] Breaking change
- [ ] Documentación

## ¿Cómo se ha probado?
- [ ] Manualmente en desarrollo
- [ ] Tests automatizados
- [ ] Probado en producción (staging)

## Checklist
- [ ] Mi código sigue el estilo del proyecto
- [ ] He comentado mi código donde es necesario
- [ ] He actualizado la documentación
- [ ] Mis cambios no generan nuevos warnings
- [ ] He probado que funciona localmente

## Screenshots (si aplica)
[Añade capturas de pantalla aquí]

## Issues relacionados
Fixes #123
```

## Reportar Bugs

### Antes de Reportar

1. **Busca** si el bug ya fue reportado
2. **Verifica** que estás usando la última versión
3. **Asegúrate** de que es un bug y no un problema de configuración

### Cómo Reportar un Bug

Crea un issue con:

- **Título descriptivo**
- **Descripción del problema**
- **Pasos para reproducir**
- **Comportamiento esperado vs actual**
- **Screenshots o logs** si es posible
- **Entorno**: SO, versión de Node.js, versión de MySQL

**Template:**

```markdown
**Descripción del bug**
Descripción clara del problema.

**Pasos para reproducir**
1. Ve a '...'
2. Haz click en '...'
3. Observa el error

**Comportamiento esperado**
Qué debería pasar.

**Screenshots/Logs**
Si aplica, añade logs o capturas.

**Entorno**
- OS: Ubuntu 22.04
- Node.js: 18.17.0
- MySQL: 8.0.33
- Branch: main
```

## Sugerir Mejoras

Para sugerir nuevas características o mejoras:

1. **Crea un issue** con la etiqueta `enhancement`
2. **Describe** el problema que resuelve
3. **Propón** una solución o alternativas
4. **Explica** por qué sería útil para el proyecto

## Testing

Aunque actualmente no tenemos tests automatizados, alentamos a añadirlos:

```bash
# Cuando existan tests
npm test
```

### Qué Probar

- Endpoints de API (status codes, respuestas)
- Validación de datos
- Manejo de errores
- Autenticación/Autorización (cuando exista)
- Casos edge

## Estructura del Proyecto

```
BACKEND-RESTAURANT/
├── index.js              # Punto de entrada principal
├── package.json          # Dependencias
├── .env                  # Variables (no commitear!)
├── .env.example          # Template de variables
├── .gitignore            # Archivos ignorados
├── README.md             # Documentación principal
├── CHANGELOG.md          # Registro de cambios
├── CONTRIBUTING.md       # Esta guía
└── deploy/               # Archivos de despliegue
    ├── README_DEPLOY.md
    ├── backend-restaurant.service
    ├── nginx-restaurant.conf
    └── verify-deployment.sh
```

## Preguntas Frecuentes

### ¿Puedo trabajar en un issue sin asignación?

Sí, pero comenta en el issue primero para que no haya duplicación de esfuerzo.

### ¿Cuánto tiempo tomará revisar mi PR?

Intentamos revisar PRs en 2-3 días. Si no hay respuesta en una semana, haz un ping amable.

### ¿Necesito permiso para hacer fork?

No, los repositorios públicos pueden ser forkeados libremente.

### ¿Puedo contribuir sin saber Git?

Te recomendamos aprender lo básico de Git primero. Hay muchos tutoriales excelentes online.

## Recursos Útiles

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)

## Agradecimientos

¡Gracias por contribuir! Cada contribución, grande o pequeña, hace que este proyecto sea mejor. 🚀

---

Si tienes preguntas que no están cubiertas aquí, abre un issue con la etiqueta `question`.
