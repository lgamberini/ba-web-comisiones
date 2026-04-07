const sheetConfig = [
  { nombre: "COMISIONES FACTORING", id: "1pjrRfDZt6oV8hZIXE25y69UbRNj3YQwDroa0gSwnYig" },
  { nombre: "COMISIONES PGH", id: "1t2xYzutCL8azNBaGI4NX6xCnycbNwt24il_PgjZAuO8" },
  { nombre: "COMISIONES GESTORA", id: "1tvJ8pMj5UAeiIkh79ia4A_AA-8GhLu5TO5bUpAD1ddw" },
  { nombre: "COMISIONES CAMBIO SEGURO", id: "11lf7hDRySyzVSiSoRXofH5XpDTaDPUucZ0rHkjngvug" }
];
const resumenAvanceConfig = {
  nombre: "Seguimiento de Automatizaciones",
  id: "1UssH4gfktDmGoVR88Ch2vH3KWxiBXILyc29Bc8_6gXc",
  primarySheet: 'resumen',
  secondarySheet: 'avance'
};

// Configuración del Google Sheet de Seguimiento
const seguimientoSheetConfig = { 
  nombre: "Seguimiento de Excepciones", 
  id: "1Cht8Pfy4W8XWFkZJP1Z3tEkHGztnjG4z4UnYmDQLAbs" 
};
const gestionComisionesConfig = {
  nombre: 'Gestión de comisiones',
  id: '1iwineJiX2AKSKhc95MyExyherlXe3hyRsuMH8m2X9Sg',
  sheetName: 'COLAB',
  productColumnIndex: 0,
  esquemaColumnIndex: 1,
  firstLinkColumnIndex: 2
};
const avanceComisionesConfig = {
  nombre: 'Avance Comisiones',
  id: '1gMgyhJUnwU3V_dYIP0ekG-iJy77u2SlHYgQ177peFxM',
  sheetName: 'CRONOGRAMA'
};

const excludes = ["indice", "info", "modelo esquemas"];
const API_BASE_URL = getApiBaseUrl();
const GOOGLE_CLIENT_ID = getGoogleClientId();
const IS_LOCAL_ENV = ['localhost', '127.0.0.1'].includes(window.location.hostname);

const elements = {
  loginView: document.getElementById("loginView"),
  appShell: document.getElementById("appShell"),
  sidebarToggleBtn: document.getElementById("sidebarToggleBtn"),
  loginForm: document.getElementById("loginForm"),
  loginIntroText: document.getElementById("loginIntroText"),
  usernameInput: document.getElementById("usernameInput"),
  passwordInput: document.getElementById("passwordInput"),
  loginBtn: document.getElementById("loginBtn"),
  loginStatus: document.getElementById("loginStatus"),
  googleLoginButton: document.getElementById("googleLoginButton"),
  googleLoginFallback: document.getElementById("googleLoginFallback"),
  credentialsLoginWrap: document.getElementById("credentialsLoginWrap"),
  sessionUser: document.getElementById("sessionUser"),
  sessionRole: document.getElementById("sessionRole"),
  logoutBtn: document.getElementById("logoutBtn"),
  productSelect: document.getElementById("productSelect"),
  sheetSelect: document.getElementById("sheetSelect"),
  activeSheetTitle: document.getElementById("activeSheetTitle"),
  status: document.getElementById("status"),
  tableWrapper: document.getElementById("tableWrapper"),
  refreshListBtn: document.getElementById("refreshListBtn"),
  refreshDataBtn: document.getElementById("refreshDataBtn"),
  resumenAvanceTitle: document.getElementById("resumenAvanceTitle"),
  resumenAvanceStatus: document.getElementById("resumenAvanceStatus"),
  resumenAvanceWrapper: document.getElementById("resumenAvanceWrapper"),
  resumenAvanceRefreshBtn: document.getElementById("resumenAvanceRefreshBtn"),
  politicasTitle: document.getElementById("politicasTitle"),
  politicasStatus: document.getElementById("politicasStatus"),
  politicasFrame: document.getElementById("politicasFrame"),
  rentabilidadTitle: document.getElementById("rentabilidadTitle"),
  rentabilidadStatus: document.getElementById("rentabilidadStatus"),
  rentabilidadFrame: document.getElementById("rentabilidadFrame"),
  seguimientoSheetSelect: document.getElementById("seguimientoSheetSelect"),
  seguimientoSheetTitle: document.getElementById("seguimientoSheetTitle"),
  seguimientoStatus: document.getElementById("seguimientoStatus"),
  seguimientoTableWrapper: document.getElementById("seguimientoTableWrapper"),
  gestionProductoSelect: document.getElementById("gestionProductoSelect"),
  gestionTitle: document.getElementById("gestionTitle"),
  gestionStatus: document.getElementById("gestionStatus"),
  gestionLinksWrapper: document.getElementById("gestionLinksWrapper"),
  gestionRefreshBtn: document.getElementById("gestionRefreshBtn"),
  avanceComisionesTitle: document.getElementById("avanceComisionesTitle"),
  avanceComisionesStatus: document.getElementById("avanceComisionesStatus"),
  avanceComisionesWrapper: document.getElementById("avanceComisionesWrapper"),
  avanceComisionesRefreshBtn: document.getElementById("avanceComisionesRefreshBtn"),
};

let currentProduct = null;
let currentSheet = null;
let currentSeguimientoSheet = null;
let autoRefreshId = null;
let currentUser = null;
let currentGestionGroups = [];
let currentGestionProduct = '';
const tableRange = 'A1:ZZ5000';
const excludedHeaders = new Set(['link manual']);
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'sidebar-collapsed';
const AUTH_TOKEN_STORAGE_KEY = 'auth-token';
let googleLoginInitialized = false;

function setStatus(text, isError = false) {
  elements.status.textContent = text;
  elements.status.style.color = isError ? '#b91c1c' : '#334155';
}

function setLoginStatus(text, isError = false) {
  elements.loginStatus.textContent = text;
  elements.loginStatus.style.color = isError ? '#b91c1c' : '#334155';
}

function setSidebarCollapsed(isCollapsed) {
  elements.appShell.classList.toggle('sidebar-collapsed', isCollapsed);
  elements.sidebarToggleBtn.setAttribute('aria-expanded', String(!isCollapsed));
  elements.sidebarToggleBtn.setAttribute(
    'aria-label',
    isCollapsed ? 'Expandir menu lateral' : 'Minimizar menu lateral'
  );
  window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, isCollapsed ? '1' : '0');
}

function toggleSidebar() {
  const isCollapsed = elements.appShell.classList.contains('sidebar-collapsed');
  setSidebarCollapsed(!isCollapsed);
}

function restoreSidebarState() {
  const isCollapsed = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === '1';
  setSidebarCollapsed(isCollapsed);
}

async function authFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const authToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });
}

function getApiBaseUrl() {
  const configuredBaseUrl = window.APP_CONFIG?.API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '');
  }

  return window.location.origin;
}

function getGoogleClientId() {
  return String(window.APP_CONFIG?.GOOGLE_CLIENT_ID || '').trim();
}

function configureLoginView() {
  if (IS_LOCAL_ENV) {
    elements.loginIntroText.textContent = 'Ingresa con Google o usa usuario y clave para las pruebas de roles.';
    elements.credentialsLoginWrap.classList.remove('hidden');
    elements.usernameInput.required = true;
    elements.passwordInput.required = true;
    return;
  }

  elements.loginIntroText.textContent = 'Ingresa con tu cuenta Google autorizada para continuar.';
  elements.credentialsLoginWrap.classList.add('hidden');
  elements.usernameInput.required = false;
  elements.passwordInput.required = false;
}

function hasAccessToSection(sectionId) {
  return currentUser?.allowedSections?.includes(sectionId);
}

function resetVisualizadoState() {
  currentProduct = null;
  currentSheet = null;
  elements.productSelect.innerHTML = '';
  elements.sheetSelect.innerHTML = '<option value="">-- Seleccionar hoja --</option>';
  elements.activeSheetTitle.textContent = 'Sin hoja seleccionada';
  elements.tableWrapper.innerHTML = '';
  elements.refreshDataBtn.disabled = true;
}

function resetSeguimientoState() {
  currentSeguimientoSheet = null;
  elements.seguimientoSheetSelect.innerHTML = '<option value="">-- Seleccionar hoja --</option>';
  elements.seguimientoSheetTitle.textContent = 'Sin hoja seleccionada';
  elements.seguimientoTableWrapper.innerHTML = '';
}

function resetResumenAvanceState() {
  elements.resumenAvanceTitle.textContent = 'Seguimiento de Automatizaciones';
  elements.resumenAvanceStatus.textContent = 'Abre esta sección para cargar la información.';
  elements.resumenAvanceStatus.style.color = '#334155';
  elements.resumenAvanceWrapper.innerHTML = '';
}

function resetGestionState() {
  currentGestionGroups = [];
  currentGestionProduct = '';
  elements.gestionProductoSelect.innerHTML = '<option value="">-- Seleccionar producto --</option>';
  elements.gestionTitle.textContent = gestionComisionesConfig.nombre;
  elements.gestionStatus.textContent = 'Abre esta sección para cargar la información.';
  elements.gestionStatus.style.color = '#334155';
  elements.gestionLinksWrapper.innerHTML = '';
}

function resetAvanceComisionesState() {
  elements.avanceComisionesTitle.textContent = avanceComisionesConfig.nombre;
  elements.avanceComisionesStatus.textContent = 'Abre esta sección para cargar la información.';
  elements.avanceComisionesStatus.style.color = '#334155';
  elements.avanceComisionesWrapper.innerHTML = '';
}

function resetPoliticasState() {
  elements.politicasTitle.textContent = 'Politicas de comisiones';
  elements.politicasStatus.textContent = 'Documento cargado.';
  elements.politicasStatus.style.color = '#334155';
}

function resetRentabilidadState() {
  elements.rentabilidadTitle.textContent = 'Dash de rentabilidad';
  elements.rentabilidadStatus.textContent = 'Dashboard cargado.';
  elements.rentabilidadStatus.style.color = '#334155';
}

function applyPermissions() {
  document.querySelectorAll('.nav-item').forEach(button => {
    const sectionId = button.getAttribute('data-section');
    const isAllowed = hasAccessToSection(sectionId);
    button.classList.toggle('hidden', !isAllowed);
  });

  if (!hasAccessToSection('seguimiento')) {
    document.getElementById('seguimiento-section').classList.remove('active');
    resetSeguimientoState();
  }

  if (!hasAccessToSection('resumen-avance')) {
    document.getElementById('resumen-avance-section').classList.remove('active');
    resetResumenAvanceState();
  }

  if (!hasAccessToSection('politicas')) {
    document.getElementById('politicas-section').classList.remove('active');
    resetPoliticasState();
  }

  if (!hasAccessToSection('rentabilidad')) {
    document.getElementById('rentabilidad-section').classList.remove('active');
    resetRentabilidadState();
  }

  if (!hasAccessToSection('gestion-comisiones')) {
    document.getElementById('gestion-comisiones-section').classList.remove('active');
    resetGestionState();
  }

  if (!hasAccessToSection('avance-comisiones')) {
    document.getElementById('avance-comisiones-section').classList.remove('active');
    resetAvanceComisionesState();
  }

  if (!hasAccessToSection('visualizado')) {
    document.getElementById('visualizado-section').classList.remove('active');
    resetVisualizadoState();
  }

  const firstAllowedButton = Array.from(document.querySelectorAll('.nav-item'))
    .find(button => !button.classList.contains('hidden'));
  const firstAllowedSection = firstAllowedButton?.getAttribute('data-section');
  if (firstAllowedSection) {
    changeSection(firstAllowedSection);
  }
}

function showAppForUser(user) {
  currentUser = user;
  document.body.classList.remove('logged-out');
  document.body.classList.add('logged-in');
  const displayRole = user.role === 'usuario_gerencia' ? 'gerencia' : user.role;
  elements.sessionUser.textContent = '';
  elements.sessionRole.textContent = `Rol: ${displayRole}`;
  elements.loginView.classList.add('hidden');
  elements.appShell.classList.remove('hidden');
  applyPermissions();
}

function storeAuthToken(token) {
  if (!token) return;
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

function clearStoredAuthToken() {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

function clearSessionUi() {
  currentUser = null;
  clearStoredAuthToken();
  document.body.classList.remove('logged-in');
  document.body.classList.add('logged-out');
  if (autoRefreshId) {
    clearInterval(autoRefreshId);
    autoRefreshId = null;
  }
  resetVisualizadoState();
  resetSeguimientoState();
  resetResumenAvanceState();
  resetGestionState();
  resetAvanceComisionesState();
  resetPoliticasState();
  resetRentabilidadState();
  elements.loginForm.reset();
  elements.appShell.classList.add('hidden');
  elements.loginView.classList.remove('hidden');
  setLoginStatus('Ingresa tus credenciales para continuar.', false);
}

async function handleLogin(event) {
  event.preventDefault();
  setLoginStatus('Validando credenciales...', false);

  try {
    const res = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: elements.usernameInput.value.trim(),
        password: elements.passwordInput.value
      })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    storeAuthToken(data.token);
    showAppForUser(data.user);
  } catch (err) {
    console.error('Error login:', err.message);
    setLoginStatus(err.message, true);
  }
}

async function handleGoogleCredentialResponse(response) {
  const idToken = String(response?.credential || '').trim();
  if (!idToken) {
    setLoginStatus('Google no devolvio un token valido.', true);
    return;
  }

  setLoginStatus('Validando acceso con Google...', false);

  try {
    const res = await fetch(`${API_BASE_URL}/api/login/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ idToken })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    storeAuthToken(data.token);
    showAppForUser(data.user);
  } catch (err) {
    console.error('Error login google:', err.message);
    setLoginStatus(err.message, true);
  }
}

function initGoogleLogin(attempt = 0) {
  if (!GOOGLE_CLIENT_ID) {
    elements.googleLoginFallback.classList.remove('hidden');
    return;
  }

  const googleIdentity = window.google?.accounts?.id;
  if (!googleIdentity) {
    if (attempt >= 20) {
      elements.googleLoginFallback.textContent = 'No se pudo cargar Google Sign-In en este momento.';
      elements.googleLoginFallback.classList.remove('hidden');
      return;
    }

    window.setTimeout(() => initGoogleLogin(attempt + 1), 250);
    return;
  }

  if (googleLoginInitialized) return;

  googleIdentity.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredentialResponse
  });
  googleIdentity.renderButton(elements.googleLoginButton, {
    theme: 'outline',
    size: 'large',
    width: '360',
    text: 'signin_with',
    shape: 'rect'
  });
  googleLoginInitialized = true;
  elements.googleLoginFallback.classList.add('hidden');
}

async function restoreSession() {
  setLoginStatus('Restaurando sesión...', false);

  try {
    const res = await authFetch(`${API_BASE_URL}/api/session`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    showAppForUser(data.user);
  } catch (err) {
    console.error('Error restoreSession:', err.message);
    clearSessionUi();
  }
}

async function logout() {
  try {
    await authFetch(`${API_BASE_URL}/api/logout`, { method: 'POST' });
  } catch (err) {
    console.error('Error logout:', err.message);
  } finally {
    clearSessionUi();
  }
}

function loadProducts() {
  if (!hasAccessToSection('visualizado')) return;

  elements.productSelect.innerHTML = "";
  sheetConfig.forEach((item, idx) => {
    const option = document.createElement("option");
    option.value = idx;
    option.textContent = item.nombre;
    elements.productSelect.appendChild(option);
  });
  elements.productSelect.selectedIndex = 0;
  selectProduct();
}

async function fetchSheetNames(productId) {
  setStatus("Cargando hojas...", false);

  try {
    const res = await authFetch(`${API_BASE_URL}/api/sheetnames?spreadsheetId=${productId}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    return data.sheets || [];
  } catch (err) {
    console.error('Error fetchSheetNames:', err.message);
    throw new Error(`No se pudo obtener la lista de hojas: ${err.message}`);
  }
}

function normalizeSheetName(value) {
  return String(value || '').trim().toLowerCase();
}

function renderSheetButtons(sheetNames) {
  elements.sheetSelect.innerHTML = '<option value="">-- Seleccionar hoja --</option>';

  if (!sheetNames.length) {
    const opt = document.createElement("option");
    opt.textContent = "No hay hojas visibles.";
    opt.disabled = true;
    elements.sheetSelect.appendChild(opt);
    return;
  }

  sheetNames.forEach((name, idx) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    elements.sheetSelect.appendChild(opt);
  });
}

function selectSheet(sheetName) {
  if (!sheetName) return;
  currentSheet = sheetName;
  elements.activeSheetTitle.textContent = `${currentProduct.nombre} — ${currentSheet}`;
  elements.refreshDataBtn.disabled = false;
  fetchSheetData();
  configureAutoRefresh();
}

function configureAutoRefresh() {
  if (autoRefreshId) clearInterval(autoRefreshId);
  if (!currentSheet) return;
  autoRefreshId = setInterval(fetchSheetData, 60000);
}

async function fetchSheetData() {
  if (!currentProduct || !currentSheet) return;

  setStatus(`Cargando datos: ${currentSheet} ...`, false);

  try {
    const primaryData = await fetchSingleSheetData(currentProduct.id, currentSheet);
    const primaryGrid = buildGridFromSheet(primaryData, tableRange);

    if (primaryGrid.length) {
      renderTable(primaryGrid);
      setStatus(`Datos cargados: ${Math.max(primaryGrid.length - 1, 0)} filas (sin cabecera).`, false);
      return;
    }
  } catch (err) {
    console.error('Error fetchSheetData:', err.message);
    setStatus(`Error al leer datos: ${err.message}`, true);
    elements.tableWrapper.innerHTML = "";
  }
}

async function fetchSingleSheetData(spreadsheetId, sheetName) {
  const res = await authFetch(`${API_BASE_URL}/api/sheetdata?spreadsheetId=${spreadsheetId}&sheetName=${encodeURIComponent(sheetName)}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data;
}

function parseRange(range) {
  const match = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i.exec(range);
  if (!match) {
    return { startRow: 0, endRow: 1000, startCol: 0, endCol: 11 };
  }

  const [, startColLabel, startRowLabel, endColLabel, endRowLabel] = match;
  return {
    startRow: Math.max(Number(startRowLabel) - 1, 0),
    endRow: Number(endRowLabel),
    startCol: columnLabelToIndex(startColLabel),
    endCol: columnLabelToIndex(endColLabel) + 1
  };
}

function columnLabelToIndex(label) {
  return String(label || '')
    .toUpperCase()
    .split('')
    .reduce((acc, char) => acc * 26 + (char.charCodeAt(0) - 64), 0) - 1;
}

function createCell(value = '') {
  return {
    text: value,
    colSpan: 1,
    rowSpan: 1,
    covered: false,
    borders: null,
    backgroundColor: null,
    hyperlink: '',
    chipRuns: []
  };
}

function extractHyperlinkFromCellData(cell) {
  if (!cell) return '';

  const textFormatRunLink = cell.textFormatRuns?.find(run => run?.format?.link?.uri)?.format?.link?.uri;
  if (textFormatRunLink) return textFormatRunLink;

  const chipRunLink = (cell.chipRuns || []).map(run =>
    run?.chip?.richLinkProperties?.uri ||
    run?.richLinkProperties?.uri ||
    run?.chip?.link?.uri ||
    run?.link?.uri ||
    run?.uri
  ).find(Boolean);

  return cell.hyperlink || chipRunLink || '';
}

function googleColorToCss(color) {
  if (!color) return '';

  const red = Math.round((color.red ?? 0) * 255);
  const green = Math.round((color.green ?? 0) * 255);
  const blue = Math.round((color.blue ?? 0) * 255);
  const alpha = color.alpha ?? 1;

  return alpha < 1
    ? `rgba(${red}, ${green}, ${blue}, ${alpha})`
    : `rgb(${red}, ${green}, ${blue})`;
}

function borderStyleToCss(border) {
  if (!border || border.style === 'NONE') return '';

  const color = googleColorToCss(border.color) || '#d1d5db';
  const styleMap = {
    DOTTED: 'dotted',
    DASHED: 'dashed',
    SOLID: 'solid',
    SOLID_MEDIUM: 'solid',
    SOLID_THICK: 'solid',
    DOUBLE: 'double'
  };
  const widthMap = {
    DOTTED: '1px',
    DASHED: '1px',
    SOLID: '1px',
    SOLID_MEDIUM: '2px',
    SOLID_THICK: '3px',
    DOUBLE: '3px'
  };

  return `${widthMap[border.style] || '1px'} ${styleMap[border.style] || 'solid'} ${color}`;
}

function applyCellStyles(element, cell, isHeader = false) {
  const borders = cell.borders || {};
  const backgroundColor = googleColorToCss(cell.backgroundColor);

  element.style.borderTop = borderStyleToCss(borders.top);
  element.style.borderRight = borderStyleToCss(borders.right);
  element.style.borderBottom = borderStyleToCss(borders.bottom);
  element.style.borderLeft = borderStyleToCss(borders.left);

  if (backgroundColor) {
    element.style.backgroundColor = backgroundColor;
  } else if (isHeader) {
    element.style.backgroundColor = '#e2e8f0';
  }
}

function trimGrid(grid) {
  let lastRowWithData = -1;

  grid.forEach((row, rowIndex) => {
    const hasVisibleContent = row.some(cell => {
      if (!cell || cell.covered) return false;
      return String(cell.text || '').trim() !== '';
    });

    if (hasVisibleContent) {
      lastRowWithData = rowIndex;
    }
  });

  return lastRowWithData >= 0 ? grid.slice(0, lastRowWithData + 1) : [];
}

function normalizeHeaderText(value) {
  return String(value || '').trim().toLowerCase();
}

function rebuildGridWithColumns(grid, keptColumns) {
  const oldToNewColumnIndex = new Map(keptColumns.map((colIndex, newIndex) => [colIndex, newIndex]));
  const filteredGrid = Array.from({ length: grid.length }, () =>
    Array.from({ length: keptColumns.length }, () => createCell(''))
  );

  grid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (!cell || cell.covered) return;

      const spannedColumns = [];
      for (let index = colIndex; index < colIndex + cell.colSpan; index++) {
        if (oldToNewColumnIndex.has(index)) {
          spannedColumns.push(index);
        }
      }

      if (!spannedColumns.length) return;

      const newStartCol = oldToNewColumnIndex.get(spannedColumns[0]);
      if (newStartCol == null) return;

      const clonedCell = {
        ...cell,
        colSpan: spannedColumns.length,
        covered: false
      };

      filteredGrid[rowIndex][newStartCol] = clonedCell;

      for (let rowOffset = 0; rowOffset < clonedCell.rowSpan; rowOffset++) {
        for (let colOffset = 0; colOffset < clonedCell.colSpan; colOffset++) {
          if (rowOffset === 0 && colOffset === 0) continue;

          const nextRow = rowIndex + rowOffset;
          const nextCol = newStartCol + colOffset;
          if (!filteredGrid[nextRow]?.[nextCol]) continue;
          filteredGrid[nextRow][nextCol].covered = true;
        }
      }
    });
  });

  return trimGrid(filteredGrid);
}

function filterExcludedHeaderColumns(grid) {
  if (!grid.length) return grid;

  const headerRow = grid[0] || [];
  let cutoffColumn = headerRow.length;

  headerRow.forEach((cell, colIndex) => {
    if (!cell || cell.covered) return;
    if (excludedHeaders.has(normalizeHeaderText(cell.text))) {
      cutoffColumn = Math.min(cutoffColumn, colIndex);
    }
  });

  if (cutoffColumn === headerRow.length) {
    return grid;
  }

  const keptColumns = [];
  for (let colIndex = 0; colIndex < cutoffColumn; colIndex++) {
    keptColumns.push(colIndex);
  }

  return rebuildGridWithColumns(grid, keptColumns);
}

function filterEmptyColumns(grid) {
  if (!grid.length) return grid;

  const keptColumns = [];

  for (let colIndex = 0; colIndex < grid[0].length; colIndex++) {
    let hasContent = false;

    for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
      const cell = grid[rowIndex]?.[colIndex];
      if (!cell || cell.covered) continue;

      if (String(cell.text || '').trim() !== '') {
        hasContent = true;
        break;
      }
    }

    if (hasContent) {
      keptColumns.push(colIndex);
    }
  }

  if (!keptColumns.length || keptColumns.length === grid[0].length) {
    return grid;
  }

  return rebuildGridWithColumns(grid, keptColumns);
}

function getVisibleNonEmptyCells(row) {
  return (row || []).filter(cell => {
    if (!cell || cell.covered) return false;
    return String(cell.text || '').trim() !== '';
  });
}

function buildCompactSummaryRows(grid) {
  return (grid || [])
    .map(getVisibleNonEmptyCells)
    .filter(row => row.length > 0);
}

function buildGridFromRows(rows) {
  const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const grid = rows.map(row => {
    const cells = Array.from({ length: maxCols }, (_, colIndex) => createCell(row[colIndex] || ''));
    return cells;
  });

  return filterExcludedHeaderColumns(trimGrid(grid));
}

function buildGridFromSheet(sheetResponse, range) {
  // sheetResponse tiene: { sheet, merges, data }
  if (!sheetResponse || !sheetResponse.data) return [];

  const bounds = parseRange(range);
  const rowData = sheetResponse.data[0]?.rowData || [];
  const totalRows = rowData.length;
  const totalCols = bounds.endCol - bounds.startCol;

  if (!totalRows || !totalCols) return [];

  const grid = Array.from({ length: totalRows }, () =>
    Array.from({ length: totalCols }, () => createCell(''))
  );

  rowData.forEach((row, rowIndex) => {
    const values = row.values || [];
    for (let colIndex = 0; colIndex < totalCols; colIndex++) {
      const cell = values[colIndex];
      grid[rowIndex][colIndex].text = cell?.formattedValue || '';
      grid[rowIndex][colIndex].borders = cell?.effectiveFormat?.borders || null;
      grid[rowIndex][colIndex].backgroundColor = cell?.effectiveFormat?.backgroundColor || null;
      grid[rowIndex][colIndex].hyperlink = extractHyperlinkFromCellData(cell);
      grid[rowIndex][colIndex].chipRuns = cell?.chipRuns || [];
    }
  });

  (sheetResponse.merges || []).forEach(merge => {
    const startRow = Math.max(merge.startRowIndex - bounds.startRow, 0);
    const endRow = Math.min(merge.endRowIndex - bounds.startRow, totalRows);
    const startCol = Math.max(merge.startColumnIndex - bounds.startCol, 0);
    const endCol = Math.min(merge.endColumnIndex - bounds.startCol, totalCols);

    if (startRow >= endRow || startCol >= endCol) return;

    const rootCell = grid[startRow]?.[startCol];
    if (!rootCell) return;

    rootCell.rowSpan = endRow - startRow;
    rootCell.colSpan = endCol - startCol;

    for (let rowIndex = startRow; rowIndex < endRow; rowIndex++) {
      for (let colIndex = startCol; colIndex < endCol; colIndex++) {
        if (rowIndex === startRow && colIndex === startCol) continue;
        grid[rowIndex][colIndex].covered = true;
      }
    }
  });

  return filterExcludedHeaderColumns(trimGrid(grid));
}

function renderTable(grid) {
  elements.tableWrapper.innerHTML = '';
  appendTableToElement(grid, elements.tableWrapper);
}

function appendTableToElement(grid, targetElement, title = '') {
  if (!grid.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'status';
    emptyState.textContent = title ? `${title}: hoja vacía o sin datos.` : 'Hoja vacía o rango A:K sin datos.';
    targetElement.appendChild(emptyState);
    return;
  }

  if (title) {
    const heading = document.createElement('h3');
    heading.textContent = title;
    heading.style.margin = '0 0 0.75rem';
    targetElement.appendChild(heading);
  }

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  const trHead = document.createElement('tr');
  grid[0].forEach(cell => {
    if (!cell || cell.covered) return;

    const th = document.createElement('th');
    th.textContent = cell.text || '';
    applyCellStyles(th, cell, true);

    if (cell.colSpan > 1) {
      th.colSpan = cell.colSpan;
      th.style.textAlign = 'center';
    }

    if (cell.rowSpan > 1) {
      th.rowSpan = cell.rowSpan;
      th.style.verticalAlign = 'middle';
    }

    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  table.appendChild(thead);

  grid.slice(1).forEach(row => {
    const tr = document.createElement('tr');
    row.forEach(cell => {
      if (!cell || cell.covered) return;

      const td = document.createElement('td');
      td.textContent = cell.text || '';
      applyCellStyles(td, cell);

      if (cell.colSpan > 1) {
        td.colSpan = cell.colSpan;
      }

      if (cell.rowSpan > 1) {
        td.rowSpan = cell.rowSpan;
        td.style.verticalAlign = 'middle';
      }

      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  targetElement.appendChild(table);
}

function renderTableToElement(grid, targetElement) {
  targetElement.innerHTML = '';
  appendTableToElement(grid, targetElement);
}

function renderMultipleTables(sections) {
  renderMultipleTablesToElement(sections, elements.tableWrapper);
}

function renderMultipleTablesToElement(sections, targetElement) {
  targetElement.innerHTML = '';

  sections.forEach((section, index) => {
    if (index > 0) {
      const spacer = document.createElement('div');
      spacer.style.height = '1.5rem';
      targetElement.appendChild(spacer);
    }

    appendTableToElement(section.grid, targetElement, section.title);
  });
}

function rowContainsText(row, searchedText) {
  return (row || []).some(cell => {
    if (!cell || cell.covered) return false;
    return String(cell.text || '').trim().toLowerCase().includes(searchedText);
  });
}

function sanitizeDetailGrid(grid) {
  const cleanedRows = (grid || []).filter(row => !rowContainsText(row, 'aqui modificar url'));
  return trimGrid(cleanedRows);
}

function getCellText(row, columnIndex) {
  const cell = row?.[columnIndex];
  if (!cell || cell.covered) return '';
  return String(cell.text || '').trim();
}

function findProductHeaderRowIndex(grid) {
  return (grid || []).findIndex(row => getCellText(row, 0).toLowerCase() === 'producto');
}

function getDetailProductOptions(grid, headerRowIndex) {
  const productSet = new Set();

  for (let rowIndex = headerRowIndex + 1; rowIndex < grid.length; rowIndex++) {
    const productName = getCellText(grid[rowIndex], 0);
    if (!productName) continue;
    productSet.add(productName);
  }

  return Array.from(productSet);
}

function filterDetailGridByProduct(grid, selectedProduct) {
  if (!grid.length || selectedProduct === 'Todo') {
    return grid;
  }

  const headerRowIndex = findProductHeaderRowIndex(grid);
  if (headerRowIndex < 0) {
    return grid;
  }

  const filteredRows = grid.filter((row, rowIndex) => {
    if (rowIndex <= headerRowIndex) return true;
    return getCellText(row, 0) === selectedProduct;
  });

  return trimGrid(filteredRows);
}

function getCellLink(row, columnIndex) {
  const cell = row?.[columnIndex];
  if (!cell || cell.covered) return '';
  return String(cell.hyperlink || '').trim();
}

function isLikelyUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function getGestionLinkMeta(label) {
  const normalizedLabel = String(label || '').trim().toLowerCase();

  if (normalizedLabel.includes('manual')) {
    return { kind: 'manual', title: 'Manual' };
  }

  if (normalizedLabel.includes('plantilla')) {
    return { kind: 'plantilla', title: 'Plantilla' };
  }

  return { kind: 'colab', title: 'Colab' };
}

function createSvgElement(tagName, attributes = {}) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
}

function createGestionLinkIcon(kind) {
  const iconWrap = document.createElement('span');
  iconWrap.className = 'link-icon';

  const svg = createSvgElement('svg', {
    viewBox: '0 0 24 24',
    'aria-hidden': 'true',
    focusable: 'false'
  });

  if (kind === 'plantilla') {
    svg.appendChild(createSvgElement('rect', { x: '3', y: '3', width: '18', height: '18', rx: '4', fill: '#107c41' }));
    svg.appendChild(createSvgElement('rect', { x: '9', y: '3', width: '12', height: '18', rx: '0', fill: '#21a366' }));
    svg.appendChild(createSvgElement('path', { d: 'M7 8h2l1.2 2.4L11.4 8h2l-2.1 4 2.3 4h-2l-1.4-2.6L8.8 16h-2l2.3-4L7 8z', fill: '#fff' }));
  } else if (kind === 'manual') {
    svg.appendChild(createSvgElement('rect', { x: '4', y: '3', width: '16', height: '18', rx: '3', fill: '#185abd' }));
    svg.appendChild(createSvgElement('path', { d: 'M8 7h8v2H8zm0 4h8v2H8zm0 4h6v2H8z', fill: '#fff' }));
    svg.appendChild(createSvgElement('path', { d: 'M16 3v5h4', fill: '#8ab4f8' }));
  } else {
    svg.appendChild(createSvgElement('circle', { cx: '8', cy: '12', r: '4', fill: '#f9ab00' }));
    svg.appendChild(createSvgElement('circle', { cx: '16', cy: '8', r: '4', fill: '#4285f4' }));
    svg.appendChild(createSvgElement('circle', { cx: '16', cy: '16', r: '4', fill: '#34a853' }));
    svg.appendChild(createSvgElement('rect', { x: '7', y: '10.8', width: '10', height: '2.4', rx: '1.2', fill: '#ea4335' }));
  }

  iconWrap.appendChild(svg);
  return iconWrap;
}

function buildGestionGroups(grid) {
  if (!grid.length) return [];

  const groupsByProduct = new Map();
  let linkColumns = [];

  grid.forEach(row => {
    const productValue = getCellText(row, gestionComisionesConfig.productColumnIndex);
    const esquemaValue = getCellText(row, gestionComisionesConfig.esquemaColumnIndex);
    const normalizedProduct = productValue.toLowerCase();
    const normalizedEsquema = esquemaValue.toLowerCase();

    if (
      normalizedProduct === 'producto' &&
      normalizedEsquema === 'esquema'
    ) {
      linkColumns = row
        .map((cell, colIndex) => {
          if (colIndex < gestionComisionesConfig.firstLinkColumnIndex) return null;
          if (!cell || cell.covered) return null;

          const label = String(cell.text || '').trim();
          if (!label) return null;

          return {
            colIndex,
            label
          };
        })
        .filter(Boolean);
      return;
    }

    if (!productValue || normalizedProduct === 'producto') {
      return;
    }

    const links = linkColumns.map(({ colIndex, label }) => {
      const linkText = getCellText(row, colIndex);
      const hyperlink = getCellLink(row, colIndex);
      const href = hyperlink || (isLikelyUrl(linkText) ? linkText : '');

      if (!href) return null;

      return {
        label,
        href
      };
    }).filter(Boolean);

    const productName = productValue;
    if (!groupsByProduct.has(productName)) {
      groupsByProduct.set(productName, []);
    }

    groupsByProduct.get(productName).push({
      esquema: esquemaValue || 'Sin esquema',
      links
    });
  });

  return Array.from(groupsByProduct.entries()).map(([productName, items]) => ({
    productName,
    items
  }));
}

function findHeaderColumnsByLabels(grid, requiredLabels) {
  const normalizedRequired = requiredLabels.map(label => normalizeHeaderText(label));

  for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
    const headerMap = new Map();

    (grid[rowIndex] || []).forEach((cell, colIndex) => {
      if (!cell || cell.covered) return;
      const text = normalizeHeaderText(cell.text);
      if (!text) return;
      headerMap.set(text, colIndex);
    });

    if (normalizedRequired.every(label => headerMap.has(label))) {
      return {
        rowIndex,
        columns: Object.fromEntries(normalizedRequired.map(label => [label, headerMap.get(label)]))
      };
    }
  }

  return null;
}

function normalizePeriodicidad(value) {
  const normalized = normalizeHeaderText(value);
  if (normalized.includes('trimestral')) return 'trimestral';
  if (normalized.includes('mensual')) return 'mensual';
  return '';
}

function normalizeWorkflowStatus(value) {
  const normalized = normalizeHeaderText(value)
    .replace(/\s+/g, ' ')
    .replace(/_/g, ' ')
    .trim();

  if (normalized === 'inactive') return 'inactive';
  if (normalized === 'to do') return 'TO DO';
  if (normalized === 'doing') return 'DOING';
  if (normalized === 'to review') return 'TO REVIEW';
  if (normalized === 'done') return 'DONE';
  return '';
}

function formatPercent(value) {
  return `${(value * 100).toFixed(2).replace('.', ',')}%`;
}

function parseFinanceDeadlineBucket(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const match = raw.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (!match) return '';

  const day = Number(match[1]);
  if (!day) return '';

  return day <= 15 ? 'quincena' : 'fin-de-mes';
}

function formatFinanceDeadlineLabel(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/(\d{1,2})[\/\-](\d{1,2})/);
  if (!match) return raw;

  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  return `${day}/${month}`;
}

async function fetchSpreadsheetMeta(spreadsheetId) {
  const res = await authFetch(`${API_BASE_URL}/api/spreadsheetmeta?spreadsheetId=${spreadsheetId}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data;
}

function parseAvanceSpreadsheetPeriod(title) {
  const match = String(title || '').match(/(\d{2})(\d{4})/);
  if (!match) return null;

  const sourceMonth = Number(match[1]);
  const sourceYear = Number(match[2]);
  if (!sourceMonth || sourceMonth > 12) return null;

  let periodMonth = sourceMonth - 1;
  let periodYear = sourceYear;
  if (periodMonth === 0) {
    periodMonth = 12;
    periodYear -= 1;
  }

  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const isQuarterClose = periodMonth % 3 === 0;

  if (isQuarterClose) {
    const startMonth = periodMonth - 2;
    return {
      periodType: 'trimestral',
      label: `${monthNames[startMonth - 1]}, ${monthNames[startMonth]} y ${monthNames[startMonth + 1]} ${periodYear}`
    };
  }

  return {
    periodType: 'mensual',
    label: `${monthNames[periodMonth - 1]} ${periodYear}`
  };
}

function buildAvanceSummaryResult(grid, periodInfo) {
  const headerInfo = findHeaderColumnsByLabels(grid, ['periodicidad', 'status', 'fecha max de envío de pago a finanzas']);
  if (!headerInfo) {
    throw new Error('No se encontraron las columnas periodicidad, status y fecha max de envío de pago a finanzas en CRONOGRAMA.');
  }

  const periodicidadColumn = headerInfo.columns.periodicidad;
  const statusColumn = headerInfo.columns.status;
  const deadlineColumn = headerInfo.columns['fecha max de envío de pago a finanzas'];
  const createCounts = () => ({ 'TO DO': 0, 'DOING': 0, 'TO REVIEW': 0, 'DONE': 0 });
  const counts = createCounts();
  const deadlineBuckets = {
    quincena: createCounts(),
    'fin-de-mes': createCounts()
  };
  const deadlineLabels = {
    quincena: new Set(),
    'fin-de-mes': new Set()
  };

  for (let rowIndex = headerInfo.rowIndex + 1; rowIndex < grid.length; rowIndex++) {
    const row = grid[rowIndex];
    const periodicidad = normalizePeriodicidad(getCellText(row, periodicidadColumn));
    const status = normalizeWorkflowStatus(getCellText(row, statusColumn));

    if (!periodicidad || !status || status === 'inactive') continue;
    if (periodInfo.periodType === 'mensual' && periodicidad !== 'mensual') continue;
    if (periodInfo.periodType === 'trimestral' && !['mensual', 'trimestral'].includes(periodicidad)) continue;

    counts[status] += 1;

    const deadlineValue = getCellText(row, deadlineColumn);
    const bucket = parseFinanceDeadlineBucket(deadlineValue);
    if (bucket && deadlineBuckets[bucket]) {
      deadlineBuckets[bucket][status] += 1;
      const formattedLabel = formatFinanceDeadlineLabel(deadlineValue);
      if (formattedLabel) {
        deadlineLabels[bucket].add(formattedLabel);
      }
    }
  }

  const buildSummaryBlock = (label, inputCounts) => {
    const total = Object.values(inputCounts).reduce((sum, value) => sum + value, 0);
    const rows = ['TO DO', 'DOING', 'TO REVIEW', 'DONE'].map(status => ({
      status,
      count: inputCounts[status],
      progress: total ? inputCounts[status] / total : 0
    }));

    return {
      label,
      total,
      rows,
      avance: total ? inputCounts.DONE / total : 0
    };
  };

  return {
    periodType: periodInfo.periodType,
    label: periodInfo.label,
    main: buildSummaryBlock('Resumen general', counts),
    deadline: [
      buildSummaryBlock(
        `Quincena${deadlineLabels.quincena.size ? ` (${Array.from(deadlineLabels.quincena).join(', ')})` : ''}`,
        deadlineBuckets.quincena
      ),
      buildSummaryBlock(
        `Fin de mes${deadlineLabels['fin-de-mes'].size ? ` (${Array.from(deadlineLabels['fin-de-mes']).join(', ')})` : ''}`,
        deadlineBuckets['fin-de-mes']
      )
    ].filter(block => block.total > 0)
  };
}

function createAvanceSummaryCard(summary, extraClassName = '') {
  const card = document.createElement('section');
  card.className = `avance-summary-card${extraClassName ? ` ${extraClassName}` : ''}`;

  if (summary.label) {
    const title = document.createElement('h3');
    title.className = 'avance-summary-title';
    title.textContent = summary.label;
    card.appendChild(title);
  }

  const rowsWrap = document.createElement('div');
  rowsWrap.className = 'avance-summary-rows';

  summary.rows.forEach(row => {
    const rowElement = document.createElement('div');
    rowElement.className = 'avance-summary-row';

    const chip = document.createElement('span');
    chip.className = `avance-chip is-${getStatusTone(row.status)}`;
    chip.textContent = row.status;

    const count = document.createElement('span');
    count.className = 'avance-summary-count';
    count.textContent = `${row.count} esquemas`;

    const progress = document.createElement('strong');
    progress.className = 'avance-summary-progress';
    progress.textContent = formatPercent(row.progress);

    rowElement.appendChild(chip);
    rowElement.appendChild(count);
    rowElement.appendChild(progress);
    rowsWrap.appendChild(rowElement);
  });

  const footer = document.createElement('div');
  footer.className = 'avance-summary-footer';

  const total = document.createElement('div');
  total.className = 'avance-summary-total';
  total.textContent = `TOTAL: ${summary.total}`;

  const avance = document.createElement('div');
  avance.className = 'avance-summary-total';
  avance.textContent = `% AVANCE: ${formatPercent(summary.avance)}`;

  footer.appendChild(total);
  footer.appendChild(avance);

  card.appendChild(rowsWrap);
  card.appendChild(footer);
  return card;
}

function getStatusTone(status) {
  if (status === 'DONE') return 'done';
  if (status === 'DOING') return 'doing';
  if (status === 'TO REVIEW') return 'review';
  return 'todo';
}

function renderAvanceComisionesSummary(summaryResult) {
  elements.avanceComisionesWrapper.innerHTML = '';
  elements.avanceComisionesTitle.textContent =
    `Avance ${summaryResult.periodType === 'trimestral' ? 'Trimestral' : 'Mensual'}`;

  elements.avanceComisionesStatus.textContent = summaryResult.label;
  elements.avanceComisionesStatus.style.color = '#334155';

  elements.avanceComisionesWrapper.appendChild(
    createAvanceSummaryCard(summaryResult.main, 'is-main')
  );

  if (summaryResult.deadline.length) {
    const secondaryGrid = document.createElement('div');
    secondaryGrid.className = 'avance-summary-secondary-grid';

    summaryResult.deadline.forEach(summary => {
      secondaryGrid.appendChild(createAvanceSummaryCard(summary));
    });

    elements.avanceComisionesWrapper.appendChild(secondaryGrid);
  }
}

function renderGestionProductOptions(groups) {
  elements.gestionProductoSelect.innerHTML = '<option value="">-- Seleccionar producto --</option>';

  groups.forEach(group => {
    const option = document.createElement('option');
    option.value = group.productName;
    option.textContent = group.productName;
    elements.gestionProductoSelect.appendChild(option);
  });
}

function renderGestionLinks() {
  elements.gestionLinksWrapper.innerHTML = '';

  const selectedGroup = currentGestionGroups.find(group => group.productName === currentGestionProduct);
  if (!selectedGroup) {
    elements.gestionStatus.textContent = 'Selecciona un producto para ver los accesos disponibles.';
    elements.gestionStatus.style.color = '#334155';
    return;
  }

  elements.gestionTitle.textContent = `${gestionComisionesConfig.nombre} — ${selectedGroup.productName}`;
  elements.gestionStatus.textContent = `${selectedGroup.items.length} esquemas disponibles.`;
  elements.gestionStatus.style.color = '#334155';

  selectedGroup.items.forEach(item => {
    const card = document.createElement('article');
    card.className = 'scheme-card';

    const title = document.createElement('h3');
    title.className = 'scheme-card-title';
    title.textContent = item.esquema;

    const actions = document.createElement('div');
    actions.className = 'scheme-card-actions';

    item.links.forEach(link => {
      const meta = getGestionLinkMeta(link.label);
      const anchor = document.createElement('a');
      anchor.className = `link-card link-card--icon link-card--${meta.kind}`;
      anchor.href = link.href;
      anchor.target = '_blank';
      anchor.rel = 'noreferrer noopener';
      anchor.title = meta.title;
      anchor.setAttribute('aria-label', meta.title);

      const icon = createGestionLinkIcon(meta.kind);

      anchor.appendChild(icon);
      actions.appendChild(anchor);
    });

    if (!item.links.length) {
      const emptyState = document.createElement('div');
      emptyState.className = 'link-card is-empty';

      const label = document.createElement('span');
      label.className = 'link-card-label';
      label.textContent = 'Sin links detectados';

      const hint = document.createElement('span');
      hint.className = 'link-card-hint';
      hint.textContent = 'Revisa si la celda tiene hyperlink o smart chip compartido.';

      emptyState.appendChild(label);
      emptyState.appendChild(hint);
      actions.appendChild(emptyState);
    }

    card.appendChild(title);
    card.appendChild(actions);
    elements.gestionLinksWrapper.appendChild(card);
  });
}

function selectGestionProduct(productName) {
  currentGestionProduct = productName;
  renderGestionLinks();
}

function appendCompactSummaryTable(rows, targetElement) {
  const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const tableWrap = document.createElement('div');
  tableWrap.className = 'summary-compact-table-wrap';
  const table = document.createElement('table');
  table.className = 'summary-compact-table';

  const tbody = document.createElement('tbody');

  rows.forEach(row => {
    const tr = document.createElement('tr');
    const visibleCellCount = row.length;

    row.forEach((cell, index) => {
      const td = document.createElement('td');
      td.textContent = cell.text || '';
      td.className = 'summary-compact-cell';
      applyCellStyles(td, cell, false);

      if (index === 0 && visibleCellCount === 1 && maxCols > 1) {
        td.colSpan = maxCols;
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  targetElement.appendChild(tableWrap);
}

function splitSummaryRows(rows) {
  const titleRow = rows.find(row => row.length === 1) || null;
  const detailHeaderIndex = rows.findIndex(row => getCellText(row, 0).toLowerCase() === 'detalle');

  return {
    title: titleRow ? getCellText(titleRow, 0) : 'Resumen',
    metricRows: rows.filter((row, index) => {
      if (row.length < 2) return false;
      if (detailHeaderIndex >= 0 && index >= detailHeaderIndex) return false;
      return /%/.test(getCellText(row, 1));
    }),
    detailRows: detailHeaderIndex >= 0 ? rows.slice(detailHeaderIndex) : []
  };
}

function renderSummaryCards(rows, targetElement) {
  const cardsGrid = document.createElement('div');
  cardsGrid.className = 'summary-cards-grid';

  rows.forEach(row => {
    const card = document.createElement('article');
    card.className = 'summary-card';

    const label = document.createElement('h4');
    label.className = 'summary-card-label';
    label.textContent = getCellText(row, 0);

    const value = document.createElement('div');
    value.className = 'summary-card-value';
    value.textContent = getCellText(row, 1);

    const statusWrap = document.createElement('div');
    statusWrap.className = 'summary-card-status';

    const indicator = document.createElement('span');
    indicator.className = 'summary-card-dot';
    indicator.style.backgroundColor = googleColorToCss(row[2]?.backgroundColor) || '#cbd5e1';

    const statusText = document.createElement('span');
    statusText.className = 'summary-card-status-text';
    const percentage = Number.parseFloat(getCellText(row, 1).replace('%', '').replace(',', '.')) / 100;

    if (percentage >= 0.9) {
      statusText.textContent = 'Optimo';
      statusWrap.classList.add('is-optimo');
    } else if (percentage >= 0.7) {
      statusText.textContent = 'En progreso';
      statusWrap.classList.add('is-progreso');
    } else {
      statusText.textContent = 'Critico';
      statusWrap.classList.add('is-critico');
    }

    statusWrap.appendChild(indicator);
    statusWrap.appendChild(statusText);

    card.appendChild(label);
    card.appendChild(value);
    card.appendChild(statusWrap);
    cardsGrid.appendChild(card);
  });

  targetElement.appendChild(cardsGrid);
}

function renderSummaryInfo(summaryGrid, detailGrid) {
  const compactRows = buildCompactSummaryRows(filterEmptyColumns(summaryGrid));
  const cleanDetailGrid = filterEmptyColumns(sanitizeDetailGrid(detailGrid));
  elements.resumenAvanceWrapper.innerHTML = '';
  const summaryParts = splitSummaryRows(compactRows);

  const summarySection = document.createElement('div');
  const summaryTitle = document.createElement('h3');
  summaryTitle.textContent = 'Resumen';
  summaryTitle.style.margin = '0 0 0.75rem';
  summarySection.appendChild(summaryTitle);

  if (!compactRows.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'status';
    emptyState.textContent = 'Resumen: hoja vacia o sin datos.';
    summarySection.appendChild(emptyState);
  } else {
    const banner = document.createElement('div');
    banner.className = 'summary-banner';
    banner.textContent = summaryParts.title;
    summarySection.appendChild(banner);

    if (summaryParts.metricRows.length) {
      renderSummaryCards(summaryParts.metricRows, summarySection);
    }

    if (summaryParts.detailRows.length) {
      const detailTitle = document.createElement('h4');
      detailTitle.className = 'summary-subtitle';
      detailTitle.textContent = 'Detalle';
      summarySection.appendChild(detailTitle);
      appendCompactSummaryTable(summaryParts.detailRows, summarySection);
    }
  }

  elements.resumenAvanceWrapper.appendChild(summarySection);

  const detailSection = document.createElement('div');
  detailSection.className = 'detail-section';

  const detailButton = document.createElement('button');
  detailButton.type = 'button';
  detailButton.className = 'detail-toggle-btn';
  detailButton.textContent = 'Mostrar detalle';

  const detailContent = document.createElement('div');
  detailContent.className = 'hidden';
  const detailHeaderRowIndex = findProductHeaderRowIndex(cleanDetailGrid);
  const productOptions = detailHeaderRowIndex >= 0
    ? getDetailProductOptions(cleanDetailGrid, detailHeaderRowIndex)
    : [];

  if (productOptions.length) {
    const filterWrap = document.createElement('div');
    filterWrap.className = 'detail-filter';

    const filterLabel = document.createElement('label');
    filterLabel.textContent = 'Producto';
    filterLabel.htmlFor = 'detailProductFilter';

    const filterSelect = document.createElement('select');
    filterSelect.id = 'detailProductFilter';

    ['Todo', ...productOptions].forEach(optionLabel => {
      const option = document.createElement('option');
      option.value = optionLabel;
      option.textContent = optionLabel;
      filterSelect.appendChild(option);
    });

    const detailTableContainer = document.createElement('div');
    detailTableContainer.className = 'detail-table-container';

    const renderFilteredDetail = () => {
      detailTableContainer.innerHTML = '';
      appendTableToElement(
        filterDetailGridByProduct(cleanDetailGrid, filterSelect.value),
        detailTableContainer
      );
    };

    filterSelect.addEventListener('change', renderFilteredDetail);
    renderFilteredDetail();

    filterWrap.appendChild(filterLabel);
    filterWrap.appendChild(filterSelect);
    detailContent.appendChild(filterWrap);
    detailContent.appendChild(detailTableContainer);
  } else {
    appendTableToElement(cleanDetailGrid, detailContent);
  }

  detailButton.addEventListener('click', () => {
    const isHidden = detailContent.classList.contains('hidden');
    detailContent.classList.toggle('hidden', !isHidden);
    detailButton.textContent = isHidden ? 'Ocultar detalle' : 'Mostrar detalle';
  });

  detailSection.appendChild(detailButton);
  detailSection.appendChild(detailContent);
  elements.resumenAvanceWrapper.appendChild(detailSection);
}

async function selectProduct() {
  const selectedIndex = elements.productSelect.value;
  const selection = sheetConfig[selectedIndex];
  if (!selection) return;

  currentProduct = selection;
  currentSheet = null;
  elements.activeSheetTitle.textContent = `Producto: ${currentProduct.nombre}`;
  elements.refreshDataBtn.disabled = true;
  elements.tableWrapper.innerHTML = "";

  try {
    const sheetNames = await fetchSheetNames(currentProduct.id);
    renderSheetButtons(sheetNames);
    setStatus('Selecciona una hoja para ver los datos.');
  } catch (err) {
    setStatus(err.message, true);
    elements.sheetSelect.innerHTML = '<option value="">-- Seleccionar hoja --</option>';
  }
}

async function loadResumenAvanceData() {
  if (!hasAccessToSection('resumen-avance')) return;

  elements.resumenAvanceTitle.textContent = resumenAvanceConfig.nombre;
  elements.resumenAvanceStatus.textContent = 'Cargando Resumen y Avance...';
  elements.resumenAvanceStatus.style.color = '#334155';

  try {
    const [primaryData, secondaryData] = await Promise.all([
      fetchSingleSheetData(resumenAvanceConfig.id, resumenAvanceConfig.primarySheet),
      fetchSingleSheetData(resumenAvanceConfig.id, resumenAvanceConfig.secondarySheet)
    ]);

    const primaryGrid = filterEmptyColumns(buildGridFromSheet(primaryData, tableRange));
    const secondaryGrid = filterEmptyColumns(buildGridFromSheet(secondaryData, tableRange));

    renderSummaryInfo(primaryGrid, secondaryGrid);

    elements.resumenAvanceStatus.textContent = 'Datos cargados: Resumen y Avance.';
  } catch (err) {
    console.error('Error loadResumenAvanceData:', err.message);
    elements.resumenAvanceStatus.textContent = `Error al leer datos: ${err.message}`;
    elements.resumenAvanceStatus.style.color = '#b91c1c';
    elements.resumenAvanceWrapper.innerHTML = '';
  }
}

async function loadSeguimientoSheets() {
  if (!hasAccessToSection('seguimiento')) return;

  try {
    elements.seguimientoStatus.textContent = "Cargando hojas...";
    const sheetNames = await fetchSheetNames(seguimientoSheetConfig.id);
    
    elements.seguimientoSheetSelect.innerHTML = '<option value="">-- Seleccionar hoja --</option>';
    sheetNames.forEach((name, idx) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      elements.seguimientoSheetSelect.appendChild(opt);
    });
    
    elements.seguimientoStatus.textContent = "Selecciona una hoja para ver los datos";
  } catch (err) {
    elements.seguimientoStatus.textContent = err.message;
    elements.seguimientoStatus.style.color = '#b91c1c';
  }
}

function selectSeguimientoSheet(sheetName) {
  if (!sheetName) return;
  currentSeguimientoSheet = sheetName;
  elements.seguimientoSheetTitle.textContent = `Seguimiento de Comisiones — ${currentSeguimientoSheet}`;
  fetchSeguimientoSheetData();
}

async function fetchSeguimientoSheetData() {
  if (!currentSeguimientoSheet) return;

  elements.seguimientoStatus.textContent = `Cargando datos: ${currentSeguimientoSheet}...`;
  elements.seguimientoStatus.style.color = '#334155';

  try {
    const res = await authFetch(`${API_BASE_URL}/api/sheetdata?spreadsheetId=${seguimientoSheetConfig.id}&sheetName=${encodeURIComponent(currentSeguimientoSheet)}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    const grid = filterEmptyColumns(buildGridFromSheet(data, tableRange));

    if (grid.length) {
      elements.seguimientoTableWrapper.innerHTML = '';
      renderTableToElement(grid, elements.seguimientoTableWrapper);
      elements.seguimientoStatus.textContent = `Datos cargados: ${Math.max(grid.length - 1, 0)} filas (sin cabecera).`;
      elements.seguimientoStatus.style.color = '#334155';
      return;
    }
  } catch (err) {
    console.error('Error fetchSeguimientoSheetData:', err.message);
    elements.seguimientoStatus.textContent = `Error al leer datos: ${err.message}`;
    elements.seguimientoStatus.style.color = '#b91c1c';
    elements.seguimientoTableWrapper.innerHTML = "";
  }
}

async function loadGestionComisionesData() {
  if (!hasAccessToSection('gestion-comisiones')) return;

  elements.gestionTitle.textContent = gestionComisionesConfig.nombre;
  elements.gestionStatus.textContent = 'Cargando Gestión de comisiones...';
  elements.gestionStatus.style.color = '#334155';
  elements.gestionLinksWrapper.innerHTML = '';
  elements.gestionProductoSelect.innerHTML = '<option value="">-- Seleccionar producto --</option>';

  try {
    const data = await fetchSingleSheetData(gestionComisionesConfig.id, gestionComisionesConfig.sheetName);
    const grid = filterEmptyColumns(buildGridFromSheet(data, tableRange));
    const groups = buildGestionGroups(grid);

    currentGestionGroups = groups;
    currentGestionProduct = '';

    if (!groups.length) {
      elements.gestionStatus.textContent = 'No se encontraron productos o links visibles en la hoja COLAB.';
      return;
    }

    renderGestionProductOptions(groups);
    currentGestionProduct = groups[0].productName;
    elements.gestionProductoSelect.value = currentGestionProduct;
    renderGestionLinks();
  } catch (err) {
    console.error('Error loadGestionComisionesData:', err.message);
    elements.gestionStatus.textContent = `Error al leer datos: ${err.message}`;
    elements.gestionStatus.style.color = '#b91c1c';
    elements.gestionLinksWrapper.innerHTML = '';
  }
}

async function loadAvanceComisionesData() {
  if (!hasAccessToSection('avance-comisiones')) return;

  elements.avanceComisionesTitle.textContent = avanceComisionesConfig.nombre;
  elements.avanceComisionesStatus.textContent = 'Cargando Avance Comisiones...';
  elements.avanceComisionesStatus.style.color = '#334155';
  elements.avanceComisionesWrapper.innerHTML = '';

  try {
    const [meta, data] = await Promise.all([
      fetchSpreadsheetMeta(avanceComisionesConfig.id),
      fetchSingleSheetData(avanceComisionesConfig.id, avanceComisionesConfig.sheetName)
    ]);
    const grid = filterEmptyColumns(buildGridFromSheet(data, tableRange));
    const periodInfo = parseAvanceSpreadsheetPeriod(meta.title);
    if (!periodInfo) {
      throw new Error('No se pudo interpretar el periodo desde el nombre del archivo.');
    }

    const summary = buildAvanceSummaryResult(grid, periodInfo);

    if (!summary.main.total) {
      elements.avanceComisionesStatus.textContent = 'No se encontraron esquemas activos para el periodo calculado.';
      return;
    }

    renderAvanceComisionesSummary(summary);
  } catch (err) {
    console.error('Error loadAvanceComisionesData:', err.message);
    elements.avanceComisionesStatus.textContent = `Error al leer datos: ${err.message}`;
    elements.avanceComisionesStatus.style.color = '#b91c1c';
    elements.avanceComisionesWrapper.innerHTML = '';
  }
}

function changeSection(sectionId) {
  if (!hasAccessToSection(sectionId)) return;

  // Ocultar todas las secciones
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });

  // Mostrar la sección seleccionada
  const activeSection = document.getElementById(`${sectionId}-section`);
  if (activeSection) {
    activeSection.classList.add('active');
  }

  // Actualizar botones de navegación
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeButton = document.querySelector(`[data-section="${sectionId}"]`);
  if (activeButton) {
    activeButton.classList.add('active');
  }

  // Pausar auto-refresh si cambias de sección
  if (sectionId === 'seguimiento') {
    if (autoRefreshId) {
      clearInterval(autoRefreshId);
      autoRefreshId = null;
    }
    // Cargar las hojas de seguimiento
    loadSeguimientoSheets();
    return;
  }

  if (autoRefreshId) {
    clearInterval(autoRefreshId);
    autoRefreshId = null;
  }

  if (sectionId === 'resumen-avance') {
    loadResumenAvanceData();
    return;
  }

  if (sectionId === 'visualizado') {
    loadProducts();
    return;
  }

  if (sectionId === 'gestion-comisiones') {
    loadGestionComisionesData();
    return;
  }

  if (sectionId === 'avance-comisiones') {
    loadAvanceComisionesData();
    return;
  }

  if (sectionId === 'politicas') {
    resetPoliticasState();
    return;
  }

  if (sectionId === 'rentabilidad') {
    resetRentabilidadState();
  }
}

function init() {
  configureLoginView();
  restoreSidebarState();
  initGoogleLogin();
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.logoutBtn.addEventListener("click", logout);
  elements.sidebarToggleBtn.addEventListener("click", toggleSidebar);
  elements.productSelect.addEventListener("change", selectProduct);
  elements.sheetSelect.addEventListener("change", (e) => selectSheet(e.target.value));
  elements.resumenAvanceRefreshBtn.addEventListener("click", loadResumenAvanceData);
  elements.seguimientoSheetSelect.addEventListener("change", (e) => selectSeguimientoSheet(e.target.value));
  elements.refreshListBtn.addEventListener("click", selectProduct);
  elements.refreshDataBtn.addEventListener("click", fetchSheetData);
  elements.gestionProductoSelect.addEventListener("change", (e) => selectGestionProduct(e.target.value));
  elements.gestionRefreshBtn.addEventListener("click", loadGestionComisionesData);
  elements.avanceComisionesRefreshBtn.addEventListener("click", loadAvanceComisionesData);
  window.addEventListener("beforeunload", () => clearInterval(autoRefreshId));

  // Agregar navegación por secciones
  document.querySelectorAll('.nav-item').forEach(navBtn => {
    navBtn.addEventListener('click', () => {
      const sectionId = navBtn.getAttribute('data-section');
      changeSection(sectionId);
    });
  });

  restoreSession();
}

init();
