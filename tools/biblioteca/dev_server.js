// Prueba local del sistema de pedidos SIN tocar GitHub ni Vercel.
// Uso:  node tools/biblioteca/dev_server.js      → http://127.0.0.1:8765
//
// - Sirve el sitio (con direcciones limpias, como Vercel) y la función api/pedidos.js.
// - Simula la API de GitHub en memoria (repositorio privado de pedidos + permisos del panel).
// - En /admin/pedidos, el token "admin-test" entra como administrador (se guarda solo en sessionStorage):
//     sessionStorage.setItem("pedidos-token", "admin-test")
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..", "..");
const PORT = +process.env.PORT || 8765;
const GH_PORT = PORT + 25;

/* ---------- GitHub simulado ---------- */
const repo = { head: null, commits: {}, trees: {}, file: null }; // file: contenido de pedidos.json en head
const sha = () => crypto.randomBytes(20).toString("hex");
function ghServer() {
  return http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const u = new URL(req.url, "http://x");
      const auth = (req.headers.authorization || "").replace(/^Bearer\s+/, "");
      const send = (st, data, raw) => { res.writeHead(st, { "Content-Type": raw ? "text/plain" : "application/json" }); res.end(raw ? data : JSON.stringify(data)); };
      const j = body ? JSON.parse(body) : {};
      // Permisos del panel (token del usuario)
      if (req.method === "GET" && u.pathname === "/repos/lautaropps2/ong-nuestros-origenes") {
        if (auth === "admin-test") return send(200, { permissions: { admin: false, push: true, pull: true } });
        if (auth === "lector-test") return send(200, { permissions: { admin: false, push: false, pull: true } });
        return send(401, { message: "Bad credentials" });
      }
      if (req.method === "GET" && u.pathname === "/user") return auth === "admin-test" ? send(200, { login: "panel-prueba" }) : send(401, {});
      // Repositorio privado de pedidos (token del servidor)
      if (auth !== "token-servidor") return send(401, { message: "Bad credentials" });
      const base = "/repos/lautaropps2/ong-pedidos";
      if (req.method === "GET" && u.pathname === base + "/git/ref/heads/main") return repo.head ? send(200, { object: { sha: repo.head } }) : send(409, { message: "Git Repository is empty." });
      if (req.method === "GET" && u.pathname.startsWith(base + "/git/commits/")) {
        const c = repo.commits[u.pathname.split("/").pop()];
        return c ? send(200, { sha: c.sha, tree: { sha: c.tree } }) : send(404, {});
      }
      if (req.method === "GET" && u.pathname === base + "/contents/pedidos.json") {
        const c = repo.commits[u.searchParams.get("ref")];
        const t = c && repo.trees[c.tree];
        return t ? send(200, t.content, true) : send(404, { message: "Not Found" });
      }
      if (req.method === "PUT" && u.pathname === base + "/contents/pedidos.json") {
        if (repo.head) return send(422, { message: "sha required" });
        const tree = sha(), c = sha();
        repo.trees[tree] = { content: Buffer.from(j.content, "base64").toString("utf8") };
        repo.commits[c] = { sha: c, tree, parent: null, message: j.message };
        repo.head = c;
        return send(201, { commit: { sha: c } });
      }
      if (req.method === "POST" && u.pathname === base + "/git/trees") {
        const tree = sha(); repo.trees[tree] = { content: j.tree[0].content }; return send(201, { sha: tree });
      }
      if (req.method === "POST" && u.pathname === base + "/git/commits") {
        const c = sha(); repo.commits[c] = { sha: c, tree: j.tree, parent: j.parents[0], message: j.message };
        console.log("  commit:", j.message);
        return send(201, { sha: c });
      }
      if (req.method === "PATCH" && u.pathname === base + "/git/refs/heads/main") {
        const c = repo.commits[j.sha];
        if (!c || c.parent !== repo.head) return send(422, { message: "Update is not a fast forward" });
        repo.head = j.sha; return send(200, { object: { sha: j.sha } });
      }
      send(404, { message: "Not Found (simulado)" });
    });
  });
}

/* ---------- sitio + función ---------- */
process.env.PEDIDOS_TOKEN = "token-servidor";
process.env.GITHUB_API = `http://127.0.0.1:${GH_PORT}`;
process.env.SITIO_URL = `http://127.0.0.1:${PORT}`;
const pedidos = require(path.join(ROOT, "api", "pedidos.js"));
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".yml": "text/yaml", ".txt": "text/plain", ".xml": "application/xml", ".mp4": "video/mp4" };

http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/api/pedidos") return pedidos(req, res);
  let p = decodeURIComponent(u.pathname);
  if (p.endsWith("/")) p += "index.html";
  let f = path.join(ROOT, p);
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(f) && fs.existsSync(f + ".html")) f += ".html";
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("404"); }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(f).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  });
}).listen(PORT, "127.0.0.1", () => console.log(`Sitio de prueba: http://127.0.0.1:${PORT}  (pedidos en memoria)`));
ghServer().listen(GH_PORT, "127.0.0.1");
