const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');

const STATIC_DIR = path.join(__dirname, '..', 'front');

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly'
];
const ESQUEMAS_COMISIONALES_FOLDER_ID = '1yXPctwQ1_qCYlFYxyY2qPymJXVqvNkem';
const SEGUIMIENTO_SPREADSHEET_ID = '1Cht8Pfy4W8XWFkZJP1Z3tEkHGztnjG4z4UnYmDQLAbs';
const GESTION_COMISIONES_SPREADSHEET_ID = '1iwineJiX2AKSKhc95MyExyherlXe3hyRsuMH8m2X9Sg';
const AVANCE_COMISIONES_SPREADSHEET_ID =
  process.env.AVANCE_COMISIONES_SPREADSHEET_ID || '1gMgyhJUnwU3V_dYIP0ekG-iJy77u2SlHYgQ177peFxM';
const RESTRICTED_SHEETS_BY_SPREADSHEET = {
  '1UssH4gfktDmGoVR88Ch2vH3KWxiBXILyc29Bc8_6gXc': ['resumen', 'avance'],
  [GESTION_COMISIONES_SPREADSHEET_ID]: ['colab', 'detalle_indicadores', 'link_de_interes', 'organigrama_comisional'],
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
let esquemasComisionalesCache = null;
let esquemasComisionalesCacheAt = 0;
const ESQUEMAS_COMISIONALES_CACHE_TTL_MS = 10 * 60 * 1000;

const activeSessions = new Map();

// Rate limiting y login brute-force
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 500;
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
const SECTION_DICTIONARY = {
  'doc-a': 'avance-comisiones',
  'doc-b': 'visualizado',
  'doc-c': 'resumen-avance',
  'doc-d': 'politicas',
  'doc-e': 'rentabilidad',
  'doc-f': 'seguimiento',
  'doc-g': 'gestion-comisiones',
  'doc-h': 'detalle-indicadores',
  'doc-i': 'links-interes',
  'doc-j': 'organigrama'
};
const ROLE_DEFINITIONS = {
  administrador: {
    allowedSections: ['doc-a', 'doc-b', 'doc-c', 'doc-d', 'doc-e', 'doc-f', 'doc-g', 'doc-h', 'doc-i', 'doc-j'],
    allowedSpreadsheetIds: ['*']
  },
  usuario_gerencia: {
    allowedSections: ['doc-b', 'doc-d', 'doc-e', 'doc-f', 'doc-j'],
    allowedSpreadsheetIds: [SEGUIMIENTO_SPREADSHEET_ID, GESTION_COMISIONES_SPREADSHEET_ID]
  }
};
const USER_CONFIG = buildUserConfig();
const GOOGLE_LOGIN_CLIENT_ID = String(process.env.GOOGLE_LOGIN_CLIENT_ID || '').trim();

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
  const googleRoleEmails = parseGoogleRoleEmails();

  if (adminUsername && adminPassword) {
    config[adminUsername] = {
      password: adminPassword,
      role: 'administrador',
      ...ROLE_DEFINITIONS.administrador
    };
  }

  if (gerenciaUsername && gerenciaPassword) {
    config[gerenciaUsername] = {
      password: gerenciaPassword,
      role: 'usuario_gerencia',
      ...ROLE_DEFINITIONS.usuario_gerencia
    };
  }

  Object.entries(googleRoleEmails).forEach(([role, emails]) => {
    const roleDefinition = ROLE_DEFINITIONS[role];
    if (!roleDefinition) return;

    emails.forEach(email => {
      config[email] = {
        role,
        ...roleDefinition,
        authProvider: 'google'
      };
    });
  });

  if (!Object.keys(config).length) {
    throw new Error(
      'Faltan usuarios en variables de entorno. Configura ADMIN_USERNAME, ADMIN_PASSWORD, GERENCIA_USERNAME y GERENCIA_PASSWORD.'
    );
  }

  return config;
}

function normalizeEmailList(value) {
  const rawValues = Array.isArray(value)
    ? value
    : String(value || '')
        .split(',')
        .map(entry => entry.trim());

  return Array.from(new Set(
    rawValues
      .map(entry => String(entry || '').trim().toLowerCase())
      .filter(Boolean)
  ));
}

function parseGoogleRoleEmails() {
  const fallbackRoleEmails = {
    administrador: normalizeEmailList(process.env.ADMIN_GOOGLE_EMAIL),
    usuario_gerencia: normalizeEmailList(process.env.GERENCIA_GOOGLE_EMAIL)
  };
  const rawJson = String(process.env.GOOGLE_ROLE_EMAILS_JSON || '').trim();
  if (!rawJson) {
    if (!fallbackRoleEmails.administrador.length && !fallbackRoleEmails.usuario_gerencia.length) {
      return {};
    }
    return fallbackRoleEmails;
  }

  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    throw new Error('GOOGLE_ROLE_EMAILS_JSON no tiene un JSON valido.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('GOOGLE_ROLE_EMAILS_JSON debe ser un objeto por rol.');
  }

  return Object.keys(ROLE_DEFINITIONS).reduce((acc, role) => {
    const configuredEmails = normalizeEmailList(parsed[role]);
    acc[role] = configuredEmails.length ? configuredEmails : fallbackRoleEmails[role];
    return acc;
  }, {});
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

async function googleDriveRequest(endpoint, params = {}) {
  const accessToken = await getGoogleAccessToken();
  const url = new URL(`https://www.googleapis.com/drive/v3/${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value == null) return;
    url.searchParams.set(key, value);
  });

  let response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  } catch (error) {
    const cause = error.cause?.message ? ` Detalle: ${error.cause.message}` : '';
    throw new Error(`No se pudo conectar con Google Drive.${cause}`);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Error al consultar Google Drive.');
  }

  return data;
}

function parseVisualizadoFileName(filename) {
  const name = filename.replace(/\.[a-zA-Z0-9]{2,10}$/, '').trim();
  const prefix = 'comisiones_';
  const lower = name.toLowerCase();
  const prefixIdx = lower.indexOf(prefix);
  if (prefixIdx === -1) return name;

  const afterPrefix = name.slice(prefixIdx + prefix.length);
  const dashIdx = afterPrefix.indexOf(' - ');
  if (dashIdx !== -1) return afterPrefix.slice(dashIdx + 3).trim();

  const simpleDash = afterPrefix.indexOf('-');
  if (simpleDash !== -1) return afterPrefix.slice(simpleDash + 1).trim();

  return afterPrefix.trim();
}

async function getCachedEsquemasComisionales() {
  const now = Date.now();
  if (esquemasComisionalesCache && now - esquemasComisionalesCacheAt < ESQUEMAS_COMISIONALES_CACHE_TTL_MS) {
    return esquemasComisionalesCache;
  }

  const response = await googleDriveRequest('files', {
    q: `'${ESQUEMAS_COMISIONALES_FOLDER_ID}' in parents and trashed=false`,
    fields: 'files(id,name)',
    pageSize: '200'
  });

  esquemasComisionalesCache = response.files || [];
  esquemasComisionalesCacheAt = now;
  return esquemasComisionalesCache;
}

async function verifyGoogleIdToken(idToken) {
  if (!GOOGLE_LOGIN_CLIENT_ID) {
    throw new Error('El login con Google no esta configurado.');
  }

  let response;
  try {
    response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  } catch (error) {
    const cause = error.cause?.message ? ` Detalle: ${error.cause.message}` : '';
    throw new Error(`No se pudo validar el acceso con Google.${cause}`);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Token de Google invalido.');
  }

  const email = String(data.email || '').trim().toLowerCase();
  const audience = String(data.aud || '').trim();
  const emailVerified = String(data.email_verified || '').toLowerCase() === 'true';
  const issuer = String(data.iss || '').trim();
  const validIssuers = new Set(['accounts.google.com', 'https://accounts.google.com']);

  if (!email) {
    throw new Error('Google no devolvio un correo valido.');
  }

  if (!emailVerified) {
    throw new Error('La cuenta de Google debe tener el correo verificado.');
  }

  if (audience !== GOOGLE_LOGIN_CLIENT_ID) {
    throw new Error('El token de Google no pertenece a esta aplicacion.');
  }

  if (!validIssuers.has(issuer)) {
    throw new Error('El emisor del token de Google no es valido.');
  }

  return {
    email,
    name: String(data.name || '').trim()
  };
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

async function canAccessSpreadsheet(user, spreadsheetId) {
  if (user.allowedSpreadsheetIds.includes('*')) return true;
  if (user.allowedSpreadsheetIds.includes(spreadsheetId)) return true;

  // For users with access to the visualizado section, also allow IDs from the Drive folder
  if (user.allowedSections.includes('doc-b')) {
    try {
      const files = await getCachedEsquemasComisionales();
      return files.some(f => f.id === spreadsheetId);
    } catch {
      return false;
    }
  }

  return false;
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

  // Origin not in the allowed list — log it to make CORS issues easy to diagnose (skip if no origin header)
  if (requestOrigin) {
    console.warn(`[CORS] Origin bloqueado: "${requestOrigin}". Agrega este origen a ALLOWED_ORIGIN en Render.`);
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
  const absolutePath = path.join(STATIC_DIR, safePath);

  if (!absolutePath.startsWith(STATIC_DIR)) {
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

async function handleGoogleLogin(req, res) {
  const body = await parseJsonBody(req);
  const idToken = String(body.idToken || '').trim();

  if (!idToken) {
    sendJson(req, res, 400, { error: 'Falta el token de Google.' });
    return;
  }

  const googleUser = await verifyGoogleIdToken(idToken);
  const user = USER_CONFIG[googleUser.email];

  if (!user) {
    sendJson(req, res, 403, { error: 'Tu correo de Google no tiene acceso a esta aplicacion.' });
    return;
  }

  const token = createSession(googleUser.email);
  const expiresAt = activeSessions.get(token).expiresAt;
  res.setHeader('Set-Cookie', buildSessionCookie(token, expiresAt));
  sendJson(req, res, 200, {
    token,
    user: sanitizeUser(googleUser.email)
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

async function handleEsquemasComisionales(req, res) {
  const auth = authenticateRequest(req, res);
  if (!auth) return;

  if (!auth.user.allowedSections.includes('doc-b')) {
    sendJson(req, res, 403, { error: 'No tienes permisos para acceder a esta sección.' });
    return;
  }

  const rawFiles = await getCachedEsquemasComisionales();
  const files = rawFiles.map(f => ({
    id: f.id,
    nombre: parseVisualizadoFileName(f.name)
  }));

  sendJson(req, res, 200, { files });
}

async function handleSheetNames(req, res, url) {
  const auth = authenticateRequest(req, res);
  if (!auth) return;

  const spreadsheetId = url.searchParams.get('spreadsheetId');
  if (!spreadsheetId) {
    sendJson(req, res, 400, { error: 'Falta spreadsheetId' });
    return;
  }

  if (!await canAccessSpreadsheet(auth.user, spreadsheetId)) {
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

  if (!await canAccessSpreadsheet(auth.user, spreadsheetId)) {
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

  if (!await canAccessSpreadsheet(auth.user, spreadsheetId)) {
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

    if (req.method === 'POST' && url.pathname === '/api/login/google') {
      await handleGoogleLogin(req, res);
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

    if (req.method === 'GET' && url.pathname === '/api/esquemas-comisionales') {
      await handleEsquemasComisionales(req, res);
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
