# Documentación del Proyecto Web Comisiones

Este documento describe la arquitectura, estructura y funcionamiento de los archivos que componen el proyecto Web Comisiones.

---

## 1. Resumen del Proyecto

**Web Comisiones** es una aplicación web para visualizar y gestionar información de comisiones de productos financieros (Préstamos, Gestora, Cambio Seguro y Factoring). La aplicación consume datos directamente de Google Sheets y Google Drive mediante APIs de Google.

### Tecnologías utilizadas
- **Backend**: Node.js (servidor HTTP personalizado, sin Express)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **APIs**: Google Sheets API, Google Drive API, Google Sign-In
- **Despliegue**: GitHub Pages (frontend), Render (backend)

---

## 2. Estructura de Archivos

```
WEB_COMISIONES/
├── back/
│   ├── server.js          # Servidor principal (Node.js)
│   ├── package.json       # Dependencias del backend
│   ├── .env               # Variables de entorno (no versionado)
│   └── .env.example       # Plantilla de variables de entorno
├── front/
│   ├── index.html         # Estructura HTML principal
│   ├── app.js             # Lógica del frontend
│   ├── config.js          # Configuración de la aplicación
│   └── styles.css         # Estilos CSS
├── scripts/
│   └── dev-local.js       # Script para desarrollo local
├── package.json           # Configuración del proyecto raíz
└── .github/workflows/
    └── static.yml         # Workflow de GitHub Actions
```

---

## 3. Descripción de Archivos

### 3.1 Backend

#### `back/server.js` (1800+ líneas)

**Propósito**: Servidor HTTP principal que maneja la autenticación, acceso a Google Sheets/Drive y serve de archivos estáticos.

**Características principales**:

1. **Autenticación y Sesiones**
   - Login con credenciales de usuario/contraseña
   - Login con Google (Google Sign-In)
   - Gestión de sesiones con cookies seguras
   - Rate limiting y protección contra brute-force

2. **Roles de Usuario**
   - `administrador`: Acceso completo a todas las secciones
   - `administrador_editor`: Acceso completo + capacidad de edición
   - `usuario_gerencia`: Acceso restringido a secciones específicas

3. **APIs de Google**
   - Google Sheets API: Lectura/escritura de hojas de cálculo
   - Google Drive API: Exploración de carpetas y archivos
   - OAuth 2.0 con JWT para autenticación de servicio

4. **Endpoints principales**
   - `/api/login` - Autenticación con credenciales
   - `/api/login/google` - Autenticación con Google
   - `/api/session` - Verificar sesión activa
   - `/api/logout` - Cerrar sesión
   - `/api/esquemas-comisionales` - Listar archivos de Drive
   - `/api/sheetnames` - Listar hojas de un spreadsheet
   - `/api/sheetdata` - Obtener datos de una hoja
   - `/api/update-cells` - Actualizar celdas (solo editores)
   - `/api/append-row` - Agregar filas (solo editores)
   - `/api/correo-esquemas` - Listar esquemas para correo
   - `/api/correo-validate` - Validar datos de correo
   - `/api/run-script` - Ejecutar automatizaciones
   - `/api/eventos` (GET) - Listar eventos del calendario
   - `/api/eventos` (POST) - Crear nuevo evento
   - `/api/eventos/:id` (PUT) - Editar evento existente
   - `/api/eventos/:id` (DELETE) - Eliminar evento

5. **Seguridad**
   - CORS configurado con orígenes permitidos
   - Content Security Policy (CSP)
   - Validación de permisos por rol
   - Rate limiting por IP

6. **Caché**
   - Esquemas comisionales: 10 minutos
   - ID de Avance Comisiones: 60 minutos
   - Tokens de acceso a Google

**Constantes importantes**:
- `SCOPES`: Permisos de Google API
- `SECTION_DICTIONARY`: Mapeo de secciones
- `ROLE_DEFINITIONS`: Permisos por rol
- `RESTRICTED_SHEETS_BY_SPREADSHEET`: Hojas restringidas

---

#### `back/package.json`

**Propósito**: Define las dependencias y scripts del backend.

**Dependencias**:
- `cors`: Middleware CORS (no utilizado directamente)
- `express`: Framework web (presente pero no utilizado)
- `googleapis`: Cliente oficial de Google para Node.js

**Scripts**:
- `npm start`: Inicia el servidor
- `npm run dev`: Inicia el servidor desde la raíz

---

### 3.2 Frontend

#### `front/index.html` (319 líneas)

**Propósito**: Estructura principal de la aplicación web.

**Secciones principales**:

1. **Login View** (`#loginView`)
   - Formulario de login con Google
   - Formulario de credenciales (para desarrollo local)
   - Mensajes de estado

2. **App Shell** (`#appShell`)
   - Sidebar con navegación
   - Área de contenido principal

3. **Secciones de contenido**:
   - Avance Comisiones (`#avance-comisiones-section`)
   - Esquemas Comisionales (`#visualizado-section`)
   - Seguimiento de Automatizaciones (`#resumen-avance-section`)
   - Políticas de Comisiones (`#politicas-section`)
   - Dash de Rentabilidad (`#rentabilidad-section`)
   - Seguimiento de Excepciones (`#seguimiento-section`)
   - Gestión de Comisiones (`#gestion-comisiones-section`)
   - Generador de Correos (`#generador-correos-section`)
   - Detalle Indicadores (`#detalle-indicadores-section`)
   - Links de Interés (`#links-interes-section`)
   - Organigrama Comisional (`#organigrama-section`)
   - Organigrama BA (`#organigrama-ba-section`)
   - Análisis de Tiempo (`#analisis-tiempo-section`)
   - Calendario de Comisiones (`#calendario-section`)

**Recursos externos**:
- Google Sign-In (accounts.google.com)
- Google Fonts
- Google Docs embebido (políticas)
- Power BI embebido (rentabilidad)

---

#### `front/app.js` (1526+ líneas)

**Propósito**: Lógica completa del frontend para interaction con el usuario, consumo de APIs y renderizado de datos.

**Funcionalidades principales**:

1. **Gestión de Sesión**
   - Login con credenciales
   - Login con Google
   - Restauración de sesión
   - Logout
   - Tracking de inactividad (60 minutos)

2. **Navegación entre Secciones**
   - Cambio de sección activa
   - Aplicación de permisos por rol
   - Persistencia del estado del sidebar

3. **Gestión de Datos de Sheets**
   - Carga de lista de productos/hojas
   - Obtención y renderizado de datos
   - Auto-refresh cada 5 minutos
   - Manejo de formatos (merged cells, hyperlinks, estilos)

4. **Edición de Datos**
   - Modo edición para Seguimiento de Excecciones
   - Validación de celdas editables
   - Guardado de cambios en Google Sheets

5. **Filtros y Búsqueda**
   - Filtro por producto, esquema, indicador
   - Búsqueda en tiempo real
   - Paginación de resultados

6. **Funcionalidades específicas**:
   - **Visualizado**: Exploración de esquemas comisionales
   - **Resumen Avance**: Seguimiento de automatizaciones
   - **Seguimiento**: Seguimiento de excepciones con edición
   - **Gestión Comisiones**: Links a plantillas y recursos
   - **Detalle Indicadores**: Vista filtrable de indicadores
   - **Links de Interés**: Recursos externos por producto
   - **Organigramas**: Visualización jerárquica
   - **Generador de Correos**: Validación y ejecución de correos

**Funciones utility**:
- `buildGridFromSheet()`: Convierte respuesta de API a grid renderizable
- `filterColumnsWithoutHeader()`: Filtra columnas vacías
- `renderTable()` / `renderMultipleTables()`: Renderizado de tablas
- `googleColorToCss()`: Conversión de colores Google → CSS
- `columnLabelToIndex()` / `columnIndexToLabel()`: Conversión de coordenadas

---

#### `front/config.js` (8 líneas)

**Propósito**: Configuración centralizada del frontend.

**Configuración**:
```javascript
window.APP_CONFIG = {
  API_BASE_URL: 'http://127.0.0.1:3000' (local) o 'https://ba-web-comisiones.onrender.com' (producción),
  GOOGLE_CLIENT_ID: '138211155805-5b0vq5b6h86n99oaovbpipbt2fq4jras.apps.googleusercontent.com'
};
```

**Funcionalidad**: Detecta si está en localhost para seleccionar la URL del API automáticamente.

---

#### `front/styles.css` (1545 líneas)

**Propósito**: Estilos CSS completos para la aplicación.

**Características**:

1. **Diseño Responsive**
   - Breakpoints: 900px (tablet), 640px (móvil), 420px (teléfono pequeño)
   - Sidebar adaptativo (horizontal en móvil)

2. **Componentes principales**
   - Login card con gradientes
   - Sidebar con transiciones
   - Tables con estilos condicionales
   - Tarjetas (summary cards, scheme cards, link cards)
   - Formularios y controles
   - Modales de confirmación

3. **Estados y variantes**
   - Chips de estado (TODO, DOING, REVIEW, DONE)
   - Estados de edición (celdas editables)
   - Tipos de enlaces (colab, plantilla, manual, PowerBI, Excel, etc.)

4. **Organigramas**
   - Diseño jerárquico con conectores CSS
   - Variables CSS para posicionamiento dinámico
   - Diferentes estilos de nodos (root, producto, PO, dominio, etc.)

5. **Utilidades**
   - Clases de utilidad (`.hidden`, `.status`)
   - Gradientes y sombras
   - Animaciones y transiciones

---

### 3.3 Scripts de Desarrollo

#### `scripts/dev-local.js` (112 líneas)

**Propósito**: Script para levantar el entorno de desarrollo local.

**Funcionalidad**:
1. Verifica que exista `.env` en `back/` o en la raíz
2. Copia `.env` de raíz a `back/` si es necesario
3. Inicia el backend en puerto 3000 (Node.js)
4. Inicia el frontend en puerto 5500 (Python http.server)
5. Manejo graceful de señales (SIGINT, SIGTERM)

**Uso**:
```bash
npm run dev-local
# o
node scripts/dev-local.js
```

---

### 3.4 Configuración del Proyecto

#### `package.json` (raíz)

**Scripts disponibles**:
- `npm run dev-local`: Inicia el entorno de desarrollo local completo

---

## 4. Flujo de Autenticación

### Login con credenciales
1. Usuario ingresa username/password
2. Servidor valida contra `USER_CONFIG` (cargado desde .env)
3. Crea sesión con token aleatorio (24 bytes)
4. Envía cookie `session_token` HttpOnly
5. Frontend restaura sesión en siguiente carga

### Login con Google
1. Usuario hace click en botón de Google
2. Google Sign-In retorna JWT en `response.credential`
3. Frontend envía token al endpoint `/api/login/google`
4. Servidor valida token con Google OAuth
5. Busca email en `USER_CONFIG` para obtener rol
6. Crea sesión como en login normal

---

## 5. Permisos por Rol

| Sección | Administrador | Administrador Editor | Usuario Gerencia |
|---------|---------------|---------------------|------------------|
| doc-a (Avance Comisiones) | ✓ | ✓ | ✗ |
| doc-b (Esquemas Comisionales) | ✓ | ✓ | ✓ |
| doc-c (Resumen Avance) | ✓ | ✓ | ✗ |
| doc-d (Políticas) | ✓ | ✓ | ✓ |
| doc-e (Rentabilidad) | ✓ | ✓ | ✓ |
| doc-f (Seguimiento) | ✓ | ✓ | ✓ |
| doc-g (Gestión Comisiones) | ✓ | ✓ | ✗ |
| doc-h (Detalle Indicadores) | ✓ | ✓ | ✗ |
| doc-i (Links de Interés) | ✓ | ✓ | ✗ |
| doc-j (Organigrama) | ✓ | ✓ | ✓ |
| doc-k (Organigrama BA) | ✓ | ✓ | ✗ |
| doc-l (Generador Correos) | ✗ | ✓ | ✗ |
| doc-p (Análisis de Tiempo) | ✓ | ✓ | ✗ |
| doc-q (Calendario) | ✓ | ✓ | ✗ |
| Edición de hojas | ✗ | ✓ | ✗ |

---

## 6. Variables de Entorno Requeridas

### Backend (`back/.env`)

```
# Autenticación
ADMIN_USERNAME=usuario_admin
ADMIN_PASSWORD=password_admin
GERENCIA_USERNAME=usuario_gerencia
GERENCIA_PASSWORD=password_gerencia
EDITOR_USERNAME=usuario_editor
EDITOR_PASSWORD=password_editor

# Google OAuth (Service Account)
GOOGLE_CLIENT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Google OAuth (Google Sign-In)
GOOGLE_LOGIN_CLIENT_ID=xxx.apps.googleusercontent.com

# Seguridad
ALLOWED_ORIGIN=https://tu-dominio.com
COOKIE_SAMESITE=Lax
COOKIE_SECURE=true
NODE_ENV=production

# Sesión
SESSION_TTL_HOURS=12

# Opcional: Apps Script para automatizaciones
APPS_SCRIPT_URL=https://script.google.com/...
APPS_SCRIPT_SECRET=xxx
APPS_SCRIPT_AUTH_MODE=service
APPS_SCRIPT_IMPERSONATE_EMAIL=xxx@xxx.com
```

---

## 7. Despliegue

### Frontend (GitHub Pages)
- push a main → GitHub Actions ejecuta `.github/workflows/static.yml`
- Disponible en: `https://tu-usuario.github.io/web-comisiones/`

### Backend (Render)
- Despliegue manual conectando el repositorio
- Variables de entorno configuradas en el dashboard de Render

---

## 8. Añadir Nueva Sección

Pasos para agregar una nueva sección:

1. **Backend** (server.js):
   - Agregar entrada en `SECTION_DICTIONARY`
   - Agregar `doc-X` a `allowedSections` en el rol correspondiente

2. **Frontend HTML** (index.html):
   - Agregar botón en sidebar: `<button class="nav-item" data-section="section-id">`
   - Agregar sección: `<section id="section-id-section" class="section">`

3. **Frontend JS** (app.js):
   - Agregar entrada en `sectionDictionary`
   - Agregar handler en `changeSection()`

---

## 9. Módulo: Calendario de Comisiones

### 9.1 Descripción general

El módulo **Calendario** (`doc-q`) permite registrar y visualizar fechas clave relacionadas con el proceso de comisiones: pagos, envío de metas, reuniones y otros hitos. Se muestra como una vista mensual con navegación entre meses y soporte para eventos recurrentes.

**Acceso en la aplicación:** sidebar → botón 📅 **Calendario** (visible para roles `administrador` y `administrador_editor`).

---

### 9.2 Ubicación de datos en Google Drive

Los eventos se almacenan en la hoja `CALENDARIO` del spreadsheet **INFORMACION COMISIONES**:

| Campo | Descripción |
|---|---|
| Google Drive | `BUSINESS ANALYTICS / OTROS / COMISIONES / DOCUMENTACION` |
| Spreadsheet | **INFORMACION COMISIONES** |
| ID del spreadsheet | `1iwineJiX2AKSKhc95MyExyherlXe3hyRsuMH8m2X9Sg` |
| Hoja | `CALENDARIO` |

**Estructura de columnas de la hoja `CALENDARIO`:**

| Columna | Campo | Descripción |
|---------|-------|-------------|
| A | ID | Identificador único generado automáticamente |
| B | TITULO | Nombre del evento |
| C | FECHA | Fecha en formato `YYYY-MM-DD` (para eventos únicos) |
| D | TIPO | `pago` / `meta` / `reunion` / `otro` |
| E | PRODUCTO | Producto al que aplica (puede estar vacío = todos) |
| F | RECURRENCIA | `ninguna` / `mensual` |
| G | DIA_MES | Día del mes para eventos con recurrencia mensual (ej: `13`) |
| H | NOTAS | Notas adicionales |

> **Nota:** Para los pagos fijos del 13 y 19 de cada mes, usar `RECURRENCIA = mensual` con `DIA_MES = 13` o `19` y dejar `FECHA` vacío.

---

### 9.3 Tipos de evento y colores

| Tipo | Color | Uso |
|------|-------|-----|
| `pago` | 🔵 Azul `#1D4ED8` | Pagos de comisiones (13 y 19 de cada mes) |
| `meta` | 🟢 Verde `#16A34A` | Envío de metas y objetivos |
| `reunion` | 🟡 Ámbar `#D97706` | Reuniones relacionadas a comisiones |
| `otro` | ⚫ Gris `#6B7280` | Otros hitos o recordatorios |

Los eventos con `RECURRENCIA = mensual` se muestran con el prefijo ↺ en el calendario.

---

### 9.4 Funcionalidades

**Vista mensual:**
- Navegación entre meses con botones `‹` y `›`
- El día actual se resalta con un círculo azul
- Clic en una celda de día → abre modal para crear evento en esa fecha
- Clic en un chip de evento → abre modal para editar o eliminar

**Modal de creación / edición:**
- Campos: Título (obligatorio), Fecha, Tipo, Producto, Recurrencia, Día del mes (solo si recurrencia = mensual), Notas
- El campo **Día del mes** aparece únicamente cuando se selecciona recurrencia mensual
- El botón **Eliminar** solo aparece en modo edición

**Leyenda:** debajo del calendario se muestra la referencia de colores por tipo y el símbolo ↺ para recurrentes.

---

### 9.5 API del módulo

| Método | Endpoint | Descripción | Permiso requerido |
|--------|----------|-------------|-------------------|
| GET | `/api/eventos` | Obtiene todos los eventos | `doc-q` |
| POST | `/api/eventos` | Crea un nuevo evento | `doc-q` |
| PUT | `/api/eventos/:id` | Actualiza un evento existente | `doc-q` |
| DELETE | `/api/eventos/:id` | Elimina un evento | `doc-q` |

El ID de cada evento se genera en el backend al momento de creación como una cadena alfanumérica única basada en `Date.now()`.

---

### 9.6 Notificaciones a Google Chat (Apps Script)

Se configuró un script en Google Apps Script para enviar alertas al chat del equipo sobre eventos próximos.

**Archivo:** Apps Script vinculado al spreadsheet **INFORMACION COMISIONES**
**Función:** `enviarNotificacionesCalendario()`
**Trigger:** Temporizador diario (recomendado: 8–9 am)

**Lógica de notificación:**
- 🔴 **HOY** — eventos que vencen el día de ejecución
- 🟠 **MAÑANA** — eventos que vencen al día siguiente
- 🟡 **EN 2 DÍAS** — eventos con 2 días de anticipación
- Si no hay eventos en ese rango, el script no envía mensaje (sin spam)

**Consideración técnica:** las fechas se parsean por partes (`new Date(año, mes-1, dia)`) para evitar el desfase UTC que ocurre al construir una fecha desde un string `YYYY-MM-DD` directamente.

**Variables a configurar en el script:**
```javascript
const WEBHOOK_URL = 'URL del webhook de Google Chat';
const SHEET_NAME  = 'CALENDARIO';
```

**Cómo obtener el webhook de Google Chat:**
1. Abrir el Space de Google Chat del equipo
2. Clic en el nombre del space → **Apps y integraciones → Webhooks**
3. **Agregar webhook** → asignar nombre y avatar opcional
4. Copiar la URL generada

---

## 10. Notas de Desarrollo

- El servidor usa Node.js nativo (http module), no Express aunque esté en dependencies
- Frontend es estático, se sirve desde `back/server.js` apuntando a `front/`
- Las sheets "resumen" y "avance" en algunos spreadsheets están restringidas
- El ID de Avance Comisiones se resuelve dinámicamente buscando en la carpeta del año actual
- Los cambios en frontend requieren incrementar el query string `?v=` en los script tags

---

*Última actualización: julio 2026 — incluye módulos Análisis de Tiempo y Calendario de Comisiones*