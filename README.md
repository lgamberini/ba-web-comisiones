# Visualizador de Comisiones

Aplicación separada en `front/` y `back/` para publicar el frontend en GitHub Pages y desplegar el backend en otro servicio.

## Estructura

- `front/`: archivos estáticos para GitHub Pages
- `back/`: API en Node.js con autenticación y acceso a Google Sheets

## Requisitos

- Node.js 20 o superior
- Archivo `back/.env` configurado
- Cuenta de servicio de Google con acceso de lectura a los sheets usados por la app

## Configuración del backend

1. Crear el archivo de entorno:

```bash
cp back/.env.example back/.env
```

2. Completar en `back/.env`:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `GERENCIA_USERNAME`
- `GERENCIA_PASSWORD`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_LOGIN_CLIENT_ID`
- `GOOGLE_ROLE_EMAILS_JSON`
- `ALLOWED_ORIGIN=https://TU_USUARIO.github.io`

Si el frontend vive en otro dominio, añade también:

- `COOKIE_SAMESITE=None`
- `COOKIE_SECURE=true`

## Configuración del frontend

El archivo [front/config.js](/Users/lucianagamberini/Library/CloudStorage/GoogleDrive-lgamberini@prestamype.com/.shortcut-targets-by-id/1wzewbtJQv6Fr_f0uKnZrRg-jPtPM9D8a/BUSINESS ANALYTICS/OTROS/COMISIONES/DOCUMENTACION/WEB_COMISIONES/front/config.js) ya está preparado para trabajar en paralelo:

- si abres el frontend en `localhost` o `127.0.0.1`, consumirá `http://127.0.0.1:3000`
- si lo abres desde GitHub Pages, consumirá el backend público en Render

Así puedes probar cambios localmente sin tener que editar la URL antes de hacer push.

Para habilitar el botón de Google en el frontend, completa también:

- `window.APP_CONFIG.GOOGLE_CLIENT_ID`

Ese valor debe ser el mismo `client_id` web que pongas en `back/.env` como `GOOGLE_LOGIN_CLIENT_ID`.

Para asignar varios correos a distintos roles con Google, usa:

```env
GOOGLE_ROLE_EMAILS_JSON={"administrador":["admin1@tuempresa.com","admin2@tuempresa.com"],"usuario_gerencia":["gerencia1@tuempresa.com","gerencia2@tuempresa.com"]}
```

Si todavia tienes el formato anterior con `ADMIN_GOOGLE_EMAIL` y `GERENCIA_GOOGLE_EMAIL`, tambien sigue funcionando como compatibilidad.

## Ejecución local

> **Comando rápido para levantar el entorno de pruebas:**
> ```bash
> cd ".../WEB_COMISIONES"
> node back/server.js
> ```
> Luego abrí `http://localhost:3000` en el navegador.

Con un solo comando desde la raiz del proyecto:

```bash
npm run dev-local
```

Ese comando:

- inicia el backend en `http://127.0.0.1:3000`
- inicia el frontend en `http://127.0.0.1:5500`
- si `back/.env` no existe, copia el `.env` de la raiz automaticamente

Para detener ambos procesos, usa `Ctrl + C`.

Si prefieres levantar cada parte manualmente, puedes hacerlo asi:

Instalar dependencias del backend y levantar el servidor:

```bash
cd back
npm install
npm start
```

El backend queda disponible en:

```text
http://127.0.0.1:3000
```

Para probar localmente el frontend, sirve `front/` con un servidor estático:

```bash
cd front
python3 -m http.server 5500
```

Luego abre:

```text
http://127.0.0.1:5500
```

Si usas ese origen local, recuerda incluirlo en `back/.env`:

```env
ALLOWED_ORIGIN=http://127.0.0.1:5500
```

## Variables principales

- `PORT`: puerto del servidor
- `HOST`: host de ejecución
- `SESSION_TTL_HOURS`: duración de la sesión
- `ALLOWED_ORIGIN`: origen permitido del frontend. Acepta varios separados por coma
- `COOKIE_SAMESITE`: por defecto `Lax`. Usa `None` si frontend y backend están en dominios distintos
- `COOKIE_SECURE`: usa `true` para enviar cookies solo por HTTPS
- `GOOGLE_TOKEN_URI`: endpoint de autenticación de Google
- `GOOGLE_LOGIN_CLIENT_ID`: client ID OAuth web usado para validar el login con Google
- `GOOGLE_ROLE_EMAILS_JSON`: objeto JSON con listas de correos por rol para login con Google
- `ADMIN_GOOGLE_EMAIL`: formato antiguo, se mantiene por compatibilidad
- `GERENCIA_GOOGLE_EMAIL`: formato antiguo, se mantiene por compatibilidad
- `AVANCE_COMISIONES_SPREADSHEET_ID`: ID del Google Sheet usado por la sección `Avance Comisiones`

## Cambio mensual de avance

Cuando cambie el archivo mensual de `Avance Comisiones`, solo actualiza en `back/.env`:

```env
AVANCE_COMISIONES_SPREADSHEET_ID=ID_DEL_NUEVO_SHEET
```

Luego reinicia el servidor:

```bash
cd back
npm start
```

## Nota de seguridad

No subas `.env`, `credential.json` ni credenciales reales al repositorio.
