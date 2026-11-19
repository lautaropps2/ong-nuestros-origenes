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
  // Cada registro es UNA compra con "cantidad" libros y un solo código QR (los antiguos, sin cantidad, valen 1).
  function cant(p) { return Math.max(1, parseInt(p && p.cantidad, 10) || 1); }
  function nLibros(n) { return num(n) + (n === 1 ? " libro" : " libros"); }
  var TACHO = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/></svg>';

  function pintarTiles() {
    // Todo se cuenta en LIBROS: una compra de 100 libros suma 100.
    var c = { pend: 0, conf: 0, env: 0, ent: 0, anu: 0, plata: 0, libros: 0 };
    DATA.forEach(function (p) {
      var n = cant(p);
      if (p.estado !== "Anulado") c.libros += n;
      if (p.estado === "Pendiente de pago") c.pend += n;
      if (CONF.indexOf(p.estado) >= 0) { c.conf += n; c.plata += (p.valor || 0) * n; }
      if (p.estado === "Enviado" || p.estado === "Entregado") c.env += n;
      if (p.estado === "Entregado") c.ent += n;
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
    $("#sync").textContent = num(DATA.length) + (DATA.length === 1 ? " compra · " : " compras · ") + nLibros(c.libros) +
      (c.anu ? " · " + c.anu + (c.anu === 1 ? " compra anulada" : " compras anuladas") : "") + (ultimo ? " · actualizado " + ultimo.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }) : "");
  }

  function fila(p) {
    var opts = ESTADOS.map(function (e) { return '<option' + (e === p.estado ? " selected" : "") + '>' + e + '</option>'; }).join("");
    var fechas = [p.pago ? "Pago " + fechaCorta(p.pago) : "", p.envio ? "Envío " + fechaCorta(p.envio) : "", p.entrega ? "Entrega " + fechaCorta(p.entrega) : ""].filter(Boolean).join(" · ");
    return '<tr data-c="' + esc(p.codigo) + '"' + (sel[p.codigo] ? ' class="sel"' : "") + '>' +
      '<td class="ck"><input type="checkbox" data-sel' + (sel[p.codigo] ? " checked" : "") + ' aria-label="Seleccionar ' + esc(p.codigo) + '"></td>' +
      '<td class="when" data-l="Fecha">' + esc(fecha(p.creado)) + '</td>' +
      '<td data-l="Código"><span class="code"><a href="' + esc(TRACK + p.codigo) + '" target="_blank" rel="noopener">' + esc(p.codigo) + '</a></span>' + (p.pedido ? '<span class="sub">' + esc(p.pedido) + '</span>' : '') + '</td>' +
      '<td data-l="Libros"><b class="cant">' + esc(nLibros(cant(p))) + '</b>' + esc(p.libro) + '<span class="sub">' + esc([p.color, p.formato].filter(Boolean).join(" · ")) + '</span></td>' +
      '<td data-l="Comprador"><b>' + esc(p.nombre) + '</b><span class="sub">' + esc(p.correo) + '</span><span class="sub">' + esc(p.telefono) + (p.comuna ? " · " + esc(p.comuna) : "") + '</span>' +
        (p.dedicatoria ? '<span class="ded">“' + esc(p.dedicatoria) + '”</span>' : "") + '</td>' +
      '<td data-l="Valor">' + (p.valor ? money(p.valor * cant(p)) + (cant(p) > 1 ? '<span class="sub">' + money(p.valor) + ' c/u</span>' : '') : '<span class="sub">Por confirmar</span>') + '</td>' +
      '<td data-l="Estado"><div class="est" data-e="' + esc(p.estado) + '"><i class="dot" aria-hidden="true"></i><select data-estado aria-label="Estado de ' + esc(p.codigo) + '">' + opts + '</select></div>' +
        (fechas ? '<div class="fechas">' + esc(fechas) + '</div>' : "") + '</td>' +
      '<td data-l="Residencia y notas (internas)"><input class="inp" data-f="residencia" value="' + esc(p.residencia || "") + '" placeholder="Residencia / hogar" maxlength="120" aria-label="Residencia de ' + esc(p.codigo) + '">' +
        '<input class="inp" data-f="notas" value="' + esc(p.notas || "") + '" placeholder="Notas" maxlength="500" aria-label="Notas de ' + esc(p.codigo) + '"></td>' +
      '<td class="acts"><button class="qrb" type="button" data-qr>QR</button>' +
        '<button class="del" type="button" data-del title="Eliminar compra" aria-label="Eliminar la compra ' + esc(p.codigo) + '">' + TACHO + '</button></td></tr>';
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
    var b = e.target.closest("[data-qr]");
    if (b) { abrirQR(porCodigo[b.closest("tr").getAttribute("data-c")]); return; }
    var d = e.target.closest("[data-del]");
    if (d) eliminar([d.closest("tr").getAttribute("data-c")]);
  });

  /* ---------------- eliminar (tacho de basura) ---------------- */
  // Quita compras de prueba, duplicadas o descartadas: salen del panel, del Excel y de la meta, y su QR deja de funcionar.
  function eliminar(cods) {
    cods = cods.filter(function (c) { return porCodigo[c]; });
    if (!cods.length) return Promise.resolve();
    var libros = cods.reduce(function (s, c) { return s + cant(porCodigo[c]); }, 0), p = porCodigo[cods[0]];
    var que = cods.length === 1
      ? "la compra " + p.codigo + " de " + p.nombre + " (" + nLibros(cant(p)) + " «" + p.libro + "»)"
      : cods.length + " compras (" + nLibros(libros) + ")";
    if (!confirm("¿Eliminar " + que + "?\n\nSe quita del panel, del Excel y de la meta, y su código QR deja de funcionar.")) return Promise.resolve();
    cods.forEach(function (c) { var tr = $('tr[data-c="' + c + '"]'); if (tr) tr.classList.add("bye"); });
    return api("?accion=eliminar", { codigos: cods }).then(function (d) {
      if (!d.ok) throw new Error(d.error || "No se pudo eliminar");
      var fuera = {}; (d.eliminados || cods).forEach(function (c) { fuera[c] = 1; delete porCodigo[c]; delete sel[c]; });
      DATA = DATA.filter(function (x) { return !fuera[x.codigo]; });
      pintar();
      toast(cods.length === 1 ? "Compra eliminada" : cods.length + " compras eliminadas");
    }).catch(function (e) {
      toast((e && e.message) || "No se pudo eliminar", true);
      pintar();
    });
  }
  $("#all").addEventListener("change", function () {
    var on = this.checked;
    filtrados().forEach(function (p) { if (on) sel[p.codigo] = 1; else delete sel[p.codigo]; });
    pintar();
  });
  $("#bulkX").addEventListener("click", function () { sel = {}; pintar(); });
  $("#bulkDel").addEventListener("click", function () {
    var b = this; b.disabled = true;
    eliminar(Object.keys(sel)).then(function () { b.disabled = false; });
  });
  $("#bulkGo").addEventListener("click", function () {
    var est = $("#bulkE").value, cods = Object.keys(sel);
    if (!cods.length) return;
    var libros = cods.reduce(function (s, c) { return s + cant(porCodigo[c]); }, 0);
    if (!confirm("¿Marcar " + cods.length + (cods.length === 1 ? " compra" : " compras") + " (" + nLibros(libros) + ") como «" + est + "»?")) return;
    var b = this; b.disabled = true;
    guardar(cods.map(function (c) { return { codigo: c, estado: est }; }), cods.length + (cods.length === 1 ? " compra → " : " compras → ") + est).then(function () { b.disabled = false; sel = {}; pintar(); });
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
    window.ongQR.tarjeta(TRACK + p.codigo, p.codigo, p.libro + (p.color ? " · " + p.color : ""), cant(p))
      .toBlob(function (blob) { if (blob) bajar(blob, "compra-" + p.codigo + ".png"); }, "image/png");
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
    $("#dlg-d").textContent = nLibros(cant(p)) + " «" + p.libro + "»" + (p.color ? " (" + p.color + ")" : "") + " · " + p.nombre + " · " + p.estado;
    window.ongQR.canvas($("#dlg-qr"), link, 10);
    var tel = telWA(p.telefono), wa = $("#dlg-wa");
    wa.hidden = !tel;
    if (tel) wa.href = "https://wa.me/" + tel + "?text=" + encodeURIComponent("Hola " + String(p.nombre).split(" ")[0] + ", gracias por regalar " + (cant(p) === 1 ? "un libro" : nLibros(cant(p))) + " en la Campaña Navidad 2026 de ONG Nuestros Orígenes. Aquí puedes seguir tu compra de «" + p.libro + "» (código " + p.codigo + "): " + link);
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
    // Celdas: texto, número, o {v, s} con estilo (1 encabezado, 2 miles, 3 fecha y hora, 4 fecha, 5 negrita, 6 negrita con miles)
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
          '<cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
          '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
          '<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
          '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
          '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
          '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
          '<xf numFmtId="3" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/></cellXfs>' +
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
  // Excel con 3 hojas:
  //   1. "Resumen por libro": cuántos libros se compraron de cada título y color (p. ej. 100 de uno, 2 de otro)
  //   2. "Compras": una fila por compra (un QR), con la cantidad de libros
  //   3. "Resumen por día"
  // Las compras anuladas aparecen en "Compras" pero no se suman en los resúmenes.
  function excel(dias) {
    var desde = dias ? diaClave(Date.now() - (dias - 1) * 86400000) : "";
    var lista = DATA.filter(function (p) { return !desde || partes(p.creado).dia >= desde; })
      .slice().sort(function (a, b) { return a.creado < b.creado ? -1 : a.creado > b.creado ? 1 : 0; });
    if (!lista.length) { toast(dias ? "No hay compras en los últimos " + dias + " días" : "Aún no hay compras", true); return; }
    var dt = function (iso) { var v = serialExcel(iso); return v === "" ? "" : { v: v, s: 3 }; };
    var mil = function (n) { return { v: n || 0, s: 2 }; }, B = function (v) { return { v: v, s: 5 }; }, BM = function (n) { return { v: n || 0, s: 6 }; };
    var activas = lista.filter(function (p) { return p.estado !== "Anulado"; });

    // 1. Resumen por libro (y color)
    function cuenta() { return { compras: 0, libros: 0, conf: 0, pend: 0, env: 0, ent: 0, plata: 0 }; }
    function sumar(r, p) {
      var n = cant(p); r.compras++; r.libros += n;
      if (CONF.indexOf(p.estado) >= 0) { r.conf += n; r.plata += (p.valor || 0) * n; }
      if (p.estado === "Pendiente de pago") r.pend += n;
      if (p.estado === "Enviado" || p.estado === "Entregado") r.env += n;
      if (p.estado === "Entregado") r.ent += n;
    }
    var porLibro = {}, total = cuenta();
    activas.forEach(function (p) {
      var L = porLibro[p.libro] || (porLibro[p.libro] = { total: cuenta(), colores: {} });
      var k = p.color || "—";
      sumar(L.total, p); sumar(L.colores[k] || (L.colores[k] = cuenta()), p); sumar(total, p);
    });
    var filaR = function (a, b, r, neg) {
      var N = neg ? BM : mil;
      return [neg ? B(a) : a, neg ? B(b) : b, N(r.libros), N(r.compras), N(r.conf), N(r.pend), N(r.env), N(r.ent), N(r.plata)];
    };
    var resumenLibro = [["Libro", "Color", "Libros comprados", "Compras", "Pago confirmado", "Pendientes de pago", "Enviados", "Entregados", "Recaudado"]];
    Object.keys(porLibro).sort(function (a, b) { return porLibro[b].total.libros - porLibro[a].total.libros || a.localeCompare(b, "es"); }).forEach(function (t) {
      var L = porLibro[t], cs = Object.keys(L.colores).sort();
      if (cs.length === 1) { resumenLibro.push(filaR(t, cs[0] === "—" ? "" : cs[0], L.total)); return; }
      cs.forEach(function (c) { resumenLibro.push(filaR(t, c === "—" ? "" : c, L.colores[c])); });
      resumenLibro.push(filaR(t, "Total del libro", L.total, true));
    });
    resumenLibro.push(filaR("TOTAL", "", total, true));

    // 2. Compras
    var compras = [["Fecha y hora", "Código", "Libro", "Color", "Formato", "Cantidad de libros", "Valor c/u", "Total", "Nombre", "Correo", "Teléfono", "Comuna", "Dedicatoria", "Estado", "Pago confirmado", "Enviado", "Entregado", "Residencia / hogar", "Notas internas"]]
      .concat(lista.map(function (p) {
        var n = cant(p);
        return [dt(p.creado), p.codigo, p.libro, p.color || "", p.formato || "", mil(n), mil(p.valor), mil((p.valor || 0) * n), p.nombre, p.correo, p.telefono, p.comuna || "",
          p.dedicatoria || "", p.estado, dt(p.pago), dt(p.envio), dt(p.entrega), p.residencia || "", p.notas || ""];
      }));

    // 3. Resumen por día
    var dias_ = {}, tot = cuenta();
    activas.forEach(function (p) { var k = partes(p.creado).dia; sumar(dias_[k] || (dias_[k] = cuenta()), p); sumar(tot, p); });
    var resumenDia = [["Día", "Compras", "Libros comprados", "Pago confirmado", "Enviados", "Entregados", "Recaudado"]].concat(Object.keys(dias_).sort().map(function (k) {
      var r = dias_[k], a = k.split("-");
      return [{ v: Date.UTC(+a[0], +a[1] - 1, +a[2]) / 86400000 + 25569, s: 4 }, mil(r.compras), mil(r.libros), mil(r.conf), mil(r.env), mil(r.ent), mil(r.plata)];
    }));
    resumenDia.push([B("Total"), BM(tot.compras), BM(tot.libros), BM(tot.conf), BM(tot.env), BM(tot.ent), BM(tot.plata)]);

    var blob = XLSX.libro([
      { nombre: "Resumen por libro", filas: resumenLibro, anchos: [40, 16, 17, 10, 16, 18, 11, 12, 14] },
      { nombre: "Compras", filas: compras, anchos: [17, 16, 36, 10, 10, 12, 11, 12, 26, 30, 16, 16, 40, 18, 17, 17, 17, 26, 30] },
      { nombre: "Resumen por día", filas: resumenDia, anchos: [14, 10, 17, 16, 12, 12, 14] }
    ]);
    var hoy = diaClave(Date.now());
    bajar(blob, "pedidos-biblioteca-" + (dias ? "ultimos-" + dias + "-dias-" : "") + hoy + ".xlsx");
    toast("Excel descargado: " + num(lista.length) + (lista.length === 1 ? " compra · " : " compras · ") + nLibros(total.libros));
  }
  $("#xls7").addEventListener("click", function () { excel(7); });
  $("#xlsAll").addEventListener("click", function () { excel(0); });

  cargar();
})();
