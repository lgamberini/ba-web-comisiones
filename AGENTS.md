# AGENTS.md

## Run commands

```bash
# Quick dev (serves both frontend + backend on :3000)
node back/server.js

# Full dev (frontend :5500 via Python, backend :3000)
npm run dev-local

# Backend only
cd back && npm install && npm start
```

## No build/test/lint

This repo has no tests, linting, typecheck, or build step. `front/` is plain static files.

## Key entry points

- **Backend**: `back/server.js` — single 1800+ line file, all routes/auth/Google API in one place
- **Frontend**: `front/app.js` — single file, vanilla JS, no bundler
- **Frontend config**: `front/config.js` — sets `window.APP_CONFIG`, auto-selects API URL by hostname

## Architecture quirks

- `express` is in `package.json` but **unused** — raw Node.js HTTP server
- `front/` is deployed to GitHub Pages (via `.github/workflows/static.yml`)
- `back/` is deployed to Render
- Avance Comisiones sheet ID can be hardcoded OR resolved dynamically by folder search (see server.js:153)

## Adding a new section

1. Add `'doc-X': 'section-id'` to `SECTION_DICTIONARY` in server.js
2. Add `'doc-X'` to `allowedSections` in relevant role(s) in `ROLE_DEFINITIONS`
3. Add `<button class="nav-item" data-section="section-id">` in front/index.html
4. Add `<section id="section-id-section" class="section">` in front/index.html
5. Add handler in `changeSection()` in front/app.js

## Env setup required

`back/.env` must exist. Copy from `back/.env.example`. Key vars:
- `ALLOWED_ORIGIN` — frontend origin(s), comma-separated
- `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY` — service account
- `GOOGLE_LOGIN_CLIENT_ID` — for Google Sign-In

## Deployment

- Front: push to main → GitHub Pages auto-deploys via action
- Back: manual deploy to Render (no CI)

## Caching frontend changes

After editing front files, bump `?v=` query string on `<script>` and `<link>` tags in `front/index.html`.