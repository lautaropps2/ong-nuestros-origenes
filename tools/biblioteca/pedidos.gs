/**
 * ONG Nuestros Orígenes — Biblioteca del Barrio
 * Pedidos de libros, seguimiento con código QR y estadísticas de la campaña.
 *
 * Vive dentro de una planilla de Google (Extensiones → Apps Script) y se publica como
 * "Aplicación web". La planilla es el Excel de pedidos: cada compra queda en una fila
 * con la fecha y hora, el libro y los datos del comprador.
 *
 * Para cambiar el estado de un libro, elige en la columna "Estado":
 *   Pendiente de pago → Comprado → Enviado → Entregado   (o Anulado)
 * El seguimiento con QR y las estadísticas del sitio se actualizan solos.
 */

var SITIO = "https://www.nuestrosorigenes.cl";
var ZONA = "America/Santiago";
var ENVIAR_CORREO = true;          // correo de confirmación al comprador
var MAX_POR_PEDIDO = 10;

var HOJA_PEDIDOS = "Pedidos";
var HOJA_RESUMEN = "Resumen 7 días";
var ESTADOS = ["Pendiente de pago", "Comprado", "Enviado", "Entregado", "Anulado"];
var COLUMNAS = ["Fecha y hora", "Código", "Libro", "Color", "Formato", "Valor", "Nombre", "Correo", "Teléfono",
                "Comuna", "Dedicatoria", "Estado", "Fecha pago", "Fecha envío", "Fecha entrega",
                "Residencia / hogar (interno)", "Notas internas"];
var C = {};  // número de columna (1 = A) por nombre corto
["fecha", "codigo", "libro", "color", "formato", "valor", "nombre", "correo", "telefono", "comuna",
 "dedicatoria", "estado", "fpago", "fenvio", "fentrega", "residencia", "notas"].forEach(function (k, i) { C[k] = i + 1; });
var FECHA_POR_ESTADO = { "Comprado": "fpago", "Enviado": "fenvio", "Entregado": "fentrega" };

/* ------------------------------------------------------------------ instalación */

/** Ejecútalo una vez desde el editor: crea las hojas, el menú y el envío semanal del Excel. */
function configurar() {
  var ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(ZONA);
  var sh = ss.getSheetByName(HOJA_PEDIDOS) || ss.insertSheet(HOJA_PEDIDOS, 0);
  sh.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS])
    .setFontWeight("bold").setBackground("#050506").setFontColor("#FFFFFF");
  sh.setFrozenRows(1);
  sh.getRange(2, C.fecha, sh.getMaxRows() - 1, 1).setNumberFormat("dd-mm-yyyy hh:mm");
  [C.fpago, C.fenvio, C.fentrega].forEach(function (c) { sh.getRange(2, c, sh.getMaxRows() - 1, 1).setNumberFormat("dd-mm-yyyy hh:mm"); });
  sh.getRange(2, C.valor, sh.getMaxRows() - 1, 1).setNumberFormat("$#,##0");
  var regla = SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).setAllowInvalid(false).build();
  sh.getRange(2, C.estado, sh.getMaxRows() - 1, 1).setDataValidation(regla);
  sh.setColumnWidths(1, COLUMNAS.length, 140);
  sh.setColumnWidth(C.libro, 260);
  sh.setColumnWidth(C.dedicatoria, 260);

  var colores = [["Pendiente de pago", "#FFF6C2"], ["Comprado", "#DDF3E6"], ["Enviado", "#DCE8FB"], ["Entregado", "#BFE8CF"], ["Anulado", "#F2D7D5"]];
  var rango = sh.getRange(2, C.estado, sh.getMaxRows() - 1, 1);
  sh.setConditionalFormatRules(colores.map(function (x) {
    return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(x[0]).setBackground(x[1]).setRanges([rango]).build();
  }));

  crearResumen_(ss);

  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "enviarExcelSemanal") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("enviarExcelSemanal").timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).inTimezone(ZONA).create();
  SpreadsheetApp.getActive().toast("Listo. Ahora publica: Implementar → Nueva implementación → Aplicación web.", "Biblioteca", 10);
}

function crearResumen_(ss) {
  var r = ss.getSheetByName(HOJA_RESUMEN) || ss.insertSheet(HOJA_RESUMEN, 1);
  r.clear();
  r.getRange("A1:D1").setValues([["Día", "Libros pedidos", "Confirmados (pagados)", "Entregados"]])
    .setFontWeight("bold").setBackground("#050506").setFontColor("#FFFFFF");
  var P = "'" + HOJA_PEDIDOS + "'!";
  var filas = [];
  for (var i = 6; i >= 0; i--) {
    var n = 8 - i;  // fila 2..8
    filas.push(["=TODAY()-" + i,
      "=COUNTIFS(" + P + "A:A,\">=\"&A" + n + "," + P + "A:A,\"<\"&A" + n + "+1)",
      "=COUNTIFS(" + P + "A:A,\">=\"&A" + n + "," + P + "A:A,\"<\"&A" + n + "+1," + P + "L:L,\"<>Pendiente de pago\"," + P + "L:L,\"<>Anulado\")",
      "=COUNTIFS(" + P + "O:O,\">=\"&A" + n + "," + P + "O:O,\"<\"&A" + n + "+1)"]);
  }
  r.getRange(2, 1, 7, 4).setFormulas(filas);
  r.getRange("A2:A8").setNumberFormat("dddd dd-mm-yyyy");
  r.getRange("A10:D10").setFormulas([["=\"Total últimos 7 días\"", "=SUM(B2:B8)", "=SUM(C2:C8)", "=SUM(D2:D8)"]]).setFontWeight("bold");
  r.getRange("A12:B15").setFormulas([
    ["=\"Campaña completa\"", "=\"\""],
    ["=\"Libros comprados (confirmados)\"", "=COUNTIF(" + P + "L:L,\"Comprado\")+COUNTIF(" + P + "L:L,\"Enviado\")+COUNTIF(" + P + "L:L,\"Entregado\")"],
    ["=\"Libros enviados\"", "=COUNTIF(" + P + "L:L,\"Enviado\")+COUNTIF(" + P + "L:L,\"Entregado\")"],
    ["=\"Libros entregados\"", "=COUNTIF(" + P + "L:L,\"Entregado\")"]]);
  r.getRange("A12").setFontWeight("bold");
  r.setColumnWidths(1, 4, 200);
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu("Biblioteca")
    .addItem("Enviarme el Excel de los últimos 7 días", "enviarExcelSemanal")
    .addItem("Reparar hojas y formato", "configurar")
    .addToUi();
}

/** Al cambiar el Estado se anota la fecha de pago, envío o entrega. */
function onEdit(e) {
  var sh = e.range.getSheet();
  if (sh.getName() !== HOJA_PEDIDOS || e.range.getColumn() !== C.estado || e.range.getRow() < 2) return;
  var vals = e.range.getValues();
  for (var i = 0; i < vals.length; i++) {
    var k = FECHA_POR_ESTADO[vals[i][0]];
    if (!k) continue;
    var fila = e.range.getRow() + i;
    var celda = sh.getRange(fila, C[k]);
    if (!celda.getValue()) celda.setValue(new Date());
    if (k === "fentrega" && !sh.getRange(fila, C.fenvio).getValue()) sh.getRange(fila, C.fenvio).setValue(new Date());
    if (k !== "fpago" && !sh.getRange(fila, C.fpago).getValue()) sh.getRange(fila, C.fpago).setValue(new Date());
  }
  CacheService.getScriptCache().remove("estadisticas");
}

/* ------------------------------------------------------------------ API web */

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.accion === "seguimiento") return json_(seguimiento_(p.codigo));
    if (p.accion === "estadisticas") return json_(estadisticas_());
    return json_({ ok: true, servicio: "Biblioteca ONG Nuestros Orígenes" });
  } catch (err) {
    return json_({ ok: false, error: "Error interno. Intenta de nuevo en unos minutos." });
  }
}

function doPost(e) {
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    return json_(registrar_(d));
  } catch (err) {
    return json_({ ok: false, error: "No pudimos registrar tu compra. Intenta de nuevo o escríbenos por WhatsApp." });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ pedidos */

function texto_(v, max) { return String(v == null ? "" : v).replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max); }
// Evita que un texto empiece con = + - @ y la planilla lo trate como fórmula.
function celda_(v) { v = String(v); return /^[=+\-@]/.test(v) ? "'" + v : v; }

function catalogo_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get("catalogo");
  if (hit) return JSON.parse(hit);
  var res = UrlFetchApp.fetch(SITIO + "/data/biblioteca.json", { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error("catálogo no disponible");
  var cat = JSON.parse(res.getContentText());
  cache.put("catalogo", JSON.stringify(cat), 600);
  return cat;
}

function nuevoCodigo_(sh) {
  var abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789", codigo;
  do {
    codigo = "NAV-";
    for (var i = 0; i < 8; i++) { if (i === 4) codigo += "-"; codigo += abc.charAt(Math.floor(Math.random() * abc.length)); }
  } while (sh.getRange(1, C.codigo, Math.max(sh.getLastRow(), 1), 1).createTextFinder(codigo).matchEntireCell(true).findNext());
  return codigo;
}

function registrar_(d) {
  if (d.web) return { ok: true, codigos: [] };  // campo trampa: lo llenan los robots, no las personas

  var nombre = texto_(d.nombre, 80), correo = texto_(d.correo, 120).toLowerCase(), telefono = texto_(d.telefono, 30);
  var comuna = texto_(d.comuna, 60), dedicatoria = texto_(d.dedicatoria, 300);
  var cantidad = Math.max(1, Math.min(MAX_POR_PEDIDO, parseInt(d.cantidad, 10) || 1));
  if (nombre.length < 2) return { ok: false, error: "Escribe tu nombre." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return { ok: false, error: "Revisa tu correo electrónico." };
  if (telefono.replace(/\D/g, "").length < 8) return { ok: false, error: "Escribe un teléfono de contacto." };

  var cat = catalogo_();
  var libro = (cat.libros || []).filter(function (l) { return l && l.titulo === d.libro && l.disponible !== false; })[0];
  if (!libro) return { ok: false, error: "Ese libro ya no está disponible." };
  var colores = libro.colores || [], formatos = libro.formatos || [];
  var color = colores.length ? (colores.indexOf(d.color) >= 0 ? d.color : null) : "";
  var formato = formatos.length ? (formatos.indexOf(d.formato) >= 0 ? d.formato : null) : "";
  if (color === null) return { ok: false, error: "Elige un color." };
  if (formato === null) return { ok: false, error: "Elige el formato." };

  // Límite simple contra abusos: 20 libros por correo cada hora.
  var cache = CacheService.getScriptCache(), clave = "c:" + correo;
  var usados = parseInt(cache.get(clave), 10) || 0;
  if (usados + cantidad > 20) return { ok: false, error: "Alcanzaste el máximo de libros por hora. Escríbenos por WhatsApp para pedidos grandes." };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  var codigos = [];
  try {
    var sh = SpreadsheetApp.getActive().getSheetByName(HOJA_PEDIDOS);
    var ahora = new Date(), precio = Math.max(0, parseInt(libro.precio, 10) || 0), filas = [];
    for (var i = 0; i < cantidad; i++) {
      var codigo = nuevoCodigo_(sh);
      codigos.push(codigo);
      filas.push([ahora, codigo, celda_(libro.titulo), color, formato, precio || "", celda_(nombre), celda_(correo), celda_(telefono),
                  celda_(comuna), celda_(dedicatoria), "Pendiente de pago", "", "", "", "", ""]);
      sh.appendRow(filas[i]);  // fila por fila para que nuevoCodigo_ vea los códigos recién creados
    }
  } finally {
    lock.releaseLock();
  }
  cache.put(clave, String(usados + cantidad), 3600);

  if (ENVIAR_CORREO) {
    try { correoConfirmacion_(correo, nombre, libro, color, formato, codigos, cat.pago || {}); } catch (err) { }
  }
  return { ok: true, codigos: codigos, libro: libro.titulo, color: color, formato: formato, valor: precio, cantidad: cantidad };
}

function correoConfirmacion_(correo, nombre, libro, color, formato, codigos, pago) {
  var enlaces = codigos.map(function (c) {
    var url = SITIO + "/seguimiento?c=" + encodeURIComponent(c);
    return '<li style="margin:6px 0"><b style="font-family:monospace;font-size:16px">' + c + '</b> · <a href="' + url + '">Seguir este libro</a></li>';
  }).join("");
  var datos = [pago.instrucciones, pago.datos_transferencia].filter(Boolean).map(function (t) {
    return '<p style="white-space:pre-line">' + esc_(t) + '</p>';
  }).join("");
  if (pago.link) datos += '<p><a href="' + esc_(pago.link) + '">Pagar en línea</a></p>';
  var html =
    '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#0B0B0C;max-width:560px">' +
    '<div style="height:6px;background:linear-gradient(90deg,#E3120B 0 25%,#00A651 25% 50%,#F7D417 50% 75%,#050506 75%)"></div>' +
    '<h2 style="margin:18px 0 6px">¡Gracias, ' + esc_(nombre.split(" ")[0]) + '!</h2>' +
    '<p>Registramos tu compra para la <b>Campaña Solidaria Navidad 2026</b> de ONG Nuestros Orígenes.</p>' +
    '<p><b>' + esc_(libro.titulo) + '</b>' + (color ? ' · ' + esc_(color) : '') + (formato ? ' · ' + esc_(formato) : '') +
    ' · ' + codigos.length + (codigos.length === 1 ? ' ejemplar' : ' ejemplares') + '</p>' +
    '<p>Cada libro tiene su propio código. Con él puedes ver cuándo se compra, se envía y llega a las niñas y niños de la residencia:</p>' +
    '<ul style="padding-left:18px">' + enlaces + '</ul>' +
    '<h3 style="margin:18px 0 6px">Cómo pagar</h3>' + datos +
    '<p style="color:#55554F;font-size:13px;margin-top:22px">ONG Nuestros Orígenes · Rancagua, Chile · <a href="' + SITIO + '">nuestrosorigenes.cl</a></p></div>';
  MailApp.sendEmail({ to: correo, subject: "Tu libro para Navidad 2026 · " + codigos[0] + (codigos.length > 1 ? " y " + (codigos.length - 1) + " más" : ""),
                      htmlBody: html, name: "ONG Nuestros Orígenes" });
}

function esc_(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

/* ------------------------------------------------------------------ seguimiento y estadísticas */

function iso_(v) { return v instanceof Date ? Utilities.formatDate(v, ZONA, "yyyy-MM-dd'T'HH:mm:ssXXX") : ""; }

/** Datos públicos de un libro: nunca devuelve correo, teléfono ni la residencia. */
function seguimiento_(codigo) {
  codigo = texto_(codigo, 20).toUpperCase();
  if (!/^NAV-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(codigo)) return { ok: false, error: "Código no válido." };
  var sh = SpreadsheetApp.getActive().getSheetByName(HOJA_PEDIDOS);
  var hit = sh.getRange(1, C.codigo, Math.max(sh.getLastRow(), 1), 1).createTextFinder(codigo).matchEntireCell(true).findNext();
  if (!hit) return { ok: false, error: "No encontramos ese código." };
  var f = sh.getRange(hit.getRow(), 1, 1, COLUMNAS.length).getValues()[0];
  var partes = String(f[C.nombre - 1]).replace(/^'/, "").trim().split(/\s+/);
  var nombre = partes[0] + (partes[1] ? " " + partes[1].charAt(0).toUpperCase() + "." : "");
  return {
    ok: true, codigo: codigo,
    libro: String(f[C.libro - 1]).replace(/^'/, ""), color: f[C.color - 1], formato: f[C.formato - 1],
    nombre: nombre, estado: f[C.estado - 1] || "Pendiente de pago",
    fechas: { registro: iso_(f[C.fecha - 1]), pago: iso_(f[C.fpago - 1]), envio: iso_(f[C.fenvio - 1]), entrega: iso_(f[C.fentrega - 1]) },
    estadisticas: estadisticas_()
  };
}

function estadisticas_() {
  var cache = CacheService.getScriptCache(), hit = cache.get("estadisticas");
  if (hit) return JSON.parse(hit);
  var sh = SpreadsheetApp.getActive().getSheetByName(HOJA_PEDIDOS);
  var n = Math.max(sh.getLastRow() - 1, 0);
  var estados = n ? sh.getRange(2, C.estado, n, 1).getValues() : [];
  var r = { ok: true, comprados: 0, enviados: 0, entregados: 0, pendientes: 0, actualizado: iso_(new Date()) };
  estados.forEach(function (x) {
    var e = x[0];
    if (e === "Comprado" || e === "Enviado" || e === "Entregado") r.comprados++;
    if (e === "Enviado" || e === "Entregado") r.enviados++;
    if (e === "Entregado") r.entregados++;
    if (e === "Pendiente de pago" || e === "") r.pendientes++;
  });
  cache.put("estadisticas", JSON.stringify(r), 60);
  return r;
}

/* ------------------------------------------------------------------ Excel semanal */

/** Envía al dueño de la planilla un Excel (.xlsx) con los pedidos de los últimos 7 días. */
function enviarExcelSemanal() {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(HOJA_PEDIDOS);
  var desde = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  var datos = sh.getDataRange().getValues();
  var filas = datos.slice(1).filter(function (f) { return f[0] instanceof Date && f[0] >= desde; })
    .map(function (f) { return f.slice(0, C.fentrega); });  // sin las columnas internas
  var titulo = "Pedidos Biblioteca " + Utilities.formatDate(desde, ZONA, "dd-MM") + " al " + Utilities.formatDate(new Date(), ZONA, "dd-MM-yyyy");

  var tmp = SpreadsheetApp.create(titulo), hoja = tmp.getSheets()[0];
  hoja.getRange(1, 1, 1, C.fentrega).setValues([COLUMNAS.slice(0, C.fentrega)]).setFontWeight("bold");
  if (filas.length) hoja.getRange(2, 1, filas.length, C.fentrega).setValues(filas);
  hoja.getRange(2, C.fecha, Math.max(filas.length, 1), 1).setNumberFormat("dd-mm-yyyy hh:mm");
  hoja.setFrozenRows(1);
  SpreadsheetApp.flush();

  var url = "https://docs.google.com/spreadsheets/d/" + tmp.getId() + "/export?format=xlsx";
  var xlsx = UrlFetchApp.fetch(url, { headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() } }).getBlob().setName(titulo + ".xlsx");
  DriveApp.getFileById(tmp.getId()).setTrashed(true);

  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: titulo + " (" + filas.length + (filas.length === 1 ? " libro)" : " libros)"),
    htmlBody: "<p>Adjuntamos el Excel con los libros pedidos en los últimos 7 días.</p><p>La planilla completa está aquí: <a href=\"" + ss.getUrl() + "\">" + esc_(ss.getName()) + "</a></p>",
    attachments: [xlsx], name: "Biblioteca ONG Nuestros Orígenes"
  });
  try { SpreadsheetApp.getActive().toast("Te enviamos el Excel a tu correo.", "Biblioteca", 6); } catch (err) { }
}
