// ================================================================
// CONSOLIDADO KPI — Generador de Consolidado (web de comisiones)
//
// Único archivo a mantener: lee la plantilla (hojas CALCULO_* y BD_EQUIPO), arma el
// consolidado (detalle KPI + EVOLUTIVO) y lo pega en el archivo destino. Las plantillas
// no llevan scripts. Va en el mismo proyecto que doPost.gs, que llama a:
//
//   consolidado-preview → lee la plantilla y devuelve KPI + EVOLUTIVO tal como se van a
//                         pegar, más errores, avisos y resumen. No escribe nada.
//   consolidado-pegar   → vuelve a leer la plantilla, escribe su hoja CONSOLIDADO y agrega
//                         las filas al final de KPI y EVOLUTIVO del archivo destino
//                         (mismo formato que el Colab TRASLADO_EVOLUTIVO_KPI).
//                         No revisa si ese período ya se había pegado antes.
//
// Validaciones: se detiene si hay #REF!/#N/A… en META, REAL, % o COMISIÓN; avisa (y deja
// continuar) si un nombre no está en BD_EQUIPO, si los pesos no suman 100 %, si falta la
// comisión o si una hoja no se reconoce. El NOMBRE que se escribe es el de BD_EQUIPO.
//
// FORMATO H (equipo, horizontal): una fila por persona, un bloque de columnas por KPI.
//     PESO      |        | 15%              | 15%              | ...
//     INDICADOR |        | INDICADOR 1      | INDICADOR 2      | ...
//               | NOMBRE | META | REAL | %  | META | REAL | %  | ... | COMISIÓN
//   Si la fila INDICADOR está vacía, cada META nueva abre un KPI.
//
// FORMATO V (una persona, vertical): una fila por KPI.
//     NOMBRE    | <nombre de la persona>
//     INDICADOR | PESO | META | REAL | %
//     <KPI>     | 65%  | ...  | ...  | ...
//     VARIABLE  | 6000             (opcional)
//     COMISIÓN  | 1206             (o "COMISIÓN FINAL" / "TOTAL COMISIÓN")
//     OBSERVACIONES | ...          (opcional)
//   El bloque se puede repetir en la misma hoja para varias personas.
//
// La cantidad de KPIs y en qué columna/fila está cada cosa no importan: todo se ubica
// por etiquetas. Nombres de hojas, etiquetas, encabezados de BD_EQUIPO y nombres de
// personas se comparan sin importar mayúsculas, tildes, espacios de más ni ":" al final.
// Hojas de cálculo: las que empiezan con CALCULO (CALCULO_X, "Cálculo X" o solo "Cálculo").
//
// COMISION_100:
//   formato H (equipos)     → COMISION de BD_EQUIPO de cada persona; si está vacía, la
//                             columna VARIABLE de la fila o la etiqueta VARIABLE de la hoja.
//   formato V (una persona) → la etiqueta VARIABLE del bloque, si tiene un monto; si no
//                             (p. ej. comisión por rangos), COMISION de BD_EQUIPO.
// ================================================================

const CONSOLIDADO_DESTINO_ID = '10cnP7epXBiDrhVKfMy73A0jDqnp7ruiDWRFLmY4tkXw';
const CONSOLIDADO_HOJA_KPI = 'KPI';
const CONSOLIDADO_HOJA_EVOLUTIVO = 'EVOLUTIVO';

const ENCABEZADOS_KPI = ['PERIODO', 'Q', 'NOMBRE', 'DNI', 'CARGO', 'PRODUCTO', 'AREA', 'SUB_AREA', 'ZONA',
  'KPI', 'VALOR_KPI', 'META', 'CUMPLIMIENTO', 'PORC_FINAL', 'PESO', 'TOTAL'];
const ENCABEZADOS_EVOLUTIVO = ['PERIODO', 'NOMBRE', 'VALIDACION_NOMBRES', 'DNI', 'CARGO', 'TOTAL_COMISION',
  'ASEGURABLE', 'SODEXO', 'COMISION_GDP', 'PRODUCTO', 'AREA', 'SUB_AREA', 'ZONA', 'ENVIADO_A', 'ESTADO',
  'OBSERVACIONES', 'COMISION_100'];

// Etiquetas que se reconocen (sin tildes, en mayúsculas). En listas con varias,
// la primera que aparece en la hoja es la que se usa.
const ETIQUETAS = {
  nombre: ['NOMBRE'],
  indicador: ['INDICADOR', 'KPI'],
  peso: ['PESO'],
  meta: ['META'],
  real: ['REAL'],
  porc: ['%', '% FINAL', 'PORC_FINAL', 'PORC FINAL', 'CUMPLIMIENTO X INDICADOR', 'CUMPLIMIENTO FINAL', 'CUMPLIMIENTO'],
  comision: ['TOTAL COMISION', 'COMISION FINAL', 'RESULTADO COMISION', 'COMISION'],
  variable: ['VARIABLE', 'COMISION 100', 'COMISION_100', 'COMISION AL 100%'],
  observaciones: ['OBSERVACIONES', 'OBSERVACION'],
  finTabla: ['CUMPLIMIENTO TOTAL', 'CUMPLIMIENTO TOTAL DEL TRIMESTRE', 'TOTAL', 'CPTO FINAL'],
};


// =========================
// 📥 FORMATO H (horizontal)
// =========================
function leerHorizontal_(datos, fmts) {
  // Encabezado: fila con NOMBRE (o "NOMBRE ASESOR", etc.) y al menos un META, dentro de las 30 primeras
  const colNombre = fila => {
    const exacta = buscarColumna_(fila, ETIQUETAS.nombre);
    return exacta !== -1 ? exacta : fila.findIndex(v => normalizarTexto_(v).includes('NOMBRE'));
  };
  const rEnc = datos.findIndex((fila, r) => r < 30 && colNombre(fila) !== -1 &&
    fila.some(v => normalizarTexto_(v).includes('META')));
  if (rEnc < 1) return null;


  const enc = datos[rEnc], filaInd = datos[rEnc - 1], filaPeso = datos[rEnc - 2] || [];
  const cNombre = colNombre(enc);
  const cComision = buscarColumnaComision_(enc);
  const cVariable = buscarColumna_(enc, ETIQUETAS.variable);
  const cObs = buscarColumna_(enc, ETIQUETAS.observaciones);
  const limite = cComision !== -1 ? cComision : enc.length;
  const avisos = [];
  if (cComision === -1) avisos.push('no hay columna COMISIÓN en el encabezado.');


  // Bloques de KPI: empiezan donde la fila INDICADOR tiene un nombre o, si esa fila
  // está vacía, en cada columna META nueva
  const kpis = [];
  let actual = null;
  for (let c = cNombre + 1; c < limite; c++) {
    const ind = normalizarTexto_(filaInd[c]);
    const h = normalizarTexto_(enc[c]);
    const conNombre = ind && !ETIQUETAS.indicador.includes(ind);
    if (conNombre || (h.includes('META') && (!actual || actual.meta !== -1))) {
      actual = { kpi: conNombre ? String(filaInd[c]).trim() : '', cols: [], meta: -1, real: -1, porc: [] };
      kpis.push(actual);
    }
    if (!actual) continue;
    actual.cols.push(c);
    if (h.includes('META') && actual.meta === -1) actual.meta = c;
    else if (ETIQUETAS.real.includes(h) && actual.real === -1) actual.real = c;
    else if (ETIQUETAS.porc.includes(h)) actual.porc.push(c);
  }
  // Solo son KPI los bloques con REAL (BASE DE PAGO, DETALLE, etc. se ignoran)
  const validos = kpis.filter(k => k.real !== -1).map((k, i) => ({
    ...k,
    kpi: k.kpi || `KPI ${i + 1}`,
    peso: (k.cols.map(c => filaPeso[c]).find(v => !vacio_(v))),
    porc: elegirPorPrioridad_(k.porc, enc, ETIQUETAS.porc),
  }));
  if (!validos.length) return null;
  validos.filter((k, i) => !kpis.filter(x => x.real !== -1)[i].kpi)
    .forEach(k => avisos.push(`falta el nombre del KPI en la fila INDICADOR (columna ${letraColumna_(k.cols[0] + 1)}); se usa "${k.kpi}".`));
  validos.filter(k => k.porc === -1).forEach(k => avisos.push(`el KPI "${k.kpi}" no tiene columna % (se toma 0).`));


  const personas = [];
  let vacias = 0;
  for (let i = rEnc + 1; i < datos.length; i++) {
    const fila = datos[i];
    if (fila.every(vacio_)) { if (++vacias >= 2) break; continue; }
    vacias = 0;
    const nombre = fila[cNombre];
    if (vacio_(nombre) || ETIQUETAS.finTabla.includes(normalizarTexto_(nombre))) continue;
    personas.push({
      nombre: String(nombre).trim(), fila: i + 1,
      comision: cComision !== -1 ? fila[cComision] : '',
      comision100: cVariable !== -1 ? fila[cVariable] : '',
      observaciones: cObs !== -1 ? fila[cObs] : '',
      kpis: validos.map(k => ({
        kpi: k.kpi, peso: k.peso,
        meta: k.meta !== -1 ? fila[k.meta] : '', real: fila[k.real], porc: k.porc !== -1 ? fila[k.porc] : '',
        formato: fmts[i][k.real],
      })),
    });
  }
  return {
    formato: 'H (horizontal)', horizontal: true, personas, avisos,
    variable: buscarEtiquetaEnHoja_(datos, ETIQUETAS.variable),
  };
}


// =========================
// 📥 FORMATO V (vertical)
// =========================
function leerVertical_(datos, fmts) {
  // Cada fila con INDICADOR + META + REAL es el encabezado de un bloque (una persona)
  const tablas = [];
  datos.forEach((fila, r) => {
    const col = {
      ind: buscarColumna_(fila, ETIQUETAS.indicador), peso: buscarColumna_(fila, ETIQUETAS.peso),
      meta: buscarColumna_(fila, ETIQUETAS.meta), real: buscarColumna_(fila, ETIQUETAS.real),
      porc: buscarColumna_(fila, ETIQUETAS.porc),
    };
    if (col.ind === -1 || col.meta === -1 || col.real === -1) return;
    let fin = r + 1;
    while (fin < datos.length && !vacio_(datos[fin][col.ind]) &&
      !esEtiquetaFinal_(datos[fin][col.ind])) fin++;
    tablas.push({ enc: r, fin, col });
  });
  if (!tablas.length) return null;


  // Inicio de cada bloque: la etiqueta NOMBRE más cercana sobre su tabla
  tablas.forEach((t, k) => {
    const desde = k ? tablas[k - 1].fin : 0;
    t.inicio = desde;
    t.nombre = '';
    for (let r = t.enc - 1; r >= desde; r--) {
      const c = buscarColumna_(datos[r], ETIQUETAS.nombre);
      if (c !== -1 && !vacio_(valorALaDerecha_(datos[r], c))) { t.inicio = r; t.nombre = valorALaDerecha_(datos[r], c); break; }
    }
  });


  const avisos = [];
  const personas = [];
  tablas.forEach((t, k) => {
    const hasta = k + 1 < tablas.length ? tablas[k + 1].inicio : datos.length;
    // Etiquetas del bloque, fuera de las filas de la tabla
    const filasBloque = datos.slice(t.inicio, hasta).filter((_, i) => {
      const r = t.inicio + i;
      return r < t.enc || r >= t.fin;
    });
    if (vacio_(t.nombre)) {
      avisos.push(`el bloque de la fila ${t.enc + 1} no tiene la etiqueta NOMBRE con el nombre a la derecha (se omitió).`);
      return;
    }
    if (t.col.porc === -1) avisos.push(`el bloque de ${t.nombre} no tiene columna % (se toma 0).`);
    const kpis = [];
    for (let r = t.enc + 1; r < t.fin; r++) {
      const fila = datos[r];
      kpis.push({
        kpi: String(fila[t.col.ind]).trim(),
        peso: t.col.peso !== -1 ? fila[t.col.peso] : '',
        meta: fila[t.col.meta], real: fila[t.col.real],
        porc: t.col.porc !== -1 ? fila[t.col.porc] : '',
        formato: fmts[r][t.col.real],
      });
    }
    personas.push({
      nombre: String(t.nombre).trim(), fila: t.enc + 1, kpis,
      comision: buscarEtiquetaEnHoja_(filasBloque, ETIQUETAS.comision, ETIQUETAS.variable),
      comision100: buscarEtiquetaEnHoja_(filasBloque, ETIQUETAS.variable),
      observaciones: buscarEtiquetaEnHoja_(filasBloque, ETIQUETAS.observaciones),
    });
  });
  if (!personas.length && !avisos.length) return null;
  return { formato: 'V (vertical)', horizontal: false, personas, avisos, variable: '' };
}


// =========================
// 🔧 AUXILIARES DE LECTURA
// =========================
function leerEquipo_(ss) {
  const sh = buscarHoja_(ss, ['BD_EQUIPO', 'BD_EQUIPOS', 'BD EQUIPO', 'BD EQUIPOS']);
  if (!sh) return null;
  const datos = sh.getDataRange().getValues();
  const enc = datos[0].map(normalizarTexto_);
  const col = nombres => { for (const n of nombres) { const i = enc.indexOf(n); if (i !== -1) return i; } return -1; };
  const idx = {
    nombre: col(['NOMBRE']), dni: col(['DNI', 'DNI/DOC', 'DOC']), cargo: col(['CARGO']), producto: col(['PRODUCTO']),
    area: col(['AREA']), subarea: col(['SUBAREA', 'SUB AREA', 'SUB_AREA']), zona: col(['ZONA']),
    comision: col(['COMISION', 'COMISION_100', 'COMISION 100']),
  };
  const v = (fila, k) => idx[k] !== -1 ? fila[idx[k]] : '';
  const porNombre = {};
  datos.slice(1).forEach(fila => {
    if (vacio_(v(fila, 'nombre'))) return;
    porNombre[normalizarTexto_(v(fila, 'nombre'))] = {
      nombre: String(v(fila, 'nombre')).trim(), dni: v(fila, 'dni'), cargo: v(fila, 'cargo'), producto: v(fila, 'producto'), area: v(fila, 'area'),
      subarea: v(fila, 'subarea'), zona: v(fila, 'zona'), comision: v(fila, 'comision'),
    };
  });
  return { porNombre };
}


function normalizarTexto_(v) {
  return String(v === null || v === undefined ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/\s+/g, ' ').replace(/[\s:]+$/, '').trim();
}


function vacio_(v) { return v === '' || v === null || v === undefined; }


// Hojas de cálculo: CALCULO_X, "Cálculo X", "calculo-x" o solo "Cálculo" (sin importar mayúsculas ni tildes)
function hojasCalculo_(ss) {
  return ss.getSheets().filter(sh => /^CALCULO([\s_-]|$)/.test(normalizarTexto_(sh.getName())));
}


// Hoja por nombre, sin importar mayúsculas, tildes, espacios ni guiones bajos
function buscarHoja_(ss, nombres) {
  const clave = n => normalizarTexto_(n).replace(/[\s_-]/g, '');
  const buscadas = nombres.map(clave);
  return ss.getSheets().find(sh => buscadas.includes(clave(sh.getName()))) || null;
}


// Monto válido para COMISION_100: número (o texto numérico) mayor a 0
function montoValido_(v) {
  if (typeof v === 'number') return v > 0;
  const n = parseFloat(String(v === null || v === undefined ? '' : v).replace(/[^\d.,-]/g, '').replace(',', '.'));
  return !isNaN(n) && n > 0;
}


function comision100_(p, leido, bd) {
  const bdCom = bd ? bd.comision : '';
  if (leido.horizontal) {  // formato H (equipos): primero BD_EQUIPO
    if (montoValido_(bdCom)) return bdCom;
    if (montoValido_(p.comision100)) return p.comision100;
    return montoValido_(leido.variable) ? leido.variable : bdCom;
  }
  return montoValido_(p.comision100) ? p.comision100 : bdCom;  // formato V
}


function letraColumna_(n) { let s = ''; while (n) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; }


function esError_(v) { return typeof v === 'string' && /^#(REF!|N\/A|VALUE!|DIV\/0!|NAME\?|NUM!|NULL!|ERROR!)/.test(v); }


function esEtiquetaFinal_(v) {
  const t = normalizarTexto_(v);
  return [...ETIQUETAS.finTabla, ...ETIQUETAS.comision, ...ETIQUETAS.variable, ...ETIQUETAS.observaciones].includes(t);
}


// Primera columna de la fila cuya etiqueta coincide, respetando el orden de prioridad
function buscarColumna_(fila, etiquetas) {
  const textos = fila.map(normalizarTexto_);
  for (const e of etiquetas) { const i = textos.indexOf(e); if (i !== -1) return i; }
  return -1;
}


function buscarColumnaComision_(fila) {
  const exacta = buscarColumna_(fila, ETIQUETAS.comision);
  if (exacta !== -1) return exacta;
  return fila.findIndex(v => { const t = normalizarTexto_(v); return t.includes('COMISION') && !t.includes('100'); });
}


function elegirPorPrioridad_(cols, fila, etiquetas) {
  if (!cols.length) return -1;
  return cols.slice().sort((a, b) => etiquetas.indexOf(normalizarTexto_(fila[a])) - etiquetas.indexOf(normalizarTexto_(fila[b])))[0];
}


// Primer valor no vacío a la derecha (salta celdas combinadas)
function valorALaDerecha_(fila, c) {
  for (let j = c + 1; j < fila.length; j++) if (!vacio_(fila[j])) return fila[j];
  return '';
}


// Valor a la derecha de la primera etiqueta encontrada (por prioridad) en un grupo de filas
function buscarEtiquetaEnHoja_(filas, etiquetas, excluir) {
  for (const e of etiquetas) {
    if (excluir && excluir.includes(e)) continue;
    for (const fila of filas) {
      const c = fila.map(normalizarTexto_).indexOf(e);
      if (c !== -1) return valorALaDerecha_(fila, c);
    }
  }
  return '';
}


function aPorcentaje_(v) {
  if (vacio_(v)) return 0;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace('%', '').replace(',', '.'));
  return isNaN(n) ? 0 : n / 100;
}


function tipoDato_(formato) {
  if (!formato) return '';
  const f = formato.toUpperCase();
  if (f.includes('%')) return 'PORCENTAJE';
  if (f.includes('S/') || f.includes('$')) return 'MONEDA';
  return 'NUMERICO';
}


function valorMeta_(v) {
  return Object.prototype.toString.call(v) === '[object Date]'
    ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM') : v;
}


function periodoMesAnterior_() {
  const hoy = new Date();
  const f = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
}


// =========================
// 🌐 ACCIONES WEB
// =========================
function Consolidado_Preview(data) {
  const ss = abrirPlantilla_(data.idArchivo);
  const c = construirConsolidado_(ss);
  if (c.error) return jsonOutput({ ok: false, error: c.error });

  const kpi = prepararKpiDestino_(c);
  const evo = prepararEvolutivoDestino_(c);

  return jsonOutput({
    ok: true,
    archivo: ss.getName(),
    periodo: periodoTexto_(c.periodo),
    errores: c.errores,
    avisos: c.avisos,
    resumen: c.resumen,
    kpi: { encabezados: ENCABEZADOS_KPI, filas: vistaFilas_(kpi.valores, kpi.pct) },
    evolutivo: { encabezados: ENCABEZADOS_EVOLUTIVO, filas: vistaFilas_(evo.valores, null, 8) }
  });
}

function Consolidado_Pegar(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000); // evita que dos pegados simultáneos calculen la misma fila de inicio
  try {
    const ss = abrirPlantilla_(data.idArchivo);
    const c = construirConsolidado_(ss);
    if (c.error) return jsonOutput({ ok: false, error: c.error });
    if (c.errores.length) return jsonOutput({ ok: false, error: 'La plantilla tiene celdas con error. Vuelve a validar.' });
    if (!c.filasKpi.length && !c.filasEvo.length) return jsonOutput({ ok: false, error: 'No hay filas para pegar.' });

    const destino = SpreadsheetApp.openById(CONSOLIDADO_DESTINO_ID);
    const shKpi = destino.getSheetByName(CONSOLIDADO_HOJA_KPI);
    const shEvo = destino.getSheetByName(CONSOLIDADO_HOJA_EVOLUTIVO);
    if (!shKpi || !shEvo) {
      return jsonOutput({ ok: false, error: `El archivo destino no tiene las hojas ${CONSOLIDADO_HOJA_KPI} y ${CONSOLIDADO_HOJA_EVOLUTIVO}.` });
    }

    escribirConsolidado_(ss, c.filasKpi, c.formatos, c.filasEvo);
    const filaKpi = pegarKpi_(shKpi, prepararKpiDestino_(c));
    const filaEvo = pegarEvolutivo_(shEvo, prepararEvolutivoDestino_(c));
    SpreadsheetApp.flush();

    return jsonOutput({
      ok: true,
      pegado: true,
      periodo: periodoTexto_(c.periodo),
      filasKpi: c.filasKpi.length,
      filasEvolutivo: c.filasEvo.length,
      filaInicioKpi: filaKpi,
      filaInicioEvolutivo: filaEvo
    });
  } finally {
    lock.releaseLock();
  }
}

function abrirPlantilla_(id) {
  if (!id) throw new Error('Falta el ID de la plantilla.');
  try {
    return SpreadsheetApp.openById(id);
  } catch (err) {
    throw new Error('No se pudo abrir la plantilla. Verifica el link y que tengas acceso al archivo.');
  }
}

// =========================
// 🧮 ARMAR CONSOLIDADO
// Misma lógica que generarConsolidadoKPI() de las plantillas, sin ventanas: devuelve
// los errores y avisos para que la web los muestre.
// =========================
function construirConsolidado_(ss) {
  const equipo = leerEquipo_(ss);
  if (!equipo) return { error: 'No existe la hoja BD_EQUIPO.' };

  const periodo = periodoMesAnterior_();
  const errores = [], avisos = [], resumen = [];
  const filasKpi = [], formatos = [], evolutivo = {};

  const hojas = hojasCalculo_(ss);
  if (!hojas.length) return { error: 'No hay hojas CALCULO_* en este archivo.' };

  hojas.forEach(sh => {
    const hoja = sh.getName();
    const rango = sh.getDataRange();
    const datos = rango.getValues();
    const fmts = rango.getNumberFormats();

    const leido = leerHorizontal_(datos, fmts) || leerVertical_(datos, fmts);
    if (!leido) {
      avisos.push(`${hoja}: no se reconoció el formato (falta la fila NOMBRE/META/REAL o INDICADOR/META/REAL). Se omitió.`);
      return;
    }
    leido.avisos.forEach(a => avisos.push(`${hoja}: ${a}`));
    const nKpis = Math.max(0, ...leido.personas.map(p => p.kpis.length));
    resumen.push(`${hoja}: formato ${leido.formato} · ${nKpis} KPI(s) · ${leido.personas.length} persona(s)`);

    leido.personas.forEach(p => {
      const donde = `${hoja} (${p.nombre}, fila ${p.fila})`;
      const bd = equipo.porNombre[normalizarTexto_(p.nombre)];
      if (!bd) { avisos.push(`${donde}: no está en BD_EQUIPO, no se incluye.`); return; }
      if (evolutivo[normalizarTexto_(p.nombre)]) avisos.push(`${donde}: aparece en más de una hoja, se usa la última.`);

      // Validaciones de la persona
      [['COMISIÓN', p.comision], ...p.kpis.flatMap(k => [[`${k.kpi} META`, k.meta], [`${k.kpi} REAL`, k.real], [`${k.kpi} %`, k.porc]])]
        .forEach(([campo, v]) => { if (esError_(v)) errores.push(`${donde}, ${campo}: ${v}`); });
      if (vacio_(p.comision)) avisos.push(`${donde}: comisión vacía.`);
      const sumaPesos = p.kpis.reduce((s, k) => s + aPorcentaje_(k.peso), 0);
      if (p.kpis.length && Math.abs(sumaPesos - 1) > 0.0001) avisos.push(`${donde}: los pesos suman ${Math.round(sumaPesos * 10000) / 100} %.`);

      const dni = "'" + bd.dni;
      const nombre = bd.nombre || p.nombre; // el de BD_EQUIPO (sin espacios de más ni otra grafía)
      p.kpis.forEach(k => {
        const peso = aPorcentaje_(k.peso);
        filasKpi.push([periodo, '', nombre, dni, bd.cargo, bd.producto, bd.area, bd.subarea, bd.zona,
          k.kpi, tipoDato_(k.formato), valorMeta_(k.meta), k.real, k.porc, peso,
          Math.round(aPorcentaje_(k.porc) * peso * 10000) / 10000]);
        formatos.push(k.formato || '@');
      });

      const comision100 = comision100_(p, leido, bd);
      evolutivo[normalizarTexto_(p.nombre)] = [periodo, nombre, '', dni, bd.cargo, p.comision, '', '', '',
        bd.producto, bd.area, bd.subarea, bd.zona, 'kiichi', 'VIGENTE', p.observaciones || '', comision100];
    });
  });

  return { periodo, errores, avisos, resumen, filasKpi, formatos, filasEvo: Object.values(evolutivo) };
}

// =========================
// 📤 ESCRIBIR CONSOLIDADO EN LA PLANTILLA (igual que antes)
// =========================
function escribirConsolidado_(ss, filasKpi, formatos, filasEvo) {
  const sh = buscarHoja_(ss, ['CONSOLIDADO']) || ss.insertSheet('CONSOLIDADO');
  sh.clear();
  sh.getRange(1, 1, 1, ENCABEZADOS_KPI.length).setValues([ENCABEZADOS_KPI]).setFontWeight('bold');
  sh.setFrozenRows(1);
  if (filasKpi.length) {
    sh.getRange(2, 1, filasKpi.length, ENCABEZADOS_KPI.length).setValues(filasKpi);
    sh.getRange(2, 12, filasKpi.length, 2).setNumberFormats(formatos.map(f => [f, f])); // META y CUMPLIMIENTO
    sh.getRange(2, 14, filasKpi.length, 3).setNumberFormat('0.00%');            // PORC_FINAL, PESO, TOTAL
  }
  const inicioEvo = filasKpi.length + 4;
  sh.getRange(inicioEvo, 1).setValue('EVOLUTIVO').setFontWeight('bold');
  sh.getRange(inicioEvo + 1, 1, 1, ENCABEZADOS_EVOLUTIVO.length).setValues([ENCABEZADOS_EVOLUTIVO]).setFontWeight('bold');
  if (filasEvo.length) sh.getRange(inicioEvo + 2, 1, filasEvo.length, ENCABEZADOS_EVOLUTIVO.length).setValues(filasEvo);
}

// =========================
// 🔁 TRANSFORMACIONES PARA EL DESTINO (las mismas del Colab)
// =========================

// KPI: PERIODO como YYYY-MM, columnas A–J en mayúsculas, números redondeados
// (4 decimales si la celda es %, 2 si no). pct[i][j] marca las celdas con formato %.
function prepararKpiDestino_(c) {
  const valores = [], pct = [];
  c.filasKpi.forEach((fila, i) => {
    const metaEsPct = String(c.formatos[i] || '').indexOf('%') !== -1;
    const filaPct = fila.map((_, j) => j >= 13 || (metaEsPct && (j === 11 || j === 12)));
    valores.push(fila.map((v, j) => {
      if (j === 0) return periodoTexto_(v);
      if (typeof v === 'string') return j < 10 ? v.toUpperCase() : v;
      if (typeof v === 'number') return redondear_(v, filaPct[j] ? 4 : 2);
      return v;
    }));
    pct.push(filaPct);
  });
  return { valores, pct };
}

// EVOLUTIVO: texto en mayúsculas; la columna I (COMISION_GDP) se reemplaza por la fórmula =F+G-H al pegar.
function prepararEvolutivoDestino_(c) {
  const valores = c.filasEvo.map(fila => fila.map(v => typeof v === 'string' ? v.toUpperCase() : v));
  return { valores };
}

function pegarKpi_(sh, kpi) {
  const n = kpi.valores.length;
  if (!n) return null;
  const inicio = sh.getLastRow() + 1;
  const cols = ENCABEZADOS_KPI.length;
  const rango = sh.getRange(inicio, 1, n, cols);
  rango.clearFormat();
  rango.setValues(kpi.valores);

  // PORC_FINAL, PESO y TOTAL siempre son %; META y CUMPLIMIENTO solo en las filas cuyo
  // formato de origen es %. Las filas seguidas se agrupan en un mismo rango.
  const rangosPct = [`N${inicio}:P${inicio + n - 1}`];
  let desde = -1;
  kpi.pct.forEach((filaPct, i) => {
    const esPct = filaPct[11];
    if (esPct && desde === -1) desde = i;
    if ((!esPct || i === n - 1) && desde !== -1) {
      const hasta = esPct ? i : i - 1;
      rangosPct.push(`L${inicio + desde}:M${inicio + hasta}`);
      desde = -1;
    }
  });
  sh.getRangeList(rangosPct).setNumberFormat('0.00%');

  aplicarFuenteYAlineacion_(rango);
  return inicio;
}

function pegarEvolutivo_(sh, evo) {
  const n = evo.valores.length;
  if (!n) return null;
  const inicio = ultimaFilaConDatos_(sh, 1) + 1; // como el Colab: según la columna A
  const cols = ENCABEZADOS_EVOLUTIVO.length;
  const valores = evo.valores.map((f, i) => {
    const copia = f.slice();
    copia[8] = `=F${inicio + i}+G${inicio + i}-H${inicio + i}`; // COMISION_GDP
    return copia;
  });
  const rango = sh.getRange(inicio, 1, n, cols);
  rango.setValues(valores);
  aplicarFuenteYAlineacion_(rango);
  return inicio;
}

function aplicarFuenteYAlineacion_(rango) {
  rango.setFontFamily('Calibri').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
}

// =========================
// 🧰 UTILIDADES
// =========================
function periodoTexto_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM');
  const s = String(v == null ? '' : v).trim();
  let m = s.match(/^(\d{4})[-\/](\d{1,2})/);
  if (m) return `${m[1]}-${('0' + m[2]).slice(-2)}`;
  m = s.match(/^(\d{4})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}`;
  return s.toUpperCase();
}

function redondear_(v, decimales) {
  const f = Math.pow(10, decimales);
  return Math.round(v * f) / f;
}

function ultimaFilaConDatos_(sh, col) {
  const max = sh.getLastRow();
  if (!max) return 0;
  const vals = sh.getRange(1, col, max, 1).getValues();
  for (let i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i][0]).trim() !== '') return i + 1;
  }
  return 0;
}

// Convierte las filas a texto para mostrarlas en la web (no afecta lo que se pega).
function vistaFilas_(filas, pct, colFormula) {
  const tz = Session.getScriptTimeZone();
  return filas.map((fila, i) => fila.map((v, j) => {
    if (colFormula === j) return '=F+G-H';
    if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
    if (typeof v === 'number') {
      if (pct && pct[i][j]) return (v * 100).toFixed(2) + ' %';
      return String(redondear_(v, 2));
    }
    return String(v == null ? '' : v).replace(/^'/, '');
  }));
}
