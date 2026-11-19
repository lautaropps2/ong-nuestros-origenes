// Pedidos de la Biblioteca del Barrio · Campaña Solidaria Navidad 2026 (función serverless de Vercel).
//
// Los pedidos se guardan en un repositorio PRIVADO de GitHub (archivo pedidos.json), nunca en el sitio
// público: ahí van nombre, correo y teléfono de cada comprador.
//
// Variables de entorno en Vercel:
//   PEDIDOS_TOKEN   token de GitHub (fine-grained) con permiso "Contents: Read and write"
//                   solo sobre el repositorio privado de pedidos. Sin él, el sitio usa WhatsApp.
//   PEDIDOS_REPO    (opcional) repositorio privado, por defecto "lautaropps2/ong-pedidos"
//   SITIO_REPO      (opcional) repositorio del sitio, por defecto "lautaropps2/ong-nuestros-origenes".
//                   Quien pueda publicar en él (las mismas personas del panel /admin) puede administrar pedidos.
//
// Rutas:
//   GET  /api/pedidos?accion=estadisticas            público: libros comprados, enviados y entregados
//   GET  /api/pedidos?accion=seguimiento&codigo=…    público: estado de un libro (sin correo ni teléfono)
//   POST /api/pedidos                                público: registra una compra y entrega un código por libro
//   GET  /api/pedidos?accion=lista                   panel: todos los pedidos (requiere login de GitHub)
//   POST /api/pedidos?accion=actualizar              panel: cambia estado, residencia o notas
const crypto = require("crypto");

const API = process.env.GITHUB_API || "https://api.github.com";
const REPO = process.env.PEDIDOS_REPO || "lautaropps2/ong-pedidos";
const SITE_REPO = process.env.SITIO_REPO || "lautaropps2/ong-nuestros-origenes";
const BRANCH = process.env.PEDIDOS_RAMA || "main";
const FILE = "pedidos.json";
const ESTADOS = ["Pendiente de pago", "Comprado", "Enviado", "Entregado", "Anulado"];
const CONFIRMADOS = ["Comprado", "Enviado", "Entregado"];
const MAX_POR_PEDIDO = 10;
const TERMINOS = "2026-11-19"; // fecha de la versión de los términos en biblioteca.html (súbela si cambian)
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin 0/O, 1/I/L para que se lea fácil

/* ---------------- GitHub ---------------- */
async function gh(path, opts = {}, token = process.env.PEDIDOS_TOKEN) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: opts.accept || "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ong-nuestros-origenes-pedidos",
  };
  if (opts.body) headers["Content-Type"] = "application/json";
  const r = await fetch(API + path, { method: opts.method || "GET", headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  if (opts.raw) return r;
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!r.ok) {
    const err = new Error(`GitHub ${r.status} en ${path}`);
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

let memo = null; // { at, commit, pedidos } — evita leer GitHub en cada visita
async function leer(fresco) {
  if (!fresco && memo && Date.now() - memo.at < 15000) return memo;
  let commit = null;
  try {
    commit = (await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`)).object.sha;
  } catch (e) {
    if (e.status !== 404 && e.status !== 409) throw e; // 409: repositorio vacío
  }
  let pedidos = [];
  if (commit) {
    const r = await gh(`/repos/${REPO}/contents/${FILE}?ref=${commit}`, { raw: true, accept: "application/vnd.github.raw+json" });
    if (r.ok) {
      const txt = await r.text();
      pedidos = txt.trim() ? JSON.parse(txt) : [];
      if (!Array.isArray(pedidos)) pedidos = [];
    } else if (r.status !== 404) {
      const err = new Error(`GitHub ${r.status} al leer ${FILE}`);
      err.status = r.status;
      throw err;
    }
  }
  memo = { at: Date.now(), commit, pedidos };
  return memo;
}

// Un pedido por línea: el historial de GitHub muestra exactamente qué cambió.
function serializar(pedidos) {
  return "[\n" + pedidos.map((p) => JSON.stringify(p)).join(",\n") + "\n]\n";
}

// Lee, aplica el cambio y guarda en un solo commit. Si otra persona guardó al mismo tiempo, reintenta.
async function guardar(cambiar, mensaje) {
  for (let intento = 0; intento < 6; intento++) {
    const actual = await leer(true);
    const pedidos = actual.pedidos.map((p) => Object.assign({}, p));
    const resultado = cambiar(pedidos);
    const contenido = serializar(pedidos);
    if (!actual.commit) {
      // Repositorio vacío: el primer archivo se crea con la API de contenidos.
      try {
        await gh(`/repos/${REPO}/contents/${FILE}`, {
          method: "PUT",
          body: { message: mensaje, content: Buffer.from(contenido, "utf8").toString("base64"), branch: BRANCH },
        });
        memo = null;
        return resultado;
      } catch (e) {
        if (e.status !== 409 && e.status !== 422) throw e;
        await espera(intento);
        continue;
      }
    }
    const base = await gh(`/repos/${REPO}/git/commits/${actual.commit}`);
    const tree = await gh(`/repos/${REPO}/git/trees`, {
      method: "POST",
      body: { base_tree: base.tree.sha, tree: [{ path: FILE, mode: "100644", type: "blob", content: contenido }] },
    });
    const commit = await gh(`/repos/${REPO}/git/commits`, {
      method: "POST",
      body: { message: mensaje, tree: tree.sha, parents: [actual.commit] },
    });
    try {
      await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, { method: "PATCH", body: { sha: commit.sha, force: false } });
      memo = { at: Date.now(), commit: commit.sha, pedidos };
      return resultado;
    } catch (e) {
      if (e.status !== 422 && e.status !== 409) throw e; // 422: alguien guardó antes; se vuelve a intentar
      await espera(intento);
    }
  }
  const err = new Error("Hay muchas compras al mismo tiempo. Intenta de nuevo en un momento.");
  err.publico = true;
  throw err;
}
const espera = (n) => new Promise((r) => setTimeout(r, 120 + Math.random() * 300 * (n + 1)));

/* ---------------- utilidades ---------------- */
const limpiar = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const limpiarTexto = (v, max) => String(v == null ? "" : v).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").trim().slice(0, max);
const normal = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function nuevoCodigo(usados) {
  for (;;) {
    let c = "";
    for (let i = 0; i < 8; i++) c += ALFABETO[crypto.randomInt(ALFABETO.length)];
    c = `NAV-${c.slice(0, 4)}-${c.slice(4)}`;
    if (!usados.has(c)) { usados.add(c); return c; }
  }
}

// "Lucía Méndez Soto" → "Lucía M." (lo único del comprador que se ve en el seguimiento público)
function nombreCorto(n) {
  const p = String(n || "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "Anónimo";
  return p.length > 1 ? `${p[0]} ${p[1][0].toUpperCase()}.` : p[0];
}

function estadisticas(pedidos) {
  let comprados = 0, enviados = 0, entregados = 0, pendientes = 0;
  for (const p of pedidos) {
    if (CONFIRMADOS.includes(p.estado)) comprados++;
    if (p.estado === "Enviado" || p.estado === "Entregado") enviados++;
    if (p.estado === "Entregado") entregados++;
    if (p.estado === "Pendiente de pago") pendientes++;
  }
  return { ok: true, comprados, enviados, entregados, pendientes };
}

let catalogo = null; // { at, libros }
async function leerCatalogo(req) {
  if (catalogo && Date.now() - catalogo.at < 300000) return catalogo.libros;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const base = process.env.SITIO_URL || `https://${host}`;
  const r = await fetch(`${base}/data/biblioteca.json`, { headers: { "Cache-Control": "no-cache" } });
  if (!r.ok) throw new Error(`catálogo ${r.status}`);
  const d = await r.json();
  catalogo = { at: Date.now(), libros: (d && d.libros) || [] };
  return catalogo.libros;
}

// Límite simple por IP (en memoria de cada instancia) para frenar envíos automáticos.
const visitas = new Map();
function demasiados(ip) {
  const ahora = Date.now();
  const lista = (visitas.get(ip) || []).filter((t) => ahora - t < 600000);
  lista.push(ahora);
  visitas.set(ip, lista);
  if (visitas.size > 5000) visitas.clear();
  return lista.length > 8;
}

async function leerCuerpo(req) {
  let b = req.body;
  if (b === undefined) {
    b = await new Promise((ok, mal) => {
      let s = "";
      req.on("data", (c) => { s += c; if (s.length > 20000) { mal(new Error("muy grande")); req.destroy(); } });
      req.on("end", () => ok(s));
      req.on("error", mal);
    });
  }
  if (Buffer.isBuffer(b)) b = b.toString("utf8");
  if (typeof b === "string") b = b ? JSON.parse(b) : {};
  return b && typeof b === "object" ? b : {};
}

function responder(res, status, data, cache) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cache || "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  res.end(JSON.stringify(data));
}

/* ---------------- quién administra ---------------- */
const admins = new Map(); // huella del token → { login, hasta }
async function administrador(req) {
  const m = /^Bearer\s+([\w.-]+)$/.exec(req.headers.authorization || "");
  if (!m) return null;
  const huella = crypto.createHash("sha256").update(m[1]).digest("hex");
  const c = admins.get(huella);
  if (c && c.hasta > Date.now()) return c.login;
  try {
    const repo = await gh(`/repos/${SITE_REPO}`, {}, m[1]);
    const perm = repo && repo.permissions;
    if (!perm || !(perm.push || perm.admin || perm.maintain)) return null;
    const user = await gh("/user", {}, m[1]);
    const login = (user && user.login) || "panel";
    admins.set(huella, { login, hasta: Date.now() + 600000 });
    return login;
  } catch (e) {
    return null;
  }
}

/* ---------------- acciones ---------------- */
async function registrar(req, res) {
  const ip = String(req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "").split(",")[0].trim() || "local";
  let b;
  try { b = await leerCuerpo(req); } catch (e) { return responder(res, 400, { ok: false, error: "Solicitud no válida." }); }

  // Trampas para robots: campo oculto lleno o formulario enviado en menos de 1,5 segundos.
  if (b.web || (typeof b.t === "number" && b.t >= 0 && b.t < 1500)) {
    return responder(res, 400, { ok: false, error: "No pudimos registrar tu compra. Intenta de nuevo." });
  }
  if (demasiados(ip)) return responder(res, 429, { ok: false, error: "Hiciste muchas compras seguidas. Espera unos minutos o escríbenos por WhatsApp." });

  const nombre = limpiar(b.nombre, 80);
  const correo = limpiar(b.correo, 120).toLowerCase();
  const telefono = limpiar(b.telefono, 30);
  const comuna = limpiar(b.comuna, 60);
  const dedicatoria = limpiarTexto(b.dedicatoria, 300);
  const cantidad = Math.min(MAX_POR_PEDIDO, Math.max(1, parseInt(b.cantidad, 10) || 1));
  if (nombre.length < 2) return responder(res, 400, { ok: false, error: "Escribe tu nombre y apellido." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return responder(res, 400, { ok: false, error: "Revisa tu correo electrónico." });
  if (telefono.replace(/\D/g, "").length < 8) return responder(res, 400, { ok: false, error: "Escribe un teléfono de contacto." });
  if (b.terminos !== true) return responder(res, 400, { ok: false, error: "Para continuar, acepta los términos y condiciones." });

  let libros;
  try { libros = await leerCatalogo(req); } catch (e) { return responder(res, 503, { ok: false, error: "No pudimos cargar el catálogo. Intenta de nuevo en un momento." }); }
  const libro = libros.find((l) => l && l.disponible !== false && normal(l.titulo) === normal(b.libro || ""));
  if (!libro) return responder(res, 400, { ok: false, error: "Ese libro ya no está disponible." });
  const colores = (libro.colores || []).map(String).filter(Boolean);
  const formatos = (libro.formatos || []).map(String).filter(Boolean);
  const color = colores.find((c) => normal(c) === normal(b.color || "")) || "";
  const formato = formatos.find((f) => normal(f) === normal(b.formato || "")) || (formatos.length === 1 ? formatos[0] : "");
  if (colores.length && !color) return responder(res, 400, { ok: false, error: "Elige el color del libro." });
  if (formatos.length && !formato) return responder(res, 400, { ok: false, error: "Elige el formato." });
  const valor = Math.max(0, parseInt(libro.precio, 10) || 0);

  const creado = new Date().toISOString();
  const pedido = "P-" + creado.slice(0, 10).replace(/-/g, "") + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
  let codigos;
  try {
    codigos = await guardar((pedidos) => {
      const hora = Date.now() - 3600000;
      const recientes = pedidos.filter((p) => p.correo === correo && Date.parse(p.creado) > hora).length;
      if (recientes + cantidad > 30) {
        const err = new Error("Ya registraste muchos libros en la última hora. Escríbenos por WhatsApp para pedidos grandes.");
        err.publico = true;
        throw err;
      }
      const usados = new Set(pedidos.map((p) => p.codigo));
      const nuevos = [];
      for (let i = 0; i < cantidad; i++) {
        const codigo = nuevoCodigo(usados);
        nuevos.push(codigo);
        pedidos.push({
          codigo, pedido, creado, libro: String(libro.titulo), color, formato, valor,
          nombre, correo, telefono, comuna, dedicatoria,
          estado: "Pendiente de pago", pago: "", envio: "", entrega: "",
          residencia: "", notas: "", actualizado: creado, por: "web",
          terminos: TERMINOS, // versión de los términos y condiciones que aceptó el comprador
        });
      }
      return nuevos;
    }, `Pedido ${pedido}: ${cantidad} × ${libro.titulo}`);
  } catch (e) {
    if (e.publico) return responder(res, 409, { ok: false, error: e.message });
    console.error("[pedidos] registrar:", e.message, e.data || "");
    return responder(res, 502, { ok: false, error: "No pudimos registrar tu compra en este momento." });
  }
  return responder(res, 200, { ok: true, pedido, codigos, libro: String(libro.titulo), color, formato, valor });
}

async function seguimiento(req, res, q) {
  const codigo = limpiar(q.get("codigo"), 20).toUpperCase();
  if (!/^NAV-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(codigo)) return responder(res, 200, { ok: false, error: "Ese código no es válido" }, "public, s-maxage=60");
  const { pedidos } = await leer(false);
  const p = pedidos.find((x) => x.codigo === codigo);
  const est = estadisticas(pedidos);
  if (!p) return responder(res, 200, { ok: false, error: "No encontramos ese código", estadisticas: est }, "public, s-maxage=15");
  return responder(res, 200, {
    ok: true,
    codigo: p.codigo,
    libro: p.libro,
    color: p.color,
    formato: p.formato,
    nombre: nombreCorto(p.nombre),
    estado: p.estado,
    fechas: { compra: p.creado, pago: p.pago, envio: p.envio, entrega: p.entrega },
    estadisticas: est,
  }, "public, s-maxage=10, stale-while-revalidate=30");
}

async function lista(req, res) {
  const login = await administrador(req);
  if (!login) return responder(res, 401, { ok: false, error: "Tu usuario de GitHub no tiene permiso para ver los pedidos." });
  const { pedidos } = await leer(true);
  return responder(res, 200, { ok: true, usuario: login, repo: REPO, pedidos, estados: ESTADOS });
}

async function actualizar(req, res) {
  const login = await administrador(req);
  if (!login) return responder(res, 401, { ok: false, error: "Tu usuario de GitHub no tiene permiso para cambiar pedidos." });
  let b;
  try { b = await leerCuerpo(req); } catch (e) { return responder(res, 400, { ok: false, error: "Solicitud no válida." }); }
  const cambios = (Array.isArray(b.cambios) ? b.cambios : []).slice(0, 500);
  if (!cambios.length) return responder(res, 400, { ok: false, error: "No hay cambios." });
  for (const c of cambios) {
    if (c.estado !== undefined && !ESTADOS.includes(c.estado)) return responder(res, 400, { ok: false, error: `Estado no válido: ${c.estado}` });
  }
  const resumen = cambios.length === 1 ? `${cambios[0].codigo}${cambios[0].estado ? " → " + cambios[0].estado : ""}` : `${cambios.length} libros${cambios[0].estado ? " → " + cambios[0].estado : ""}`;
  try {
    const listos = await guardar((pedidos) => {
      const ahora = new Date().toISOString();
      const porCodigo = new Map(pedidos.map((p) => [p.codigo, p]));
      const out = [];
      for (const c of cambios) {
        const p = porCodigo.get(String(c.codigo || "").toUpperCase());
        if (!p) continue;
        if (c.estado !== undefined && c.estado !== p.estado) {
          const nivel = CONFIRMADOS.indexOf(c.estado); // -1 pendiente/anulado, 0 comprado, 1 enviado, 2 entregado
          // Fechas automáticas: al avanzar se anotan las que falten; al retroceder se borran las posteriores.
          if (nivel >= 0 && !p.pago) p.pago = ahora;
          if (nivel >= 1 && !p.envio) p.envio = ahora;
          if (nivel >= 2 && !p.entrega) p.entrega = ahora;
          if (c.estado === "Pendiente de pago") { p.pago = ""; p.envio = ""; p.entrega = ""; }
          if (nivel === 0) { p.envio = ""; p.entrega = ""; }
          if (nivel === 1) p.entrega = "";
          p.estado = c.estado;
        }
        if (c.residencia !== undefined) p.residencia = limpiar(c.residencia, 120);
        if (c.notas !== undefined) p.notas = limpiarTexto(c.notas, 500);
        p.actualizado = ahora;
        p.por = login;
        out.push(p);
      }
      return out;
    }, `Panel (${login}): ${resumen}`);
    return responder(res, 200, { ok: true, pedidos: listos });
  } catch (e) {
    console.error("[pedidos] actualizar:", e.message, e.data || "");
    return responder(res, 502, { ok: false, error: e.publico ? e.message : "No se pudo guardar. Intenta de nuevo." });
  }
}

module.exports = async (req, res) => {
  const q = new URL(req.url, "https://localhost").searchParams;
  const accion = q.get("accion") || "";
  if (!process.env.PEDIDOS_TOKEN) {
    return responder(res, 503, { ok: false, sinConfig: true, error: "El sistema de pedidos aún no está conectado." });
  }
  try {
    if (req.method === "GET" && accion === "estadisticas") {
      const { pedidos } = await leer(false);
      return responder(res, 200, estadisticas(pedidos), "public, s-maxage=20, stale-while-revalidate=60");
    }
    if (req.method === "GET" && accion === "seguimiento") return await seguimiento(req, res, q);
    if (req.method === "GET" && accion === "lista") return await lista(req, res);
    if (req.method === "POST" && accion === "actualizar") return await actualizar(req, res);
    if (req.method === "POST" && !accion) return await registrar(req, res);
    return responder(res, 404, { ok: false, error: "Acción no válida." });
  } catch (e) {
    console.error("[pedidos]", accion, e.message, e.data || "");
    const sinRepo = e.status === 404 || e.status === 401 || e.status === 403;
    return responder(res, 502, { ok: false, error: sinRepo ? "No se pudo abrir el repositorio de pedidos. Revisa PEDIDOS_TOKEN y PEDIDOS_REPO." : "Error temporal. Intenta de nuevo." });
  }
};
