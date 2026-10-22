# AGENTS.md

## Comandos para ejecutar

```bash
# Desarrollo rápido (sirve frontend + backend en :3000)
node back/server.js

# Desarrollo completo (frontend en :5500 con Python, backend en :3000)
npm run dev-local

# Solo backend
cd back && npm install && npm start
```

## Sin build, tests ni lint

Este repo no tiene tests, linting, chequeo de tipos ni paso de build. `front/` son archivos estáticos.

## Puntos de entrada

- **Backend**: `back/server.js`: un solo archivo de más de 2200 líneas con todas las rutas, la autenticación y las llamadas a las APIs de Google
- **Frontend**: `front/app.js`: un solo archivo de JavaScript puro, sin bundler
- **Configuración del frontend**: `front/config.js`: define `window.APP_CONFIG` y elige la URL de la API según el hostname
- **Apps Script**: `apps-script/`: copia versionada de `doPost.gs` y `Consolidado.gs` del Web App (el código que se ejecuta está en el proyecto de Apps Script)

## Particularidades de la arquitectura

- `express` figura en `package.json` pero **no se usa**: es un servidor HTTP de Node.js puro
- `front/` se despliega en GitHub Pages (con `.github/workflows/static.yml`)
- `back/` se despliega en Render
- El ID del spreadsheet de Avance Comisiones se resuelve automáticamente buscando en la carpeta, sin variable de entorno (ver `getCachedAvanceComisionesSpreadsheetId()`, server.js:890)

## Agregar una sección nueva

1. Agregar `'doc-X': 'section-id'` a `SECTION_DICTIONARY` en server.js
2. Agregar `'doc-X'` a `allowedSections` de los roles que correspondan en `ROLE_DEFINITIONS`
3. Agregar `<button class="nav-item" data-section="section-id">` en front/index.html
4. Agregar `<section id="section-id-section" class="section">` en front/index.html
5. Agregar `'doc-X': 'section-id'` a `sectionDictionary` y el manejo en `changeSection()`, ambos en front/app.js

## Configuración de entorno necesaria

Tiene que existir `back/.env`. Se crea copiando `back/.env.example`. Variables principales:
- `ALLOWED_ORIGIN`: origen u orígenes del frontend, separados por coma
- `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY`: cuenta de servicio
- `GOOGLE_LOGIN_CLIENT_ID`: para Google Sign-In

## Despliegue

- Front: push a main → GitHub Pages se despliega solo con la action
- Back: despliegue manual en Render (sin CI)
- Apps Script: nueva versión de la implementación existente, siempre con la cuenta de BA

## Caché del frontend

Después de editar archivos del front, actualizá el parámetro `?v=` de las etiquetas `<script>` y `<link>` en `front/index.html`.
