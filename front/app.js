let sheetConfig = [];
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
  id: null,
  sheetName: 'CRONOGRAMA'
};
const detalleIndicadoresConfig = {
  nombre: 'DETALLE INDICADORES',
  id: gestionComisionesConfig.id,
  sheetName: 'DETALLE_INDICADORES'
};
const linksInteresConfig = {
  nombre: 'LINK DE INTERES',
  id: gestionComisionesConfig.id,
  sheetName: 'LINK_DE_INTERES'
};
const organigramaConfig = {
  nombre: 'Organigrama Comisional',
  id: gestionComisionesConfig.id,
  sheetName: 'ORGANIGRAMA_COMISIONAL'
};
const organigramaBaConfig = {
  nombre: 'Organigrama BA',
  id: gestionComisionesConfig.id,
  sheetName: 'ORGANIGRAMA_BA'
};
const CORREO_SECTION_TITLE = 'Generador de correos comisiones';
const sectionDictionary = {
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
  'doc-l': 'config-aps'
};
const sectionAliasesById = Object.fromEntries(
  Object.entries(sectionDictionary).map(([alias, sectionId]) => [sectionId, alias])
);

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
  detalleIndicadoresProductoSelect: document.getElementById("detalleIndicadoresProductoSelect"),
  detalleIndicadoresEsquemaSelect: document.getElementById("detalleIndicadoresEsquemaSelect"),
  detalleIndicadoresTitle: document.getElementById("detalleIndicadoresTitle"),
  detalleIndicadoresStatus: document.getElementById("detalleIndicadoresStatus"),
  detalleIndicadoresWrapper: document.getElementById("detalleIndicadoresWrapper"),
  detalleIndicadoresSearchInput: document.getElementById("detalleIndicadoresSearchInput"),
  detalleIndicadoresRefreshBtn: document.getElementById("detalleIndicadoresRefreshBtn"),
  linksInteresProductoSelect: document.getElementById("linksInteresProductoSelect"),
  linksInteresAccionSelect: document.getElementById("linksInteresAccionSelect"),
  linksInteresSearchInput: document.getElementById("linksInteresSearchInput"),
  linksInteresTitle: document.getElementById("linksInteresTitle"),
  linksInteresStatus: document.getElementById("linksInteresStatus"),
  linksInteresWrapper: document.getElementById("linksInteresWrapper"),
  linksInteresRefreshBtn: document.getElementById("linksInteresRefreshBtn"),
  avanceComisionesTitle: document.getElementById("avanceComisionesTitle"),
  avanceComisionesStatus: document.getElementById("avanceComisionesStatus"),
  avanceComisionesWrapper: document.getElementById("avanceComisionesWrapper"),
  avanceComisionesRefreshBtn: document.getElementById("avanceComisionesRefreshBtn"),
  organigramaTitle: document.getElementById("organigramaTitle"),
  organigramaStatus: document.getElementById("organigramaStatus"),
  organigramaWrapper: document.getElementById("organigramaWrapper"),
  organigramaRefreshBtn: document.getElementById("organigramaRefreshBtn"),
  organigramaBaTitle: document.getElementById("organigramaBaTitle"),
  organigramaBaStatus: document.getElementById("organigramaBaStatus"),
  organigramaBaWrapper: document.getElementById("organigramaBaWrapper"),
  organigramaBaRefreshBtn: document.getElementById("organigramaBaRefreshBtn"),
  correoProductoSelect: document.getElementById("correoProductoSelect"),
  correoEsquemaSelect: document.getElementById("correoEsquemaSelect"),
  correoUrlInput: document.getElementById("correoUrlInput"),
  correoValidarBtn: document.getElementById("correoValidarBtn"),
  correoTitle: document.getElementById("correoTitle"),
  correoStatus: document.getElementById("correoStatus"),
  correoValidacionWrapper: document.getElementById("correoValidacionWrapper"),
  correoAsunto: document.getElementById("correoAsunto"),
  correoPeriodicidad: document.getElementById("correoPeriodicidad"),
  correoFechaPago: document.getElementById("correoFechaPago"),
  correoDestinatarios: document.getElementById("correoDestinatarios"),
  correoCC: document.getElementById("correoCC"),
  correoButtons: document.getElementById("correoButtons"),
  correoLimpiarBtn: document.getElementById("correoLimpiarBtn"),
  correoEjecutarBtn: document.getElementById("correoEjecutarBtn"),
};

let currentProduct = null;
let currentSheet = null;
let currentSeguimientoSheet = null;
let autoRefreshId = null;
let inactivityTimer = null;
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hora

function resetInactivityTimer() {
  if (!currentUser) return;
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(async () => {
    await logout();
    setLoginStatus('Sesión cerrada por inactividad. Por favor vuelve a ingresar.', false);
    elements.loginStatus.classList.remove('hidden');
  }, INACTIVITY_TIMEOUT_MS);
}

function startInactivityTracking() {
  ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, resetInactivityTimer, { passive: true });
  });
  resetInactivityTimer();
}

function stopInactivityTracking() {
  clearTimeout(inactivityTimer);
  inactivityTimer = null;
}

let currentUser = null;
let currentGestionGroups = [];
let currentGestionProduct = '';
let currentDetalleIndicadoresGrid = [];
let currentDetalleIndicadoresHeaderInfo = null;
let currentDetalleIndicadoresProduct = 'Todo';
let currentDetalleIndicadoresEsquema = 'Todo';
let currentDetalleIndicadoresSearch = '';
let currentLinksInteresItems = [];
let currentLinksInteresProduct = 'Todo';
let currentLinksInteresAction = 'Todo';
let currentLinksInteresSearch = '';
let currentDetalleIndicadoresPage = 1;
const DETALLE_INDICADORES_PAGE_SIZE = 10;
let currentLinksInteresPage = 1;
const LINKS_INTERES_PAGE_SIZE = 10;
let currentSeguimientoPage = 1;
const SEGUIMIENTO_PAGE_SIZE = 10;
let currentSeguimientoGrid = [];
let currentSeguimientoIsEditMode = false;
const currentSeguimientoPendingChanges = new Map();
const currentSeguimientoValidationMap = new Map();
let currentSeguimientoDraftRows = [];
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
  if (!IS_LOCAL_ENV) {
    elements.loginStatus.classList.remove('hidden');
  }
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
  const res = await fetch(url, {
    ...options,
    credentials: 'include'
  });

  if (res.status === 401 && currentUser) {
    await logout();
    setLoginStatus('Tu sesión expiró. Por favor vuelve a ingresar.', false);
    elements.loginStatus.classList.remove('hidden');
  }

  return res;
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
    elements.loginStatus.classList.remove('hidden');
    elements.usernameInput.required = true;
    elements.passwordInput.required = true;
    return;
  }

  elements.loginIntroText.textContent = 'Ingresa con tu cuenta Google autorizada para continuar.';
  elements.credentialsLoginWrap.classList.add('hidden');
  elements.loginStatus.classList.add('hidden');
  elements.usernameInput.required = false;
  elements.passwordInput.required = false;
}

function hasAccessToSection(sectionId) {
  const sectionAlias = sectionAliasesById[sectionId] || sectionId;
  return currentUser?.allowedSections?.includes(sectionAlias);
}

function resetVisualizadoState() {
  currentProduct = null;
  currentSheet = null;
  elements.productSelect.innerHTML = '<option value="">-- Seleccionar producto --</option>';
  elements.sheetSelect.innerHTML = '<option value="">-- Seleccionar hoja --</option>';
  elements.activeSheetTitle.textContent = 'Sin producto seleccionado';
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

function resetOrganigramaState() {
  elements.organigramaTitle.textContent = organigramaConfig.nombre;
  elements.organigramaStatus.textContent = 'Abre esta sección para cargar la información.';
  elements.organigramaStatus.style.color = '#334155';
  elements.organigramaWrapper.innerHTML = '';
}

function resetOrganigramaBaState() {
  elements.organigramaBaTitle.textContent = organigramaBaConfig.nombre;
  elements.organigramaBaStatus.textContent = 'Abre esta sección para cargar la información.';
  elements.organigramaBaStatus.style.color = '#334155';
  elements.organigramaBaWrapper.innerHTML = '';
}

let correoValidatedData = null;
let correoAllRows = [];

function resetCorreoState() {
  correoValidatedData = null;
  correoAllRows = [];
  elements.correoProductoSelect.innerHTML = '<option value="">-- Seleccionar producto --</option>';
  elements.correoEsquemaSelect.innerHTML = '<option value="">-- Seleccionar esquema --</option>';
  elements.correoUrlInput.value = '';
  elements.correoValidacionWrapper.classList.add('hidden');
  elements.correoButtons.classList.add('hidden');
  elements.correoTitle.textContent = CORREO_SECTION_TITLE;
  elements.correoStatus.textContent = 'Selecciona un producto y esquema, luego ingresa la URL del archivo.';
  elements.correoStatus.style.color = '#334155';
}

async function loadCorreoEsquemas() {
  if (!hasAccessToSection('config-aps')) return;

  elements.correoTitle.textContent = CORREO_SECTION_TITLE;
  elements.correoStatus.textContent = 'Cargando...';
  elements.correoStatus.style.color = '#334155';
  elements.correoProductoSelect.innerHTML = '<option value="">-- Cargando... --</option>';
  elements.correoEsquemaSelect.innerHTML = '<option value="">-- Seleccionar esquema --</option>';

  try {
    const res = await authFetch(`${API_BASE_URL}/api/correo-esquemas`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    correoAllRows = data.rows || [];
    const productos = [...new Set(correoAllRows.map(r => r.producto).filter(Boolean))];
    elements.correoProductoSelect.innerHTML = '<option value="">-- Seleccionar producto --</option>' +
      productos.map(p => `<option value="${p}">${p}</option>`).join('');
    elements.correoStatus.textContent = productos.length
      ? 'Selecciona un producto y esquema, luego ingresa la URL del archivo Excel.'
      : 'No se encontraron datos en CRONOGRAMA.';
  } catch (err) {
    elements.correoProductoSelect.innerHTML = '<option value="">-- Error al cargar --</option>';
    elements.correoStatus.textContent = `Error al cargar datos: ${err.message}`;
    elements.correoStatus.style.color = '#b91c1c';
  }
}

function filterCorreoEsquemas() {
  const producto = elements.correoProductoSelect.value;
  const esquemas = correoAllRows
    .filter(r => !producto || r.producto === producto)
    .map(r => r.esquema)
    .filter(Boolean);
  const unique = [...new Set(esquemas)];
  elements.correoEsquemaSelect.innerHTML = '<option value="">-- Seleccionar esquema --</option>' +
    unique.map(e => `<option value="${e}">${e}</option>`).join('');
  elements.correoValidacionWrapper.classList.add('hidden');
  elements.correoButtons.classList.add('hidden');
  correoValidatedData = null;
  elements.correoStatus.textContent = unique.length
    ? 'Selecciona un esquema e ingresa la URL del archivo Excel.'
    : producto ? 'No hay esquemas para este producto.' : 'Selecciona un producto.';
}

async function validarCorreo() {
  const esquema = elements.correoEsquemaSelect.value;
  const url = elements.correoUrlInput.value.trim();

  if (!esquema) {
    elements.correoStatus.textContent = 'Selecciona un esquema.';
    elements.correoStatus.style.color = '#b91c1c';
    return;
  }
  if (!url) {
    elements.correoStatus.textContent = 'Ingresa la URL del archivo Excel.';
    elements.correoStatus.style.color = '#b91c1c';
    return;
  }

  elements.correoStatus.textContent = 'Validando...';
  elements.correoStatus.style.color = '#334155';
  elements.correoValidacionWrapper.classList.add('hidden');
  elements.correoButtons.classList.add('hidden');
  correoValidatedData = null;

  try {
    const res = await authFetch(`${API_BASE_URL}/api/correo-validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ esquema, url })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    correoValidatedData = data;
    elements.correoAsunto.textContent = data.asunto || '—';
    elements.correoPeriodicidad.textContent = data.periodicidad || '—';
    elements.correoFechaPago.textContent = data.fechaPago || '—';
    elements.correoDestinatarios.textContent = data.destinatarios || '—';
    elements.correoCC.textContent = data.cc || '—';
    elements.correoValidacionWrapper.classList.remove('hidden');
    elements.correoButtons.classList.remove('hidden');
    elements.correoStatus.textContent = 'Validación exitosa. Revisa los datos antes de ejecutar.';
    elements.correoStatus.style.color = '#166534';
  } catch (err) {
    elements.correoStatus.textContent = `Error al validar: ${err.message}`;
    elements.correoStatus.style.color = '#b91c1c';
  }
}

function limpiarCorreo() {
  resetCorreoState();
  loadCorreoEsquemas();
}

async function ejecutarCorreo() {
  if (!correoValidatedData) {
    elements.correoStatus.textContent = 'Primero valida los datos.';
    elements.correoStatus.style.color = '#b91c1c';
    return;
  }

  elements.correoStatus.textContent = 'Ejecutando...';
  elements.correoStatus.style.color = '#334155';
  elements.correoEjecutarBtn.disabled = true;

  try {
    const scriptBody = {
      action: 'correo',
      idArchivo: correoValidatedData.idArchivo,
      asunto: correoValidatedData.asunto,
      tipoPago: correoValidatedData.tipoPago,
      periodicidad: correoValidatedData.periodicidad,
      destinatarios: correoValidatedData.destinatarios,
      cc: correoValidatedData.cc
    };
    const res = await authFetch(`${API_BASE_URL}/api/run-script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scriptBody)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    elements.correoStatus.textContent = 'Correo enviado correctamente.';
    elements.correoStatus.style.color = '#166534';
    elements.correoButtons.classList.add('hidden');
    correoValidatedData = null;
  } catch (err) {
    elements.correoStatus.textContent = `Error ejecutando correo: ${err.message}`;
    elements.correoStatus.style.color = '#b91c1c';
    console.error('Error ejecutando correo:', err.message);
  } finally {
    elements.correoEjecutarBtn.disabled = false;
  }
}

function resetDetalleIndicadoresState() {
  currentDetalleIndicadoresGrid = [];
  currentDetalleIndicadoresHeaderInfo = null;
  currentDetalleIndicadoresProduct = 'Todo';
  currentDetalleIndicadoresEsquema = 'Todo';
  currentDetalleIndicadoresSearch = '';
  currentDetalleIndicadoresPage = 1;
  elements.detalleIndicadoresSearchInput.value = '';
  elements.detalleIndicadoresProductoSelect.innerHTML = '<option value="Todo">Todo</option>';
  elements.detalleIndicadoresEsquemaSelect.innerHTML = '<option value="Todo">Todo</option>';
  elements.detalleIndicadoresTitle.textContent = detalleIndicadoresConfig.nombre;
  elements.detalleIndicadoresStatus.textContent = 'Abre esta sección para cargar la información.';
  elements.detalleIndicadoresStatus.style.color = '#334155';
  elements.detalleIndicadoresWrapper.innerHTML = '';
}

function resetLinksInteresState() {
  currentLinksInteresItems = [];
  currentLinksInteresProduct = 'Todo';
  currentLinksInteresAction = 'Todo';
  currentLinksInteresSearch = '';
  currentLinksInteresPage = 1;
  elements.linksInteresProductoSelect.innerHTML = '<option value="Todo">Todo</option>';
  elements.linksInteresAccionSelect.innerHTML = '<option value="Todo">Todo</option>';
  elements.linksInteresSearchInput.value = '';
  elements.linksInteresTitle.textContent = linksInteresConfig.nombre;
  elements.linksInteresStatus.textContent = 'Abre esta sección para cargar la información.';
  elements.linksInteresStatus.style.color = '#334155';
  elements.linksInteresWrapper.innerHTML = '';
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

  if (!hasAccessToSection('detalle-indicadores')) {
    document.getElementById('detalle-indicadores-section').classList.remove('active');
    resetDetalleIndicadoresState();
  }

  if (!hasAccessToSection('links-interes')) {
    document.getElementById('links-interes-section').classList.remove('active');
    resetLinksInteresState();
  }

  if (!hasAccessToSection('avance-comisiones')) {
    document.getElementById('avance-comisiones-section').classList.remove('active');
    resetAvanceComisionesState();
  }

  if (!hasAccessToSection('visualizado')) {
    document.getElementById('visualizado-section').classList.remove('active');
    resetVisualizadoState();
  }

  if (!hasAccessToSection('organigrama-ba')) {
    document.getElementById('organigrama-ba-section').classList.remove('active');
    resetOrganigramaBaState();
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
  startInactivityTracking();
}

function clearStoredAuthToken() {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

function clearSessionUi() {
  stopInactivityTracking();
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
  resetDetalleIndicadoresState();
  resetLinksInteresState();
  resetAvanceComisionesState();
  avanceComisionesConfig.id = null;
  resetOrganigramaState();
  resetOrganigramaBaState();
  resetCorreoState();
  resetPoliticasState();
  resetRentabilidadState();
  elements.loginForm.reset();
  elements.appShell.classList.add('hidden');
  elements.loginView.classList.remove('hidden');
  if (IS_LOCAL_ENV) {
    setLoginStatus('Ingresa tus credenciales para continuar.', false);
  } else {
    elements.loginStatus.textContent = '';
    elements.loginStatus.classList.add('hidden');
  }
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

async function loadProducts() {
  if (!hasAccessToSection('visualizado')) return;

  elements.productSelect.innerHTML = '<option value="">-- Cargando archivos... --</option>';

  try {
    const res = await authFetch(`${API_BASE_URL}/api/esquemas-comisionales`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    sheetConfig = data.files || [];
  } catch (err) {
    console.error('Error loadProducts:', err.message);
    sheetConfig = [];
  }

  elements.productSelect.innerHTML = '<option value="">-- Seleccionar producto --</option>';
  sheetConfig.forEach((item, idx) => {
    const option = document.createElement("option");
    option.value = idx;
    option.textContent = item.nombre;
    elements.productSelect.appendChild(option);
  });
  elements.productSelect.value = '';
  elements.sheetSelect.innerHTML = '<option value="">-- Seleccionar hoja --</option>';
  elements.activeSheetTitle.textContent = 'Sin producto seleccionado';
  elements.tableWrapper.innerHTML = '';
  elements.refreshDataBtn.disabled = true;
  setStatus('Selecciona un producto para ver sus hojas.');
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
  autoRefreshId = setInterval(fetchSheetData, 300000);
}

async function fetchSheetData() {
  if (!currentProduct || !currentSheet) return;

  setStatus('Cargando...', false);

  try {
    const primaryData = await fetchSingleSheetData(currentProduct.id, currentSheet);
    const primaryGrid = filterColumnsWithoutHeader(buildGridFromSheet(primaryData, tableRange));

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

function columnIndexToLabel(index) {
  let current = Number(index) + 1;
  let label = '';

  while (current > 0) {
    const remainder = (current - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    current = Math.floor((current - 1) / 26);
  }

  return label;
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

function formatDisplayLabel(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function prepareGridForEditing(grid, headerRowCount = 1) {
  if (!grid.length) return grid;

  for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
    const row = grid[rowIndex] || [];
    let assignedSheetRow = false;
    row.forEach((cell, colIndex) => {
      if (!cell || cell.covered) return;
      if (rowIndex < headerRowCount) {
        cell._originalColIndex = colIndex;
      } else if (!assignedSheetRow) {
        cell._sheetRowIndex = rowIndex + 1;
        assignedSheetRow = true;
      }
    });
  }

  return grid;
}

function cloneSeguimientoDraftRow(templateRow, draftRowId) {
  const clonedRow = (templateRow || []).map(cell => {
    if (!cell) return null;
    return {
      ...cell,
      text: cell.covered ? cell.text : '',
      _sheetRowIndex: undefined
    };
  });

  clonedRow._draftRowId = draftRowId;
  return clonedRow;
}

function buildEditableColMapFromHeaderRow(headerRow, allowedColumns = null) {
  const map = new Map();

  (headerRow || []).forEach((cell, colIndex) => {
    if (!cell || cell.covered) return;
    const originalColIndex = cell._originalColIndex ?? colIndex;
    const colLetter = columnIndexToLabel(originalColIndex);
    if (allowedColumns && !allowedColumns.has(colLetter)) return;
    map.set(colIndex, colLetter);
  });

  return map;
}

function getSeguimientoHeaderRowCount(grid) {
  if (!grid.length) return 1;

  const datePattern = /^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/;
  const firstDataRowIndex = grid.findIndex((row, rowIndex) => {
    if (rowIndex === 0) return false;
    const firstVisibleCell = (row || []).find(cell => cell && !cell.covered);
    const value = String(firstVisibleCell?.text || '').trim();
    return datePattern.test(value);
  });

  return firstDataRowIndex > 0 ? firstDataRowIndex : Math.min(grid.length, 2);
}

function createEditableControl(currentValue, options, onChange, controlConfig = {}) {
  const normalizedCurrentValue = String(currentValue || '');
  const {
    variant = 'default',
    cell = null
  } = controlConfig;
  const cellBackgroundColor = googleColorToCss(cell?.backgroundColor) || '#fff';

  if (options.length) {
    const select = document.createElement('select');
    select.className = 'avance-editable-select';
    if (variant === 'sheet') {
      select.classList.add('editable-control--sheet');
      select.style.backgroundColor = cellBackgroundColor;
    }

    if (!normalizedCurrentValue) {
      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = '— seleccionar —';
      select.appendChild(emptyOpt);
    }

    if (normalizedCurrentValue && !options.includes(normalizedCurrentValue)) {
      const currentOpt = document.createElement('option');
      currentOpt.value = normalizedCurrentValue;
      currentOpt.textContent = normalizedCurrentValue;
      select.appendChild(currentOpt);
    }

    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      select.appendChild(option);
    });

    select.value = normalizedCurrentValue;
    select.addEventListener('change', () => onChange(select.value));
    return select;
  }

  const input = document.createElement('input');
  input.type = 'text';
  input.value = normalizedCurrentValue;
  input.className = 'avance-editable-input';
  if (variant === 'sheet') {
    input.classList.add('editable-control--sheet');
    input.style.backgroundColor = cellBackgroundColor;
  }
  input.addEventListener('input', () => onChange(input.value));
  return input;
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

function filterColumnsWithoutHeader(grid) {
  if (!grid.length) return grid;

  const headerRow = grid[0];
  const keptColumns = [];

  for (let colIndex = 0; colIndex < headerRow.length; colIndex++) {
    const cell = headerRow[colIndex];
    if (cell && cell.covered) {
      keptColumns.push(colIndex);
      continue;
    }
    if (cell && String(cell.text || '').trim() !== '') {
      keptColumns.push(colIndex);
    }
  }

  if (!keptColumns.length || keptColumns.length === headerRow.length) return grid;
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
  table.className = 'app-data-table';
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  const trHead = document.createElement('tr');
  grid[0].forEach(cell => {
    if (!cell || cell.covered) return;

    const th = document.createElement('th');
    th.textContent = formatDisplayLabel(cell.text || '');
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

function getDistinctColumnValues(grid, headerRowIndex, columnIndex) {
  const values = new Set();

  for (let rowIndex = headerRowIndex + 1; rowIndex < grid.length; rowIndex++) {
    const value = getCellText(grid[rowIndex], columnIndex);
    if (value) {
      values.add(value);
    }
  }

  return Array.from(values);
}

function filterGridByColumnValues(grid, headerRowIndex, filters) {
  if (!grid.length) return grid;

  const filteredRows = grid.filter((row, rowIndex) => {
    if (rowIndex <= headerRowIndex) return true;

    return filters.every(({ columnIndex, value }) => {
      if (!value || value === 'Todo') return true;
      return getCellText(row, columnIndex) === value;
    });
  });

  return trimGrid(filteredRows);
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

function normalizePlatformKind(label, href = '') {
  const normalizedLabel = String(label || '').trim().toLowerCase();
  const normalizedHref = String(href || '').trim().toLowerCase();

  if (normalizedLabel.includes('power bi') || normalizedLabel.includes('powerbi')) {
    return 'powerbi';
  }

  if (normalizedLabel.includes('excel') || normalizedLabel.includes('xlsx')) {
    return 'excel';
  }

  if (normalizedLabel.includes('ppt') || normalizedLabel.includes('powerpoint')) {
    return 'ppt';
  }

  if (normalizedLabel.includes('word') || normalizedLabel.includes('docx')) {
    return 'word';
  }

  if (normalizedLabel.includes('video') || normalizedLabel.includes('youtube') || normalizedLabel.includes('mp4')) {
    return 'video';
  }

  if (normalizedLabel.includes('query')) {
    return 'query';
  }

  if (
    normalizedLabel.includes('drive') ||
    normalizedHref.includes('drive.google.com') ||
    normalizedHref.includes('docs.google.com')
  ) {
    return 'drive';
  }

  return 'external';
}

function createSvgElement(tagName, attributes = {}) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
}

function platformKindToCssClass(kind) {
  const map = {
    powerbi: 'link-card--powerbi',
    excel: 'link-card--excel',
    ppt: 'link-card--ppt',
    word: 'link-card--word',
    video: 'link-card--video',
    drive: 'link-card--drive',
    query: 'link-card--query',
  };
  return map[kind] || 'link-card--external';
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

function createPlatformIcon(kind) {
  const iconWrap = document.createElement('span');
  iconWrap.className = 'link-icon';

  const svg = createSvgElement('svg', {
    viewBox: '0 0 24 24',
    'aria-hidden': 'true',
    focusable: 'false'
  });

  if (kind === 'powerbi') {
    svg.appendChild(createSvgElement('rect', { x: '4', y: '10', width: '3', height: '8', rx: '1', fill: '#f2c811' }));
    svg.appendChild(createSvgElement('rect', { x: '9', y: '7', width: '3', height: '11', rx: '1', fill: '#f2c811' }));
    svg.appendChild(createSvgElement('rect', { x: '14', y: '4', width: '3', height: '14', rx: '1', fill: '#f2c811' }));
    svg.appendChild(createSvgElement('circle', { cx: '18.5', cy: '6', r: '1.8', fill: '#d6a800' }));
  } else if (kind === 'excel') {
    svg.appendChild(createSvgElement('rect', { x: '3', y: '3', width: '18', height: '18', rx: '4', fill: '#107c41' }));
    svg.appendChild(createSvgElement('rect', { x: '9', y: '3', width: '12', height: '18', rx: '0', fill: '#21a366' }));
    svg.appendChild(createSvgElement('path', { d: 'M7 8h2l1.2 2.4L11.4 8h2l-2.1 4 2.3 4h-2l-1.4-2.6L8.8 16h-2l2.3-4L7 8z', fill: '#fff' }));
  } else if (kind === 'ppt') {
    svg.appendChild(createSvgElement('rect', { x: '3', y: '3', width: '18', height: '18', rx: '4', fill: '#c43e1c' }));
    svg.appendChild(createSvgElement('rect', { x: '9', y: '3', width: '12', height: '18', rx: '0', fill: '#d24726' }));
    svg.appendChild(createSvgElement('rect', { x: '6', y: '8', width: '5', height: '1.5', rx: '0.75', fill: '#fff' }));
    svg.appendChild(createSvgElement('rect', { x: '6', y: '11', width: '5', height: '1.5', rx: '0.75', fill: '#fff' }));
    svg.appendChild(createSvgElement('rect', { x: '6', y: '14', width: '3', height: '1.5', rx: '0.75', fill: '#fff' }));
  } else if (kind === 'word') {
    svg.appendChild(createSvgElement('rect', { x: '3', y: '3', width: '18', height: '18', rx: '4', fill: '#185abd' }));
    svg.appendChild(createSvgElement('rect', { x: '9', y: '3', width: '12', height: '18', rx: '0', fill: '#2b7cd3' }));
    svg.appendChild(createSvgElement('path', { d: 'M6 8h1.5l1 5 1.2-5h1.3l1.2 5 1-5H14l-1.8 8H10.8L9.5 11l-1.3 5H6.8L5 8z', fill: '#fff' }));
  } else if (kind === 'video') {
    svg.appendChild(createSvgElement('rect', { x: '3', y: '5', width: '18', height: '14', rx: '3', fill: '#dc2626' }));
    svg.appendChild(createSvgElement('path', { d: 'M10 9l6 3-6 3V9z', fill: '#fff' }));
  } else if (kind === 'drive') {
    svg.appendChild(createSvgElement('path', { d: 'M9 3h6l6 10-3 5h-4l3-5-5-8H9z', fill: '#0f9d58' }));
    svg.appendChild(createSvgElement('path', { d: 'M9 3 3 13l3 5 6-10z', fill: '#4285f4' }));
    svg.appendChild(createSvgElement('path', { d: 'M6 18h12l3-5H9z', fill: '#f4b400' }));
  } else if (kind === 'query') {
    svg.appendChild(createSvgElement('rect', { x: '8', y: '4', width: '10', height: '13', rx: '2', fill: '#2563eb' }));
    svg.appendChild(createSvgElement('rect', { x: '5', y: '7', width: '10', height: '13', rx: '2', fill: '#93c5fd' }));
    svg.appendChild(createSvgElement('path', { d: 'M10 11h5v1.6h-5zm0 3h5v1.6h-5z', fill: '#fff' }));
  } else {
    svg.appendChild(createSvgElement('path', { d: 'M14 5h5v5h-2V8.41l-6.29 6.3-1.42-1.42 6.3-6.29H14V5z', fill: '#0f172a' }));
    svg.appendChild(createSvgElement('path', { d: 'M6 7h5v2H8v7h7v-3h2v5H6V7z', fill: '#64748b' }));
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

const AVANCE_DETAIL_FILTER_COLS = ['STATUS', 'RESPONSABLE', 'PRODUCTO', 'PERIODICIDAD', 'FECHA DE PAGO POR FINANZAS'];

function buildAvanceDetailGrid(data) {
  const fullGrid = buildGridFromSheet(data, 'A1:R5000');
  if (!fullGrid.length) return [];

  // Tag header cells with original column index so editable cols survive filterEmptyColumns
  fullGrid[0].forEach((cell, colIndex) => {
    if (cell) cell._originalColIndex = colIndex;
  });

  const datePattern = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/;
  const headerRow = fullGrid[0];
  const dataRows = fullGrid.slice(1).reduce((acc, row, idx) => {
    const text = String(row?.[0]?.text || '').trim();
    if (datePattern.test(text)) {
      // Store 1-based sheet row index for write operations (idx is 0-based within slice(1))
      if (row[0]) row[0]._sheetRowIndex = idx + 2;
      acc.push(row);
    }
    return acc;
  }, []);

  if (!dataRows.length) return [];
  return filterEmptyColumns([headerRow, ...dataRows]);
}

function buildAvanceDetailFilterDefs(detailGrid) {
  if (detailGrid.length < 2) return [];
  const headerRow = detailGrid[0];
  const defs = [];

  headerRow.forEach((cell, colIndex) => {
    const label = String(cell?.text || '').trim().toUpperCase();
    if (!AVANCE_DETAIL_FILTER_COLS.includes(label)) return;

    const values = new Set();
    detailGrid.slice(1).forEach(row => {
      const val = String(row?.[colIndex]?.text || '').trim();
      if (val) values.add(val);
    });

    defs.push({ label: String(cell?.text || '').trim(), colIndex, values: [...values].sort() });
  });

  return defs;
}

function applyAvanceDetailFilters(detailGrid, activeFilters) {
  if (!activeFilters.size) return detailGrid;
  const headerRow = detailGrid[0];
  const dataRows = detailGrid.slice(1).filter(row =>
    [...activeFilters.entries()].every(([colIndex, value]) =>
      String(row?.[colIndex]?.text || '').trim() === value
    )
  );
  return [headerRow, ...dataRows];
}

function applyAvanceDetailStatusChips(container) {
  const table = container.querySelector('.app-data-table');
  if (!table) return;
  const ths = [...table.querySelectorAll('thead tr th')];
  const statusIdx = ths.findIndex(th => th.textContent.trim().toUpperCase() === 'STATUS');
  if (statusIdx < 0) return;
  table.querySelectorAll('tbody tr').forEach(tr => {
    const td = [...tr.querySelectorAll('td')][statusIdx];
    if (!td) return;
    const value = td.textContent.trim();
    td.textContent = '';
    td.style.backgroundColor = '';
    td.style.verticalAlign = 'middle';
    const chip = document.createElement('span');
    chip.className = `avance-chip is-${getStatusTone(value)}`;
    chip.textContent = value;
    td.appendChild(chip);
  });
}

function capAvanceDetailWideColumns(container) {
  const table = container.querySelector('.app-data-table');
  if (!table) return;
  const ths = [...table.querySelectorAll('thead tr th')];
  ths.forEach((th, idx) => {
    if (!th.textContent.trim().toUpperCase().includes('DESTINATARI')) return;
    const maxPx = th.textContent.trim().length * 9 + 28;
    table.querySelectorAll('tbody tr').forEach(tr => {
      const td = [...tr.querySelectorAll('td')][idx];
      if (!td) return;
      td.style.maxWidth = `${maxPx}px`;
      td.style.overflow = 'hidden';
      td.style.textOverflow = 'ellipsis';
    });
  });
}

const AVANCE_EDITABLE_ORIGINAL_COLS = { 1: 'B', 14: 'O', 15: 'P' };

function buildEditableColMap(headerRow) {
  const map = new Map();
  (headerRow || []).forEach((cell, idx) => {
    if (cell && AVANCE_EDITABLE_ORIGINAL_COLS[cell._originalColIndex] != null) {
      map.set(idx, AVANCE_EDITABLE_ORIGINAL_COLS[cell._originalColIndex]);
    }
  });
  return map;
}

function renderAvanceEditableTable(grid, container, editableColMap, pendingChanges, validationMap = new Map(), options = {}) {
  container.innerHTML = '';
  if (!grid.length) return;

  const {
    headerRowCount = 1,
    footerAction = null,
    controlVariant = 'default',
    editableCellClassName = 'avance-editable-cell'
  } = options;

  const table = document.createElement('table');
  table.className = 'app-data-table';

  const thead = document.createElement('thead');
  grid.slice(0, headerRowCount).forEach(headerRow => {
    const trHead = document.createElement('tr');
    headerRow.forEach((cell, colIdx) => {
      if (!cell || cell.covered) return;
      const th = document.createElement('th');
      th.textContent = formatDisplayLabel(cell.text || '');
      applyCellStyles(th, cell, true);
      if (cell.colSpan > 1) { th.colSpan = cell.colSpan; th.style.textAlign = 'center'; }
      if (cell.rowSpan > 1) { th.rowSpan = cell.rowSpan; th.style.verticalAlign = 'middle'; }
      if (editableColMap.has(colIdx) && headerRowCount === 1) th.classList.add('avance-editable-header');
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
  });
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  grid.slice(headerRowCount).forEach(row => {
    const sheetRowIndex = row.find(cell => cell && !cell.covered && cell._sheetRowIndex)?._sheetRowIndex;
    const draftRowId = row._draftRowId || null;
    const tr = document.createElement('tr');
    row.forEach((cell, colIdx) => {
      if (!cell || cell.covered) return;
      const td = document.createElement('td');
      applyCellStyles(td, cell);
      if (cell.colSpan > 1) td.colSpan = cell.colSpan;
      if (cell.rowSpan > 1) { td.rowSpan = cell.rowSpan; td.style.verticalAlign = 'middle'; }

      const colLetter = editableColMap.get(colIdx);
      const changeKey = draftRowId
        ? `draft:${draftRowId}:${colLetter}`
        : (sheetRowIndex ? `${sheetRowIndex}:${colLetter}` : '');

      if (colLetter && changeKey) {
        const currentValue = pendingChanges.has(changeKey) ? pendingChanges.get(changeKey) : (cell.text || '');
        const options = validationMap.get(colLetter) || [];
        td.appendChild(
          createEditableControl(
            currentValue,
            options,
            value => pendingChanges.set(changeKey, value),
            { variant: controlVariant, cell }
          )
        );
        if (editableCellClassName) td.classList.add(editableCellClassName);
      } else {
        td.textContent = cell.text || '';
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);

  if (footerAction?.label && typeof footerAction.onClick === 'function') {
    const actions = document.createElement('div');
    actions.className = 'seguimiento-new-row-actions';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'avance-edit-bar-btn avance-edit-bar-btn--save';
    button.textContent = footerAction.label;
    button.addEventListener('click', footerAction.onClick);

    actions.appendChild(button);
    container.appendChild(actions);
  }
}

function showConfirmModal(message, onConfirm, onCancel) {
  let overlay = document.getElementById('confirm-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'confirm-modal-overlay';
    overlay.className = 'confirm-modal-overlay';
    overlay.innerHTML = `
      <div class="confirm-modal-box">
        <p class="confirm-modal-message"></p>
        <div class="confirm-modal-actions">
          <button type="button" id="confirm-modal-cancel-btn" class="confirm-modal-btn confirm-modal-btn--no">No, volver</button>
          <button type="button" id="confirm-modal-ok-btn" class="confirm-modal-btn confirm-modal-btn--yes">Sí, confirmar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  overlay.querySelector('.confirm-modal-message').textContent = message;
  overlay.style.display = 'flex';
  document.getElementById('confirm-modal-ok-btn').onclick = () => {
    overlay.style.display = 'none';
    onConfirm();
  };
  document.getElementById('confirm-modal-cancel-btn').onclick = () => {
    overlay.style.display = 'none';
    if (onCancel) onCancel();
  };
}

function renderAvanceComisionesSummary(summaryResult, detailGrid) {
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

  if (detailGrid && detailGrid.length) {
    const detailSection = document.createElement('div');
    detailSection.className = 'detail-section';

    const detailButton = document.createElement('button');
    detailButton.type = 'button';
    detailButton.className = 'detail-toggle-btn';
    detailButton.textContent = 'Mostrar detalle';

    const detailContent = document.createElement('div');
    detailContent.className = 'hidden';

    const filterDefs = buildAvanceDetailFilterDefs(detailGrid);
    const activeFilters = new Map();
    const editableColMap = buildEditableColMap(detailGrid[0]);
    let isEditMode = false;
    const pendingChanges = new Map();
    const validationMap = new Map(); // colLetter → string[]

    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'avance-detail-scroll';

    const renderFiltered = () => {
      scrollContainer.innerHTML = '';
      const filtered = applyAvanceDetailFilters(detailGrid, activeFilters);
      if (isEditMode && editableColMap.size > 0) {
        renderAvanceEditableTable(filtered, scrollContainer, editableColMap, pendingChanges, validationMap, {
          controlVariant: 'default',
          editableCellClassName: 'avance-editable-cell'
        });
      } else {
        appendTableToElement(filtered, scrollContainer);
        applyAvanceDetailStatusChips(scrollContainer);
        capAvanceDetailWideColumns(scrollContainer);
      }
    };

    const filtersWrap = document.createElement('div');
    filtersWrap.className = 'avance-detail-filters';

    if (filterDefs.length) {
      const selectMap = new Map();

      const updateFilterOptions = () => {
        filterDefs.forEach(({ colIndex }) => {
          const sel = selectMap.get(colIndex);
          if (!sel) return;
          const currentValue = sel.value;
          const othersFilters = new Map([...activeFilters].filter(([ci]) => ci !== colIndex));
          const filteredRows = applyAvanceDetailFilters(detailGrid, othersFilters).slice(1);
          const available = new Set();
          filteredRows.forEach(row => {
            const val = String(row?.[colIndex]?.text || '').trim();
            if (val) available.add(val);
          });
          sel.innerHTML = '';
          const allOpt = document.createElement('option');
          allOpt.value = '';
          allOpt.textContent = 'Todo';
          sel.appendChild(allOpt);
          [...available].sort().forEach(v => {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            sel.appendChild(opt);
          });
          if (available.has(currentValue)) {
            sel.value = currentValue;
          } else {
            sel.value = '';
            activeFilters.delete(colIndex);
          }
        });
      };

      filterDefs.forEach(({ label, colIndex, values }) => {
        const group = document.createElement('div');
        group.className = 'avance-detail-filter-group';

        const lbl = document.createElement('label');
        lbl.textContent = label;

        const sel = document.createElement('select');
        selectMap.set(colIndex, sel);
        [{ text: 'Todo', value: '' }, ...values.map(v => ({ text: v, value: v }))].forEach(({ text, value }) => {
          const opt = document.createElement('option');
          opt.value = value;
          opt.textContent = text;
          sel.appendChild(opt);
        });

        sel.addEventListener('change', () => {
          if (sel.value === '') activeFilters.delete(colIndex);
          else activeFilters.set(colIndex, sel.value);
          updateFilterOptions();
          renderFiltered();
        });

        group.appendChild(lbl);
        group.appendChild(sel);
        filtersWrap.appendChild(group);
      });
    }

    // Edit button — only for canEdit users
    if (currentUser?.canEdit && editableColMap.size > 0) {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'avance-edit-btn';
      editBtn.textContent = 'Editar';

      const editActionsBar = document.createElement('div');
      editActionsBar.className = 'avance-edit-bar hidden';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'avance-edit-bar-btn avance-edit-bar-btn--cancel';
      cancelBtn.textContent = 'Cancelar';

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'avance-edit-bar-btn avance-edit-bar-btn--save';
      saveBtn.textContent = 'Guardar';

      editActionsBar.appendChild(cancelBtn);
      editActionsBar.appendChild(saveBtn);

      editBtn.addEventListener('click', async () => {
        editBtn.disabled = true;
        editBtn.textContent = 'Cargando...';
        try {
          validationMap.clear();
          const cols = [...editableColMap.values()].join(',');
          const res = await authFetch(
            `${API_BASE_URL}/api/sheetvalidation?spreadsheetId=${avanceComisionesConfig.id}&sheetName=${encodeURIComponent(avanceComisionesConfig.sheetName)}&columns=${cols}`
          );
          if (res.ok) {
            const data = await res.json();
            Object.entries(data).forEach(([col, opts]) => {
              validationMap.set(col, Array.isArray(opts) ? opts : []);
            });
          }
        } catch (_) { /* continúa sin validación */ }
        editBtn.disabled = false;
        editBtn.textContent = 'Editar';
        isEditMode = true;
        pendingChanges.clear();
        editBtn.classList.add('hidden');
        editActionsBar.classList.remove('hidden');
        renderFiltered();
      });

      cancelBtn.addEventListener('click', () => {
        showConfirmModal(
          '¿Estás seguro? Se perderán todos los cambios sin guardar.',
          () => {
            isEditMode = false;
            pendingChanges.clear();
            editActionsBar.classList.add('hidden');
            editBtn.classList.remove('hidden');
            renderFiltered();
          }
        );
      });

      saveBtn.addEventListener('click', () => {
        const updates = [...pendingChanges.entries()].map(([key, value]) => {
          const [rowIndex, colLetter] = key.split(':');
          return { range: `${colLetter}${rowIndex}`, value };
        });

        if (!updates.length) {
          showConfirmModal('No hay cambios para guardar.', () => {});
          return;
        }

        showConfirmModal(
          `¿Confirmas guardar ${updates.length} cambio(s) en Google Sheets?`,
          async () => {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Guardando...';
            try {
              const res = await authFetch(`${API_BASE_URL}/api/updatesheetcells`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  spreadsheetId: avanceComisionesConfig.id,
                  sheetName: avanceComisionesConfig.sheetName,
                  updates
                })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Error al guardar.');
              isEditMode = false;
              pendingChanges.clear();
              editActionsBar.classList.add('hidden');
              editBtn.classList.remove('hidden');
              saveBtn.disabled = false;
              saveBtn.textContent = 'Guardar';
              await loadAvanceComisionesData();
            } catch (err) {
              saveBtn.disabled = false;
              saveBtn.textContent = 'Guardar';
              showConfirmModal(`Error al guardar: ${err.message}`, () => {});
            }
          }
        );
      });

      filtersWrap.appendChild(editBtn);
      detailContent.appendChild(filtersWrap);
      detailContent.appendChild(editActionsBar);
    } else {
      detailContent.appendChild(filtersWrap);
    }

    renderFiltered();
    detailContent.appendChild(scrollContainer);

    detailButton.addEventListener('click', () => {
      const isHidden = detailContent.classList.contains('hidden');
      detailContent.classList.toggle('hidden', !isHidden);
      detailButton.textContent = isHidden ? 'Ocultar detalle' : 'Mostrar detalle';
    });

    detailSection.appendChild(detailButton);
    detailSection.appendChild(detailContent);
    elements.avanceComisionesWrapper.appendChild(detailSection);
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

function renderDetalleIndicadoresFilters(grid, headerInfo) {
  const productOptions = getDistinctColumnValues(grid, headerInfo.rowIndex, headerInfo.columns.producto);

  elements.detalleIndicadoresProductoSelect.innerHTML = '';
  ['Todo', ...productOptions].forEach(optionValue => {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionValue;
    elements.detalleIndicadoresProductoSelect.appendChild(option);
  });

  if (![...elements.detalleIndicadoresProductoSelect.options].some(option => option.value === currentDetalleIndicadoresProduct)) {
    currentDetalleIndicadoresProduct = 'Todo';
  }

  if (![...elements.detalleIndicadoresEsquemaSelect.options].some(option => option.value === currentDetalleIndicadoresEsquema)) {
    currentDetalleIndicadoresEsquema = 'Todo';
  }

  const filteredForProduct = filterGridByColumnValues(grid, headerInfo.rowIndex, [
    {
      columnIndex: headerInfo.columns.producto,
      value: currentDetalleIndicadoresProduct
    }
  ]);
  const esquemaOptions = getDistinctColumnValues(
    filteredForProduct,
    headerInfo.rowIndex,
    headerInfo.columns.esquema
  );

  elements.detalleIndicadoresEsquemaSelect.innerHTML = '';
  ['Todo', ...esquemaOptions].forEach(optionValue => {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionValue;
    elements.detalleIndicadoresEsquemaSelect.appendChild(option);
  });

  if (![...elements.detalleIndicadoresEsquemaSelect.options].some(option => option.value === currentDetalleIndicadoresEsquema)) {
    currentDetalleIndicadoresEsquema = 'Todo';
  }

  elements.detalleIndicadoresProductoSelect.value = currentDetalleIndicadoresProduct;
  elements.detalleIndicadoresEsquemaSelect.value = currentDetalleIndicadoresEsquema;
}

function renderDetalleIndicadoresTable() {
  elements.detalleIndicadoresWrapper.innerHTML = '';

  if (!currentDetalleIndicadoresGrid.length || !currentDetalleIndicadoresHeaderInfo) {
    elements.detalleIndicadoresStatus.textContent = 'No hay datos cargados para filtrar.';
    elements.detalleIndicadoresStatus.style.color = '#334155';
    return;
  }

  const filteredGrid = filterGridByColumnValues(
    currentDetalleIndicadoresGrid,
    currentDetalleIndicadoresHeaderInfo.rowIndex,
    [
      {
        columnIndex: currentDetalleIndicadoresHeaderInfo.columns.producto,
        value: currentDetalleIndicadoresProduct
      },
      {
        columnIndex: currentDetalleIndicadoresHeaderInfo.columns.esquema,
        value: currentDetalleIndicadoresEsquema
      }
    ]
  );

  const headerRowCount = currentDetalleIndicadoresHeaderInfo.rowIndex + 1;
  const headerRows = filteredGrid.slice(0, headerRowCount);
  const normalizedSearch = currentDetalleIndicadoresSearch.trim().toLowerCase();
  const dataRows = filteredGrid.slice(headerRowCount).filter(row =>
    !normalizedSearch || row.some(cell => !cell?.covered && String(cell?.text || '').toLowerCase().includes(normalizedSearch))
  );
  const totalRows = dataRows.length;
  const totalPages = Math.max(Math.ceil(totalRows / DETALLE_INDICADORES_PAGE_SIZE), 1);
  if (currentDetalleIndicadoresPage > totalPages) currentDetalleIndicadoresPage = totalPages;
  if (currentDetalleIndicadoresPage < 1) currentDetalleIndicadoresPage = 1;
  const startIndex = (currentDetalleIndicadoresPage - 1) * DETALLE_INDICADORES_PAGE_SIZE;
  const paginatedGrid = [...headerRows, ...dataRows.slice(startIndex, startIndex + DETALLE_INDICADORES_PAGE_SIZE)];

  renderDetalleIndicadoresTableToElement(paginatedGrid, elements.detalleIndicadoresWrapper);

  if (totalPages > 1) {
    const pagination = document.createElement('div');
    pagination.className = 'pagination-bar';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'pagination-btn';
    prevBtn.textContent = 'Anterior';
    prevBtn.disabled = currentDetalleIndicadoresPage === 1;
    prevBtn.addEventListener('click', () => {
      currentDetalleIndicadoresPage -= 1;
      renderDetalleIndicadoresTable();
    });

    const info = document.createElement('span');
    info.className = 'pagination-info';
    info.textContent = `Mostrando ${startIndex + 1}-${Math.min(startIndex + DETALLE_INDICADORES_PAGE_SIZE, totalRows)} de ${totalRows}`;

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'pagination-btn';
    nextBtn.textContent = 'Siguiente';
    nextBtn.disabled = currentDetalleIndicadoresPage === totalPages;
    nextBtn.addEventListener('click', () => {
      currentDetalleIndicadoresPage += 1;
      renderDetalleIndicadoresTable();
    });

    pagination.appendChild(prevBtn);
    pagination.appendChild(info);
    pagination.appendChild(nextBtn);
    elements.detalleIndicadoresWrapper.appendChild(pagination);
  }

  elements.detalleIndicadoresTitle.textContent = detalleIndicadoresConfig.nombre;
  elements.detalleIndicadoresStatus.textContent = `${totalRows} filas visibles${currentDetalleIndicadoresProduct !== 'Todo' ? ` | Producto: ${currentDetalleIndicadoresProduct}` : ''}${currentDetalleIndicadoresEsquema !== 'Todo' ? ` | Esquema: ${currentDetalleIndicadoresEsquema}` : ''}${normalizedSearch ? ` | Búsqueda: ${currentDetalleIndicadoresSearch}` : ''} | Página ${currentDetalleIndicadoresPage} de ${totalPages}.`;
  elements.detalleIndicadoresStatus.style.color = '#334155';
}

function renderSeguimientoTable(grid) {
  elements.seguimientoTableWrapper.innerHTML = '';

  if (!grid.length) {
    elements.seguimientoStatus.textContent = 'No hay datos para mostrar.';
    elements.seguimientoStatus.style.color = '#334155';
    currentSeguimientoPage = 1;
    return;
  }

  const headerRowCount = getSeguimientoHeaderRowCount(grid);
  const headerRows = grid.slice(0, headerRowCount);
  const dataRows = [...grid.slice(headerRowCount), ...currentSeguimientoDraftRows];
  const totalRows = dataRows.length;
  const totalPages = Math.max(Math.ceil(totalRows / SEGUIMIENTO_PAGE_SIZE), 1);

  if (currentSeguimientoPage > totalPages) currentSeguimientoPage = totalPages;
  if (currentSeguimientoPage < 1) currentSeguimientoPage = 1;

  const startIndex = (currentSeguimientoPage - 1) * SEGUIMIENTO_PAGE_SIZE;
  const paginatedGrid = [...headerRows, ...dataRows.slice(startIndex, startIndex + SEGUIMIENTO_PAGE_SIZE)];
  const editableColMap = buildEditableColMapFromHeaderRow(headerRows.at(-1));
  const canEditSeguimiento = currentUser?.canEdit && editableColMap.size > 0;

  if (canEditSeguimiento) {
    const toolbar = document.createElement('div');
    toolbar.className = 'seguimiento-edit-toolbar';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'avance-edit-btn';
    editBtn.textContent = 'Editar';
    editBtn.classList.toggle('hidden', currentSeguimientoIsEditMode);

    const editActionsBar = document.createElement('div');
    editActionsBar.className = `avance-edit-bar${currentSeguimientoIsEditMode ? '' : ' hidden'}`;

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'avance-edit-bar-btn avance-edit-bar-btn--cancel';
    cancelBtn.textContent = 'Cancelar';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'avance-edit-bar-btn avance-edit-bar-btn--save';
    saveBtn.textContent = 'Guardar';

    editBtn.addEventListener('click', async () => {
      editBtn.disabled = true;
      editBtn.textContent = 'Cargando...';
      try {
        currentSeguimientoValidationMap.clear();
        const cols = [...editableColMap.values()].join(',');
        const res = await authFetch(
          `${API_BASE_URL}/api/sheetvalidation?spreadsheetId=${seguimientoSheetConfig.id}&sheetName=${encodeURIComponent(currentSeguimientoSheet)}&columns=${cols}`
        );
        if (res.ok) {
          const data = await res.json();
          Object.entries(data).forEach(([col, opts]) => {
            currentSeguimientoValidationMap.set(col, Array.isArray(opts) ? opts : []);
          });
        }
      } catch (_) { /* continúa sin validación */ }
      editBtn.disabled = false;
      editBtn.textContent = 'Editar';
      currentSeguimientoIsEditMode = true;
      currentSeguimientoPendingChanges.clear();
      currentSeguimientoDraftRows = [];
      renderSeguimientoTable(currentSeguimientoGrid);
    });

    cancelBtn.addEventListener('click', () => {
      showConfirmModal(
        '¿Estás seguro? Se perderán todos los cambios sin guardar.',
        () => {
          currentSeguimientoIsEditMode = false;
          currentSeguimientoPendingChanges.clear();
          currentSeguimientoDraftRows = [];
          renderSeguimientoTable(currentSeguimientoGrid);
        }
      );
    });

    saveBtn.addEventListener('click', async () => {
      const updates = [...currentSeguimientoPendingChanges.entries()]
        .filter(([key]) => !key.startsWith('draft:'))
        .map(([key, value]) => {
          const [rowIndex, colLetter] = key.split(':');
          return { range: `${colLetter}${rowIndex}`, value };
        });

      const draftRows = currentSeguimientoDraftRows.map(row => ({
        draftRowId: row._draftRowId,
        rowValues: [...editableColMap.values()].map(colLetter => ({
          colLetter,
          value: currentSeguimientoPendingChanges.get(`draft:${row._draftRowId}:${colLetter}`) || ''
        }))
      }));

      if (!updates.length && !draftRows.length) {
        showConfirmModal('No hay cambios para guardar.', () => {});
        return;
      }

      showConfirmModal(
        `¿Confirmas guardar los cambios en Google Sheets?`,
        async () => {
          saveBtn.disabled = true;
          saveBtn.textContent = 'Guardando...';
          try {
            if (updates.length) {
              const res = await authFetch(`${API_BASE_URL}/api/updatesheetcells`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  spreadsheetId: seguimientoSheetConfig.id,
                  sheetName: currentSeguimientoSheet,
                  updates,
                  editableColumns: [...editableColMap.values()]
                })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Error al guardar.');
            }

            for (const draftRow of draftRows) {
              const res = await authFetch(`${API_BASE_URL}/api/appendsheetrow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  spreadsheetId: seguimientoSheetConfig.id,
                  sheetName: currentSeguimientoSheet,
                  rowValues: draftRow.rowValues,
                  editableColumns: [...editableColMap.values()]
                })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Error al agregar la fila.');
            }

            currentSeguimientoIsEditMode = false;
            currentSeguimientoPendingChanges.clear();
            currentSeguimientoDraftRows = [];
            saveBtn.disabled = false;
            saveBtn.textContent = 'Guardar';
            await fetchSeguimientoSheetData();
          } catch (err) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Guardar';
            showConfirmModal(`Error al guardar: ${err.message}`, () => {});
          }
        }
      );
    });

    editActionsBar.appendChild(cancelBtn);
    editActionsBar.appendChild(saveBtn);
    toolbar.appendChild(editBtn);
    toolbar.appendChild(editActionsBar);
    elements.seguimientoTableWrapper.appendChild(toolbar);
  }

  const tableContent = document.createElement('div');

  if (currentSeguimientoIsEditMode && editableColMap.size > 0) {
    const isLastPage = currentSeguimientoPage === totalPages;
    renderAvanceEditableTable(
      paginatedGrid,
      tableContent,
      editableColMap,
      currentSeguimientoPendingChanges,
      currentSeguimientoValidationMap,
      {
        headerRowCount,
        controlVariant: 'sheet',
        editableCellClassName: '',
        footerAction: isLastPage ? {
          label: 'Agregar fila',
          onClick: () => {
            const draftRowId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
            const templateRow = currentSeguimientoDraftRows.at(-1) || grid.at(-1);
            currentSeguimientoDraftRows = [
              ...currentSeguimientoDraftRows,
              cloneSeguimientoDraftRow(templateRow, draftRowId)
            ];
            renderSeguimientoTable(currentSeguimientoGrid);
          }
        } : null
      }
    );
  } else {
    renderTableToElement(paginatedGrid, tableContent);
  }

  elements.seguimientoTableWrapper.appendChild(tableContent);

  if (totalPages > 1) {
    const pagination = document.createElement('div');
    pagination.className = 'pagination-bar';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'pagination-btn';
    prevBtn.textContent = 'Anterior';
    prevBtn.disabled = currentSeguimientoPage === 1;
    prevBtn.addEventListener('click', () => {
      currentSeguimientoPage -= 1;
      renderSeguimientoTable(grid);
    });

    const info = document.createElement('span');
    info.className = 'pagination-info';
    info.textContent = `Mostrando ${startIndex + 1}-${Math.min(startIndex + SEGUIMIENTO_PAGE_SIZE, totalRows)} de ${totalRows}`;

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'pagination-btn';
    nextBtn.textContent = 'Siguiente';
    nextBtn.disabled = currentSeguimientoPage === totalPages;
    nextBtn.addEventListener('click', () => {
      currentSeguimientoPage += 1;
      renderSeguimientoTable(grid);
    });

    pagination.appendChild(prevBtn);
    pagination.appendChild(info);
    pagination.appendChild(nextBtn);
    elements.seguimientoTableWrapper.appendChild(pagination);
  }

  elements.seguimientoStatus.textContent = `Datos cargados: ${totalRows} filas (sin cabecera). | Página ${currentSeguimientoPage} de ${totalPages}.`;
  elements.seguimientoStatus.style.color = '#334155';
}

function getHeaderMapForRow(row) {
  const headerMap = new Map();

  (row || []).forEach((cell, colIndex) => {
    if (!cell || cell.covered) return;
    const text = normalizeHeaderText(cell.text);
    if (!text) return;
    headerMap.set(text, colIndex);
  });

  return headerMap;
}

function renderDetalleIndicadoresTableToElement(grid, targetElement) {
  targetElement.innerHTML = '';

  if (!grid.length) {
    appendTableToElement(grid, targetElement);
    return;
  }

  const headerInfo = findHeaderColumnsByLabels(grid, ['fuente', 'plataforma']);
  if (!headerInfo) {
    appendTableToElement(grid, targetElement);
    return;
  }

  const fuenteColumnIndex = headerInfo.columns.fuente;
  const plataformaColumnIndex = headerInfo.columns.plataforma;
  const hiddenColumns = new Set([plataformaColumnIndex]);
  const table = document.createElement('table');
  table.className = 'app-data-table';
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  grid.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');

    row.forEach((cell, colIndex) => {
      if (!cell || cell.covered || hiddenColumns.has(colIndex)) return;

      const isHeader = rowIndex === headerInfo.rowIndex;
      const element = document.createElement(isHeader ? 'th' : 'td');
      applyCellStyles(element, cell, isHeader);

      if (cell.colSpan > 1) {
        const adjustedColSpan = Array.from({ length: cell.colSpan }, (_, offset) => colIndex + offset)
          .filter(index => !hiddenColumns.has(index)).length;
        if (!adjustedColSpan) return;
        if (adjustedColSpan > 1) {
          element.colSpan = adjustedColSpan;
        }
      }

      if (cell.rowSpan > 1) {
        element.rowSpan = cell.rowSpan;
        element.style.verticalAlign = 'middle';
      }

      if (!isHeader && colIndex === fuenteColumnIndex) {
        const platformLabel = getCellText(row, plataformaColumnIndex);
        const href = getCellLink(row, fuenteColumnIndex) || (isLikelyUrl(cell.text) ? cell.text : '');
        const platformKind = normalizePlatformKind(platformLabel, href);

        if (href) {
          const anchor = document.createElement('a');
          const linkToneClass = platformKindToCssClass(platformKind);
          anchor.className = `link-card link-card--icon ${linkToneClass}`;
          anchor.href = href;
          anchor.target = '_blank';
          anchor.rel = 'noreferrer noopener';
          anchor.title = platformLabel || 'Abrir fuente';
          anchor.setAttribute('aria-label', platformLabel || 'Abrir fuente');
          anchor.appendChild(createPlatformIcon(platformKind));
          element.classList.add('cell-icon');
          element.appendChild(anchor);
        } else {
          element.textContent = cell.text || '';
        }
      } else {
        element.textContent = isHeader ? formatDisplayLabel(cell.text || '') : (cell.text || '');
      }

      tr.appendChild(element);
    });

    if (tr.children.length) {
      (rowIndex <= headerInfo.rowIndex ? thead : tbody).appendChild(tr);
    }
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  targetElement.appendChild(table);
}

function buildLinksInteresItems(grid) {
  const headerInfo = findHeaderColumnsByLabels(grid, ['producto', 'link', 'plataforma']);
  if (!headerInfo) {
    throw new Error('No se encontraron las columnas producto, link y plataforma en LINK_DE_INTERES.');
  }

  const headerMap = getHeaderMapForRow(grid[headerInfo.rowIndex]);
  const esquemaColumn = headerMap.get('esquema');
  const nombreColumn = headerMap.get('nombre');
  const detalleColumn = headerMap.get('detalle');
  const descripcionColumn = headerMap.get('descripcion');

  return grid
    .slice(headerInfo.rowIndex + 1)
    .map(row => {
      const producto = getCellText(row, headerInfo.columns.producto);
      const linkText = getCellText(row, headerInfo.columns.link);
      const platformLabel = getCellText(row, headerInfo.columns.plataforma);

      if (!producto || !linkText) return null;

      const hyperlink = getCellLink(row, headerInfo.columns.link);
      const href = hyperlink || (isLikelyUrl(linkText) ? linkText : '');
      const platformKind = normalizePlatformKind(platformLabel, href);
      const title =
        getCellText(row, detalleColumn) ||
        getCellText(row, nombreColumn) ||
        getCellText(row, esquemaColumn) ||
        getCellText(row, descripcionColumn) ||
        'Link disponible';

      return {
        producto,
        title,
        platformKind,
        platformLabel,
        href,
        copyValue: linkText
      };
    })
    .filter(Boolean);
}

function renderLinksInteresProductOptions(items) {
  const productOptions = Array.from(new Set(items.map(item => item.producto)));
  elements.linksInteresProductoSelect.innerHTML = '';

  ['Todo', ...productOptions].forEach(optionValue => {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionValue;
    elements.linksInteresProductoSelect.appendChild(option);
  });

  if (![...elements.linksInteresProductoSelect.options].some(option => option.value === currentLinksInteresProduct)) {
    currentLinksInteresProduct = 'Todo';
  }

  elements.linksInteresProductoSelect.value = currentLinksInteresProduct;
}

function getLinksInteresActionLabel(platformKind) {
  if (platformKind === 'powerbi') return 'Power BI';
  if (platformKind === 'excel') return 'Excel';
  if (platformKind === 'ppt') return 'PowerPoint';
  if (platformKind === 'word') return 'Word';
  if (platformKind === 'video') return 'Video';
  if (platformKind === 'drive') return 'Drive';
  if (platformKind === 'query') return 'Query';
  return 'Link externo';
}

function renderLinksInteresActionOptions(items) {
  const actionOptions = Array.from(new Set(items.map(item => getLinksInteresActionLabel(item.platformKind))));
  elements.linksInteresAccionSelect.innerHTML = '';

  ['Todo', ...actionOptions].forEach(optionValue => {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionValue;
    elements.linksInteresAccionSelect.appendChild(option);
  });

  if (![...elements.linksInteresAccionSelect.options].some(option => option.value === currentLinksInteresAction)) {
    currentLinksInteresAction = 'Todo';
  }

  elements.linksInteresAccionSelect.value = currentLinksInteresAction;
}

async function copyToClipboard(value) {
  const text = String(value || '');

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const tempInput = document.createElement('textarea');
  tempInput.value = text;
  tempInput.setAttribute('readonly', 'readonly');
  tempInput.style.position = 'fixed';
  tempInput.style.opacity = '0';
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand('copy');
  document.body.removeChild(tempInput);
}

function showCopyToast(message, targetElement) {
  const existingToast = document.querySelector('.copy-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'copy-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  const targetRect = targetElement?.getBoundingClientRect();
  const toastRect = toast.getBoundingClientRect();
  const viewportPadding = 12;
  let top = targetRect
    ? targetRect.top + (targetRect.height / 2) - (toastRect.height / 2)
    : window.innerHeight - toastRect.height - 80;
  let left = targetRect
    ? targetRect.right + 12
    : window.innerWidth - toastRect.width - 20;

  if (left + toastRect.width > window.innerWidth - viewportPadding && targetRect) {
    left = targetRect.left - toastRect.width - 12;
  }

  if (left < viewportPadding) {
    left = viewportPadding;
  }

  if (top + toastRect.height > window.innerHeight - viewportPadding) {
    top = window.innerHeight - toastRect.height - viewportPadding;
  }

  if (top < viewportPadding) {
    top = viewportPadding;
  }

  toast.style.top = `${top}px`;
  toast.style.left = `${left}px`;

  window.requestAnimationFrame(() => {
    toast.classList.add('is-visible');
  });

  window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => toast.remove(), 220);
  }, 2000);
}

function renderLinksInteresCards() {
  elements.linksInteresWrapper.innerHTML = '';
  const normalizedSearch = currentLinksInteresSearch.trim().toLowerCase();

  const items = currentLinksInteresItems.filter(item =>
    (currentLinksInteresProduct === 'Todo' ? true : item.producto === currentLinksInteresProduct) &&
    (currentLinksInteresAction === 'Todo' ? true : getLinksInteresActionLabel(item.platformKind) === currentLinksInteresAction) &&
    (!normalizedSearch ? true : item.title.toLowerCase().includes(normalizedSearch))
  );

  if (!items.length) {
    elements.linksInteresStatus.textContent = 'No hay links disponibles para el filtro seleccionado.';
    elements.linksInteresStatus.style.color = '#334155';
    currentLinksInteresPage = 1;
    return;
  }

  const totalPages = Math.max(Math.ceil(items.length / LINKS_INTERES_PAGE_SIZE), 1);
  if (currentLinksInteresPage > totalPages) {
    currentLinksInteresPage = totalPages;
  }
  if (currentLinksInteresPage < 1) {
    currentLinksInteresPage = 1;
  }
  const startIndex = (currentLinksInteresPage - 1) * LINKS_INTERES_PAGE_SIZE;
  const paginatedItems = items.slice(startIndex, startIndex + LINKS_INTERES_PAGE_SIZE);

  elements.linksInteresTitle.textContent = linksInteresConfig.nombre;
  const activeFilters = [
    currentLinksInteresProduct !== 'Todo' ? `Producto: ${currentLinksInteresProduct}` : '',
    currentLinksInteresAction !== 'Todo' ? `Fuente: ${currentLinksInteresAction}` : '',
    normalizedSearch ? `Detalle: ${currentLinksInteresSearch}` : ''
  ].filter(Boolean);
  elements.linksInteresStatus.textContent = `${items.length} links disponibles${activeFilters.length ? ` | ${activeFilters.join(' | ')}` : ''} | Página ${currentLinksInteresPage} de ${totalPages}.`;
  elements.linksInteresStatus.style.color = '#334155';

  const table = document.createElement('div');
  table.className = 'interest-table';

  const header = document.createElement('div');
  header.className = 'interest-row interest-row--head';
  ['Producto', 'Detalle', 'Accion'].forEach(label => {
    const cell = document.createElement('div');
    cell.className = 'interest-cell';
    cell.textContent = label;
    header.appendChild(cell);
  });
  table.appendChild(header);

  paginatedItems.forEach(item => {
    const row = document.createElement('article');
    row.className = 'interest-row';

    const productCell = document.createElement('div');
    productCell.className = 'interest-cell';
    productCell.textContent = item.producto;

    const titleCell = document.createElement('div');
    titleCell.className = 'interest-cell';
    titleCell.textContent = item.title;

    let actionElement;
    if (item.platformKind === 'query') {
      actionElement = document.createElement('button');
      actionElement.type = 'button';
      actionElement.className = 'link-card link-card--icon link-card--query';
      actionElement.title = 'Copiar query';
      actionElement.setAttribute('aria-label', 'Copiar query');
      actionElement.addEventListener('click', async event => {
        try {
          await copyToClipboard(item.copyValue);
          showCopyToast('Copiado', event.currentTarget);
        } catch (error) {
          elements.linksInteresStatus.textContent = `No se pudo copiar el query: ${error.message}`;
          elements.linksInteresStatus.style.color = '#b91c1c';
        }
      });
    } else {
      actionElement = document.createElement('a');
      const linkToneClass = platformKindToCssClass(item.platformKind);
      actionElement.className = `link-card link-card--icon ${linkToneClass}`;
      actionElement.href = item.href || '#';
      actionElement.target = '_blank';
      actionElement.rel = 'noreferrer noopener';
      actionElement.title = item.platformLabel || 'Abrir link';
      actionElement.setAttribute('aria-label', item.platformLabel || 'Abrir link');

      if (!item.href) {
        actionElement.classList.add('is-empty');
        actionElement.removeAttribute('href');
        actionElement.removeAttribute('target');
        actionElement.removeAttribute('rel');
      }
    }

    actionElement.appendChild(createPlatformIcon(item.platformKind));

    const actionCell = document.createElement('div');
    actionCell.className = 'interest-cell interest-cell--action';
    actionCell.appendChild(actionElement);

    row.appendChild(productCell);
    row.appendChild(titleCell);
    row.appendChild(actionCell);
    table.appendChild(row);
  });

  elements.linksInteresWrapper.appendChild(table);

  if (totalPages > 1) {
    const pagination = document.createElement('div');
    pagination.className = 'pagination-bar';

    const previousButton = document.createElement('button');
    previousButton.type = 'button';
    previousButton.className = 'pagination-btn';
    previousButton.textContent = 'Anterior';
    previousButton.disabled = currentLinksInteresPage === 1;
    previousButton.addEventListener('click', () => {
      if (currentLinksInteresPage === 1) return;
      currentLinksInteresPage -= 1;
      renderLinksInteresCards();
    });

    const info = document.createElement('span');
    info.className = 'pagination-info';
    info.textContent = `Mostrando ${startIndex + 1}-${Math.min(startIndex + LINKS_INTERES_PAGE_SIZE, items.length)} de ${items.length}`;

    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'pagination-btn';
    nextButton.textContent = 'Siguiente';
    nextButton.disabled = currentLinksInteresPage === totalPages;
    nextButton.addEventListener('click', () => {
      if (currentLinksInteresPage === totalPages) return;
      currentLinksInteresPage += 1;
      renderLinksInteresCards();
    });

    pagination.appendChild(previousButton);
    pagination.appendChild(info);
    pagination.appendChild(nextButton);
    elements.linksInteresWrapper.appendChild(pagination);
  }
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
  if (!selection) {
    currentProduct = null;
    currentSheet = null;
    elements.sheetSelect.innerHTML = '<option value="">-- Seleccionar hoja --</option>';
    elements.activeSheetTitle.textContent = 'Sin producto seleccionado';
    elements.tableWrapper.innerHTML = '';
    elements.refreshDataBtn.disabled = true;
    setStatus('Selecciona un producto para ver sus hojas.');
    return;
  }

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
  elements.resumenAvanceStatus.textContent = 'Cargando...';
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
    elements.seguimientoStatus.textContent = "Cargando...";
    currentSeguimientoGrid = [];
    currentSeguimientoIsEditMode = false;
    currentSeguimientoPendingChanges.clear();
    currentSeguimientoValidationMap.clear();
    currentSeguimientoDraftRows = [];
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
  currentSeguimientoPage = 1;
  currentSeguimientoIsEditMode = false;
  currentSeguimientoPendingChanges.clear();
  currentSeguimientoValidationMap.clear();
  currentSeguimientoDraftRows = [];
  elements.seguimientoSheetTitle.textContent = `Seguimiento de Comisiones — ${currentSeguimientoSheet}`;
  fetchSeguimientoSheetData();
}

async function fetchSeguimientoSheetData() {
  if (!currentSeguimientoSheet) return;

  elements.seguimientoStatus.textContent = 'Cargando...';
  elements.seguimientoStatus.style.color = '#334155';

  try {
    const res = await authFetch(`${API_BASE_URL}/api/sheetdata?spreadsheetId=${seguimientoSheetConfig.id}&sheetName=${encodeURIComponent(currentSeguimientoSheet)}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    const rawGrid = buildGridFromSheet(data, tableRange);
    const headerRowCount = getSeguimientoHeaderRowCount(rawGrid);
    const grid = filterEmptyColumns(prepareGridForEditing(rawGrid, headerRowCount));

    if (grid.length) {
      currentSeguimientoGrid = grid;
      renderSeguimientoTable(grid);
      return;
    }

    currentSeguimientoGrid = [];
    renderSeguimientoTable([]);
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
  elements.gestionStatus.textContent = 'Cargando...';
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
    currentGestionProduct = '';
    elements.gestionProductoSelect.value = '';
    renderGestionLinks();
  } catch (err) {
    console.error('Error loadGestionComisionesData:', err.message);
    elements.gestionStatus.textContent = `Error al leer datos: ${err.message}`;
    elements.gestionStatus.style.color = '#b91c1c';
    elements.gestionLinksWrapper.innerHTML = '';
  }
}

async function loadDetalleIndicadoresData() {
  if (!hasAccessToSection('detalle-indicadores')) return;

  elements.detalleIndicadoresTitle.textContent = detalleIndicadoresConfig.nombre;
  elements.detalleIndicadoresStatus.textContent = 'Cargando...';
  elements.detalleIndicadoresStatus.style.color = '#334155';
  elements.detalleIndicadoresWrapper.innerHTML = '';

  try {
    const data = await fetchSingleSheetData(detalleIndicadoresConfig.id, detalleIndicadoresConfig.sheetName);
    const grid = filterEmptyColumns(buildGridFromSheet(data, tableRange));
    const headerInfo = findHeaderColumnsByLabels(grid, ['producto', 'esquema']);

    if (!headerInfo) {
      throw new Error('No se encontraron las columnas producto y esquema en DETALLE_INDICADORES.');
    }

    currentDetalleIndicadoresGrid = grid;
    currentDetalleIndicadoresHeaderInfo = headerInfo;
    renderDetalleIndicadoresFilters(grid, headerInfo);
    renderDetalleIndicadoresTable();
  } catch (err) {
    console.error('Error loadDetalleIndicadoresData:', err.message);
    elements.detalleIndicadoresStatus.textContent = `Error al leer datos: ${err.message}`;
    elements.detalleIndicadoresStatus.style.color = '#b91c1c';
    elements.detalleIndicadoresWrapper.innerHTML = '';
  }
}

async function loadLinksInteresData() {
  if (!hasAccessToSection('links-interes')) return;

  elements.linksInteresTitle.textContent = linksInteresConfig.nombre;
  elements.linksInteresStatus.textContent = 'Cargando...';
  elements.linksInteresStatus.style.color = '#334155';
  elements.linksInteresWrapper.innerHTML = '';

  try {
    const data = await fetchSingleSheetData(linksInteresConfig.id, linksInteresConfig.sheetName);
    const grid = filterEmptyColumns(buildGridFromSheet(data, tableRange));
    const items = buildLinksInteresItems(grid);

    currentLinksInteresItems = items;
    currentLinksInteresPage = 1;

    if (!items.length) {
      elements.linksInteresStatus.textContent = 'No se encontraron links visibles en LINK_DE_INTERES.';
      return;
    }

    renderLinksInteresProductOptions(items);
    renderLinksInteresActionOptions(items);
    renderLinksInteresCards();
  } catch (err) {
    console.error('Error loadLinksInteresData:', err.message);
    elements.linksInteresStatus.textContent = `Error al leer datos: ${err.message}`;
    elements.linksInteresStatus.style.color = '#b91c1c';
    elements.linksInteresWrapper.innerHTML = '';
  }
}

async function loadAvanceComisionesData() {
  if (!hasAccessToSection('avance-comisiones')) return;

  elements.avanceComisionesTitle.textContent = avanceComisionesConfig.nombre;
  elements.avanceComisionesStatus.textContent = 'Cargando...';
  elements.avanceComisionesStatus.style.color = '#334155';
  elements.avanceComisionesWrapper.innerHTML = '';

  try {
    if (!avanceComisionesConfig.id) {
      const resp = await authFetch(`${API_BASE_URL}/api/avance-comisiones-id`);
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => null);
        throw new Error(errBody?.error || `Error ${resp.status} al obtener el archivo de cronograma.`);
      }
      const { spreadsheetId } = await resp.json();
      avanceComisionesConfig.id = spreadsheetId;
    }

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

    const detailGrid = buildAvanceDetailGrid(data);
    renderAvanceComisionesSummary(summary, detailGrid);
  } catch (err) {
    console.error('Error loadAvanceComisionesData:', err.message);
    elements.avanceComisionesStatus.textContent = `Error al leer datos: ${err.message}`;
    elements.avanceComisionesStatus.style.color = '#b91c1c';
    elements.avanceComisionesWrapper.innerHTML = '';
  }
}

// ── Organigrama: tabla plana ─────────────────────────────────
// Columnas esperadas en el sheet (en cualquier orden):
//   Producto | PO | Dominio | Subdominio | Perfil | Canal | Area
// Cada fila representa un perfil (hoja del árbol).
// El árbol se reconstruye agrupando los valores únicos de izquierda a derecha.

function parseOrgFlat(grid) {
  if (grid.length < 2) return [];
  const header = grid[0];
  let productoCol = -1, poCol = -1, dominioCol = -1, subdominioCol = -1,
      perfilCol = -1, canalCol = -1, areaCol = -1;

  header.forEach((cell, i) => {
    const label = String(cell?.text || '').trim().toUpperCase().replace(/[\s_\-]/g, '');
    if (label === 'PRODUCTO') productoCol = i;
    if (label === 'PO') poCol = i;
    if (label === 'DOMINIO') dominioCol = i;
    if (label === 'SUBDOMINIO') subdominioCol = i;
    if (label === 'PERFIL') perfilCol = i;
    if (label === 'CANAL') canalCol = i;
    if (label === 'AREA' || label === 'ÁREA') areaCol = i;
  });

  const get = (row, col) => col >= 0 ? String(row[col]?.text || '').trim() : '';

  return grid.slice(1)
    .map(row => ({
      producto:   get(row, productoCol),
      po:         get(row, poCol),
      dominio:    get(row, dominioCol),
      subdominio: get(row, subdominioCol),
      perfil:     get(row, perfilCol),
      canal:      get(row, canalCol),
      area:       get(row, areaCol),
    }))
    .filter(r => r.producto); // al menos Producto debe estar presente
}

function buildOrgTreeFromFlat(rows) {
  const root = { name: 'HOLDING', tipoNodo: 'root', children: [] };
  const seen = new Map([['_root_', root]]);

  function getOrCreate(key, name, tipoNodo, parent, extra) {
    if (!seen.has(key)) {
      const node = Object.assign({ name, tipoNodo, children: [] }, extra);
      seen.set(key, node);
      parent.children.push(node);
    }
    return seen.get(key);
  }

  rows.forEach(r => {
    let node = root;
    if (r.producto)
      node = getOrCreate(`P|${r.producto}`, r.producto, 'producto', node);
    if (r.po)
      node = getOrCreate(`PO|${r.producto}|${r.po}`, r.po, 'po', node);
    if (r.dominio)
      node = getOrCreate(`D|${r.producto}|${r.po}|${r.dominio}`, r.dominio, 'dominio', node);
    if (r.subdominio)
      node = getOrCreate(`S|${r.producto}|${r.po}|${r.dominio}|${r.subdominio}`, r.subdominio, 'subdominio', node);
    if (r.perfil)
      node = getOrCreate(
        `F|${r.producto}|${r.po}|${r.dominio}|${r.subdominio}|${r.perfil}`,
        r.perfil, 'perfil', node
      );
    if (r.canal)
      node = getOrCreate(
        `C|${r.producto}|${r.po}|${r.dominio}|${r.subdominio}|${r.perfil}|${r.canal}`,
        r.canal, 'canal', node
      );
    if (r.area)
      getOrCreate(
        `A|${r.producto}|${r.po}|${r.dominio}|${r.subdominio}|${r.perfil}|${r.canal}|${r.area}`,
        r.area, 'area', node
      );
  });

  return root;
}

function renderOrgNode(node) {
  const li = document.createElement('li');

  const box = document.createElement('div');
  box.className = `org-node org-node-${node.tipoNodo}`;
  const match = node.name.match(/^(.*?)\s*(\(.*\))\s*$/s);
  if (match) {
    box.appendChild(document.createTextNode(match[1]));
    box.appendChild(document.createElement('br'));
    box.appendChild(document.createTextNode(match[2]));
  } else {
    box.textContent = node.name;
  }
  li.appendChild(box);

  if (node.children.length) {
    const allLeaves = node.children.every(c => c.children.length === 0);
    const ul = document.createElement('ul');
    if (allLeaves) ul.classList.add('is-vertical');
    node.children.forEach(child => ul.appendChild(renderOrgNode(child)));
    li.appendChild(ul);
  }

  return li;
}

function alignVerticalSpines(wrapper) {
  const ARM = 24; // px, igual a 1.5rem
  wrapper.querySelectorAll('.org-chart ul.is-vertical').forEach(ul => {
    const parentNode = ul.parentElement?.querySelector(':scope > .org-node');
    if (!parentNode) return;
    const nodeRect = parentNode.getBoundingClientRect();
    const ulRect = ul.getBoundingClientRect();
    // spineX0: distancia del borde izq del ul al centro del nodo padre
    const spineX0 = Math.max(0, nodeRect.left + nodeRect.width / 2 - ulRect.left);
    // Al cambiar padding-left, el ul se recentra: la espina queda en 2*spineX0 del nuevo borde izq
    ul.style.paddingLeft = (2 * spineX0 + ARM) + 'px';
    ul.style.setProperty('--vspine-x', (2 * spineX0) + 'px');
  });
}

function renderOrgChart(root, wrapper) {
  const existing = wrapper.querySelector('.org-chart-wrap');
  if (existing) existing.remove();
  if (!root || !root.children.length) return;
  const wrap = document.createElement('div');
  wrap.className = 'org-chart-wrap';
  const chart = document.createElement('div');
  chart.className = 'org-chart';
  const ul = document.createElement('ul');
  ul.appendChild(renderOrgNode(root));
  chart.appendChild(ul);
  wrap.appendChild(chart);
  wrapper.appendChild(wrap);
  requestAnimationFrame(() => alignVerticalSpines(wrapper));
}

function renderOrganigrama(allRows, wrapper, statusEl) {
  wrapper.innerHTML = '';
  if (!allRows.length) {
    statusEl.textContent = 'No se encontraron datos en la hoja.';
    return;
  }

  // Filtro por producto
  const products = [...new Set(allRows.map(r => r.producto).filter(Boolean))].sort();
  if (products.length > 1) {
    const bar = document.createElement('div');
    bar.className = 'org-filter-bar';
    const label = document.createElement('label');
    label.className = 'org-filter-label';
    label.textContent = 'Producto:';
    const select = document.createElement('select');
    select.className = 'org-filter-select';
    [{ value: '', text: 'Todos' }, ...products.map(p => ({ value: p, text: p }))].forEach(({ value, text }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = text;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      const sel = select.value;
      const filtered = sel ? allRows.filter(r => r.producto === sel) : allRows;
      renderOrgChart(buildOrgTreeFromFlat(filtered), wrapper);
    });
    bar.appendChild(label);
    bar.appendChild(select);
    wrapper.appendChild(bar);
  }

  renderOrgChart(buildOrgTreeFromFlat(allRows), wrapper);
  statusEl.textContent = '';
}

async function loadOrganigramaData() {
  if (!hasAccessToSection('organigrama')) return;
  elements.organigramaTitle.textContent = organigramaConfig.nombre;
  elements.organigramaStatus.textContent = 'Cargando...';
  elements.organigramaStatus.style.color = '#334155';
  elements.organigramaWrapper.innerHTML = '';
  try {
    const data = await fetchSingleSheetData(organigramaConfig.id, organigramaConfig.sheetName);
    const grid = filterEmptyColumns(buildGridFromSheet(data, tableRange));
    const rows = parseOrgFlat(grid);
    if (!rows.length) {
      elements.organigramaStatus.textContent = 'No se encontraron datos. Verificá que la hoja "ORGANIGRAMA_COMISIONAL" tenga las columnas: Producto | PO | Dominio | Subdominio | Perfil | Canal | Area';
      return;
    }
    renderOrganigrama(rows, elements.organigramaWrapper, elements.organigramaStatus);
  } catch (err) {
    console.error('Error loadOrganigramaData:', err.message);
    elements.organigramaStatus.textContent = `Error al leer datos: ${err.message}`;
    elements.organigramaStatus.style.color = '#b91c1c';
    elements.organigramaWrapper.innerHTML = '';
  }
}

async function loadOrganigramaBaData() {
  if (!hasAccessToSection('organigrama-ba')) return;
  elements.organigramaBaTitle.textContent = organigramaBaConfig.nombre;
  elements.organigramaBaStatus.textContent = 'Cargando...';
  elements.organigramaBaStatus.style.color = '#334155';
  elements.organigramaBaWrapper.innerHTML = '';
  try {
    const data = await fetchSingleSheetData(organigramaBaConfig.id, organigramaBaConfig.sheetName);
    const grid = filterEmptyColumns(buildGridFromSheet(data, tableRange));
    const rows = parseOrgFlat(grid);
    if (!rows.length) {
      elements.organigramaBaStatus.textContent = 'No se encontraron datos. Verificá que la hoja "ORGANIGRAMA_BA" tenga las columnas: Producto | PO | Dominio | Subdominio | Perfil | Canal | Area';
      return;
    }
    renderOrganigrama(rows, elements.organigramaBaWrapper, elements.organigramaBaStatus);
  } catch (err) {
    console.error('Error loadOrganigramaBaData:', err.message);
    elements.organigramaBaStatus.textContent = `Error al leer datos: ${err.message}`;
    elements.organigramaBaStatus.style.color = '#b91c1c';
    elements.organigramaBaWrapper.innerHTML = '';
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

  if (sectionId === 'detalle-indicadores') {
    loadDetalleIndicadoresData();
    return;
  }

  if (sectionId === 'links-interes') {
    loadLinksInteresData();
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
    return;
  }

  if (sectionId === 'organigrama') {
    loadOrganigramaData();
    return;
  }

  if (sectionId === 'organigrama-ba') {
    loadOrganigramaBaData();
    return;
  }

  if (sectionId === 'config-aps') {
    loadCorreoEsquemas();
  }
}

function init() {
  clearStoredAuthToken();
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
  elements.detalleIndicadoresProductoSelect.addEventListener("change", (e) => {
    currentDetalleIndicadoresProduct = e.target.value;
    currentDetalleIndicadoresPage = 1;
    if (currentDetalleIndicadoresHeaderInfo && currentDetalleIndicadoresGrid.length) {
      renderDetalleIndicadoresFilters(currentDetalleIndicadoresGrid, currentDetalleIndicadoresHeaderInfo);
    }
    renderDetalleIndicadoresTable();
  });
  elements.detalleIndicadoresEsquemaSelect.addEventListener("change", (e) => {
    currentDetalleIndicadoresEsquema = e.target.value;
    currentDetalleIndicadoresPage = 1;
    renderDetalleIndicadoresTable();
  });
  elements.detalleIndicadoresSearchInput.addEventListener("input", (e) => {
    currentDetalleIndicadoresSearch = e.target.value;
    currentDetalleIndicadoresPage = 1;
    renderDetalleIndicadoresTable();
  });
  elements.detalleIndicadoresRefreshBtn.addEventListener("click", loadDetalleIndicadoresData);
  elements.linksInteresProductoSelect.addEventListener("change", (e) => {
    currentLinksInteresProduct = e.target.value;
    currentLinksInteresPage = 1;
    renderLinksInteresCards();
  });
  elements.linksInteresAccionSelect.addEventListener("change", (e) => {
    currentLinksInteresAction = e.target.value;
    currentLinksInteresPage = 1;
    renderLinksInteresCards();
  });
  elements.linksInteresSearchInput.addEventListener("input", (e) => {
    currentLinksInteresSearch = e.target.value;
    currentLinksInteresPage = 1;
    renderLinksInteresCards();
  });
  elements.linksInteresRefreshBtn.addEventListener("click", loadLinksInteresData);
  elements.avanceComisionesRefreshBtn.addEventListener("click", loadAvanceComisionesData);
  elements.organigramaRefreshBtn.addEventListener("click", loadOrganigramaData);
  elements.organigramaBaRefreshBtn.addEventListener("click", loadOrganigramaBaData);
  elements.correoProductoSelect.addEventListener("change", filterCorreoEsquemas);
  elements.correoValidarBtn.addEventListener("click", validarCorreo);
  elements.correoLimpiarBtn.addEventListener("click", limpiarCorreo);
  elements.correoEjecutarBtn.addEventListener("click", ejecutarCorreo);
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
