const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const VISUALIZADO_SPREADSHEET_IDS = [
  '1pjrRfDZt6oV8hZIXE25y69UbRNj3YQwDroa0gSwnYig',
  '1t2xYzutCL8azNBaGI4NX6xCnycbNwt24il_PgjZAuO8',
  '1tvJ8pMj5UAeiIkh79ia4A_AA-8GhLu5TO5bUpAD1ddw',
  '11lf7hDRySyzVSiSoRXofH5XpDTaDPUucZ0rHkjngvug',
  '1UssH4gfktDmGoVR88Ch2vH3KWxiBXILyc29Bc8_6gXc'
];
const SEGUIMIENTO_SPREADSHEET_ID = '1Cht8Pfy4W8XWFkZJP1Z3tEkHGztnjG4z4UnYmDQLAbs';
const GESTION_COMISIONES_SPREADSHEET_ID = '1iwineJiX2AKSKhc95MyExyherlXe3hyRsuMH8m2X9Sg';
const AVANCE_COMISIONES_SPREADSHEET_ID =
  process.env.AVANCE_COMISIONES_SPREADSHEET_ID || '1gMgyhJUnwU3V_dYIP0ekG-iJy77u2SlHYgQ177peFxM';
const RESTRICTED_SHEETS_BY_SPREADSHEET = {
  '1UssH4gfktDmGoVR88Ch2vH3KWxiBXILyc29Bc8_6gXc': ['resumen', 'avance'],
  [GESTION_COMISIONES_SPREADSHEET_ID]: ['colab'],
  [AVANCE_COMISIONES_SPREADSHEET_ID]: ['cronograma']
};
const ENV_PATH = path.join(__dirname, '.env');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

let credentialsCache = null;
let tokenCache = null;

const activeSessions = new Map();

// Rate limiting y login brute-force
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const RATE_LIMIT_MAX_REQUESTS = 200;
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_BLOCK_TIME_MS = 15 * 60 * 1000; // 15 minutos
const ipRequestCounts = new Map();
const loginAttempts = new Map();
function getClientIp(req) {
  // X-Forwarded-For puede ser spoofed, pero es útil si hay proxy
  const xfwd = req.headers['x-forwarded-for'];
  return (xfwd ? xfwd.split(',')[0].trim() : req.socket.remoteAddress) || '';
}

function rateLimitMiddleware(req, res) {
  const ip = getClientIp(req);
  const now = Date.now();
  if (!ipRequestCounts.has(ip)) {
    ipRequestCounts.set(ip, []);
  }
  const timestamps = ipRequestCounts.get(ip).filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  ipRequestCounts.set(ip, timestamps);
  if (timestamps.length > RATE_LIMIT_MAX_REQUESTS) {
    sendJson(req, res, 429, { error: 'Demasiadas peticiones. Intenta más tarde.' });
    return false;
  }
  return true;
}

function isLoginBlocked(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (entry.blockedUntil && entry.blockedUntil > Date.now()) return true;
  return false;
}

function registerLoginAttempt(ip, success) {
  let entry = loginAttempts.get(ip) || { fails: 0, blockedUntil: 0 };
  if (success) {
    entry = { fails: 0, blockedUntil: 0 };
  } else {
    entry.fails += 1;
    if (entry.fails >= LOGIN_ATTEMPT_LIMIT) {
      entry.blockedUntil = Date.now() + LOGIN_BLOCK_TIME_MS;
      entry.fails = 0;
    }
  }
  loginAttempts.set(ip, entry);
}

loadDotEnv();

const SESSION_TTL_MS = Math.max(Number(process.env.SESSION_TTL_HOURS || 12), 1) * 60 * 60 * 1000;
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || 'Lax';
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';
const USER_CONFIG = buildUserConfig();

function loadDotEnv() {
  if (!fs.existsSync(ENV_PATH)) return;

  const rawEnv = fs.readFileSync(ENV_PATH, 'utf8');
  rawEnv.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] != null) return;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value.replace(/\\n/g, '\n');
  });
}

function buildUserConfig() {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const gerenciaUsername = process.env.GERENCIA_USERNAME;
  const gerenciaPassword = process.env.GERENCIA_PASSWORD;
  const config = {};

  if (adminUsername && adminPassword) {
    config[adminUsername] = {
      password: adminPassword,
      role: 'administrador',
      allowedSections: ['avance-comisiones', 'visualizado', 'resumen-avance', 'politicas', 'rentabilidad', 'seguimiento', 'gestion-comisiones'],
      allowedSpreadsheetIds: ['*']
    };
  }

  if (gerenciaUsername && gerenciaPassword) {
    config[gerenciaUsername] = {
      password: gerenciaPassword,
      role: 'usuario_gerencia',
      allowedSections: ['visualizado', 'politicas', 'rentabilidad', 'seguimiento'],
      allowedSpreadsheetIds: [...VISUALIZADO_SPREADSHEET_IDS, SEGUIMIENTO_SPREADSHEET_ID]
    };
  }

  if (!Object.keys(config).length) {
    throw new Error(
      'Faltan usuarios en variables de entorno. Configura ADMIN_USERNAME, ADMIN_PASSWORD, GERENCIA_USERNAME y GERENCIA_PASSWORD.'
    );
  }

  return config;
}

function loadCredentials() {
  if (credentialsCache) return credentialsCache;

  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error(
      'Faltan GOOGLE_CLIENT_EMAIL y GOOGLE_PRIVATE_KEY en variables de entorno.'
    );
  }

  credentialsCache = {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    token_uri: process.env.GOOGLE_TOKEN_URI || 'https://oauth2.googleapis.com/token'
  };

  return credentialsCache;
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function getGoogleAccessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  const credentials = loadCredentials();
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: SCOPES.join(' '),
    aud: credentials.token_uri || 'https://oauth2.googleapis.com/token',
    exp: issuedAt + 3600,
    iat: issuedAt
  };
  const header = { alg: 'RS256', typ: 'JWT' };
  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(unsignedToken)
    .sign(credentials.private_key, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  const assertion = `${unsignedToken}.${signature}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  });

  let response;
  try {
    response = await fetch(payload.aud, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });
  } catch (error) {
    const cause = error.cause?.message ? ` Detalle: ${error.cause.message}` : '';
    throw new Error(`No se pudo conectar con Google OAuth.${cause}`);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'No se pudo obtener el token de Google.');
  }

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000
  };

  return tokenCache.accessToken;
}

async function googleSheetsRequest(endpoint, params = {}) {
  const accessToken = await getGoogleAccessToken();
  const url = new URL(`https://sheets.googleapis.com/v4/${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach(item => url.searchParams.append(key, item));
      return;
    }
    url.searchParams.set(key, value);
  });

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
  } catch (error) {
    const cause = error.cause?.message ? ` Detalle: ${error.cause.message}` : '';
    throw new Error(`No se pudo conectar con Google Sheets.${cause}`);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Error al consultar Google Sheets.');
  }

  return data;
}

function createSession(username) {
  const token = crypto.randomBytes(24).toString('hex');
  activeSessions.set(token, {
    username,
    expiresAt: Date.now() + SESSION_TTL_MS
  });
  return token;
}

function sanitizeUser(username) {
  const user = USER_CONFIG[username];
  if (!user) return null;

  return {
    username,
    role: user.role,
    allowedSections: user.allowedSections,
    allowedSpreadsheetIds: user.allowedSpreadsheetIds
  };
}

function canAccessSpreadsheet(user, spreadsheetId) {
  return user.allowedSpreadsheetIds.includes('*') || user.allowedSpreadsheetIds.includes(spreadsheetId);
}

function getAllowedSheetNames(spreadsheetId) {
  return RESTRICTED_SHEETS_BY_SPREADSHEET[spreadsheetId] || null;
}

function canAccessSheetName(spreadsheetId, sheetName) {
  const allowedSheetNames = getAllowedSheetNames(spreadsheetId);
  if (!allowedSheetNames) return true;
  return allowedSheetNames.includes(String(sheetName || '').trim().toLowerCase());
}

function getAllowedOrigins() {
  return String(process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

function resolveAllowedOrigin(req) {
  const requestOrigin = req.headers.origin || '';
  const allowedOrigins = getAllowedOrigins();

  if (!allowedOrigins.length) {
    return requestOrigin || '*';
  }

  if (allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  return allowedOrigins[0];
}

function setCorsHeaders(req, res) {
  const allowedOrigin = resolveAllowedOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Cache-Control', 'no-store');

  // HSTS solo en producción y si es HTTPS
  if (IS_PRODUCTION) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  res.setHeader('Vary', 'Origin');
}

function sendJson(req, res, statusCode, payload) {
  setCorsHeaders(req, res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendText(req, res, statusCode, payload) {
  setCorsHeaders(req, res);
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(payload);
}

function parseCookies(req) {
  const rawCookie = req.headers.cookie || '';
  return rawCookie.split(';').reduce((acc, entry) => {
    const trimmed = entry.trim();
    if (!trimmed) return acc;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) return acc;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function getAuthTokenFromRequest(req) {
  const cookies = parseCookies(req);
  if (cookies.session_token) {
    return cookies.session_token;
  }

  const authHeader = req.headers.authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
}

function buildSessionCookie(token, expiresAt) {
  const cookieParts = [
    `session_token=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    `SameSite=${COOKIE_SAMESITE}`,
    `Max-Age=${Math.max(Math.floor((expiresAt - Date.now()) / 1000), 0)}`
  ];

  if (IS_PRODUCTION || COOKIE_SECURE) {
    cookieParts.push('Secure');
  }

  return cookieParts.join('; ');
}

function clearSessionCookie(res) {
  const cookieParts = [
    'session_token=',
    'HttpOnly',
    'Path=/',
    `SameSite=${COOKIE_SAMESITE}`,
    'Max-Age=0'
  ];

  if (IS_PRODUCTION || COOKIE_SECURE) {
    cookieParts.push('Secure');
  }

  res.setHeader('Set-Cookie', cookieParts.join('; '));
}

function authenticateRequest(req, res) {
  const token = getAuthTokenFromRequest(req);
  if (!token || !activeSessions.has(token)) {
    clearSessionCookie(res);
    sendJson(req, res, 401, { error: 'No autorizado' });
    return null;
  }

  const session = activeSessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    activeSessions.delete(token);
    clearSessionCookie(res);
    sendJson(req, res, 401, { error: 'Sesion expirada' });
    return null;
  }

  session.expiresAt = Date.now() + SESSION_TTL_MS;
  activeSessions.set(token, session);
  res.setHeader('Set-Cookie', buildSessionCookie(token, session.expiresAt));

  const username = session.username;
  const user = sanitizeUser(username);
  if (!user) {
    activeSessions.delete(token);
    clearSessionCookie(res);
    sendJson(req, res, 401, { error: 'Sesion invalida' });
    return null;
  }

  return { token, user };
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Body demasiado grande.'));
        req.destroy();
      }
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function parseJsonBody(req) {
  const rawBody = await readRequestBody(req);
  if (!rawBody) return {};

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    throw new Error('JSON invalido.');
  }
}

function resolveStaticPath(requestPath) {
  const normalizedPath = requestPath === '/' ? '/index.html' : requestPath;
  const decodedPath = decodeURIComponent(normalizedPath);
  const safePath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  const absolutePath = path.join(__dirname, safePath);

  if (!absolutePath.startsWith(__dirname)) {
    return null;
  }

  return absolutePath;
}

function serveStaticFile(req, res, pathname) {
  const filePath = resolveStaticPath(pathname);
  if (!filePath) {
    sendText(req, res, 403, 'Acceso denegado');
    return;
  }

  const fileName = path.basename(filePath).toLowerCase();
  if (fileName === 'credential.json' || fileName === 'package.json' || fileName === 'package-lock.json') {
    sendText(req, res, 404, 'No encontrado');
    return;
  }

  let stats;
  try {
    stats = fs.statSync(filePath);
  } catch {
    sendText(req, res, 404, 'No encontrado');
    return;
  }

  if (stats.isDirectory()) {
    serveStaticFile(req, res, path.join(pathname, 'index.html'));
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || 'application/octet-stream';
  setCorsHeaders(req, res);
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

async function handleLogin(req, res) {
  const ip = getClientIp(req);
  if (isLoginBlocked(ip)) {
    sendJson(req, res, 429, { error: 'Demasiados intentos fallidos. Intenta más tarde.' });
    return;
  }
  const body = await parseJsonBody(req);
  // Sanitización básica de usuario
  const username = String(body.username || '').replace(/[^a-zA-Z0-9_.@-]/g, '').trim();
  const password = String(body.password || '');
  const user = USER_CONFIG[username];

  if (!user || user.password !== password) {
    registerLoginAttempt(ip, false);
    sendJson(req, res, 401, { error: 'Usuario o clave incorrectos' });
    return;
  }

  registerLoginAttempt(ip, true);
  const token = createSession(username);
  const expiresAt = activeSessions.get(token).expiresAt;
  res.setHeader('Set-Cookie', buildSessionCookie(token, expiresAt));
  sendJson(req, res, 200, {
    token,
    user: sanitizeUser(username)
  });
}

function handleSession(req, res) {
  const auth = authenticateRequest(req, res);
  if (!auth) return;
  sendJson(req, res, 200, { user: auth.user });
}

function handleLogout(req, res) {
  const auth = authenticateRequest(req, res);
  if (!auth) return;
  activeSessions.delete(auth.token);
  clearSessionCookie(res);
  sendJson(req, res, 200, { ok: true });
}

async function handleSheetNames(req, res, url) {
  const auth = authenticateRequest(req, res);
  if (!auth) return;

  const spreadsheetId = url.searchParams.get('spreadsheetId');
  if (!spreadsheetId) {
    sendJson(req, res, 400, { error: 'Falta spreadsheetId' });
    return;
  }

  if (!canAccessSpreadsheet(auth.user, spreadsheetId)) {
    sendJson(req, res, 403, { error: 'No tienes permisos para acceder a esta hoja.' });
    return;
  }

  const response = await googleSheetsRequest(`spreadsheets/${spreadsheetId}`, {
    fields: 'sheets.properties.title'
  });
  const titles = (response.sheets || []).map(sheet => sheet.properties?.title).filter(Boolean);
  const excludes = ['indice', 'info', 'modelo esquemas'];
  const allowedSheetNames = getAllowedSheetNames(spreadsheetId);
  const filtered = Array.from(new Set(
    titles
      .map(title => title.trim())
      .filter(title => title.length)
      .filter(title => !excludes.includes(title.toLowerCase()))
      .filter(title => !allowedSheetNames || allowedSheetNames.includes(title.toLowerCase()))
  ));

  sendJson(req, res, 200, { sheets: filtered });
}

async function handleSpreadsheetMeta(req, res, url) {
  const auth = authenticateRequest(req, res);
  if (!auth) return;

  const spreadsheetId = url.searchParams.get('spreadsheetId');
  if (!spreadsheetId) {
    sendJson(req, res, 400, { error: 'Falta spreadsheetId' });
    return;
  }

  if (!canAccessSpreadsheet(auth.user, spreadsheetId)) {
    sendJson(req, res, 403, { error: 'No tienes permisos para acceder a esta hoja.' });
    return;
  }

  const response = await googleSheetsRequest(`spreadsheets/${spreadsheetId}`, {
    fields: 'properties.title'
  });

  sendJson(req, res, 200, {
    title: response.properties?.title || ''
  });
}

async function handleSheetData(req, res, url) {
  const auth = authenticateRequest(req, res);
  if (!auth) return;

  const spreadsheetId = url.searchParams.get('spreadsheetId');
  const sheetName = url.searchParams.get('sheetName');
  const range = url.searchParams.get('range') || 'A1:ZZ5000';

  if (!spreadsheetId || !sheetName) {
    sendJson(req, res, 400, { error: 'Falta spreadsheetId o sheetName' });
    return;
  }

  if (!canAccessSpreadsheet(auth.user, spreadsheetId)) {
    sendJson(req, res, 403, { error: 'No tienes permisos para acceder a esta hoja.' });
    return;
  }

  if (!canAccessSheetName(spreadsheetId, sheetName)) {
    sendJson(req, res, 403, { error: 'No tienes permisos para acceder a esta pestana.' });
    return;
  }

  const response = await googleSheetsRequest(`spreadsheets/${spreadsheetId}`, {
    ranges: `'${sheetName}'!${range}`,
    includeGridData: 'true',
    fields: 'sheets(properties(title),merges,data(rowData(values(formattedValue,hyperlink,effectiveFormat(backgroundColor,borders),textFormatRuns(format(link(uri))),chipRuns))))'
  });
  const sheet = (response.sheets || [])[0];

  if (!sheet) {
    sendJson(req, res, 404, { error: 'Hoja no encontrada' });
    return;
  }

  sendJson(req, res, 200, {
    sheet: sheet.properties?.title || sheetName,
    merges: sheet.merges || [],
    data: sheet.data || []
  });
}

async function requestHandler(req, res) {
  // Forzado de HTTPS en producción
  if (IS_PRODUCTION && req.headers['x-forwarded-proto'] === 'http') {
    const host = req.headers.host || '';
    res.writeHead(301, { Location: `https://${host}${req.url}` });
    res.end();
    return;
  }

  // Rate limiting global
  if (!rateLimitMiddleware(req, res)) return;

  setCorsHeaders(req, res);

  // Solo permite métodos GET, POST y OPTIONS
  if (!['GET', 'POST', 'OPTIONS'].includes(req.method)) {
    sendText(req, res, 405, 'Método no permitido');
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');

  try {
    if (req.method === 'POST' && url.pathname === '/api/login') {
      await handleLogin(req, res);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(req, res, 200, { ok: true, uptime: Math.round(process.uptime()) });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/session') {
      handleSession(req, res);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/logout') {
      handleLogout(req, res);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/sheetnames') {
      await handleSheetNames(req, res, url);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/spreadsheetmeta') {
      await handleSpreadsheetMeta(req, res, url);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/sheetdata') {
      await handleSheetData(req, res, url);
      return;
    }

    if (req.method === 'GET') {
      serveStaticFile(req, res, url.pathname);
      return;
    }

    sendText(req, res, 404, 'No encontrado');
  } catch (error) {
    if (!IS_PRODUCTION) {
      console.error('[ERROR]', error.message);
    }
    sendJson(req, res, 500, { error: error.message });
  }
}
const server = http.createServer((req, res) => {
  requestHandler(req, res);
});

server.on('error', error => {
  console.error(`[SERVER ERROR] ${error.code || 'UNKNOWN'}: ${error.message}`);
});

server.listen(PORT, HOST, () => {
  console.log(`Servidor ejecutandose en http://${HOST}:${PORT}`);
  console.log('Esperando conexiones...');
});
