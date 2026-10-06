// Inicio del login con GitHub para Decap CMS (función serverless de Vercel).
// Variables de entorno requeridas en Vercel: OAUTH_GITHUB_CLIENT_ID, OAUTH_GITHUB_CLIENT_SECRET
const crypto = require("crypto");

module.exports = (req, res) => {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  if (!clientId) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Falta configurar OAUTH_GITHUB_CLIENT_ID en Vercel.");
    return;
  }
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const state = crypto.randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `https://${host}/api/callback`,
    scope: process.env.OAUTH_SCOPE || "repo,user",
    state,
  });
  res.setHeader("Set-Cookie", `decap_oauth_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  res.setHeader("Cache-Control", "no-store");
  res.statusCode = 302;
  res.setHeader("Location", `https://github.com/login/oauth/authorize?${params}`);
  res.end();
};
