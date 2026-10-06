// Respuesta de GitHub: cambia el código por un token y se lo entrega al panel de Decap CMS.
// Opcional: ALLOWED_ORIGINS="https://www.tudominio.cl,https://tudominio.cl" si abres /admin desde más de un dominio.

module.exports = async (req, res) => {
  const url = new URL(req.url, "https://localhost");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const saved = ((req.headers.cookie || "").split(/;\s*/).find((c) => c.startsWith("decap_oauth_state=")) || "").split("=")[1];

  let status = "error";
  let content = { message: "La sesión expiró o no es válida. Cierra esta ventana e inténtalo de nuevo." };

  if (code && state && saved && state === saved) {
    try {
      const r = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.OAUTH_GITHUB_CLIENT_ID,
          client_secret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const data = await r.json();
      if (data.access_token) {
        status = "success";
        content = { token: data.access_token, provider: "github" };
      } else {
        content = { message: data.error_description || "GitHub no entregó un token." };
      }
    } catch (e) {
      content = { message: "No se pudo conectar con GitHub." };
    }
  }

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const allowed = (process.env.ALLOWED_ORIGINS || `https://${host}`).split(",").map((s) => s.trim()).filter(Boolean);
  const message = `authorization:github:${status}:${JSON.stringify(content)}`;
  const js = (v) => JSON.stringify(v).replace(/</g, "\\u003c");

  res.setHeader("Set-Cookie", "decap_oauth_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.statusCode = 200;
  res.end(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Conectando…</title></head>
<body style="font-family:system-ui,sans-serif;padding:2rem">
<p>${status === "success" ? "Sesión iniciada. Esta ventana se cerrará sola." : "No se pudo iniciar sesión."}</p>
<script>
(function () {
  var allowed = ${js(allowed)};
  var message = ${js(message)};
  function receive(e) {
    if (allowed.indexOf(e.origin) === -1) return;
    window.opener.postMessage(message, e.origin);
    window.removeEventListener("message", receive, false);
  }
  if (!window.opener) { document.body.insertAdjacentHTML("beforeend", "<p>Abre el panel desde /admin.</p>"); return; }
  window.addEventListener("message", receive, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
</body></html>`);
};
