# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running locally

```bash
# Quickest option: serves front/ as static files + API at http://localhost:3000
node back/server.js

# Both servers (backend at :3000, frontend at :5500 via Python)
npm run dev-local          # from repo root

# Backend only
cd back && npm install && npm start
```

No build step. `front/` is plain static files — edit and reload.

When cache-busting is needed after frontend changes, update the `?v=` query string on the `<script>` and `<link>` tags in `front/index.html`.

## Architecture

**Split deployment:** `front/` → GitHub Pages (via `.github/workflows/static.yml`), `back/` → Render. `front/config.js` auto-selects the API URL based on hostname.

**Backend (`back/server.js`):** Single-file raw Node.js HTTP server (no framework despite `express` being in `package.json` — it is unused). All routes, auth, Google API calls, and static file serving live in this one file.

**Frontend (`front/app.js`):** Single-file vanilla JS, no bundler. All section logic, rendering, and API calls are in this file. `front/config.js` is loaded first to set `window.APP_CONFIG`.

## Authentication & access control

Two login methods share the same session cookie (`session_token`, httpOnly):
- **Username/password** — local dev only, defined in `back/.env` via `ADMIN_USERNAME`, `GERENCIA_USERNAME`, `EDITOR_USERNAME`
- **Google Sign-In** — production; ID token verified against `GOOGLE_LOGIN_CLIENT_ID`, role assigned via `GOOGLE_ROLE_EMAILS_JSON`

Roles and their section access are defined in `ROLE_DEFINITIONS` (server.js:156). The mapping from opaque key (e.g. `doc-l`) to section ID (e.g. `generador-correos`) lives in `SECTION_DICTIONARY` (server.js:135). `toPublicUser()` strips `allowedSpreadsheetIds` before sending any user object to the client.

## Adding a new section

1. Add `'doc-X': 'section-id'` to `SECTION_DICTIONARY` in `server.js`
2. Add `'doc-X'` to `allowedSections` in the relevant role(s) in `ROLE_DEFINITIONS`
3. Add a `<button class="nav-item" data-section="section-id">` in `front/index.html`
4. Add `<section id="section-id-section" class="section">` in `front/index.html`
5. Handle `sectionId === 'section-id'` in `changeSection()` in `front/app.js`

## Google API integration

The service account credentials (`GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY`) are used to sign JWTs and exchange them for access tokens manually — no Google client library. `getGoogleAccessToken()` caches the token in memory with a 1-minute expiry buffer.

**Sheet access control:** `RESTRICTED_SHEETS_BY_SPREADSHEET` (server.js:33) lists sheet names that are blocked per spreadsheet. All API endpoints check this before returning data.

**Avance Comisiones spreadsheet:** resolved by `getCachedAvanceComisionesSpreadsheetId()` (server.js:883): inside `AVANCE_COMISIONES_ROOT_FOLDER_ID` it opens the current year's subfolder and picks the file named `MMYYYY_...` with the highest month. Cached for 1 hour. No env var or manual update is needed.

**Integración con Apps Script (`handleRunScript`):** la autenticación depende de `APPS_SCRIPT_AUTH_MODE`. Se usa solo el modo configurado; si falla, no se prueba otro.
- `none` (configuración actual): no se envía token. El Web App debe estar implementado con *Ejecutar como: Yo* y *Quién tiene acceso: Cualquier usuario*. La única protección es `APPS_SCRIPT_SECRET`, que valida `doPost`.
- `service`: envía un token de `getAppsScriptToken()`. Ese token sale de la cuenta de servicio actuando como `APPS_SCRIPT_IMPERSONATE_EMAIL`, lo que requiere delegación de dominio en Google Admin. Acceso del Web App: *Cualquier usuario con cuenta de Google*.
- `user`: usa el token que llega en `body.accessToken`. Hoy el frontend no envía ese token, así que este modo no funciona sin cambios en el frontend.

Los cambios en Apps Script se publican como una versión nueva de la implementación existente (*Administrar implementaciones → Editar → Nueva versión*). Así la URL no cambia. Si se crea una implementación nueva, cambia la URL y hay que actualizar `APPS_SCRIPT_URL` en `back/.env` y en las variables de entorno de Render.

**La implementación siempre se hace con la cuenta de BA.** Como el Web App corre con *Ejecutar como: Yo*, usa los permisos de la cuenta que lo implementa: lee las plantillas, escribe en el archivo destino del consolidado y crea los borradores del correo. Si lo implementa otra cuenta, el script queda con los permisos de esa persona y el correo o el consolidado pueden fallar.

`RUN_SCRIPT_ACTION_SECTIONS` in `server.js` maps each `/api/run-script` action to the section it requires (`correo` → `doc-l`, `consolidado-preview` / `consolidado-pegar` → `doc-s`). `apps-script/` holds a versioned copy of the Web App's `doPost.gs` and `Consolidado.gs` (single file that reads a plantilla's `CALCULO_*` / `BD_EQUIPO` sheets, builds the consolidado and pastes it into the destination). The live code is in the Apps Script project, which also holds `Correo_Borrador`. Plantillas carry no scripts.

## Key env vars (back/.env)

| Variable | Purpose |
|---|---|
| `ALLOWED_ORIGIN` | Comma-separated allowed origins for CORS/CSRF. Local dev includes `:5500` and `:3000` |
| `COOKIE_SAMESITE` / `COOKIE_SECURE` | Set to `None` / `true` when frontend and backend are on different domains |
| `APPS_SCRIPT_URL` | URL del Web App (solo cambia si se crea una implementación nueva, no al publicar una versión nueva) |
| `APPS_SCRIPT_AUTH_MODE` | Cómo se autentica el backend con Apps Script: `none` (actual), `service` o `user` |
| `APPS_SCRIPT_SECRET` | Shared secret validated in Apps Script `doPost` |
| `APPS_SCRIPT_IMPERSONATE_EMAIL` | prestamype.com email to impersonate for Apps Script calls (requires domain-wide delegation) |
| `GOOGLE_ROLE_EMAILS_JSON` | JSON object mapping role names to arrays of Google emails |

Production secrets go in Render's environment variables dashboard (not `.env.render`, which is a reference template only).
