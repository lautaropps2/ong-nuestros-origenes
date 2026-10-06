"""
IMPORTACIÓN MASIVA de fotos a la galería (uso ocasional).
Lo normal es agregar o borrar fotos desde el panel: https://tudominio.cl/admin

Este script copia una carpeta de fotos a assets/img/galeria/ y escribe data/galeria.json,
que es el archivo que lee la web y que edita el panel. Cada foto debe llevar el año en su
nombre (p. ej. "feria navideña 2019 intendencia.jpg"); el nombre sin extensión es el título.

Uso:  python tools/galeria.py "C:\\ruta\\a\\las\\fotos" --force
Sin --force no hace nada si data/galeria.json ya existe (para no borrar lo publicado desde el panel).
"""
import json
import pathlib
import re
import shutil
import sys
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT_IMG = ROOT / "assets" / "img" / "galeria"
OUT_JSON = ROOT / "data" / "galeria.json"
OVERRIDES = ROOT / "tools" / "fotos-mejoradas"
EXTRA = ROOT / "tools" / "fotos-extra"
# Fotos de la carpeta que NO deben aparecer en la galería (nombre sin extensión)
EXCLUDE = {
    "feria navideña 2019 intendencia",
    "feria navideña 2019 intendencia 1",
}
# Títulos corregidos: nombre original del archivo -> título que se muestra (el año se toma del título)
RENAME = {
    "campaña apaga la TV 2009 TITEREDUCA": "campaña apaga la TV 2012 TITEREDUCA",
}
VIDEO_EXTS = {".mp4", ".webm"}
EXTS = {".jpg", ".jpeg", ".png", ".webp"} | VIDEO_EXTS


def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def collect(src):
    items = []
    files = list(pathlib.Path(src).iterdir()) + (list(EXTRA.iterdir()) if EXTRA.exists() else [])
    excl = {x.lower() for x in EXCLUDE}
    for f in files:
        if f.suffix.lower() not in EXTS or f.stem.strip().lower() in excl:
            continue
        title = RENAME.get(f.stem.strip(), f.stem.strip())
        m = re.search(r"(19|20)\d{2}", title)
        if not m:
            print("sin año, se omite:", f.name)
            continue
        better = OVERRIDES / f.name  # versión mejorada con el mismo nombre, si existe
        items.append({"src": better if better.exists() else f, "year": int(m.group(0)), "title": title,
                      "video": f.suffix.lower() in VIDEO_EXTS})
    items.sort(key=lambda x: (x["year"], x["title"].lower()))
    return items


def main():
    args = [a for a in sys.argv[1:] if a != "--force"]
    if OUT_JSON.exists() and "--force" not in sys.argv:
        print(f"{OUT_JSON} ya existe. Usa --force para reemplazarlo (se perderá lo editado en el panel).")
        return
    src = args[0] if args else r"C:\Users\lmlau\Downloads\img ogn\ong m"
    items = collect(src)
    OUT_IMG.mkdir(parents=True, exist_ok=True)
    fotos = []
    for it in items:
        name = f'{it["year"]}-{slug(it["title"])}{it["src"].suffix.lower()}'
        shutil.copy2(it["src"], OUT_IMG / name)
        entry = {"titulo": it["title"], "anio": it["year"], "imagen": "", "video": ""}
        entry["video" if it["video"] else "imagen"] = f"assets/img/galeria/{name}"
        fotos.append(entry)
    OUT_JSON.parent.mkdir(exist_ok=True)
    OUT_JSON.write_text(json.dumps({"fotos": fotos}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for f in fotos:
        print(f["anio"], "-", f["titulo"])
    print(f"{len(fotos)} elementos -> {OUT_JSON}")


if __name__ == "__main__":
    main()
