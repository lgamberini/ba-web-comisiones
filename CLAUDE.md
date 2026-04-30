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

Roles and their section access are defined in `ROLE_DEFINITIONS` (server.js:121). The mapping from opaque key (e.g. `doc-l`) to section ID (e.g. `config-aps`) lives in `SECTION_DICTIONARY` (server.js:107). `toPublicUser()` strips `allowedSpreadsheetIds` before sending any user object to the client.

## Adding a new section

1. Add `'doc-X': 'section-id'` to `SECTION_DICTIONARY` in `server.js`
2. Add `'doc-X'` to `allowedSections` in the relevant role(s) in `ROLE_DEFINITIONS`
3. Add a `<button class="nav-item" data-section="section-id">` in `front/index.html`
4. Add `<section id="section-id-section" class="section">` in `front/index.html`
5. Handle `sectionId === 'section-id'` in `changeSection()` in `front/app.js`

## Google API integration

The service account credentials (`GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY`) are used to sign JWTs and exchange them for access tokens manually — no Google client library. `getGoogleAccessToken()` caches the token in memory with a 1-minute expiry buffer.

**Sheet access control:** `RESTRICTED_SHEETS_BY_SPREADSHEET` (server.js:17) lists sheet names that are blocked per spreadsheet. All API endpoints check this before returning data.

**Avance Comisiones spreadsheet:** resolved dynamically by folder search (not hardcoded ID) to support monthly rotation. Cached for 1 hour. When a new month's sheet is uploaded, the server picks it up automatically.

**Apps Script integration (`handleRunScript`):** Uses the user's Google OAuth access token when available (acquired in-browser via `requestAppsScriptAccessToken()` after Google login). Falls back to service account impersonation via `getAppsScriptToken()`, which requires domain-wide delegation configured in Google Admin Console. The Apps Script Web App must be deployed with "Anyone with a Google account" access.

## Key env vars (back/.env)

| Variable | Purpose |
|---|---|
| `ALLOWED_ORIGIN` | Comma-separated allowed origins for CORS/CSRF. Local dev includes `:5500` and `:3000` |
| `COOKIE_SAMESITE` / `COOKIE_SECURE` | Set to `None` / `true` when frontend and backend are on different domains |
| `AVANCE_COMISIONES_SPREADSHEET_ID` | Updated monthly when a new Avance sheet is created |
| `APPS_SCRIPT_URL` | Web App URL (changes on each new deployment version) |
| `APPS_SCRIPT_SECRET` | Shared secret validated in Apps Script `doPost` |
| `APPS_SCRIPT_IMPERSONATE_EMAIL` | prestamype.com email to impersonate for Apps Script calls (requires domain-wide delegation) |
| `GOOGLE_ROLE_EMAILS_JSON` | JSON object mapping role names to arrays of Google emails |

Production secrets go in Render's environment variables dashboard (not `.env.render`, which is a reference template only).
