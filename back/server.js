/**
 * Servidor principal de Web Comisiones
 * Maneja autenticación, acceso a Google Sheets/Drive y serve de archivos estáticos
 * No usa Express - implementación nativa con Node.js http module
 */

// Módulos nativos de Node.js
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');

// Directorio donde se encuentran los archivos estáticos del frontend
const STATIC_DIR = path.join(__dirname, '..', 'front');

// Permisos de Google API requeridos para la aplicación
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.metadata.readonly'
];

// IDs de carpetas y spreadsheets en Google Drive/Sheets
const ESQUEMAS_COMISIONALES_FOLDER_ID = '1yXPctwQ1_qCYlFYxyY2qPymJXVqvNkem'; // Folder con esquemas comisionales
const AVANCE_COMISIONES_ROOT_FOLDER_ID = '15VSV2I1xDUxIQZ-JZmi-OCCfOkWIV0By'; // Folder raíz de cronogramas
const SEGUIMIENTO_SPREADSHEET_ID = '1Cht8Pfy4W8XWFkZJP1Z3tEkHGztnjG4z4UnYmDQLAbs'; // Spreadsheet de seguimiento
const GESTION_COMISIONES_SPREADSHEET_ID = '1iwineJiX2AKSKhc95MyExyherlXe3hyRsuMH8m2X9Sg'; // Spreadsheet gestión comisiones

// Hojas restringidas por spreadsheet - usuarios no pueden acceder a estas hojas
const RESTRICTED_SHEETS_BY_SPREADSHEET = {
  '1UssH4gfktDmGoVR88Ch2vH3KWxiBXILyc29Bc8_6gXc': ['resumen', 'avance'],
  [GESTION_COMISIONES_SPREADSHEET_ID]: ['colab', 'detalle_indicadores', 'link_de_interes', 'organigrama_comisional', 'organigrama_ba', 'config_aps'],
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

// Cachés para optimizar llamadas a Google API
let credentialsCache = null;         // Credenciales de service account
let tokenCache = null;                // Token de acceso OAuth
let appsScriptTokenCache = null;      // Token para Apps Script
let esquemasComisionalesCache = null;  // Lista de archivos de esquemas
let esquemasComisionalesCacheAt = 0;   // Timestamp de cache de esquemas
const ESQUEMAS_COMISIONALES_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

let avanceComisionesIdCache = null;   // ID del spreadsheet de avance comisiones
let avanceComisionesIdCacheAt = 0;
const AVANCE_COMISIONES_ID_CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutos

// Almacenamiento de sesiones activas en memoria
const activeSessions = new Map();

// Rate limiting y protección contra brute-force en login
// Configuración de rate limiting - protege contra ataques DDoS y brute-force
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // Ventana de 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 500;    // Máximo requests por IP en la ventana
const LOGIN_ATTEMPT_LIMIT = 5;          // Máximo intentos fallidos de login
const LOGIN_BLOCK_TIME_MS = 15 * 60 * 1000; // Bloqueo de 15 minutos tras exceder intentos

// Mapas para tracking de requests y intentos de login por IP
const ipRequestCounts = new Map();
const loginAttempts = new Map();

// Extrae la IP real del cliente considerando proxys (X-Forwarded-For)
function getClientIp(req) {
  const xfwd = req.headers['x-forwarded-for'];
  if (xfwd) {
    const ips = xfwd.split(',').map(s => s.trim());
    return ips[ips.length - 1];
  }
  return req.socket.remoteAddress || '';
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

// Carga variables de entorno desde archivo .env
loadDotEnv();

// Configuración del servidor desde variables de entorno
const SESSION_TTL_MS = Math.max(Number(process.env.SESSION_TTL_HOURS || 12), 1) * 60 * 60 * 1000; // Duración de sesión (default 12h)
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || 'Lax';
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

// Diccionario que mapea códigos de sección a IDs de sección en la UI
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
  'doc-j': 'organigrama',
  'doc-k': 'organigrama-ba',
  'doc-l': 'generador-correos',
  'doc-m': 'jira'
};
// Definiciones de roles y sus permisos
// Cada rol tiene acceso a secciones específicas y spreadsheets permitidos
const ROLE_DEFINITIONS = {
  administrador: {
    allowedSections: ['doc-a', 'doc-b', 'doc-c', 'doc-d', 'doc-e', 'doc-f', 'doc-g', 'doc-h', 'doc-i', 'doc-j', 'doc-k'],
    allowedSpreadsheetIds: ['*']
  },
  administrador_editor: {
    allowedSections: ['doc-a', 'doc-b', 'doc-c', 'doc-d', 'doc-e', 'doc-f', 'doc-g', 'doc-h', 'doc-i', 'doc-j', 'doc-k', 'doc-l', 'doc-m'],
    allowedSpreadsheetIds: ['*'],
    canEdit: true
  },
  usuario_gerencia: {
    allowedSections: ['doc-b', 'doc-d', 'doc-e', 'doc-f', 'doc-j'],
    allowedSpreadsheetIds: [SEGUIMIENTO_SPREADSHEET_ID, GESTION_COMISIONES_SPREADSHEET_ID]
  }
};
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || '';
const APPS_SCRIPT_SECRET = process.env.APPS_SCRIPT_SECRET || '';
const APPS_SCRIPT_AUTH_MODE = ['none', 'service', 'user'].includes(String(process.env.APPS_SCRIPT_AUTH_MODE || '').toLowerCase())
  ? String(process.env.APPS_SCRIPT_AUTH_MODE).toLowerCase()
  : 'none';
const USER_CONFIG = buildUserConfig();
const GOOGLE_LOGIN_CLIENT_ID = String(process.env.GOOGLE_LOGIN_CLIENT_ID || '').trim();
const JIRA_SITE = process.env.JIRA_SITE || 'prestamype.atlassian.net';
const JIRA_TOKENS_SHEET = 'PRIVATE';
const JIRA_START_DATE_FIELD = process.env.JIRA_START_DATE_FIELD || 'customfield_10015';

// Carga variables de entorno desde archivo .env
// Soporta valores con comillas y saltos de línea
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

  const editorUsername = process.env.EDITOR_USERNAME;
  const editorPassword = process.env.EDITOR_PASSWORD;
  if (editorUsername && editorPassword) {
    config[editorUsername] = {
      password: editorPassword,
      role: 'administrador_editor',
      ...ROLE_DEFINITIONS.administrador_editor
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
    acc[role] = configuredEmails.length ? configuredEmails : (fallbackRoleEmails[role] || []);
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

async function getAppsScriptToken() {
  if (appsScriptTokenCache && appsScriptTokenCache.expiresAt > Date.now() + 60_000) {
    return appsScriptTokenCache.accessToken;
  }

  const impersonateEmail = process.env.APPS_SCRIPT_IMPERSONATE_EMAIL;
  if (!impersonateEmail) {
    throw new Error('APPS_SCRIPT_IMPERSONATE_EMAIL no configurado en variables de entorno.');
  }

  const credentials = loadCredentials();
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    sub: impersonateEmail,
    scope: 'https://www.googleapis.com/auth/script.external_request',
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

  const tokenBody = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  });

  const response = await fetch(credentials.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'No se pudo obtener token para Apps Script.');
  }

  appsScriptTokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000
  };

  return appsScriptTokenCache.accessToken;
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

async function googleSheetsBatchUpdate(spreadsheetId, body) {
  const accessToken = await getGoogleAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    const cause = error.cause?.message ? ` Detalle: ${error.cause.message}` : '';
    throw new Error(`No se pudo conectar con Google Sheets.${cause}`);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Error al escribir en Google Sheets.');
  }

  return data;
}

async function googleSheetsAppend(spreadsheetId, range, values) {
  const accessToken = await getGoogleAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values })
    });
  } catch (error) {
    const cause = error.cause?.message ? ` Detalle: ${error.cause.message}` : '';
    throw new Error(`No se pudo conectar con Google Sheets.${cause}`);
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Error al agregar fila en Google Sheets.');
  return data;
}

async function googleSheetsSpreadsheetBatchUpdate(spreadsheetId, body) {
  const accessToken = await getGoogleAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    const cause = error.cause?.message ? ` Detalle: ${error.cause.message}` : '';
    throw new Error(`No se pudo conectar con Google Sheets.${cause}`);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Error al actualizar la estructura de Google Sheets.');
  }

  return data;
}

const AVANCE_EDITABLE_COLS = new Set(['B', 'O', 'P']);

function flattenSheetValidationData(response) {
  return (response.sheets || []).flatMap(sheet => sheet.data || []);
}

async function resolveValidationOptions(spreadsheetId, validation) {
  const conditionType = validation?.condition?.type;
  const conditionValues = validation?.condition?.values || [];

  if (conditionType === 'ONE_OF_LIST') {
    return conditionValues
      .map(value => String(value.userEnteredValue || '').trim())
      .filter(Boolean);
  }

  if (conditionType !== 'ONE_OF_RANGE') return [];

  const rangeExpression = String(conditionValues[0]?.userEnteredValue || '').trim().replace(/^=/, '');
  if (!rangeExpression) return [];

  const rangeResponse = await googleSheetsRequest(
    `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeExpression)}`
  );

  return (rangeResponse.values || [])
    .flat()
    .map(value => String(value || '').trim())
    .filter(Boolean);
}

async function handleSheetValidation(req, res, url) {
  const auth = authenticateRequest(req, res);
  if (!auth) return;

  const spreadsheetId = url.searchParams.get('spreadsheetId');
  const sheetName = url.searchParams.get('sheetName');
  const columns = (url.searchParams.get('columns') || '')
    .split(',').map(c => c.trim().toUpperCase()).filter(Boolean);

  if (!spreadsheetId || !sheetName || !columns.length) {
    sendJson(req, res, 400, { error: 'Faltan parámetros.' });
    return;
  }

  if (!await canAccessSpreadsheet(auth.user, spreadsheetId)) {
    sendJson(req, res, 403, { error: 'Sin permisos.' });
    return;
  }

  if (!canAccessSheetName(spreadsheetId, sheetName)) {
    sendJson(req, res, 403, { error: 'Sin permisos para esta pestana.' });
    return;
  }

  const ranges = columns.map(col => `'${sheetName}'!${col}2:${col}200`);

  const response = await googleSheetsRequest(`spreadsheets/${spreadsheetId}`, {
    ranges,
    includeGridData: 'true',
    fields: 'sheets(data(rowData(values(dataValidation))))'
  });

  const result = {};
  const validationBlocks = flattenSheetValidationData(response);

  for (let i = 0; i < columns.length; i += 1) {
    const col = columns[i];
    const validation = (validationBlocks[i]?.rowData || [])
      .map(row => row?.values?.[0]?.dataValidation)
      .find(Boolean);
    result[col] = await resolveValidationOptions(spreadsheetId, validation);
  }

  sendJson(req, res, 200, result);
}

async function handleUpdateSheetCells(req, res) {
  if (!validateOrigin(req, res)) return;

  const auth = authenticateRequest(req, res);
  if (!auth) return;

  if (!auth.user.canEdit) {
    sendJson(req, res, 403, { error: 'No tienes permisos de edición.' });
    return;
  }

  let body;
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(req, res, 400, { error: 'Cuerpo de petición inválido.' });
    return;
  }

  const { spreadsheetId, sheetName, updates } = body;

  if (!spreadsheetId || !sheetName || !Array.isArray(updates) || !updates.length) {
    sendJson(req, res, 400, { error: 'Faltan campos requeridos: spreadsheetId, sheetName, updates.' });
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

  const editableColumns = Array.isArray(body.editableColumns) && body.editableColumns.length
    ? new Set(body.editableColumns.map(col => String(col || '').trim().toUpperCase()).filter(Boolean))
    : AVANCE_EDITABLE_COLS;

  for (const update of updates) {
    const colLetter = String(update.range || '').match(/^([A-Z]+)/)?.[1];
    if (!colLetter || !editableColumns.has(colLetter)) {
      sendJson(req, res, 403, { error: `Columna no editable: ${colLetter || update.range}` });
      return;
    }
  }

  const batchData = updates.map(u => ({
    range: `'${sheetName}'!${u.range}`,
    values: [[String(u.value ?? '')]]
  }));

  await googleSheetsBatchUpdate(spreadsheetId, {
    valueInputOption: 'USER_ENTERED',
    data: batchData
  });

  sendJson(req, res, 200, { ok: true, updated: updates.length });
}

async function handleAppendSheetRow(req, res) {
  if (!validateOrigin(req, res)) return;

  const auth = authenticateRequest(req, res);
  if (!auth) return;

  if (!auth.user.canEdit) {
    sendJson(req, res, 403, { error: 'No tienes permisos de edición.' });
    return;
  }

  let body;
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(req, res, 400, { error: 'Cuerpo de petición inválido.' });
    return;
  }

  const { spreadsheetId, sheetName, rowValues, editableColumns } = body;

  if (!spreadsheetId || !sheetName || !Array.isArray(rowValues) || !rowValues.length) {
    sendJson(req, res, 400, { error: 'Faltan campos requeridos: spreadsheetId, sheetName, rowValues.' });
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

  const allowedColumns = new Set(
    (Array.isArray(editableColumns) && editableColumns.length
      ? editableColumns
      : rowValues.map(entry => entry?.colLetter)
    )
      .map(col => String(col || '').trim().toUpperCase())
      .filter(Boolean)
  );

  const normalizedRowValues = rowValues.map(entry => ({
    colLetter: String(entry?.colLetter || '').trim().toUpperCase(),
    value: String(entry?.value ?? '')
  }));

  for (const entry of normalizedRowValues) {
    if (!entry.colLetter || !allowedColumns.has(entry.colLetter)) {
      sendJson(req, res, 403, { error: `Columna no editable: ${entry.colLetter || '(vacía)'}` });
      return;
    }
  }

  const [sheetMetadata, currentValues] = await Promise.all([
    googleSheetsRequest(`spreadsheets/${spreadsheetId}`, {
      fields: 'sheets(properties(sheetId,title))'
    }),
    googleSheetsRequest(
      `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`'${sheetName}'!A:ZZ`)}`
    )
  ]);

  const targetSheet = (sheetMetadata.sheets || []).find(
    sheet => sheet.properties?.title === sheetName
  );

  if (targetSheet?.properties?.sheetId == null) {
    sendJson(req, res, 404, { error: 'Hoja no encontrada.' });
    return;
  }

  const lastFilledRow = Math.max((currentValues.values || []).length, 1);
  const targetRow = Math.max(lastFilledRow + 1, 2);
  const templateRow = Math.max(targetRow - 1, 2);

  if (targetRow !== templateRow) {
    await googleSheetsSpreadsheetBatchUpdate(spreadsheetId, {
      requests: [
        {
          copyPaste: {
            source: {
              sheetId: targetSheet.properties.sheetId,
              startRowIndex: templateRow - 1,
              endRowIndex: templateRow
            },
            destination: {
              sheetId: targetSheet.properties.sheetId,
              startRowIndex: targetRow - 1,
              endRowIndex: targetRow
            },
            pasteType: 'PASTE_FORMAT',
            pasteOrientation: 'NORMAL'
          }
        },
        {
          copyPaste: {
            source: {
              sheetId: targetSheet.properties.sheetId,
              startRowIndex: templateRow - 1,
              endRowIndex: templateRow
            },
            destination: {
              sheetId: targetSheet.properties.sheetId,
              startRowIndex: targetRow - 1,
              endRowIndex: targetRow
            },
            pasteType: 'PASTE_DATA_VALIDATION',
            pasteOrientation: 'NORMAL'
          }
        }
      ]
    });
  }

  await googleSheetsBatchUpdate(spreadsheetId, {
    valueInputOption: 'USER_ENTERED',
    data: normalizedRowValues.map(entry => ({
      range: `'${sheetName}'!${entry.colLetter}${targetRow}`,
      values: [[entry.value]]
    }))
  });

  sendJson(req, res, 200, { ok: true, row: targetRow, updated: normalizedRowValues.length });
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

async function getCachedAvanceComisionesSpreadsheetId() {
  const now = Date.now();
  if (avanceComisionesIdCache && now - avanceComisionesIdCacheAt < AVANCE_COMISIONES_ID_CACHE_TTL_MS) {
    return avanceComisionesIdCache;
  }

  const currentYear = String(new Date().getFullYear());

  // Buscar la subcarpeta del año actual
  const foldersResponse = await googleDriveRequest('files', {
    q: `'${AVANCE_COMISIONES_ROOT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id,name)',
    pageSize: '50'
  });
  const yearFolder = (foldersResponse.files || []).find(f => f.name === currentYear);
  if (!yearFolder) throw new Error(`No se encontró la carpeta del año ${currentYear} en Drive.`);

  // Listar archivos dentro de la carpeta del año (sin filtrar mimeType: puede ser Sheets nativo o Excel subido)
  const filesResponse = await googleDriveRequest('files', {
    q: `'${yearFolder.id}' in parents and trashed=false`,
    fields: 'files(id,name,mimeType)',
    pageSize: '100'
  });

  // Formato esperado: MMYYYY_Cronograma_de_Comisiones
  const cronogramaRegex = /^(\d{2})\d{4}_/i;
  let best = null;
  for (const file of (filesResponse.files || [])) {
    const match = file.name.match(cronogramaRegex);
    if (!match) continue;
    const month = parseInt(match[1], 10);
    if (!best || month > best.month) best = { month, id: file.id, name: file.name };
  }

  if (!best) {
    const found = (filesResponse.files || []).map(f => f.name).join(', ') || '(ninguno)';
    throw new Error(`No se encontró ningún archivo de cronograma en la carpeta ${currentYear}. Archivos encontrados: ${found}`);
  }

  avanceComisionesIdCache = best.id;
  avanceComisionesIdCacheAt = now;
  RESTRICTED_SHEETS_BY_SPREADSHEET[best.id] = ['cronograma'];
  return avanceComisionesIdCache;
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
    allowedSpreadsheetIds: user.allowedSpreadsheetIds,
    canEdit: !!user.canEdit
  };
}

function toPublicUser(user) {
  if (!user) return null;
  const { allowedSpreadsheetIds: _, ...publicUser } = user;
  return publicUser;
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

function validateOrigin(req, res) {
  const allowedOrigins = getAllowedOrigins();
  if (!allowedOrigins.length) return true;

  const requestOrigin = req.headers.origin || req.headers.referer || '';
  const matches = allowedOrigins.some(o => requestOrigin === o || requestOrigin.startsWith(o + '/'));
  if (!matches) {
    sendJson(req, res, 403, { error: 'Origen no permitido.' });
    return false;
  }
  return true;
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' https://accounts.google.com",
      "style-src 'self' 'unsafe-inline' https://accounts.google.com https://fonts.googleapis.com",
      "frame-src https://docs.google.com https://app.powerbi.com https://accounts.google.com",
      "connect-src 'self' https://ba-web-comisiones.onrender.com https://oauth2.googleapis.com",
      "img-src 'self' data: https://lh3.googleusercontent.com https://accounts.google.com",
      "font-src 'self' https://fonts.gstatic.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  );

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
  return cookies.session_token || '';
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
    user: toPublicUser(sanitizeUser(username))
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
    user: toPublicUser(sanitizeUser(googleUser.email))
  });
}

function handleSession(req, res) {
  const auth = authenticateRequest(req, res);
  if (!auth) return;
  sendJson(req, res, 200, { user: toPublicUser(auth.user) });
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

async function handleAvanceComisionesId(req, res) {
  const auth = authenticateRequest(req, res);
  if (!auth) return;

  if (!auth.user.allowedSections.includes('doc-a')) {
    sendJson(req, res, 403, { error: 'No tienes permisos para acceder a esta sección.' });
    return;
  }

  try {
    const spreadsheetId = await getCachedAvanceComisionesSpreadsheetId();
    sendJson(req, res, 200, { spreadsheetId });
  } catch (err) {
    console.error('Error handleAvanceComisionesId:', err.message);
    const msg = IS_PRODUCTION ? 'Error interno del servidor.' : err.message;
    sendJson(req, res, 500, { error: msg });
  }
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

function extractFileId(url) {
  const trimmed = String(url || '').trim();
  const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) return trimmed;
  return null;
}

function buildCorreoAsunto(asuntoBase, periodicidad) {
  const base = String(asuntoBase || '').trim();
  const normalizedPeriodicidad = String(periodicidad || '').trim().toUpperCase();
  const now = new Date();
  const periodDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = periodDate.getFullYear();

  if (normalizedPeriodicidad === 'TRIMESTRAL') {
    const quarter = Math.floor(periodDate.getMonth() / 3) + 1;
    return `${year}Q${quarter}_${base}`;
  }

  const month = String(periodDate.getMonth() + 1).padStart(2, '0');
  return `${year}${month}_${base}`;
}

async function handleGetCorreoEsquemas(req, res) {
  if (!validateOrigin(req, res)) return;
  const auth = authenticateRequest(req, res);
  if (!auth) return;

  if (!auth.user.allowedSections.includes('doc-l')) {
    sendJson(req, res, 403, { error: 'No tienes permisos para acceder a esta sección.' });
    return;
  }

  try {
    const spreadsheetId = await getCachedAvanceComisionesSpreadsheetId();
    const response = await googleSheetsRequest(`spreadsheets/${spreadsheetId}/values/${encodeURIComponent('CRONOGRAMA!D:E')}`);
    const rows = response.values || [];
    const dataRows = [];
    for (const r of rows.slice(1)) {
      const producto = String(r[0] || '').trim();
      const esquema = String(r[1] || '').trim();
      if (!producto && !esquema) break;
      dataRows.push({ producto, esquema });
    }
    sendJson(req, res, 200, { rows: dataRows });
  } catch (err) {
    console.error('Error handleGetCorreoEsquemas:', err.message);
    const msg = IS_PRODUCTION ? 'Error interno del servidor.' : err.message;
    sendJson(req, res, 500, { error: msg });
  }
}

async function handleValidateCorreo(req, res) {
  if (!validateOrigin(req, res)) return;
  const auth = authenticateRequest(req, res);
  if (!auth) return;

  if (!auth.user.allowedSections.includes('doc-l')) {
    sendJson(req, res, 403, { error: 'No tienes permisos para acceder a esta sección.' });
    return;
  }

  let body;
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(req, res, 400, { error: 'Cuerpo de petición inválido.' });
    return;
  }

  const producto = String(body.producto || '').trim();
  const esquema = String(body.esquema || '').trim();
  const url = String(body.url || '').trim();

  if (!esquema || !url) {
    sendJson(req, res, 400, { error: 'Faltan parámetros: esquema y url son requeridos.' });
    return;
  }

  const idArchivo = extractFileId(url);
  if (!idArchivo) {
    sendJson(req, res, 400, { error: 'No se pudo extraer el ID del archivo de la URL proporcionada.' });
    return;
  }

  try {
    const spreadsheetId = await getCachedAvanceComisionesSpreadsheetId();

    // Fetch CRONOGRAMA columns D through N (D=producto, E=esquema, H=periodicidad, L=fechaPago, N=asunto)
    const cronoResponse = await googleSheetsRequest(
      `spreadsheets/${spreadsheetId}/values/${encodeURIComponent('CRONOGRAMA!D:N')}`,
      { valueRenderOption: 'UNFORMATTED_VALUE' }
    );
    const rows = cronoResponse.values || [];
    const dataRows = [];
    for (const r of rows.slice(1)) {
      if (!String(r[0] || '').trim() && !String(r[1] || '').trim()) break;
      dataRows.push(r);
    }

    // In range D:N, offsets: D=0, E=1, F=2, G=3, H=4, I=5, J=6, K=7, L=8, M=9, N=10
    const matchRow = dataRows.find(row => {
      const rowEsquema = String(row[1] || '').trim();
      const rowProducto = String(row[0] || '').trim();
      if (rowEsquema !== esquema) return false;
      if (producto) return rowProducto === producto;
      return true;
    });
    if (!matchRow) {
      sendJson(req, res, 404, { error: `No se encontró el esquema "${esquema}" en CRONOGRAMA.` });
      return;
    }

    const periodicidad = String(matchRow[4] || '').trim();
    const fechaPagoRaw = matchRow[8];
    const asuntoBase = String(matchRow[10] || '').trim();
    const asunto = buildCorreoAsunto(asuntoBase, periodicidad);

    let fechaPagoStr = '';
    let tipoPago = 'fin_de_mes';
    if (fechaPagoRaw !== undefined && fechaPagoRaw !== '') {
      const serial = Number(fechaPagoRaw);
      if (!isNaN(serial) && serial > 25569) {
        const jsDate = new Date((serial - 25569) * 86400 * 1000);
        const day = jsDate.getUTCDate();
        const month = jsDate.getUTCMonth() + 1;
        const year = jsDate.getUTCFullYear();
        fechaPagoStr = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
        tipoPago = day <= 15 ? 'quincena' : 'fin_de_mes';
      } else {
        fechaPagoStr = String(fechaPagoRaw).trim();
      }
    }

    // Fetch INPUTS sheet: R4:T5 — quincena in col R (idx 0), fin de mes in col T (idx 2)
    const inputsResponse = await googleSheetsRequest(
      `spreadsheets/${spreadsheetId}/values/${encodeURIComponent('INPUTS!R4:T5')}`
    );
    const inputsRows = inputsResponse.values || [];
    const row4 = inputsRows[0] || [];
    const row5 = inputsRows[1] || [];

    let destinatarios, cc;
    if (tipoPago === 'quincena') {
      destinatarios = String(row4[0] || '').trim();
      cc = String(row5[0] || '').trim();
    } else {
      destinatarios = String(row4[2] || '').trim();
      cc = String(row5[2] || '').trim();
    }

    sendJson(req, res, 200, { asunto, periodicidad, fechaPago: fechaPagoStr, destinatarios, cc, idArchivo, tipoPago });
  } catch (err) {
    console.error('Error handleValidateCorreo:', err.message);
    const msg = IS_PRODUCTION ? 'Error interno del servidor.' : err.message;
    sendJson(req, res, 500, { error: msg });
  }
}

async function handleRunScript(req, res) {
  if (!validateOrigin(req, res)) return;

  const auth = authenticateRequest(req, res);
  if (!auth) return;

  if (!auth.user.allowedSections.includes('doc-l')) {
    sendJson(req, res, 403, { error: 'No tienes permisos para ejecutar automatizaciones.' });
    return;
  }

  let body;
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(req, res, 400, { error: 'Cuerpo de petición inválido.' });
    return;
  }

  const action = String(body.action || '').trim().toLowerCase();

  if (!['correo'].includes(action)) {
    sendJson(req, res, 400, { error: 'Acción no válida.' });
    return;
  }

  const idArchivo = String(body.idArchivo || '').trim();
  const asunto = String(body.asunto || '').trim();
  const tipoPago = String(body.tipoPago || '').trim();
  const periodicidad = String(body.periodicidad || '').trim();
  const destinatarios = String(body.destinatarios || '').trim();
  const cc = String(body.cc || '').trim();

  if (!idArchivo || !asunto || !tipoPago) {
    sendJson(req, res, 400, { error: 'Faltan parámetros para la acción correo.' });
    return;
  }

  if (!APPS_SCRIPT_URL) {
    sendJson(req, res, 503, { error: 'Apps Script no configurado en el servidor.' });
    return;
  }

  const appsScriptHeaders = {
    'Content-Type': 'application/json'
  };

  if (APPS_SCRIPT_AUTH_MODE === 'user') {
    const userAccessToken = typeof body.accessToken === 'string' && body.accessToken.length > 20
      ? body.accessToken
      : null;

    if (!userAccessToken) {
      sendJson(req, res, 500, { error: 'Esta acción requiere iniciar sesión con Google.' });
      return;
    }

    appsScriptHeaders.Authorization = `Bearer ${userAccessToken}`;
  } else if (APPS_SCRIPT_AUTH_MODE === 'service') {
    try {
      const serviceAccessToken = await getAppsScriptToken();
      appsScriptHeaders.Authorization = `Bearer ${serviceAccessToken}`;
    } catch (err) {
      console.error('Error obteniendo token para Apps Script:', err.message);
      const msg = IS_PRODUCTION
        ? 'Esta acción requiere iniciar sesión con Google.'
        : err.message;
      sendJson(req, res, 500, { error: msg });
      return;
    }
  }

  let appsResponse;
  try {
    appsResponse = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: appsScriptHeaders,
      body: JSON.stringify({ action, idArchivo, asunto, tipoPago, periodicidad, destinatarios, cc, secret: APPS_SCRIPT_SECRET }),
      redirect: 'follow'
    });
  } catch (err) {
    console.error('Error llamando Apps Script:', err.message);
    const msg = IS_PRODUCTION ? 'No se pudo conectar con Apps Script.' : err.message;
    sendJson(req, res, 500, { error: msg });
    return;
  }

  let appsData;
  try {
    appsData = await appsResponse.json();
  } catch {
    const text = await appsResponse.text().catch(() => '(no text)');
    console.error('Apps Script respuesta no-JSON. Status:', appsResponse.status, '| Body:', text.slice(0, 300));
    if (appsResponse.status === 401) {
      sendJson(req, res, 500, { error: 'Apps Script rechazó la llamada con 401. Verifica el despliegue del Web App: acceso por link si usas APPS_SCRIPT_AUTH_MODE=none, o token válido si usas service/user.' });
      return;
    }
    sendJson(req, res, 500, { error: 'Respuesta inválida de Apps Script.' });
    return;
  }

  if (!appsData.ok) {
    sendJson(req, res, 500, { error: appsData.error || 'Error al ejecutar el script.' });
    return;
  }

  sendJson(req, res, 200, { ok: true });
}

// ── Jira helpers ──────────────────────────────────────────────────────────────

async function jiraApiRequest(jiraEmail, apiToken, path, params = {}, method = 'GET') {
  const credentials = Buffer.from(`${jiraEmail}:${apiToken}`).toString('base64');
  const headers = { Authorization: `Basic ${credentials}`, Accept: 'application/json' };

  let url, fetchOptions;
  if (method === 'POST' || method === 'PUT') {
    url = `https://${JIRA_SITE}/rest${path}`;
    headers['Content-Type'] = 'application/json';
    fetchOptions = { method, headers, body: JSON.stringify(params) };
  } else {
    const urlObj = new URL(`https://${JIRA_SITE}/rest${path}`);
    Object.entries(params).forEach(([k, v]) => v != null && urlObj.searchParams.set(k, String(v)));
    url = urlObj.toString();
    fetchOptions = { headers };
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (error) {
    throw new Error(`No se pudo conectar con Jira: ${error.message}`);
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const msg = data.message || (data.errorMessages || []).join(', ') || 'Error en Jira API';
    throw new Error(msg);
  }
  return data;
}

async function getJiraToken(username) {
  try {
    const response = await googleSheetsRequest(
      `spreadsheets/${GESTION_COMISIONES_SPREADSHEET_ID}/values/${encodeURIComponent(`${JIRA_TOKENS_SHEET}!A:C`)}`
    );
    const rows = response.values || [];
    const row = rows.find(r => String(r[0] || '').trim() === username);
    if (!row || !row[1] || !row[2]) return null;
    return { jiraEmail: String(row[1]).trim(), apiToken: String(row[2]).trim() };
  } catch {
    return null;
  }
}

async function saveJiraToken(username, jiraEmail, apiToken) {
  const response = await googleSheetsRequest(
    `spreadsheets/${GESTION_COMISIONES_SPREADSHEET_ID}/values/${encodeURIComponent(`${JIRA_TOKENS_SHEET}!A:A`)}`
  );
  const rows = response.values || [];
  const rowIdx = rows.findIndex(r => String(r[0] || '').trim() === username);
  const now = new Date().toISOString();

  if (rowIdx >= 0) {
    const targetRow = rowIdx + 1;
    await googleSheetsBatchUpdate(GESTION_COMISIONES_SPREADSHEET_ID, {
      valueInputOption: 'RAW',
      data: [{ range: `${JIRA_TOKENS_SHEET}!A${targetRow}:D${targetRow}`, values: [[username, jiraEmail, apiToken, now]] }]
    });
  } else {
    await googleSheetsAppend(
      GESTION_COMISIONES_SPREADSHEET_ID,
      `${JIRA_TOKENS_SHEET}!A:D`,
      [[username, jiraEmail, apiToken, now]]
    );
  }
}

// ── Jira handlers ─────────────────────────────────────────────────────────────

async function handleJiraTokenGet(req, res) {
  const auth = authenticateRequest(req, res);
  if (!auth) return;
  if (!auth.user.allowedSections.includes('doc-m')) {
    sendJson(req, res, 403, { error: 'Sin permisos.' });
    return;
  }
  const token = await getJiraToken(auth.user.username);
  if (!token) {
    sendJson(req, res, 200, { hasToken: false });
    return;
  }
  const parts = token.jiraEmail.split('@');
  const maskedEmail = parts[0].slice(0, 3) + '***@' + (parts[1] || '');
  sendJson(req, res, 200, { hasToken: true, jiraEmail: maskedEmail });
}

async function handleJiraTokenSave(req, res) {
  if (!validateOrigin(req, res)) return;
  const auth = authenticateRequest(req, res);
  if (!auth) return;
  if (!auth.user.allowedSections.includes('doc-m')) {
    sendJson(req, res, 403, { error: 'Sin permisos.' });
    return;
  }

  let body;
  try { body = await parseJsonBody(req); } catch {
    sendJson(req, res, 400, { error: 'Cuerpo inválido.' }); return;
  }

  const jiraEmail = String(body.jiraEmail || '').trim().toLowerCase();
  const apiToken = String(body.apiToken || '').trim();
  if (!jiraEmail || !apiToken) {
    sendJson(req, res, 400, { error: 'Faltan jiraEmail o apiToken.' }); return;
  }

  try {
    await jiraApiRequest(jiraEmail, apiToken, '/agile/1.0/board', { maxResults: 1 });
  } catch (err) {
    sendJson(req, res, 400, { error: `Token inválido o sin acceso a Jira: ${err.message}` }); return;
  }

  await saveJiraToken(auth.user.username, jiraEmail, apiToken);
  sendJson(req, res, 200, { ok: true });
}

async function handleJiraBoards(req, res) {
  const auth = authenticateRequest(req, res);
  if (!auth) return;
  if (!auth.user.allowedSections.includes('doc-m')) {
    sendJson(req, res, 403, { error: 'Sin permisos.' }); return;
  }

  const token = await getJiraToken(auth.user.username);
  if (!token) { sendJson(req, res, 404, { error: 'No hay token de Jira guardado.' }); return; }

  const data = await jiraApiRequest(token.jiraEmail, token.apiToken, '/api/3/project/search', { maxResults: 50 });
  const boards = (data.values || []).map(p => ({
    id: p.key,
    name: p.name,
    type: p.projectTypeKey,
    projectKey: p.key
  }));
  sendJson(req, res, 200, { boards });
}

async function handleJiraBoardIssues(req, res, url) {
  const auth = authenticateRequest(req, res);
  if (!auth) return;
  if (!auth.user.allowedSections.includes('doc-m')) {
    sendJson(req, res, 403, { error: 'Sin permisos.' }); return;
  }

  const projectKey = url.searchParams.get('boardId');
  if (!projectKey) { sendJson(req, res, 400, { error: 'Falta boardId.' }); return; }

  const token = await getJiraToken(auth.user.username);
  if (!token) { sendJson(req, res, 404, { error: 'No hay token de Jira guardado.' }); return; }

  const issuesData = await jiraApiRequest(
    token.jiraEmail, token.apiToken,
    '/api/3/search/jql',
    {
      jql: `project="${projectKey}" AND assignee="${token.jiraEmail}" ORDER BY created DESC`,
      fields: ['summary', 'status', 'assignee', 'priority', 'issuetype'],
      maxResults: 100
    },
    'POST'
  );

  const issues = (issuesData.issues || []).map(i => ({
    key: i.key,
    summary: i.fields?.summary || '',
    status: i.fields?.status?.name || 'Sin estado',
    assignee: i.fields?.assignee?.displayName || null,
    priority: i.fields?.priority?.name || null,
    type: i.fields?.issuetype?.name || null
  }));

  sendJson(req, res, 200, { sprintName: projectKey, issues });
}

async function handleJiraTransitions(req, res, url) {
  const auth = authenticateRequest(req, res);
  if (!auth) return;
  if (!auth.user.allowedSections.includes('doc-m')) { sendJson(req, res, 403, { error: 'Sin permisos.' }); return; }

  const issueKey = url.searchParams.get('issueKey');
  if (!issueKey) { sendJson(req, res, 400, { error: 'Falta issueKey.' }); return; }

  const token = await getJiraToken(auth.user.username);
  if (!token) { sendJson(req, res, 404, { error: 'Sin token de Jira.' }); return; }

  const data = await jiraApiRequest(token.jiraEmail, token.apiToken, `/api/3/issue/${encodeURIComponent(issueKey)}/transitions`);
  sendJson(req, res, 200, { transitions: (data.transitions || []).map(t => ({ id: t.id, name: t.name })) });
}

async function handleJiraApplyTransition(req, res) {
  if (!validateOrigin(req, res)) return;
  const auth = authenticateRequest(req, res);
  if (!auth) return;
  if (!auth.user.allowedSections.includes('doc-m')) { sendJson(req, res, 403, { error: 'Sin permisos.' }); return; }

  let body;
  try { body = await parseJsonBody(req); } catch { sendJson(req, res, 400, { error: 'Cuerpo inválido.' }); return; }

  const { issueKey, transitionId } = body;
  if (!issueKey || !transitionId) { sendJson(req, res, 400, { error: 'Faltan issueKey o transitionId.' }); return; }

  const token = await getJiraToken(auth.user.username);
  if (!token) { sendJson(req, res, 404, { error: 'Sin token de Jira.' }); return; }

  await jiraApiRequest(token.jiraEmail, token.apiToken, `/api/3/issue/${encodeURIComponent(issueKey)}/transitions`, { transition: { id: transitionId } }, 'POST');
  sendJson(req, res, 200, { ok: true });
}

async function handleJiraAddComment(req, res) {
  if (!validateOrigin(req, res)) return;
  const auth = authenticateRequest(req, res);
  if (!auth) return;
  if (!auth.user.allowedSections.includes('doc-m')) { sendJson(req, res, 403, { error: 'Sin permisos.' }); return; }

  let body;
  try { body = await parseJsonBody(req); } catch { sendJson(req, res, 400, { error: 'Cuerpo inválido.' }); return; }

  const { issueKey, comment } = body;
  if (!issueKey || !String(comment || '').trim()) {
    sendJson(req, res, 400, { error: 'Faltan issueKey o comment.' }); return;
  }

  const token = await getJiraToken(auth.user.username);
  if (!token) { sendJson(req, res, 404, { error: 'Sin token de Jira.' }); return; }

  await jiraApiRequest(
    token.jiraEmail, token.apiToken,
    `/api/3/issue/${encodeURIComponent(issueKey)}/comment`,
    {
      body: {
        type: 'doc', version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: String(comment).trim() }] }]
      }
    },
    'POST'
  );
  sendJson(req, res, 200, { ok: true });
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function adfToHtml(node) {
  if (!node) return '';
  if (node.type === 'text') {
    let text = escapeHtml(node.text || '');
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === 'strong') text = `<strong>${text}</strong>`;
        else if (mark.type === 'em') text = `<em>${text}</em>`;
        else if (mark.type === 'code') text = `<code>${text}</code>`;
        else if (mark.type === 'underline') text = `<u>${text}</u>`;
        else if (mark.type === 'strike') text = `<s>${text}</s>`;
        else if (mark.type === 'link') {
          const href = escapeHtml(mark.attrs?.href || '#');
          text = `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        }
      }
    }
    return text;
  }
  if (node.type === 'hardBreak') return '<br>';
  if (node.type === 'mention') return `<strong>${escapeHtml(node.attrs?.text || node.attrs?.id || '')}</strong>`;
  if (node.type === 'emoji') return escapeHtml(node.attrs?.text || node.attrs?.shortName || '');
  if (node.type === 'inlineCard' || node.type === 'blockCard') {
    const url = escapeHtml(node.attrs?.url || '');
    return url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>` : '';
  }
  if (node.type === 'media' || node.type === 'mediaSingle' || node.type === 'mediaGroup') return '';
  const inner = (node.content || []).map(adfToHtml).join('');
  switch (node.type) {
    case 'doc': return inner;
    case 'paragraph': return `<p>${inner}</p>`;
    case 'heading': { const l = Math.min(Math.max(node.attrs?.level || 3, 1), 6); return `<h${l}>${inner}</h${l}>`; }
    case 'bulletList': return `<ul>${inner}</ul>`;
    case 'orderedList': return `<ol>${inner}</ol>`;
    case 'listItem': return `<li>${inner}</li>`;
    case 'blockquote': return `<blockquote>${inner}</blockquote>`;
    case 'codeBlock': return `<pre><code>${inner}</code></pre>`;
    case 'rule': return '<hr>';
    case 'table': return `<table>${inner}</table>`;
    case 'tableRow': return `<tr>${inner}</tr>`;
    case 'tableHeader': return `<th>${inner}</th>`;
    case 'tableCell': return `<td>${inner}</td>`;
    default: return inner;
  }
}

function extractAdfText(node) {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  if (node.content && Array.isArray(node.content)) {
    const parts = node.content.map(extractAdfText);
    const sep = (node.type === 'paragraph' || node.type === 'heading') ? '\n' : '';
    return parts.join('') + sep;
  }
  return '';
}

async function handleJiraGetComments(req, res, url) {
  const auth = authenticateRequest(req, res);
  if (!auth) return;
  if (!auth.user.allowedSections.includes('doc-m')) { sendJson(req, res, 403, { error: 'Sin permisos.' }); return; }

  const issueKey = url.searchParams.get('issueKey');
  if (!issueKey) { sendJson(req, res, 400, { error: 'Falta issueKey.' }); return; }

  const token = await getJiraToken(auth.user.username);
  if (!token) { sendJson(req, res, 404, { error: 'Sin token de Jira.' }); return; }

  const data = await jiraApiRequest(
    token.jiraEmail, token.apiToken,
    `/api/3/issue/${encodeURIComponent(issueKey)}/comment`,
    { maxResults: 50, orderBy: 'created' }
  );

  const comments = (data.comments || []).map(c => ({
    id: c.id,
    author: c.author?.displayName || 'Desconocido',
    created: c.created,
    body: extractAdfText(c.body).trim()
  }));

  sendJson(req, res, 200, { comments });
}

async function handleJiraGetIssue(req, res, url) {
  const auth = authenticateRequest(req, res);
  if (!auth) return;
  if (!auth.user.allowedSections.includes('doc-m')) { sendJson(req, res, 403, { error: 'Sin permisos.' }); return; }

  const issueKey = url.searchParams.get('issueKey');
  if (!issueKey) { sendJson(req, res, 400, { error: 'Falta issueKey.' }); return; }

  const token = await getJiraToken(auth.user.username);
  if (!token) { sendJson(req, res, 404, { error: 'Sin token de Jira.' }); return; }

  const data = await jiraApiRequest(
    token.jiraEmail, token.apiToken,
    `/api/3/issue/${encodeURIComponent(issueKey)}`,
    { fields: `summary,description,status,assignee,priority,comment,duedate,${JIRA_START_DATE_FIELD}` }
  );

  const fields = data.fields || {};
  const comments = (fields.comment?.comments || []).map(c => ({
    id: c.id,
    author: c.author?.displayName || 'Desconocido',
    created: c.created,
    bodyHtml: adfToHtml(c.body)
  }));

  sendJson(req, res, 200, {
    key: data.key,
    summary: fields.summary || '',
    descriptionHtml: adfToHtml(fields.description),
    status: fields.status?.name || '',
    assignee: fields.assignee?.displayName || null,
    priority: fields.priority?.name || null,
    duedate: fields.duedate || null,
    startdate: fields[JIRA_START_DATE_FIELD] || null,
    startDateField: JIRA_START_DATE_FIELD,
    comments
  });
}

async function handleJiraUpdateIssue(req, res) {
  if (!validateOrigin(req, res)) return;
  const auth = authenticateRequest(req, res);
  if (!auth) return;
  if (!auth.user.allowedSections.includes('doc-m')) { sendJson(req, res, 403, { error: 'Sin permisos.' }); return; }

  let body;
  try { body = await parseJsonBody(req); } catch { sendJson(req, res, 400, { error: 'Cuerpo inválido.' }); return; }

  const { issueKey, field, value } = body;
  if (!issueKey || !field) { sendJson(req, res, 400, { error: 'Faltan issueKey o field.' }); return; }

  const token = await getJiraToken(auth.user.username);
  if (!token) { sendJson(req, res, 404, { error: 'Sin token de Jira.' }); return; }

  const fieldKey = field === 'startdate' ? JIRA_START_DATE_FIELD : field;
  await jiraApiRequest(
    token.jiraEmail, token.apiToken,
    `/api/3/issue/${encodeURIComponent(issueKey)}`,
    { fields: { [fieldKey]: value || null } },
    'PUT'
  );
  sendJson(req, res, 200, { ok: true });
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

    if (req.method === 'GET' && url.pathname === '/api/avance-comisiones-id') {
      await handleAvanceComisionesId(req, res);
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

    if (req.method === 'GET' && url.pathname === '/api/sheetvalidation') {
      await handleSheetValidation(req, res, url);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/updatesheetcells') {
      await handleUpdateSheetCells(req, res);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/appendsheetrow') {
      await handleAppendSheetRow(req, res);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/correo-esquemas') {
      await handleGetCorreoEsquemas(req, res);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/correo-validate') {
      await handleValidateCorreo(req, res);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/run-script') {
      await handleRunScript(req, res);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/jira/token') {
      await handleJiraTokenGet(req, res);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/jira/token') {
      await handleJiraTokenSave(req, res);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/jira/boards') {
      await handleJiraBoards(req, res);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/jira/board-issues') {
      await handleJiraBoardIssues(req, res, url);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/jira/transitions') {
      await handleJiraTransitions(req, res, url);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/jira/transition') {
      await handleJiraApplyTransition(req, res);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/jira/comment') {
      await handleJiraAddComment(req, res);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/jira/comments') {
      await handleJiraGetComments(req, res, url);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/jira/issue') {
      await handleJiraGetIssue(req, res, url);
      return;
    }

    if (req.method === 'PUT' && url.pathname === '/api/jira/issue') {
      await handleJiraUpdateIssue(req, res);
      return;
    }

    if (req.method === 'GET') {
      serveStaticFile(req, res, url.pathname);
      return;
    }

    sendText(req, res, 404, 'No encontrado');
  } catch (error) {
    console.error('[ERROR]', error.message);
    const msg = IS_PRODUCTION ? 'Error interno del servidor.' : error.message;
    sendJson(req, res, 500, { error: msg });
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
