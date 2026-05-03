# HOLDING COMMISSIONS

Aplicación web para visualizar y gestionar información de comisiones de productos financieros (Préstamos, Gestora, Cambio Seguro y Factoring). La aplicación consume datos directamente de Google Sheets mediante APIs de Google.

## Arquitectura

```
WEB_COMISIONES/
├── front/          # Frontend estático (HTML, CSS, JS)
├── back/           # Backend API (Node.js)
├── scripts/        # Scripts de desarrollo
└── .github/        # GitHub Actions para deployment
```

- **Frontend**: Desplegado en GitHub Pages
- **Backend**: Desplegado en Render

## Requisitos Previos

- Node.js 20 o superior
- Cuenta de servicio de Google con acceso de lectura a los Google Sheets
- Python 3 (para desarrollo local del frontend)

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/web-comisiones.git
cd web-comisiones
```

### 2. Configurar variables de entorno

Copiar el archivo de ejemplo y configurarlo:

```bash
cp back/.env.example back/.env
```

 затем editar `back/.env` con las credenciales correspondientes:

```env
# Usuarios y contraseñas para login
ADMIN_USERNAME=tu_admin
ADMIN_PASSWORD=tu_password
GERENCIA_USERNAME=tu_gerencia
GERENCIA_PASSWORD=tu_password_gerencia
EDITOR_USERNAME=tu_editor
EDITOR_PASSWORD=tu_password_editor

# Cuenta de servicio de Google
GOOGLE_CLIENT_EMAIL=tu-servicio@proyecto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Configuración de Google Sign-In
GOOGLE_LOGIN_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_ROLE_EMAILS_JSON={"administrador":["admin@tuempresa.com"],"usuario_gerencia":["gerencia@tuempresa.com"]}

# Configuración del servidor
PORT=3000
HOST=0.0.0.0
SESSION_TTL_HOURS=12

# Origen del frontend (ajustar para producción)
ALLOWED_ORIGIN=https://tu-usuario.github.io

# Configuración de cookies (para producción con dominio diferente)
COOKIE_SAMESITE=Lax
COOKIE_SECURE=true
```

## Desarrollo Local

### Opción 1: Un solo comando (recomendado)

```bash
npm run dev-local
```

Esto iniciara:
- Backend en `http://127.0.0.1:3000`
- Frontend en `http://127.0.0.1:5500`

### Opción 2: Manual

**Backend:**

```bash
cd back
npm install
npm start
```

**Frontend:**

```bash
cd front
python3 -m http.server 5500
```

Luego acceder a `http://127.0.0.1:5500`

## Roles de Usuario

| Rol | Permisos |
|-----|-----------|
| **Administrador** | Acceso completo a todas las secciones |
| **Administrador Editor** | Acceso completo + edición de hojas |
| **Usuario Gerencia** | Acceso limitado a secciones específicas |

## Secciones Disponibles

- **Avance Comisiones**: Resumen del cronograma de comisiones
- **Esquemas Comisionales**: Exploración de archivos en Drive
- **Seguimiento de Automatizaciones**: Estado de automatizaciones
- **Políticas de Comisiones**: Documento embebido
- **Dash de Rentabilidad**: Dashboard Power BI embebido
- **Seguimiento de Excepciones**: Hoja editable
- **Gestión de Comisiones**: Links a plantillas y recursos
- **Detalle Indicadores**: Vista filtrable de indicadores
- **Links de Interés**: Recursos externos por producto
- **Organigrama Comisional**: Estructura jerárquica
- **Organigrama BA**: Estructura Business Analytics
- **Generador de Correos**: Automatización de correos

## Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | 3000 |
| `HOST` | Host de ejecución | 0.0.0.0 |
| `SESSION_TTL_HOURS` | Duración de sesión | 12 |
| `ALLOWED_ORIGIN` | Orígenes permitidos (separados por coma) | - |
| `COOKIE_SAMESITE` | SameSite cookie | Lax |
| `COOKIE_SECURE` | Cookies solo HTTPS | false |
| `GOOGLE_CLIENT_EMAIL` | Email de cuenta de servicio | - |
| `GOOGLE_PRIVATE_KEY` | Clave privada RSA | - |
| `GOOGLE_TOKEN_URI` | Endpoint OAuth Google | https://oauth2.googleapis.com/token |
| `GOOGLE_LOGIN_CLIENT_ID` | Client ID para Google Sign-In | - |
| `GOOGLE_ROLE_EMAILS_JSON` | JSON con correos por rol | - |
| `AVANCE_COMISIONES_SPREADSHEET_ID` | ID del sheet de avance | - |
| `APPS_SCRIPT_URL` | URL de Apps Script para automatizaciones | - |
| `APPS_SCRIPT_AUTH_MODE` | Modo auth Apps Script (none/service/user) | none |

## Actualización Mensual

Cuando cambie el archivo mensual de Avance Comisiones, actualizar en `back/.env`:

```env
AVANCE_COMISIONES_SPREADSHEET_ID=ID_DEL_NUEVO_SHEET
```

Luego reiniciar el servidor.

## Despliegue

### Frontend (GitHub Pages)

Push a la rama `main` - GitHub Actions deploya automáticamente a:
`https://tu-usuario.github.io/web-comisiones`

### Backend (Render)

1. Conectar el repositorio en Render
2. Configurar las variables de entorno en el dashboard de Render
3. El comando de build es: `npm start`
4. Directorio de trabajo: `back`

## Notas de Seguridad

- No subir `.env`, credenciales reales ni archivos sensibles al repositorio
- El `.env.example` sirve como plantilla pero no contiene valores reales
- Las credenciales de Google deben ser de una cuenta de servicio con permisos de lectura

---

Para más información, consulta la documentación completa en `PROJECT_DOCUMENTATION.md`.