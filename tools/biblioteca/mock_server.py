"""
Simulador local del sistema de pedidos (imita la API de pedidos.gs) para probar el sitio sin Google.
Uso:  python tools/biblioteca/mock_server.py      → http://localhost:8766
Luego pon "pedidos_url": "http://localhost:8766/" en data/sistema.json (solo para probar; no lo publiques).
Para cambiar el estado de un pedido:  http://localhost:8766/?accion=estado&codigo=NAV-XXXX-XXXX&estado=Enviado
"""
import json
import pathlib
import random
import re
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

ROOT = pathlib.Path(__file__).resolve().parents[2]
PEDIDOS = []
ABC = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def ahora():
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def estadisticas():
    e = [p["estado"] for p in PEDIDOS]
    return {"ok": True, "comprados": sum(x in ("Comprado", "Enviado", "Entregado") for x in e),
            "enviados": sum(x in ("Enviado", "Entregado") for x in e), "entregados": e.count("Entregado"),
            "pendientes": e.count("Pendiente de pago"), "actualizado": ahora()}


def registrar(d):
    cat = json.loads((ROOT / "data" / "biblioteca.json").read_text(encoding="utf-8"))
    libro = next((l for l in cat["libros"] if l["titulo"] == d.get("libro") and l.get("disponible", True)), None)
    if not libro:
        return {"ok": False, "error": "Ese libro ya no está disponible."}
    if len(str(d.get("nombre", "")).strip()) < 2:
        return {"ok": False, "error": "Escribe tu nombre."}
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$", str(d.get("correo", ""))):
        return {"ok": False, "error": "Revisa tu correo electrónico."}
    if libro.get("colores") and d.get("color") not in libro["colores"]:
        return {"ok": False, "error": "Elige un color."}
    n = max(1, min(10, int(d.get("cantidad") or 1)))
    codigos = []
    for _ in range(n):
        c = "".join(random.choice(ABC) for _ in range(8))
        c = f"NAV-{c[:4]}-{c[4:]}"
        codigos.append(c)
        PEDIDOS.append({"codigo": c, "libro": libro["titulo"], "color": d.get("color", ""), "formato": d.get("formato", ""),
                        "nombre": d["nombre"].strip(), "estado": "Pendiente de pago",
                        "fechas": {"registro": ahora(), "pago": "", "envio": "", "entrega": ""}})
    print("pedido", codigos, d.get("nombre"), d.get("correo"))
    return {"ok": True, "codigos": codigos, "libro": libro["titulo"], "color": d.get("color", ""),
            "formato": d.get("formato", ""), "valor": libro.get("precio", 0), "cantidad": n}


def seguimiento(codigo):
    p = next((x for x in PEDIDOS if x["codigo"] == str(codigo).upper()), None)
    if not p:
        return {"ok": False, "error": "No encontramos ese código."}
    partes = p["nombre"].split()
    nombre = partes[0] + (f" {partes[1][0].upper()}." if len(partes) > 1 else "")
    return {"ok": True, **{k: p[k] for k in ("codigo", "libro", "color", "formato", "estado", "fechas")},
            "nombre": nombre, "estadisticas": estadisticas()}


class H(BaseHTTPRequestHandler):
    def send(self, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        q = {k: v[0] for k, v in parse_qs(urlparse(self.path).query).items()}
        a = q.get("accion")
        if a == "seguimiento":
            return self.send(seguimiento(q.get("codigo", "")))
        if a == "estadisticas":
            return self.send(estadisticas())
        if a == "estado":
            for p in PEDIDOS:
                if p["codigo"] == q.get("codigo"):
                    p["estado"] = q.get("estado", p["estado"])
                    key = {"Comprado": "pago", "Enviado": "envio", "Entregado": "entrega"}.get(p["estado"])
                    for k in ("pago", "envio", "entrega"):
                        if not p["fechas"][k]:
                            p["fechas"][k] = ahora()
                        if k == key:
                            break
            return self.send({"ok": True})
        self.send({"ok": True, "servicio": "simulador"})

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        self.send(registrar(json.loads(self.rfile.read(n) or b"{}")))


if __name__ == "__main__":
    print("Simulador en http://localhost:8766")
    HTTPServer(("127.0.0.1", 8766), H).serve_forever()
