/* Código QR con la marca de ONG Nuestros Orígenes (requiere assets/vendor/qrcode.js).
   - Esquinas en los colores de la ONG: rojo arriba a la izquierda y verde arriba a la derecha, como en el logo.
   - Símbolo de la ONG (la chakana de 7×7) al centro, sobre un recuadro blanco.
   - Usa corrección de errores alta (H, o Q si el enlace es largo), así el QR se lee aunque el logo tape el centro.
   Lo usan biblioteca.html (al comprar) y el panel /admin/pedidos. */
(function(){
  "use strict";
  var TINTA = "#050506", ROJO = "#E3120B", VERDE = "#00A651", AMARILLO = "#F7D417", GRIS = "#D6D4CC";
  var LOGO = ["RRRKGGG", "RRKKKGG", "RKKKKKG", "KKKWKKK", "YKKKKKS", "YYKKKSS", "YYYKSSS"];
  var COLOR = { R:ROJO, G:VERDE, Y:AMARILLO, S:GRIS, K:TINTA, W:"#fff" };

  function matriz(texto){
    if(typeof window.qrcode !== "function") return null;
    var q = window.qrcode(0, "H"); q.addData(texto); q.make();
    // Desde la versión 7 (45 módulos) hay un patrón de alineación al centro: con Q el QR queda en una versión menor.
    if(q.getModuleCount() > 41){ q = window.qrcode(0, "Q"); q.addData(texto); q.make(); }
    return q;
  }
  function redondo(g, x, y, w, h, r){
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  // Dibuja el QR desde (x, y) con módulos de m px (sin margen blanco).
  function pintar(g, q, x, y, m){
    var n = q.getModuleCount(), c0 = (n - 1) / 2, h = 4;  // recuadro del logo: 9×9 módulos al centro
    function ojo(r, c){ return (r < 7 && (c < 7 || c >= n - 7)) || (r >= n - 7 && c < 7); }
    function centro(r, c){ return Math.abs(r - c0) <= h && Math.abs(c - c0) <= h; }
    g.fillStyle = TINTA;
    for(var r = 0; r < n; r++) for(var c = 0; c < n; c++){
      if(q.isDark(r, c) && !ojo(r, c) && !centro(r, c)) g.fillRect(x + c * m, y + r * m, m, m);
    }
    [[0, 0, ROJO], [0, n - 7, VERDE], [n - 7, 0, TINTA]].forEach(function(o){
      // esquinas casi rectas: con bordes muy redondeados algunos lectores de QR no las reconocen
      var ox = x + o[1] * m, oy = y + o[0] * m;
      g.fillStyle = o[2];
      g.beginPath(); redondo(g, ox, oy, 7 * m, 7 * m, .25 * m); redondo(g, ox + m, oy + m, 5 * m, 5 * m, .16 * m); g.fill("evenodd");
      g.beginPath(); redondo(g, ox + 2 * m, oy + 2 * m, 3 * m, 3 * m, .11 * m); g.fill();
    });
    // Logo de 7 módulos (un cuadro por módulo) sobre un recuadro blanco. Probado con los lectores ZXing y OpenCV,
    // también achicado a 1/3: con un logo más grande, los QR pequeños fallan en algunos lectores.
    var L = 7 * m, k = L / 7, lx = x + (c0 + .5) * m - L / 2, ly = y + (c0 + .5) * m - L / 2;
    g.fillStyle = "#fff"; g.beginPath(); redondo(g, lx - .85 * m, ly - .85 * m, L + 1.7 * m, L + 1.7 * m, 1.4 * m); g.fill();
    for(var i = 0; i < 7; i++) for(var j = 0; j < 7; j++){
      var x1 = Math.round(lx + j * k), y1 = Math.round(ly + i * k);  // bordes redondeados a píxeles: sin líneas entre cuadros
      g.fillStyle = COLOR[LOGO[i].charAt(j)];
      g.fillRect(x1, y1, Math.round(lx + (j + 1) * k) - x1, Math.round(ly + (i + 1) * k) - y1);
    }
  }

  // Pone el QR en un <canvas> (con margen blanco de 3 módulos). m = píxeles por módulo.
  function enCanvas(cv, texto, m){
    var q = matriz(texto); if(!q) return false;
    var n = q.getModuleCount(), s = (n + 6) * m;
    cv.width = cv.height = s;
    var g = cv.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, s, s);
    pintar(g, q, 3 * m, 3 * m, m);
    return true;
  }
  // Dibuja el QR centrado dentro de un cuadrado de "lado" px que empieza en (x, y).
  function dibujar(g, texto, x, y, lado){
    var q = matriz(texto); if(!q) return false;
    var n = q.getModuleCount(), m = Math.floor(lado / n), d = Math.round((lado - n * m) / 2);
    pintar(g, q, x + d, y + d, m);
    return true;
  }
  // Tarjeta para descargar o imprimir: franjas con los colores de la ONG, QR, código y libro.
  function tarjeta(texto, codigo, libro){
    var W = 720, H = 920, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var g = cv.getContext("2d"), f = '"Space Grotesk", Arial, sans-serif';
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    [ROJO, VERDE, AMARILLO, TINTA].forEach(function(c, i){ g.fillStyle = c; g.fillRect(i * W / 4, 0, W / 4, 14); g.fillRect(i * W / 4, H - 14, W / 4, 14); });
    g.textAlign = "center";
    g.fillStyle = TINTA; g.font = "700 30px " + f; g.fillText("ONG Nuestros Orígenes", W / 2, 74);
    g.fillStyle = "#55554F"; g.font = "500 20px " + f; g.fillText("CAMPAÑA SOLIDARIA NAVIDAD 2026", W / 2, 108);
    g.strokeStyle = "#E4E2DB"; g.lineWidth = 2; g.beginPath(); redondo(g, 104, 136, 512, 512, 30); g.stroke();
    dibujar(g, texto, 124, 156, 472);
    g.fillStyle = TINTA; g.font = "700 40px " + f; g.fillText(codigo, W / 2, 716);
    g.fillStyle = "#55554F"; g.font = "400 23px " + f;
    var t = String(libro || ""); g.fillText(t.length > 50 ? t.slice(0, 48) + "…" : t, W / 2, 758);
    g.fillText("Escanéame y sigue este libro hasta la residencia", W / 2, 798);
    g.fillStyle = VERDE; g.font = "700 22px " + f; g.fillText("nuestrosorigenes.cl", W / 2, 856);
    return cv;
  }
  function descargar(texto, codigo, libro){
    tarjeta(texto, codigo, libro).toBlob(function(blob){
      if(!blob) return;
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "libro-" + codigo + ".png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(a.href); }, 4000);
    }, "image/png");
  }

  window.ongQR = { canvas:enCanvas, dibujar:dibujar, tarjeta:tarjeta, descargar:descargar };
})();
