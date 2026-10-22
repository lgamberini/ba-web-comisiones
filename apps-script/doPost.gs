function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');

    const appSecret = PropertiesService
      .getScriptProperties()
      .getProperty('APPS_SCRIPT_SECRET');

    if (!appSecret || String(data.secret || '') !== appSecret) {
      return jsonOutput({ ok: false, error: 'No autorizado.' });
    }

    if (data.action === 'correo') {
      return Correo_Borrador(data);
    }

    if (data.action === 'consolidado-preview') {
      return Consolidado_Preview(data);
    }

    if (data.action === 'consolidado-pegar') {
      return Consolidado_Pegar(data);
    }

    return jsonOutput({ ok: false, error: 'Acción no válida.' });
  } catch (err) {
    return jsonOutput({ ok: false, error: err.message });
  }
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
