# CLAUDE.md

Este archivo da contexto a Claude Code (claude.ai/code) para trabajar con el código de este repositorio.

## Ejecución local

```bash
# Opción más rápida: sirve front/ como archivos estáticos + la API en http://localhost:3000
node back/server.js

# Ambos servidores (backend en :3000, frontend en :5500 con Python)
npm run dev-local          # desde la raíz del repo

# Solo backend
cd back && npm install && npm start
```

No hay paso de build. `front/` son archivos estáticos: se editan y se recarga la página.

Después de cambiar el frontend, para que el navegador no use la versión en caché, actualizá el parámetro `?v=` de las etiquetas `<script>` y `<link>` en `front/index.html`.

## Arquitectura

**Despliegue separado:** `front/` → GitHub Pages (con `.github/workflows/static.yml`), `back/` → Render. `front/config.js` elige la URL de la API según el hostname.

**Backend (`back/server.js`):** servidor HTTP de Node.js puro en un solo archivo (no usa framework; `express` figura en `package.json` pero no se usa). Todas las rutas, la autenticación, las llamadas a las APIs de Google y el servicio de archivos estáticos están en este archivo.

**Frontend (`front/app.js`):** JavaScript puro en un solo archivo, sin bundler. Toda la lógica de las secciones, el renderizado y las llamadas a la API están en este archivo. `front/config.js` se carga primero y define `window.APP_CONFIG`.

## Autenticación y control de acceso

Hay dos formas de iniciar sesión y las dos usan la misma cookie de sesión (`session_token`, httpOnly):
- **Usuario y contraseña:** solo para desarrollo local. Se definen en `back/.env` con `ADMIN_USERNAME`, `GERENCIA_USERNAME` y `EDITOR_USERNAME`.
- **Google Sign-In:** en producción. El ID token se verifica contra `GOOGLE_LOGIN_CLIENT_ID` y el rol se asigna según `GOOGLE_ROLE_EMAILS_JSON`.

Los roles y las secciones a las que accede cada uno se definen en `ROLE_DEFINITIONS` (server.js:163). La correspondencia entre la clave opaca (por ejemplo `doc-l`) y el ID de la sección (por ejemplo `generador-correos`) está en `SECTION_DICTIONARY` (server.js:135). `toPublicUser()` quita `allowedSpreadsheetIds` antes de enviar cualquier objeto de usuario al cliente.

## Agregar una sección nueva

1. Agregar `'doc-X': 'section-id'` a `SECTION_DICTIONARY` en `server.js`.
2. Agregar `'doc-X'` a `allowedSections` de los roles que correspondan en `ROLE_DEFINITIONS`.
3. Agregar `<button class="nav-item" data-section="section-id">` en `front/index.html`.
4. Agregar `<section id="section-id-section" class="section">` en `front/index.html`.
5. Agregar `'doc-X': 'section-id'` a `sectionDictionary` y manejar `sectionId === 'section-id'` en `changeSection()`, ambos en `front/app.js`.

## Integración con las APIs de Google

Las credenciales de la cuenta de servicio (`GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY`) se usan para firmar JWT e intercambiarlos por tokens de acceso de forma manual, sin la librería cliente de Google. `getGoogleAccessToken()` guarda el token en memoria y lo renueva 1 minuto antes de que venza.

**Control de acceso a hojas:** `RESTRICTED_SHEETS_BY_SPREADSHEET` (server.js:33) lista las hojas bloqueadas de cada spreadsheet. Todos los endpoints lo revisan antes de devolver datos.

**Spreadsheet de Avance Comisiones:** lo resuelve `getCachedAvanceComisionesSpreadsheetId()` (server.js:890). Dentro de `AVANCE_COMISIONES_ROOT_FOLDER_ID` abre la subcarpeta del año actual y toma el archivo `MMYYYY_...` del mes más alto. El resultado se guarda en caché 1 hora. No hace falta variable de entorno ni actualización manual.

**Integración con Apps Script (`handleRunScript`, server.js:1971):** la autenticación depende de `APPS_SCRIPT_AUTH_MODE`. Se usa solo el modo configurado; si falla, no se prueba otro.
- `none` (configuración actual): no se envía token. El Web App debe estar implementado con *Ejecutar como: Yo* y *Quién tiene acceso: Cualquier usuario*. La única protección es `APPS_SCRIPT_SECRET`, que valida `doPost`.
- `service`: envía un token de `getAppsScriptToken()`. Ese token sale de la cuenta de servicio actuando como `APPS_SCRIPT_IMPERSONATE_EMAIL`, lo que requiere delegación de dominio en Google Admin. Acceso del Web App: *Cualquier usuario con cuenta de Google*.
- `user`: usa el token que llega en `body.accessToken`. Hoy el frontend no envía ese token, así que este modo no funciona sin cambios en el frontend.

Los cambios en Apps Script se publican como una versión nueva de la implementación existente (*Administrar implementaciones → Editar → Nueva versión*). Así la URL no cambia. Si se crea una implementación nueva, cambia la URL y hay que actualizar `APPS_SCRIPT_URL` en `back/.env` y en las variables de entorno de Render.

**La implementación siempre se hace con la cuenta de BA.** Como el Web App corre con *Ejecutar como: Yo*, usa los permisos de la cuenta que lo implementa: lee las plantillas, escribe en el archivo destino del consolidado y crea los borradores del correo. Si lo implementa otra cuenta, el script queda con los permisos de esa persona y el correo o el consolidado pueden fallar.

`RUN_SCRIPT_ACTION_SECTIONS` (server.js:156) indica qué sección requiere cada acción de `/api/run-script`: `correo` → `doc-l`; `consolidado-preview` y `consolidado-pegar` → `doc-s`. `apps-script/` tiene una copia versionada de `doPost.gs` y `Consolidado.gs` del Web App. `Consolidado.gs` es un único archivo que lee las hojas `CALCULO_*` y `BD_EQUIPO` de una plantilla, arma el consolidado y lo pega en el archivo destino. El código que se ejecuta está en el proyecto de Apps Script, que también contiene `Correo_Borrador`. Las plantillas no llevan scripts.

## Variables de entorno principales (back/.env)

| Variable | Para qué sirve |
|---|---|
| `ALLOWED_ORIGIN` | Orígenes permitidos para CORS/CSRF, separados por coma. En local incluye `:5500` y `:3000` |
| `COOKIE_SAMESITE` / `COOKIE_SECURE` | Se ponen en `None` / `true` cuando frontend y backend están en dominios distintos |
| `APPS_SCRIPT_URL` | URL del Web App (solo cambia si se crea una implementación nueva, no al publicar una versión nueva) |
| `APPS_SCRIPT_AUTH_MODE` | Cómo se autentica el backend con Apps Script: `none` (actual), `service` o `user` |
| `APPS_SCRIPT_SECRET` | Secreto compartido que valida `doPost` en Apps Script |
| `APPS_SCRIPT_IMPERSONATE_EMAIL` | Correo de prestamype.com que se usa en el modo `service` (requiere delegación de dominio) |
| `GOOGLE_ROLE_EMAILS_JSON` | Objeto JSON que asigna a cada rol una lista de correos de Google |

Los secretos de producción se cargan en las variables de entorno de Render, no en `.env.render`, que es solo una plantilla de referencia.

## Forma de trabajo

- Toda la documentación y las respuestas van en español.
- Si hay dudas sobre el alcance o la lógica de negocio, se consulta antes de cambiar código.
- El push a GitHub se hace a mano desde la terminal del equipo. Desde las sesiones de Claude Code el push da 403, porque la cuenta autenticada en la máquina (`LucianaGamberini`) no tiene permiso de escritura sobre `lgamberini/ba-web-comisiones`. Se deja el commit hecho, o los cambios en stage si así se pide.
- No hay tests: los cambios en `apps-script/` se verifican con simulaciones en Node (con objetos falsos de `SpreadsheetApp`) en el scratchpad, y después se prueban en Apps Script.

## Generador de Consolidado: decisiones tomadas

Detalle funcional completo en `PROJECT_DOCUMENTATION.md`, sección 11. Lo que no se deduce del código:

- **Por qué existe:** reemplaza el flujo manual, que consistía en correr `generarConsolidadoKPI()` en cada plantilla, copiarla a la carpeta "COMISIONES PARA TRASLADAR" y ejecutar el Colab `TRASLADO_EVOLUTIVO_KPI`. El objetivo es mantener **un solo script** (`Consolidado.gs`) en lugar de uno por plantilla. Las plantillas ya no llevan scripts.
- **Por qué Apps Script y no el backend:** la lógica cambia seguido y la mantiene el equipo de BA. Con Apps Script se publica una versión nueva sin tocar Render y el script corre con los permisos de la cuenta de BA, sin tener que compartir cada plantilla con la cuenta de servicio.
- **`Consolidado.gs` es un único archivo a propósito:** antes la lectura estaba separada en `LecturaCalculo.gs`, que también usaba otra "web de validación" ajena a este proyecto. Se unieron y se quitó lo que solo usaba esa otra web.
- **Período:** siempre el mes anterior; no se puede elegir.
- **Sin control de duplicados:** se quitó a pedido porque hacía lento el pegado al leer todo el historial del destino. Si se pega dos veces la misma plantilla, las filas quedan duplicadas.
- **También escribe la hoja `CONSOLIDADO` de la plantilla**, como hacía el script original.
- **Reglas del Colab que se mantienen:** PERIODO `YYYY-MM` en KPI, mayúsculas, redondeo a 4 decimales si la celda es % y a 2 si no, fórmula `=F+G-H` en la columna I de EVOLUTIVO, Calibri 11 centrado. El DNI se pega como texto para conservar los ceros iniciales.
- **VALOR_KPI** sale del formato de número de la celda REAL (`tipoDato_`): `%` → PORCENTAJE, `S/` o `$` → MONEDA, cualquier otro → NUMERICO.
- **Archivo destino:** `CONSOLIDADO_DESTINO_ID` en `Consolidado.gs` (hojas `KPI` y `EVOLUTIVO`). Para probar se cambia temporalmente por el ID de una copia.

**Problemas ya resueltos (por si vuelven a aparecer):**
- `404` desde Apps Script → `APPS_SCRIPT_URL` apunta a una implementación que no existe. Se arregla poniendo la URL de la implementación activa en `back/.env` y en Render.
- `200` con respuesta no-JSON → faltan autorizar permisos nuevos. Se ejecuta `testAuth()` en el editor de Apps Script con la cuenta de BA y se publica una versión nueva.
- "Estás intentando editar una celda o un objeto protegidos" → la hoja o un rango está protegido y la cuenta de BA no figura entre los editores permitidos (*Datos → Hojas y rangos protegidos*).
