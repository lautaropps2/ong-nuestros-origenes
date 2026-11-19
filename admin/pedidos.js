/* Panel de pedidos · Biblioteca del Barrio (Campaña Navidad 2026)
   Usa el mismo inicio de sesión de GitHub que el panel /admin. Los datos vienen de /api/pedidos. */
(function () {
  "use strict";
  var API = "/api/pedidos";
  var SITE = location.hostname === "localhost" || location.hostname === "127.0.0.1" ? location.origin : "https://www.nuestrosorigenes.cl";
  var TRACK = SITE + "/seguimiento?c=";
  var ESTADOS = ["Pendiente de pago", "Comprado", "Enviado", "Entregado", "Anulado"];
  var CONF = ["Comprado", "Enviado", "Entregado"];
  var ZONA = "America/Santiago";
  var META = 5183;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var money = function (n) { return "$" + Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
  var num = function (n) { return Number(n || 0).toLocaleString("es-CL"); };
  var fmt = new Intl.DateTimeFormat("es-CL", { timeZone: ZONA, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  var fmtCorto = new Intl.DateTimeFormat("es-CL", { timeZone: ZONA, day: "numeric", month: "short" });
  function fecha(iso) { var d = new Date(iso); return iso && !isNaN(d) ? fmt.format(d).replace(",", "") : ""; }
  function fechaCorta(iso) { var d = new Date(iso); return iso && !isNaN(d) ? fmtCorto.format(d) : ""; }
  // Partes de la fecha en hora de Chile (para Excel y para agrupar por día)
  var partsFmt = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  function partes(iso) {
    var o = {}; partsFmt.formatToParts(new Date(iso)).forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second, dia: o.year + "-" + o.month + "-" + o.day };
  }
  function serialExcel(iso) { // fecha de Excel en hora de Chile
    if (!iso || isNaN(new Date(iso))) return "";
    var p = partes(iso); return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) / 86400000 + 25569;
  }

  /* ---------------- sesión ---------------- */
  function token() {
    try { var t = sessionStorage.getItem("pedidos-token"); if (t) return t; } catch (e) {}
    try { var u = JSON.parse(localStorage.getItem("decap-cms-user") || "null"); if (u && (u.token || u.access_token)) return u.token || u.access_token; } catch (e) {}
    return "";
  }
  function login() {
    var w = 620, h = 720;
    var pop = window.open("/api/auth?provider=github&site_id=" + encodeURIComponent(location.host) + "&scope=repo", "pedidos-login",
      "width=" + w + ",height=" + h + ",left=" + Math.max(0, (screen.width - w) / 2) + ",top=" + Math.max(0, (screen.height - h) / 2));
    function onMsg(e) {
      if (e.origin !== location.origin || typeof e.data !== "string") return;
      if (e.data === "authorizing:github") { e.source.postMessage("authorizing:github", e.origin); return; }
      var m = /^authorization:github:(success|error):(.*)$/.exec(e.data);
      if (!m) return;
      window.removeEventListener("message", onMsg);
      try { var data = JSON.parse(m[2]); } catch (x) { data = {}; }
      if (m[1] === "success" && data.token) { try { sessionStorage.setItem("pedidos-token", data.token); } catch (x) {} cargar(); }
      else gate("No se pudo iniciar sesión", "<p>" + esc(data.message || "Inténtalo de nuevo.") + "</p>", true);
      if (pop) try { pop.close(); } catch (x) {}
    }
    window.addEventListener("message", onMsg);
  }
  function propio() { try { return !!sessionStorage.getItem("pedidos-token"); } catch (e) { return false; } }
  function salir() {
    try { sessionStorage.removeItem("pedidos-token"); } catch (e) {}
    location.href = "/admin/";
  }

  /* ---------------- API ---------------- */
  function api(q, body) {
    var opts = { headers: { Authorization: "Bearer " + token() }, cache: "no-store" };
    if (body) { opts.method = "POST"; opts.body = JSON.stringify(body); opts.headers["Content-Type"] = "text/plain;charset=UTF-8"; }
    return fetch(API + q, opts).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: "Respuesta no válida (" + r.status + ")" }; })
        .then(function (d) { d._status = r.status; return d; });
    });
  }

  /* ---------------- estado de la página ---------------- */
  var DATA = [], porCodigo = {}, sel = {}, ultimo = null;

  function gate(titulo, html, conLogin) {
    $("#panel").hidden = true;
    var g = $("#gate"); g.hidden = false;
    g.innerHTML = '<h1>' + esc(titulo) + '</h1>' + (html || "") +
      (conLogin ? '<button class="btn btn--y" type="button" id="loginBtn">Iniciar sesión con GitHub</button>' : "");
    var b = $("#loginBtn"); if (b) b.addEventListener("click", login);
  }

  function cargar(silencioso) {
    if (!token()) {
      gate("Pedidos de libros", "<p>Entra con la misma cuenta de GitHub que usas en el panel del sitio.</p>", true);
      return Promise.resolve();
    }
    if (!silencioso && !DATA.length) { $("#gate").hidden = false; $("#gate").innerHTML = '<p><span class="spin"></span> Cargando pedidos…</p>'; }
    $("#refresh").disabled = true;
    return api("?accion=lista").then(function (d) {
      $("#refresh").disabled = false;
      if (d.sinConfig) {
        gate("Falta conectar el sistema de pedidos",
          "<p>El sitio aún no tiene dónde guardar los pedidos. Mientras tanto, las compras llegan por WhatsApp.</p>" +
          "<ol><li>Crea el repositorio privado <b>ong-pedidos</b> en GitHub.</li><li>Crea un token con permiso <b>Contents: Read and write</b> solo para ese repositorio.</li>" +
          "<li>En Vercel → proyecto → Settings → Environment Variables, agrega <b>PEDIDOS_TOKEN</b> con ese token y vuelve a publicar.</li></ol>" +
          "<p>Los pasos detallados están en <code>tools/biblioteca/INSTRUCCIONES.md</code>.</p>");
        return;
      }
      if (d._status === 401) {
        try { sessionStorage.removeItem("pedidos-token"); } catch (e) {}
        gate("No tienes acceso", "<p>" + esc(d.error || "") + " Entra con la cuenta que publica en el panel del sitio.</p>", true);
        return;
      }
      if (!d.ok) { if (DATA.length) toast(d.error || "No se pudo actualizar", true); else gate("No se pudieron cargar los pedidos", "<p>" + esc(d.error || "") + "</p>"); return; }
      DATA = (d.pedidos || []).slice().sort(function (a, b) { return a.creado < b.creado ? 1 : a.creado > b.creado ? -1 : 0; });
      porCodigo = {}; DATA.forEach(function (p) { porCodigo[p.codigo] = p; });
      Object.keys(sel).forEach(function (c) { if (!porCodigo[c]) delete sel[c]; });
      ultimo = new Date();
      var who = $("#who"); who.hidden = false;
      who.innerHTML = "Sesión: <b>" + esc(d.usuario) + "</b>" + (propio() ? ' <button type="button" id="logout">Salir</button>' : "");
      var lo = $("#logout"); if (lo) lo.addEventListener("click", salir);
      $("#gate").hidden = true; $("#panel").hidden = false;
      pintar();
    }).catch(function () {
      $("#refresh").disabled = false;
      if (DATA.length) toast("Sin conexión. Intenta de nuevo.", true);
      else gate("No se pudieron cargar los pedidos", "<p>Revisa tu conexión e inténtalo de nuevo.</p>");
    });
  }

  /* ---------------- pintar ---------------- */
  function filtrados() {
    var q = $("#q").value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    var qd = q.replace(/\D/g, "");
    var fe = $("#fe").value, fp = parseInt($("#fp").value, 10) || 0;
    var desde = fp ? diaClave(Date.now() - (fp - 1) * 86400000) : "";
    return DATA.filter(function (p) {
      if (fe && p.estado !== fe) return false;
      if (desde && partes(p.creado).dia < desde) return false;
      if (!q) return true;
      var h = [p.codigo, p.pedido, p.nombre, p.correo, p.libro, p.comuna, p.residencia].join(" ").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      return h.indexOf(q) >= 0 || (qd.length >= 4 && String(p.telefono || "").replace(/\D/g, "").indexOf(qd) >= 0);
    });
  }
  function diaClave(ms) { return partes(new Date(ms).toISOString()).dia; }

  function pintarTiles() {
    var c = { pend: 0, conf: 0, env: 0, ent: 0, anu: 0, plata: 0 };
    DATA.forEach(function (p) {
      if (p.estado === "Pendiente de pago") c.pend++;
      if (CONF.indexOf(p.estado) >= 0) { c.conf++; c.plata += p.valor || 0; }
      if (p.estado === "Enviado" || p.estado === "Entregado") c.env++;
      if (p.estado === "Entregado") c.ent++;
      if (p.estado === "Anulado") c.anu++;
    });
    var pct = Math.min(100, c.conf / META * 100);
    $("#tiles").innerHTML =
      '<div class="tile tile--meta"><span>Meta de la campaña · libros con pago confirmado</span><b>' + num(c.conf) + ' / ' + num(META) + '</b>' +
      '<div class="bar"><i style="width:' + Math.max(pct, c.conf ? 1 : 0) + '%"></i></div><span>' + pct.toLocaleString("es-CL", { maximumFractionDigits: 2 }) + '% de la meta</span></div>' +
      '<div class="tile" style="--c:#E8A400"><b>' + num(c.pend) + '</b><span>Pendientes de pago</span></div>' +
      '<div class="tile" style="--c:var(--yellow)"><b>' + num(c.conf) + '</b><span>Pago confirmado (suman a la meta)</span></div>' +
      '<div class="tile" style="--c:var(--blue)"><b>' + num(c.env) + '</b><span>Enviados</span></div>' +
      '<div class="tile" style="--c:var(--green)"><b>' + num(c.ent) + '</b><span>Entregados en el hogar</span></div>' +
      '<div class="tile" style="--c:var(--ink)"><b>' + money(c.plata) + '</b><span>Recaudado (pagos confirmados)</span></div>';
    $("#sync").textContent = DATA.length + (DATA.length === 1 ? " libro registrado" : " libros registrados") +
      (c.anu ? " · " + c.anu + " anulados" : "") + (ultimo ? " · actualizado " + ultimo.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }) : "");
  }

  function fila(p) {
    var opts = ESTADOS.map(function (e) { return '<option' + (e === p.estado ? " selected" : "") + '>' + e + '</option>'; }).join("");
    var fechas = [p.pago ? "Pago " + fechaCorta(p.pago) : "", p.envio ? "Envío " + fechaCorta(p.envio) : "", p.entrega ? "Entrega " + fechaCorta(p.entrega) : ""].filter(Boolean).join(" · ");
    return '<tr data-c="' + esc(p.codigo) + '"' + (sel[p.codigo] ? ' class="sel"' : "") + '>' +
      '<td class="ck"><input type="checkbox" data-sel' + (sel[p.codigo] ? " checked" : "") + ' aria-label="Seleccionar ' + esc(p.codigo) + '"></td>' +
      '<td class="when" data-l="Fecha">' + esc(fecha(p.creado)) + '</td>' +
      '<td data-l="Código"><span class="code"><a href="' + esc(TRACK + p.codigo) + '" target="_blank" rel="noopener">' + esc(p.codigo) + '</a></span><span class="sub">' + esc(p.pedido || "") + '</span></td>' +
      '<td data-l="Libro">' + esc(p.libro) + '<span class="sub">' + esc([p.color, p.formato].filter(Boolean).join(" · ")) + '</span></td>' +
      '<td data-l="Comprador"><b>' + esc(p.nombre) + '</b><span class="sub">' + esc(p.correo) + '</span><span class="sub">' + esc(p.telefono) + (p.comuna ? " · " + esc(p.comuna) : "") + '</span>' +
        (p.dedicatoria ? '<span class="ded">“' + esc(p.dedicatoria) + '”</span>' : "") + '</td>' +
      '<td data-l="Valor">' + (p.valor ? money(p.valor) : '<span class="sub">Por confirmar</span>') + '</td>' +
      '<td data-l="Estado"><div class="est" data-e="' + esc(p.estado) + '"><i class="dot" aria-hidden="true"></i><select data-estado aria-label="Estado de ' + esc(p.codigo) + '">' + opts + '</select></div>' +
        (fechas ? '<div class="fechas">' + esc(fechas) + '</div>' : "") + '</td>' +
      '<td data-l="Residencia y notas (internas)"><input class="inp" data-f="residencia" value="' + esc(p.residencia || "") + '" placeholder="Residencia / hogar" maxlength="120" aria-label="Residencia de ' + esc(p.codigo) + '">' +
        '<input class="inp" data-f="notas" value="' + esc(p.notas || "") + '" placeholder="Notas" maxlength="500" aria-label="Notas de ' + esc(p.codigo) + '"></td>' +
      '<td class="acts"><button class="qrb" type="button" data-qr>QR</button></td></tr>';
  }

  function pintar() {
    pintarTiles();
    var lista = filtrados();
    $("#rows").innerHTML = lista.map(fila).join("");
    $("#empty").hidden = lista.length > 0;
    var vis = lista.map(function (p) { return p.codigo; });
    var all = $("#all");
    all.checked = vis.length > 0 && vis.every(function (c) { return sel[c]; });
    all.indeterminate = !all.checked && vis.some(function (c) { return sel[c]; });
    pintarBulk();
  }
  function pintarBulk() {
    var n = Object.keys(sel).length;
    $("#bulk").hidden = n === 0;
    $("#nsel").textContent = n + (n === 1 ? " seleccionado" : " seleccionados");
  }

  /* ---------------- guardar ---------------- */
  function guardar(cambios, mensaje) {
    cambios.forEach(function (c) { var tr = $('tr[data-c="' + c.codigo + '"]'); if (tr) tr.classList.add("saving"); });
    return api("?accion=actualizar", { cambios: cambios }).then(function (d) {
      if (!d.ok) throw new Error(d.error || "No se pudo guardar");
      (d.pedidos || []).forEach(function (p) {
        porCodigo[p.codigo] = p;
        for (var i = 0; i < DATA.length; i++) if (DATA[i].codigo === p.codigo) DATA[i] = p;
      });
      pintar();
      toast(mensaje || "Guardado");
    }).catch(function (e) {
      toast((e && e.message) || "No se pudo guardar", true);
      pintar(); // vuelve a mostrar el valor guardado
    });
  }

  $("#rows").addEventListener("change", function (e) {
    var tr = e.target.closest("tr[data-c]"); if (!tr) return;
    var codigo = tr.getAttribute("data-c"), p = porCodigo[codigo];
    if (e.target.matches("[data-sel]")) {
      if (e.target.checked) sel[codigo] = 1; else delete sel[codigo];
      tr.classList.toggle("sel", e.target.checked); pintarBulk();
      return;
    }
    if (e.target.matches("[data-estado]")) {
      var est = e.target.value;
      e.target.closest(".est").setAttribute("data-e", est);
      guardar([{ codigo: codigo, estado: est }], codigo + " → " + est);
      return;
    }
    var f = e.target.getAttribute("data-f");
    if (f && p && e.target.value.trim() !== (p[f] || "")) {
      var c = { codigo: codigo }; c[f] = e.target.value.trim();
      guardar([c], f === "residencia" ? "Residencia guardada" : "Nota guardada");
    }
  });
  $("#rows").addEventListener("click", function (e) {
    var b = e.target.closest("[data-qr]"); if (!b) return;
    abrirQR(porCodigo[b.closest("tr").getAttribute("data-c")]);
  });
  $("#all").addEventListener("change", function () {
    var on = this.checked;
    filtrados().forEach(function (p) { if (on) sel[p.codigo] = 1; else delete sel[p.codigo]; });
    pintar();
  });
  $("#bulkX").addEventListener("click", function () { sel = {}; pintar(); });
  $("#bulkGo").addEventListener("click", function () {
    var est = $("#bulkE").value, cods = Object.keys(sel);
    if (!cods.length) return;
    if (!confirm("¿Marcar " + cods.length + (cods.length === 1 ? " libro" : " libros") + " como «" + est + "»?")) return;
    var b = this; b.disabled = true;
    guardar(cods.map(function (c) { return { codigo: c, estado: est }; }), cods.length + " libros → " + est).then(function () { b.disabled = false; sel = {}; pintar(); });
  });
  ["#q", "#fe", "#fp"].forEach(function (id) { $(id).addEventListener("input", pintar); });
  $("#refresh").addEventListener("click", function () { cargar(true).then(function () { toast("Pedidos actualizados"); }); });
  // Al volver a la pestaña se traen los pedidos nuevos
  document.addEventListener("visibilitychange", function () { if (!document.hidden && DATA.length && Date.now() - ultimo > 60000) cargar(true); });

  var tt;
  function toast(t, err) {
    var el = $("#toast"); el.textContent = t; el.classList.toggle("err", !!err); el.classList.add("on");
    clearTimeout(tt); tt = setTimeout(function () { el.classList.remove("on"); }, err ? 4200 : 2200);
  }

  /* ---------------- QR ---------------- */
  // QR con la marca de la ONG: /assets/qr-ong.js (el mismo que recibe el comprador)
  function descargarQR(p) {
    window.ongQR.tarjeta(TRACK + p.codigo, p.codigo, p.libro + (p.color ? " · " + p.color : ""))
      .toBlob(function (blob) { if (blob) bajar(blob, "libro-" + p.codigo + ".png"); }, "image/png");
  }
  function telWA(t) {
    var d = String(t || "").replace(/\D/g, "");
    if (d.length === 9 && d[0] === "9") d = "56" + d;
    else if (d.length === 8) d = "569" + d;
    return d.length >= 10 ? d : "";
  }
  var actual = null;
  function abrirQR(p) {
    if (!p) return; actual = p;
    var dlg = $("#dlg"), link = TRACK + p.codigo;
    $("#dlg-t").textContent = p.codigo;
    $("#dlg-d").textContent = p.libro + (p.color ? " (" + p.color + ")" : "") + " · " + p.nombre + " · " + p.estado;
    window.ongQR.canvas($("#dlg-qr"), link, 10);
    var tel = telWA(p.telefono), wa = $("#dlg-wa");
    wa.hidden = !tel;
    if (tel) wa.href = "https://wa.me/" + tel + "?text=" + encodeURIComponent("Hola " + String(p.nombre).split(" ")[0] + ", gracias por regalar un libro en la Campaña Navidad 2026 de ONG Nuestros Orígenes. Aquí puedes seguir tu libro «" + p.libro + "» (código " + p.codigo + "): " + link);
    $("#dlg-ver").href = link;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  }
  $("#dlg").addEventListener("click", function (e) { if (e.target === this || e.target.closest("[data-close]")) this.close ? this.close() : this.removeAttribute("open"); });
  $("#dlg-dl").addEventListener("click", function () { if (actual) descargarQR(actual); });
  $("#dlg-copy").addEventListener("click", function () {
    if (!actual) return; var link = TRACK + actual.codigo;
    (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(function () { toast("Enlace copiado"); }, function () { prompt("Copia el enlace:", link); });
  });

  /* ---------------- Excel (.xlsx) ---------------- */
  var XLSX = (function () {
    var enc = new TextEncoder();
    var tabla = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
    function crc32(u) { var c = 0xFFFFFFFF; for (var i = 0; i < u.length; i++) c = tabla[(c ^ u[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
    function zip(files) { // ZIP sin compresión: suficiente para Excel
      var partes = [], central = [], offset = 0;
      files.forEach(function (f) {
        var name = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data);
        var lh = new DataView(new ArrayBuffer(30));
        lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
        lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true);
        lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
        partes.push(new Uint8Array(lh.buffer), name, data);
        var ch = new DataView(new ArrayBuffer(46));
        ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
        ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
        ch.setUint16(28, name.length, true); ch.setUint16(30, 0, true); ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true);
        ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
        central.push(new Uint8Array(ch.buffer), name);
        offset += 30 + name.length + data.length;
      });
      var cd = central.reduce(function (s, a) { return s + a.length; }, 0);
      var end = new DataView(new ArrayBuffer(22));
      end.setUint32(0, 0x06054b50, true); end.setUint16(4, 0, true); end.setUint16(6, 0, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
      end.setUint32(12, cd, true); end.setUint32(16, offset, true); end.setUint16(20, 0, true);
      return new Blob(partes.concat(central, [new Uint8Array(end.buffer)]), { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    }
    function x(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ""); }
    function col(n) { var s = ""; n++; while (n) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
    // Celdas: texto, número, o {v, s} con estilo (1 encabezado, 2 miles, 3 fecha y hora, 4 fecha)
    function hoja(filas, anchos) {
      var cols = "<cols>" + anchos.map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join("") + "</cols>";
      var data = filas.map(function (f, ri) {
        return '<row r="' + (ri + 1) + '">' + f.map(function (v, ci) {
          var ref = col(ci) + (ri + 1), s = ri === 0 ? 1 : 0;
          if (v && typeof v === "object") { s = v.s; v = v.v; }
          if (v === "" || v == null) return "";
          if (typeof v === "number" && isFinite(v)) return '<c r="' + ref + '"' + (s ? ' s="' + s + '"' : "") + "><v>" + v + "</v></c>";
          return '<c r="' + ref + '"' + (s ? ' s="' + s + '"' : "") + ' t="inlineStr"><is><t xml:space="preserve">' + x(v) + "</t></is></c>";
        }).join("") + "</row>";
      }).join("");
      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
        '<sheetFormatPr defaultRowHeight="15"/>' + cols + "<sheetData>" + data + "</sheetData></worksheet>";
    }
    var NS = "http://schemas.openxmlformats.org/";
    function libro(hojas) { // [{nombre, filas, anchos}]
      var files = [
        { name: "[Content_Types].xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="' + NS + 'package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
          hojas.map(function (h, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join("") + "</Types>" },
        { name: "_rels/.rels", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="' + NS + 'package/2006/relationships">' +
          '<Relationship Id="rId1" Type="' + NS + 'officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
        { name: "xl/workbook.xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="' + NS + 'spreadsheetml/2006/main" xmlns:r="' + NS + 'officeDocument/2006/relationships"><sheets>' +
          hojas.map(function (h, i) { return '<sheet name="' + x(h.nombre) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join("") + "</sheets></workbook>" },
        { name: "xl/_rels/workbook.xml.rels", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="' + NS + 'package/2006/relationships">' +
          hojas.map(function (h, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="' + NS + 'officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join("") +
          '<Relationship Id="rId' + (hojas.length + 1) + '" Type="' + NS + 'officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
        { name: "xl/styles.xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="' + NS + 'spreadsheetml/2006/main">' +
          '<numFmts count="2"><numFmt numFmtId="164" formatCode="dd-mm-yyyy hh:mm"/><numFmt numFmtId="165" formatCode="dd-mm-yyyy"/></numFmts>' +
          '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
          '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF7D417"/><bgColor indexed="64"/></patternFill></fill></fills>' +
          '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
          '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
          '<cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
          '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
          '<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
          '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
          '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>' +
          '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>' }
      ];
      hojas.forEach(function (h, i) { files.push({ name: "xl/worksheets/sheet" + (i + 1) + ".xml", data: hoja(h.filas, h.anchos) }); });
      return zip(files);
    }
    return { libro: libro };
  })();

  function bajar(blob, nombre) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  }
  function excel(dias) {
    var desde = dias ? diaClave(Date.now() - (dias - 1) * 86400000) : "";
    var lista = DATA.filter(function (p) { return !desde || partes(p.creado).dia >= desde; })
      .slice().sort(function (a, b) { return a.creado < b.creado ? -1 : a.creado > b.creado ? 1 : 0; });
    if (!lista.length) { toast(dias ? "No hay pedidos en los últimos " + dias + " días" : "Aún no hay pedidos", true); return; }
    var dt = function (iso) { var v = serialExcel(iso); return v === "" ? "" : { v: v, s: 3 }; };
    var filas = [["Fecha y hora", "Código", "Pedido", "Libro", "Color", "Formato", "Valor", "Nombre", "Correo", "Teléfono", "Comuna", "Dedicatoria", "Estado", "Pago confirmado", "Enviado", "Entregado", "Residencia / hogar", "Notas internas"]]
      .concat(lista.map(function (p) {
        return [dt(p.creado), p.codigo, p.pedido || "", p.libro, p.color || "", p.formato || "", { v: p.valor || 0, s: 2 }, p.nombre, p.correo, p.telefono, p.comuna || "",
          p.dedicatoria || "", p.estado, dt(p.pago), dt(p.envio), dt(p.entrega), p.residencia || "", p.notas || ""];
      }));
    // Resumen por día
    var dias_ = {};
    lista.forEach(function (p) {
      var k = partes(p.creado).dia, r = dias_[k] || (dias_[k] = { n: 0, c: 0, e: 0, ent: 0, plata: 0 });
      r.n++;
      if (CONF.indexOf(p.estado) >= 0) { r.c++; r.plata += p.valor || 0; }
      if (p.estado === "Enviado" || p.estado === "Entregado") r.e++;
      if (p.estado === "Entregado") r.ent++;
    });
    var tot = { n: 0, c: 0, e: 0, ent: 0, plata: 0 };
    var resumen = [["Día", "Libros pedidos", "Pago confirmado", "Enviados", "Entregados", "Recaudado"]].concat(Object.keys(dias_).sort().map(function (k) {
      var r = dias_[k], a = k.split("-");
      Object.keys(tot).forEach(function (t) { tot[t] += r[t]; });
      return [{ v: Date.UTC(+a[0], +a[1] - 1, +a[2]) / 86400000 + 25569, s: 4 }, r.n, r.c, r.e, r.ent, { v: r.plata, s: 2 }];
    }));
    resumen.push([{ v: "Total", s: 1 }, { v: tot.n, s: 1 }, { v: tot.c, s: 1 }, { v: tot.e, s: 1 }, { v: tot.ent, s: 1 }, { v: tot.plata, s: 2 }]);
    var blob = XLSX.libro([
      { nombre: "Pedidos", filas: filas, anchos: [17, 16, 18, 36, 10, 10, 10, 26, 30, 16, 16, 40, 18, 17, 17, 17, 26, 30] },
      { nombre: "Resumen por día", filas: resumen, anchos: [14, 16, 17, 12, 12, 14] }
    ]);
    var hoy = diaClave(Date.now());
    bajar(blob, "pedidos-biblioteca-" + (dias ? "ultimos-" + dias + "-dias-" : "") + hoy + ".xlsx");
    toast("Excel descargado: " + lista.length + (lista.length === 1 ? " libro" : " libros"));
  }
  $("#xls7").addEventListener("click", function () { excel(7); });
  $("#xlsAll").addEventListener("click", function () { excel(0); });

  cargar();
})();
