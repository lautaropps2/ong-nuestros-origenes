"""
Genera las páginas del sitio a partir de tools/pages/*.html
Uso:  python tools/build.py
El header, el footer y los íconos se escriben una sola vez aquí.
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "pages"
V = "20261006c"  # cache-buster: súbelo en cada publicación

WA = "https://wa.me/56926175941"
IG = "https://www.instagram.com/nuestrosorigenesong/"
MAIL = "nuestrosorigenesong@gmail.com"
MAPS = "https://www.google.com/maps/search/?api=1&amp;query=Calle%20Jorge%20Rivera%20967%2C%20Rancagua%2C%20Chile"

PAGES = [
    ("inicio", "index.html", "ONG Nuestros Orígenes · Rancagua, Chile",
     "Promovemos y protegemos los derechos de pueblos originarios y comunidades migrantes residentes en Chile. Rancagua, desde 2014."),
    ("quienes", "quienes-somos.html", "Quiénes somos · ONG Nuestros Orígenes",
     "Conoce a ONG Nuestros Orígenes: nuestra organización, misión, marco legal y los once pueblos originarios reconocidos en Chile."),
    ("trabajo", "nuestro-trabajo.html", "Nuestro trabajo · ONG Nuestros Orígenes",
     "Líneas de trabajo y proyectos emblemáticos de ONG Nuestros Orígenes en Rancagua, Rapa Nui y la Región de O'Higgins."),
    ("noticias", "noticias.html", "Noticias · ONG Nuestros Orígenes",
     "Novedades de ONG Nuestros Orígenes: celebración de nuestros 12 años y reunión de socios, 16 de octubre de 2026 en Rancagua."),
    ("galeria", "galeria.html", "Galería · ONG Nuestros Orígenes",
     "Línea de tiempo fotográfica de ONG Nuestros Orígenes: Titereduca, lengua de señas, Rapa Nui, ferias y reciclaje RAEE, de 2012 a hoy."),
    ("apoyanos", "apoyanos.html", "Apóyanos · ONG Nuestros Orígenes",
     "Colabora con aportes, auspicios o donaciones para el comedor abierto, salud mental, regularización migratoria y más en Rancagua."),
    ("bazar", "bazar.html", "Bazar Dign@ y Emporio · ONG Nuestros Orígenes",
     "Ropa y accesorios reciclados, emporio, vivero urbano y artesanía. Con tu compra apoyas a personas en situación de calle."),
    ("contacto", "contacto.html", "Contacto · ONG Nuestros Orígenes",
     "Escríbenos por WhatsApp al +56 9 2617 5941, por correo o visítanos en Calle Jorge Rivera #967, Rancagua."),
]

NAV = [
    ("inicio", "index.html", "Inicio", []),
    ("quienes", "quienes-somos.html", "Quiénes somos", [
        ("quienes-somos.html#organizacion", "Nuestra organización"),
        ("quienes-somos.html#mision", "Misión y marco"),
        ("quienes-somos.html#pueblos", "Pueblos originarios"),
    ]),
    ("trabajo", "nuestro-trabajo.html", "Nuestro trabajo", [
        ("nuestro-trabajo.html#que-hacemos", "Qué hacemos"),
        ("nuestro-trabajo.html#proyectos", "Proyectos emblemáticos"),
    ]),
    ("noticias", "noticias.html", "Noticias", []),
    ("galeria", "galeria.html", "Galería", []),
    ("apoyanos", "apoyanos.html", "Apóyanos", []),
    ("bazar", "bazar.html", "Bazar", []),
    ("contacto", "contacto.html", "Contacto", []),
]

FAVICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 7 7' shape-rendering='crispEdges'%3E"
           "%3Cpath fill='%23E3120B' d='M0 0h3v1H2v1H1v1H0z'/%3E%3Cpath fill='%2300A651' d='M7 0v3H6V2H5V1H4V0z'/%3E"
           "%3Cpath fill='%23F7D417' d='M0 7h3V6H2V5H1V4H0z'/%3E%3Cpath fill='%23D6D4CC' d='M7 7H4V6h1V5h1V4h1z'/%3E"
           "%3Cpath fill='%23050506' d='M3 0h1v1h1v1h1v1h1v1H6v1H5v1H4v1H3V6H2V5H1V4H0V3h1V2h1V1h1z'/%3E"
           "%3Cpath fill='%23fff' d='M3 3h1v1H3z'/%3E%3C/svg%3E")

SPRITE = """<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<symbol id="logo" viewBox="0 0 7 7" shape-rendering="crispEdges"><path fill="#E3120B" d="M0 0h3v1H2v1H1v1H0z"/><path fill="#00A651" d="M7 0v3H6V2H5V1H4V0z"/><path fill="#F7D417" d="M0 7h3V6H2V5H1V4H0z"/><path style="fill:var(--logo-w,#FFFFFF)" d="M7 7H4V6h1V5h1V4h1z"/><path fill="#050506" d="M3 0h1v1h1v1h1v1h1v1H6v1H5v1H4v1H3V6H2V5H1V4H0V3h1V2h1V1h1z"/><path fill="#FFFFFF" d="M3 3h1v1H3z"/></symbol>
<symbol id="chakana" viewBox="0 0 7 7" shape-rendering="crispEdges"><path fill="currentColor" fill-rule="evenodd" d="M3 0h1v1h1v1h1v1h1v1H6v1H5v1H4v1H3V6H2V5H1V4H0V3h1V2h1V1h1zM3 3v1h1V3z"/></symbol>
<symbol id="wa" viewBox="0 0 24 24"><path d="M12 2.6a9.4 9.4 0 0 0-8.1 14.2L2.6 21.4l4.7-1.2A9.4 9.4 0 1 0 12 2.6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path fill="currentColor" d="M9.1 7.2c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.3.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.8 2.9 4.5 4 2.2.9 2.7.7 3.2.7.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3l-1.9-.9c-.3-.1-.5-.1-.7.1l-.9 1.1c-.2.2-.3.2-.6.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.5-1.5-1.8-.2-.3 0-.4.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2z"/></symbol>
<symbol id="i-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></symbol>
<symbol id="i-arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
<symbol id="i-bag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4.5 8h15l-1.2 12.5H5.7z"/><path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10"/></symbol>
<symbol id="i-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></symbol>
<symbol id="i-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></symbol>
<symbol id="i-mail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/></symbol>
<symbol id="i-ig" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".9" fill="currentColor" stroke="none"/></symbol>
<symbol id="i-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></symbol>
<symbol id="i-scale" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M16 4v24M9 28h14M6 9h20"/><path d="M6 9l-4 9h8zM26 9l-4 9h8z"/><path d="M2 18a4 4 0 0 0 8 0M22 18a4 4 0 0 0 8 0"/></symbol>
<symbol id="i-hand" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><circle cx="20" cy="9" r="5"/><path d="M20 6.5v5M18 9h4"/><path d="M3 22h5l6 2h6l8-5-2-2-7 3"/><path d="M3 28h7l5 1 13-6"/><path d="M14 22l5-1"/></symbol>
<symbol id="i-people" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="10" r="3.5"/><circle cx="23" cy="10" r="3.5"/><circle cx="16" cy="15" r="3.5"/><path d="M3 24a6 6 0 0 1 9-5M29 24a6 6 0 0 0-9-5M9 29a7 7 0 0 1 14 0"/></symbol>
<symbol id="i-gear" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="16" cy="16" r="4.5"/><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8"/></symbol>
<symbol id="i-home" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4 15L16 5l12 10"/><path d="M7 13v15h18V13"/><path d="M16 25s-5-3-5-6.5a2.6 2.6 0 0 1 5-1 2.6 2.6 0 0 1 5 1C21 22 16 25 16 25z"/></symbol>
<symbol id="i-community" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="16" cy="16" r="12"/><path d="M16 4v24M4 16h24"/><path d="M10 10h12v12H10z"/></symbol>
<symbol id="i-food" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v8a3 3 0 0 1-6 0V3M5 3v22"/><path d="M22 25V3c-3 2-4 6-4 10h4"/></symbol>
<symbol id="i-mind" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M14 25v-6"/><path d="M14 19c-6 0-9-4-9-9a9 9 0 0 1 18 0c0 5-3 9-9 9z"/><path d="M14 19c0-5 3-8 6-9M14 15c-1-3-3-5-6-5.5"/></symbol>
<symbol id="i-doc" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M6 2h11l5 5v19H6z"/><path d="M17 2v5h5M10 13h8M10 17h8M10 21h5"/></symbol>
<symbol id="i-id" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="6" width="24" height="16" rx="2"/><circle cx="9" cy="13" r="2.5"/><path d="M5 19a4 4 0 0 1 8 0M16 11h7M16 15h7M16 19h4"/></symbol>
<symbol id="i-book" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M14 7c-3-2-7-2.5-11-2v18c4-.5 8 0 11 2 3-2 7-2.5 11-2V5c-4-.5-8 0-11 2zM14 7v18"/></symbol>
<symbol id="i-tool" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M17 4a5 5 0 0 0-5 6.5L3 19.5 6.5 23l9-9A5 5 0 0 0 22 9l-3 1-2-2 1-3z"/></symbol>
<symbol id="i-recycle" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 9l5-6 5 6M20 3v8"/><path d="M11 30H4l4-8M8 22l4 2"/><path d="M29 30h7l-4-8"/><path d="M14 13l-6 9M26 13l6 9M11 30h18"/></symbol>
<symbol id="i-heart" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M14 24S3 17.5 3 10a5.5 5.5 0 0 1 11-1.5A5.5 5.5 0 0 1 25 10c0 7.5-11 14-11 14z"/></symbol>
</defs></svg>"""


def nav_desktop(active):
    out = []
    for key, href, label, sub in NAV:
        cur = ' aria-current="page"' if key == active else ""
        chev = '<svg aria-hidden="true"><use href="#i-chev"/></svg>' if sub else ""
        li = f'<li><a class="top" href="{href}"{cur}>{label}{chev}</a>'
        if sub:
            li += '<div class="sub"><ul>' + "".join(f'<li><a href="{h}">{t}</a></li>' for h, t in sub) + "</ul></div>"
        out.append(li + "</li>")
    return '<nav class="nav" aria-label="Principal"><ul>' + "".join(out) + "</ul></nav>"


def nav_mobile(active):
    out = []
    for key, href, label, sub in NAV:
        cur = ' aria-current="page"' if key == active else ""
        li = f'<li><a class="ml" href="{href}"{cur}>{label}</a>'
        if sub:
            li += '<div class="msub">' + "".join(f'<a href="{h}">{t}</a>' for h, t in sub) + "</div>"
        out.append(li + "</li>")
    return "<ul>" + "".join(out) + "</ul>"


JSONLD = """<script type="application/ld+json">
{"@context":"https://schema.org","@type":"NGO","name":"ONG Nuestros Orígenes",
"description":"Promovemos y protegemos los derechos de pueblos originarios y comunidades migrantes residentes en Chile, en el marco del Convenio 169 de la OIT y la Ley Indígena 19.253.",
"foundingDate":"2014-08-08","foundingLocation":"Rancagua, Chile","areaServed":"CL",
"email":"nuestrosorigenesong@gmail.com","telephone":"+56926175941",
"address":{"@type":"PostalAddress","streetAddress":"Calle Jorge Rivera 967","addressLocality":"Rancagua","addressRegion":"Región del Libertador General Bernardo O'Higgins","addressCountry":"CL"},
"sameAs":["https://www.instagram.com/nuestrosorigenesong/"],
"event":{"@type":"Event","name":"Celebración de los 12 años de ONG Nuestros Orígenes","startDate":"2026-10-16T16:00:00-03:00",
"eventAttendanceMode":"https://schema.org/OfflineEventAttendanceMode","eventStatus":"https://schema.org/EventScheduled",
"location":{"@type":"Place","name":"Sede ONG Nuestros Orígenes","address":"Calle Jorge Rivera 967, Rancagua, Chile"}}}
</script>"""


def layout(key, title, desc, body):
    return f"""<!doctype html>
<html lang="es-CL">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#050506">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_CL">
<meta property="og:site_name" content="ONG Nuestros Orígenes">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<link rel="icon" href="{FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/styles.css?v={V}">
<script>document.documentElement.classList.add("js")</script>
{JSONLD if key == "inicio" else ""}
<script defer src="assets/main.js?v={V}"></script>
</head>
<body data-page="{key}">
{SPRITE}
<a class="skip" href="#contenido">Saltar al contenido</a>

<div class="topbar">
  <div class="wrap">
    <p class="topbar__l">Rancagua, Región de O'Higgins · Desde 2014</p>
    <div class="topbar__r">
      <a href="{WA}" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#wa"/></svg>+56 9 2617 5941</a>
      <a href="{IG}" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-ig"/></svg>Instagram</a>
    </div>
  </div>
</div>

<header class="hdr">
  <div class="wrap hdr__in">
    <a class="lockup" href="index.html" aria-label="Nuestros Orígenes, ir al inicio">
      <svg aria-hidden="true"><use href="#logo"/></svg>
      <span><b>Nuestros</b><b>Orígenes</b></span>
    </a>
    {nav_desktop(key)}
    <div class="hdr__act">
      <a class="btn" href="apoyanos.html">Apóyanos</a>
      <button class="ibtn" type="button" data-cart-open aria-controls="cart" aria-expanded="false" aria-label="Abrir carrito, 0 productos">
        <svg aria-hidden="true"><use href="#i-bag"/></svg><span class="bag__n" data-zero="true" aria-hidden="true">0</span>
      </button>
      <button class="ibtn burger" id="burger" type="button" aria-controls="mnav" aria-expanded="false" aria-label="Abrir menú">
        <svg aria-hidden="true"><use href="#i-menu"/></svg>
      </button>
    </div>
  </div>
</header>

<div class="mnav" id="mnav" role="dialog" aria-modal="true" aria-label="Menú" inert>
  <div class="wrap mnav__h">
    <a class="lockup" href="index.html" aria-label="Nuestros Orígenes, ir al inicio"><svg aria-hidden="true"><use href="#logo"/></svg><span><b>Nuestros</b><b>Orígenes</b></span></a>
    <button class="ibtn" id="mnavClose" type="button" aria-label="Cerrar menú"><svg aria-hidden="true"><use href="#i-x"/></svg></button>
  </div>
  <nav class="wrap" aria-label="Menú móvil">{nav_mobile(key)}</nav>
  <div class="wrap mnav__f"><a class="btn btn--wa" href="{WA}" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#wa"/></svg>Escríbenos por WhatsApp</a></div>
</div>

<main id="contenido">
{body}
</main>

<footer class="ft">
  <div class="wrap">
    <div class="ft__grid">
      <div>
        <a class="lockup" href="index.html" aria-label="Nuestros Orígenes, ir al inicio"><svg aria-hidden="true"><use href="#logo"/></svg><span><b>Nuestros</b><b>Orígenes</b></span></a>
        <p class="ft__about">Promovemos y protegemos los derechos de pueblos originarios y comunidades migrantes residentes en Chile. Rancagua, desde 2014.</p>
      </div>
      <div>
        <h4>Organización</h4>
        <ul>
          <li><a href="quienes-somos.html">Quiénes somos</a></li>
          <li><a href="quienes-somos.html#pueblos">Pueblos originarios</a></li>
          <li><a href="nuestro-trabajo.html">Nuestro trabajo</a></li>
          <li><a href="nuestro-trabajo.html#proyectos">Proyectos</a></li>
        </ul>
      </div>
      <div>
        <h4>Participa</h4>
        <ul>
          <li><a href="noticias.html">Noticias</a></li>
          <li><a href="galeria.html">Galería</a></li>
          <li><a href="apoyanos.html">Apóyanos</a></li>
          <li><a href="bazar.html">Bazar Dign@ y Emporio</a></li>
          <li><a href="contacto.html">Contacto</a></li>
        </ul>
      </div>
      <div>
        <h4>Contacto</h4>
        <ul>
          <li><a href="{WA}" target="_blank" rel="noopener">WhatsApp +56 9 2617 5941</a></li>
          <li><a href="mailto:{MAIL}">{MAIL}</a></li>
          <li><a href="{IG}" target="_blank" rel="noopener">Instagram @nuestrosorigenesong</a></li>
          <li><a href="{MAPS}" target="_blank" rel="noopener">Calle Jorge Rivera #967, Rancagua</a></li>
        </ul>
      </div>
    </div>
    <div class="ft__bottom">
      <p>Reconocemos que este territorio es y ha sido habitado por pueblos originarios desde mucho antes de llamarse Chile.</p>
      <p>© 2026 ONG Nuestros Orígenes</p>
    </div>
  </div>
</footer>

<a class="fab" href="{WA}" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp"><svg aria-hidden="true"><use href="#wa"/></svg></a>
</body>
</html>
"""


def main():
    for key, fname, title, desc in PAGES:
        body = (SRC / fname).read_text(encoding="utf-8")
        body = body.replace("{WA}", WA).replace("{MAPS}", MAPS).replace("{MAIL}", MAIL).replace("{IG}", IG)
        (ROOT / fname).write_text(layout(key, title, desc, body), encoding="utf-8")
        print("ok", fname)


if __name__ == "__main__":
    main()
