/* ONG Nuestros Orígenes — interacciones compartidas (sin dependencias) */
(function(){
  "use strict";
  var WA = "56926175941";
  var $ = function(s, c){ return (c || document).querySelector(s); };
  var $$ = function(s, c){ return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  function safe(fn, name){ try{ fn(); }catch(e){ if(window.console) console.warn("[init:" + name + "]", e); } }
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  var money = (function(){
    try{ var f = new Intl.NumberFormat("es-CL", {style:"currency", currency:"CLP", maximumFractionDigits:0}); return function(n){ return f.format(n); }; }
    catch(e){ return function(n){ return "$" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }; }
  })();
  var FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';
  function trapTab(container, e){
    if(e.key !== "Tab") return;
    var f = $$(FOCUSABLE, container).filter(function(el){ return el.getClientRects().length; });
    if(!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }

  /* ---------- Libros con varias tapas (p. ej. Amarillo y Rojo) ----------
     Las tapas se ven una sobre otra, cada una en su lugar. Al pasar el cursor sobre una tapa (o sobre su puntito de color),
     esa tapa pasa adelante; al salir de la tarjeta vuelve adelante la última de la lista.
     En celulares, tocar una tapa la pasa adelante (tocar la de adelante muestra la siguiente). */
  var COLORES = { rojo:"#E3120B", amarillo:"#F7D417", verde:"#00A651", azul:"#1D5BD8", negro:"#0A0A0A", blanco:"#FFFFFF",
                  rosado:"#E91E78", naranjo:"#F28C28", morado:"#7B3FA0", celeste:"#5BC0EB", gris:"#9A9890" };
  function normal(s){ return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(); }
  function swatch(name){ return COLORES[normal(name)] || "#C9C7BF"; }
  function tapasDe(x){
    return ((x && x.tapas) || []).filter(function(t){ return t && t.imagen; }).map(function(t){
      return { color:String(t.color || ""), img:mediaPath(t.imagen) };
    }).filter(function(t){ return t.img; });
  }
  function pilaHTML(tapas, titulo){
    var n = tapas.length, nombres = tapas.map(function(t){ return normal(t.color); }).filter(Boolean);
    return '<div class="pila" data-pila data-front="' + (n - 1) + '" role="img" aria-label="' +
        esc("Portada de " + titulo + (nombres.length ? ", en tapa " + nombres.join(" y ") : "")) + '">' +
      tapas.map(function(t, i){
        // Lugar de cada tapa: la primera atrás a la izquierda, la última adelante a la derecha.
        // (--px, --py, --pr): hacia dónde se aparta al barajarse.
        var f = n > 1 ? i / (n - 1) : 1, x = -25 + 46 * f, y = -4 + 7 * f, r = -5 + 7 * f, izq = f < .5;
        var pos = "--x:" + uno(x) + "%;--y:" + uno(y) + "%;--r:" + uno(r) + "deg;--px:" + uno(x + (izq ? -17 : 21)) + "%;--py:" +
          uno(y - 3) + "%;--pr:" + uno(r + (izq ? -3 : 5)) + "deg";
        return '<img class="pila__b' + (i === n - 1 ? ' is-front' : '') + '" style="' + pos + '" src="' + esc(t.img) + '" alt="" data-color="' + esc(t.color) + '" decoding="async" draggable="false">';
      }).join("") +
      '<span class="pila__dots" aria-hidden="true">' + tapas.map(function(t, i){
        return '<i' + (i === n - 1 ? ' class="on"' : '') + ' style="--sw:' + swatch(t.color) + '"></i>';
      }).join("") + '</span></div>';
  }
  function uno(v){ return Math.round(v * 10) / 10; }
  // Pasa adelante la tapa i. Si otra tapa se está moviendo, espera a que termine y muestra la última pedida
  // (así, al mover el cursor rápido entre tapas, la animación no salta).
  function pilaMostrar(st, i, animar){
    var bs = $$(".pila__b", st);
    if(!bs[i]) return;
    st._quiero = i;
    if(st._mueve || +st.getAttribute("data-front") === i) return;
    st.setAttribute("data-front", i);
    var anim = animar && !reduce;
    bs.forEach(function(b, j){
      var era = b.classList.contains("is-front");
      b.classList.remove("to-front", "to-back");
      b.classList.toggle("is-front", j === i);
      if(anim && (j === i || era)){ void b.offsetWidth; b.classList.add(j === i ? "to-front" : "to-back"); }
    });
    $$(".pila__dots i", st).forEach(function(d, j){ d.classList.toggle("on", j === i); });
    if(!anim) return;
    st._mueve = true;
    setTimeout(function(){  // misma duración que la animación en styles.css (.pila__b.to-front)
      st._mueve = false;
      bs.forEach(function(b){ b.classList.remove("to-front", "to-back"); });
      if(st._quiero !== i) pilaMostrar(st, st._quiero, true);
    }, 780);
  }
  function pilaColor(st, color){
    var bs = $$(".pila__b", st), k = -1;
    bs.forEach(function(b, j){ if(k < 0 && normal(b.getAttribute("data-color")) === normal(color)) k = j; });
    if(k >= 0) pilaMostrar(st, k, true);
  }
  function initPilas(root){
    $$("[data-pila]", root).forEach(function(st){
      if(st.getAttribute("data-on")) return;
      st.setAttribute("data-on", "1");
      var bs = $$(".pila__b", st), dots = $$(".pila__dots i", st), n = bs.length, tipo = "mouse", zona = st.closest(".book, .card") || st;
      if(n < 2) return;
      function indice(el){ var k = bs.indexOf(el); return k >= 0 ? k : dots.indexOf(el); }
      // Cursor sobre una tapa (o su puntito): esa tapa pasa adelante
      st.addEventListener("pointerover", function(e){
        if(e.pointerType !== "mouse" || st.hasAttribute("data-fija")) return;
        var k = indice(e.target); if(k >= 0) pilaMostrar(st, k, true);
      });
      zona.addEventListener("pointerleave", function(e){
        if(e.pointerType === "mouse" && !st.hasAttribute("data-fija")) pilaMostrar(st, n - 1, true);
      });
      // Celulares: tocar una tapa (o su puntito) la pasa adelante; tocar la tapa de adelante muestra la siguiente
      st.addEventListener("pointerdown", function(e){ tipo = e.pointerType; });
      st.addEventListener("click", function(e){
        if(tipo === "mouse" || st.hasAttribute("data-fija")) return;
        var actual = st._quiero != null ? st._quiero : +st.getAttribute("data-front"), k = indice(e.target);
        if(k >= 0 && (k !== actual || dots.indexOf(e.target) >= 0)) pilaMostrar(st, k, true);
        else pilaMostrar(st, (actual + 1) % n, true);
      });
    });
  }

  /* ---------- Header ---------- */
  safe(function(){
    var h = $(".hdr"); if(!h) return;
    var on = function(){ h.classList.toggle("scrolled", window.scrollY > 40); };
    on(); window.addEventListener("scroll", on, {passive:true});
  }, "header");

  /* ---------- Menú móvil ---------- */
  safe(function(){
    var btn = $("#burger"), menu = $("#mnav"), close = $("#mnavClose");
    if(!btn || !menu || !close) return;
    function set(open){
      menu.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("lock", open);
      if(open){ menu.removeAttribute("inert"); setTimeout(function(){ close.focus(); }, 40); }
      else { menu.setAttribute("inert", ""); btn.focus(); }
    }
    btn.addEventListener("click", function(){ set(true); });
    close.addEventListener("click", function(){ set(false); });
    $$("a", menu).forEach(function(a){ a.addEventListener("click", function(){ menu.classList.remove("open"); document.body.classList.remove("lock"); menu.setAttribute("inert", ""); btn.setAttribute("aria-expanded", "false"); }); });
    document.addEventListener("keydown", function(e){
      if(!menu.classList.contains("open")) return;
      if(e.key === "Escape"){ set(false); return; }
      trapTab(menu, e);
    });
  }, "mnav");

  /* ---------- Reveal on scroll ---------- */
  safe(function(){
    $$("[data-stagger]").forEach(function(p){
      Array.prototype.forEach.call(p.children, function(c, i){ c.classList.add("rv"); c.style.setProperty("--d", (i % 6) * 0.08 + "s"); });
    });
    var els = $$(".rv"); if(!els.length) return;
    if(!("IntersectionObserver" in window)){ els.forEach(function(e){ e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); } });
    }, {threshold:0.05, rootMargin:"0px 0px -5% 0px"});
    els.forEach(function(e){ io.observe(e); });
    // Red de seguridad: lo que ya está en pantalla o por encima, se muestra sí o sí.
    setTimeout(function(){
      els.forEach(function(e){ if(!e.classList.contains("in") && e.getBoundingClientRect().top < window.innerHeight){ e.classList.add("in"); } });
    }, 6000);
  }, "reveal");

  /* ---------- Slider del inicio ---------- */
  safe(function(){
    var root = $(".hero"); if(!root) return;
    var slides = $$(".slide", root), dots = $$(".dot", root), bar = $(".progress", root), pauseBtn = $(".hbtn.pause", root);
    if(slides.length < 2) return;
    var i = 0, t = null, DUR = 7000, userPaused = reduce, hover = false;
    function show(n){
      slides[i].classList.remove("on"); slides[i].setAttribute("aria-hidden", "true"); slides[i].inert = true;
      dots[i].setAttribute("aria-current", "false");
      i = (n + slides.length) % slides.length;
      slides[i].classList.add("on"); slides[i].removeAttribute("aria-hidden"); slides[i].inert = false;
      dots[i].setAttribute("aria-current", "true");
      restart();
    }
    function stop(){ clearTimeout(t); t = null; if(bar){ bar.classList.remove("run"); } }
    function restart(){
      stop();
      if(userPaused || hover || document.hidden) return;
      if(bar){ bar.style.setProperty("--dur", DUR + "ms"); void bar.offsetWidth; bar.classList.add("run"); }
      t = setTimeout(function(){ show(i + 1); }, DUR);
    }
    slides.forEach(function(s, k){ if(k !== i){ s.setAttribute("aria-hidden", "true"); s.inert = true; } });
    dots.forEach(function(d, k){ d.addEventListener("click", function(){ show(k); }); });
    $(".hbtn.prev", root).addEventListener("click", function(){ show(i - 1); });
    $(".hbtn.next", root).addEventListener("click", function(){ show(i + 1); });
    function syncPause(){
      pauseBtn.setAttribute("aria-pressed", String(userPaused));
      pauseBtn.setAttribute("aria-label", userPaused ? "Reproducir presentación" : "Pausar presentación");
      pauseBtn.innerHTML = userPaused
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>';
    }
    pauseBtn.addEventListener("click", function(){ userPaused = !userPaused; syncPause(); restart(); });
    root.addEventListener("mouseenter", function(){ hover = true; stop(); });
    root.addEventListener("mouseleave", function(){ hover = false; restart(); });
    root.addEventListener("focusin", function(){ hover = true; stop(); });
    root.addEventListener("focusout", function(e){ if(!root.contains(e.relatedTarget)){ hover = false; restart(); } });
    document.addEventListener("visibilitychange", restart);
    var x0 = null;
    root.addEventListener("touchstart", function(e){ x0 = e.touches[0].clientX; }, {passive:true});
    root.addEventListener("touchend", function(e){ if(x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if(Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); x0 = null; });
    syncPause();
    restart();
  }, "slider");

  /* ---------- Datos editables desde /admin ---------- */
  // Rutas de archivos subidos: siempre relativas y sin esquemas peligrosos.
  function mediaPath(p){
    p = String(p || "").trim().replace(/^\/+/, "");
    if(/^[a-z][a-z0-9+.-]*:/i.test(p) && !/^https?:/i.test(p)) return "";
    return p;
  }
  var galleryData = null;
  function loadGallery(){
    if(!galleryData){
      galleryData = fetch("data/galeria.json", {cache:"no-store"})
        .then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
        .then(function(d){
          return ((d && d.fotos) || []).map(function(x){
            return { titulo: String(x.titulo || "").trim(), anio: parseInt(x.anio, 10) || 0,
                     imagen: mediaPath(x.imagen), video: mediaPath(x.video) };
          }).filter(function(x){ return x.imagen || x.video; })
            .sort(function(a, b){ return a.anio - b.anio || a.titulo.localeCompare(b.titulo, "es"); });
        });
    }
    return galleryData;
  }

  /* ---------- Adelanto de galería en el inicio ---------- */
  safe(function(){
    var ul = $("[data-gteaser]"); if(!ul || !window.fetch) return;
    loadGallery().then(function(items){
      var fotos = items.filter(function(x){ return x.imagen; });
      if(fotos.length < 3) return;
      var pick = [fotos[0], fotos[Math.floor((fotos.length - 1) / 2)], fotos[fotos.length - 1]];
      ul.innerHTML = pick.map(function(x){
        return '<li class="rv in"><a href="galeria.html"><img src="' + esc(x.imagen) + '" alt="' + esc(x.titulo) + '" loading="lazy" decoding="async"><span>' + (x.anio || "") + '</span></a></li>';
      }).join("");
    }).catch(function(){ /* se queda con las fotos de respaldo */ });
  }, "teaser");

  /* ---------- Galería: línea de tiempo ---------- */
  function buildGallery(root, items){
    var stage = $(".gal__stage", root), line = $(".tline", root), n = items.length;
    var pad = function(k){ return (k < 10 ? "0" : "") + k; };
    var years = items.map(function(x){ return x.anio; }).filter(Boolean);
    var yrs = $("[data-gal-years]");
    if(yrs && years.length) yrs.textContent = ", de " + Math.min.apply(null, years) + " a " + Math.max.apply(null, years);
    var prev = null;
    stage.insertAdjacentHTML("afterbegin", items.map(function(x, k){
      var t = esc(x.titulo), media;
      if(x.video){
        media = '<div class="gslide__media"><video class="gslide__vid" src="' + esc(x.video) + '#t=0.5" controls playsinline preload="metadata" aria-label="' + t + '"></video></div>';
      } else {
        var load = k === 0 ? 'fetchpriority="high"' : 'loading="lazy"';
        media = '<div class="gslide__media"><img class="gslide__bg" src="' + esc(x.imagen) + '" alt="" aria-hidden="true" ' + load + ' decoding="async">' +
                '<img class="gslide__ph" src="' + esc(x.imagen) + '" alt="' + t + '" ' + load + ' decoding="async"></div>';
      }
      return '<figure class="gslide' + (x.video ? " gslide--video" : "") + (k === 0 ? " on" : "") + '" aria-roledescription="diapositiva" aria-label="' + (k + 1) + ' de ' + n + '">' +
        media + '<figcaption><span class="gyear">' + (x.anio || "") + '</span><span class="gcap">' + t + '</span>' +
        '<span class="gnum">' + pad(k + 1) + ' / ' + pad(n) + '</span></figcaption></figure>';
    }).join(""));
    line.innerHTML = items.map(function(x, k){
      var first = x.anio !== prev; prev = x.anio;
      var thumb = x.video
        ? '<video src="' + esc(x.video) + '#t=0.5" muted playsinline preload="metadata" aria-hidden="true"></video><span class="tl__play" aria-hidden="true"></span>'
        : '<img src="' + esc(x.imagen) + '" alt="" loading="lazy" decoding="async">';
      return '<li class="tl' + (first ? " tl--y" : "") + '"><span class="tl__y" aria-hidden="true">' + (first ? x.anio : "") + '</span>' +
        '<button class="tl__btn" type="button" aria-label="' + esc(x.titulo) + ' (' + x.anio + ')"' + (k === 0 ? ' aria-current="true"' : '') + '>' + thumb + '</button></li>';
    }).join("");
  }

  safe(function(){
    var root = $(".gal"); if(!root) return;
    var empty = $(".gal__empty", root);
    if(!window.fetch){ if(empty) empty.hidden = false; return; }
    loadGallery().then(function(items){
      if(!items.length){ if(empty) empty.hidden = false; return; }
      buildGallery(root, items);
      root.classList.add("ready");
      initGallery(root);
    }).catch(function(){ if(empty) empty.hidden = false; });
  }, "gallery");

  function initGallery(root){
    var slides = $$(".gslide", root), btns = $$(".tl__btn", root), tline = $(".tline", root);
    var bar = $(".gal__prog", root), pauseBtn = $(".gpause", root);
    if(!slides.length) return;
    var i = 0, t = null, DUR = 6000, userPaused = reduce, hover = false, playing = false;
    var vids = $$(".gslide__vid", root);
    vids.forEach(function(v){
      v.addEventListener("play", function(){ playing = true; stop(); });
      v.addEventListener("pause", function(){ playing = false; restart(); });
      v.addEventListener("ended", function(){ playing = false; show(i + 1); });
    });
    function centerThumb(){
      var b = btns[i]; if(!b || !tline) return;
      var li = b.parentNode;
      var left = li.offsetLeft - (tline.clientWidth - li.offsetWidth) / 2;
      tline.scrollTo({left: Math.max(0, left), behavior: reduce ? "auto" : "smooth"});
    }
    function show(n){
      var v = $(".gslide__vid", slides[i]); if(v && !v.paused) v.pause();
      playing = false;
      slides[i].classList.remove("on"); slides[i].setAttribute("aria-hidden", "true");
      if(btns[i]) btns[i].removeAttribute("aria-current");
      i = (n + slides.length) % slides.length;
      slides[i].classList.add("on"); slides[i].removeAttribute("aria-hidden");
      if(btns[i]) btns[i].setAttribute("aria-current", "true");
      centerThumb();
      restart();
    }
    function stop(){ clearTimeout(t); t = null; if(bar) bar.classList.remove("run"); }
    function restart(){
      stop();
      if(userPaused || hover || playing || document.hidden) return;
      if(bar){ bar.style.setProperty("--dur", DUR + "ms"); void bar.offsetWidth; bar.classList.add("run"); }
      t = setTimeout(function(){ show(i + 1); }, DUR);
    }
    slides.forEach(function(s, k){ if(k !== i) s.setAttribute("aria-hidden", "true"); });
    btns.forEach(function(b, k){ b.addEventListener("click", function(){ show(k); }); });
    $(".gprev", root).addEventListener("click", function(){ show(i - 1); });
    $(".gnext", root).addEventListener("click", function(){ show(i + 1); });
    function syncPause(){
      pauseBtn.setAttribute("aria-pressed", String(userPaused));
      pauseBtn.setAttribute("aria-label", userPaused ? "Reproducir presentación" : "Pausar presentación");
      pauseBtn.innerHTML = userPaused
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>';
    }
    pauseBtn.addEventListener("click", function(){ userPaused = !userPaused; syncPause(); restart(); });
    var stage = $(".gal__stage", root);
    stage.addEventListener("mouseenter", function(){ hover = true; stop(); });
    stage.addEventListener("mouseleave", function(){ hover = false; restart(); });
    root.addEventListener("keydown", function(e){
      if(e.key === "ArrowLeft"){ e.preventDefault(); show(i - 1); }
      else if(e.key === "ArrowRight"){ e.preventDefault(); show(i + 1); }
    });
    document.addEventListener("visibilitychange", restart);
    var x0 = null;
    stage.addEventListener("touchstart", function(e){ x0 = e.touches[0].clientX; }, {passive:true});
    stage.addEventListener("touchend", function(e){ if(x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if(Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); x0 = null; });
    // Arranca solo cuando la galería entra en pantalla
    if("IntersectionObserver" in window){
      var started = false;
      new IntersectionObserver(function(en, obs){ if(en[0].isIntersecting && !started){ started = true; obs.disconnect(); restart(); } }, {threshold:0.3}).observe(stage);
    } else { restart(); }
    syncPause();
  }

  /* ---------- Carruseles ---------- */
  safe(function(){
    $$(".carousel").forEach(function(c){
      var tr = $(".track", c), p = $(".car-btn.prev", c), n = $(".car-btn.next", c);
      if(!tr || !p || !n) return;
      function step(){ var k = tr.children[0]; return k ? k.getBoundingClientRect().width : tr.clientWidth; }
      function upd(){ p.disabled = tr.scrollLeft < 4; n.disabled = tr.scrollLeft + tr.clientWidth >= tr.scrollWidth - 4; }
      p.addEventListener("click", function(){ tr.scrollBy({left:-step(), behavior: reduce ? "auto" : "smooth"}); });
      n.addEventListener("click", function(){ tr.scrollBy({left:step(), behavior: reduce ? "auto" : "smooth"}); });
      tr.addEventListener("scroll", upd, {passive:true});
      window.addEventListener("resize", upd);
      upd();
    });
  }, "carousel");

  /* ---------- Contadores ---------- */
  safe(function(){
    var els = $$("[data-count]"); if(!els.length || reduce || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target, end = parseInt(el.getAttribute("data-count"), 10), t0 = null;
        function frame(ts){
          if(!t0) t0 = ts;
          var k = Math.min(1, (ts - t0) / 1400);
          el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
          if(k < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      });
    }, {threshold:0.3});
    els.forEach(function(e){ e.textContent = "0"; io.observe(e); });
  }, "count");

  /* ---------- Cuenta regresiva ---------- */
  // La inicia el evento principal con su propia fecha.
  function startCountdown(target){
    var cells = $("#countCells"); if(!cells) return;
    var done = $("#countDone"), label = $("#countLabel");
    var d = $('[data-u="d"]'), h = $('[data-u="h"]'), m = $('[data-u="m"]'), timer;
    function tick(){
      var diff = target - Date.now();
      if(diff <= 0){ cells.hidden = true; if(label) label.hidden = true; done.hidden = false; if(timer) clearInterval(timer); return; }
      var mins = Math.floor(diff / 60000);
      d.textContent = Math.floor(mins / 1440);
      h.textContent = String(Math.floor((mins % 1440) / 60)).padStart(2, "0");
      m.textContent = String(mins % 60).padStart(2, "0");
    }
    tick(); timer = setInterval(tick, 30000);
  }

  /* ---------- Eventos (data/eventos.json, editable en /admin) ---------- */
  // El PRIMER evento de la lista del panel es el principal (cada evento nuevo entra arriba).
  //  [data-evento-principal]  bloque grande en Noticias
  //  [data-slide-evento]      diapositiva del inicio
  //  [data-eventos] "resto"   los demás, en el orden del panel (Noticias)
  //  [data-eventos] "proximos" los que aún no ocurren, por fecha (Inicio)
  safe(function(){
    if(!$("[data-eventos], [data-evento-principal], [data-slide-evento]") || !window.fetch) return;
    var BGS = ["#300807", "#06301B", "#050506"];
    var cap = function(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; };
    var hasTime = function(d){ return d.getHours() || d.getMinutes(); };
    var hora = function(d){ return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") + " h"; };
    var corta = function(d){ return d.toLocaleDateString("es-CL", {day:"numeric", month:"long"}); };
    var larga = function(d){ return d.toLocaleDateString("es-CL", {weekday:"long", day:"numeric", month:"long", year:"numeric"}) + (hasTime(d) ? ", " + hora(d) : ""); };
    var multiline = function(s){ return esc(s).replace(/\n/g, "<br>"); };

    fetch("data/eventos.json", {cache:"no-store"})
      .then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
      .then(function(data){
        var all = ((data && data.items) || []).filter(function(x){ return x && x.titulo; }).map(function(x){
          var d = x.fecha ? new Date(x.fecha) : null;
          if(d && isNaN(d)) d = null;
          return { titulo: String(x.titulo), desc: String(x.descripcion || ""), img: mediaPath(x.imagen), lugar: String(x.lugar || "").trim(), d: d };
        });
        if(!all.length) return;
        safe(function(){ principal(all[0]); }, "evento-principal");
        safe(function(){ slide(all[0]); }, "evento-slide");
        $$("[data-eventos]").forEach(function(sec){ safe(function(){ lista(sec, all); }, "eventos-lista"); });
      })
      .catch(function(){ /* sin datos: las secciones quedan ocultas */ });

    function principal(ev){
      var sec = $("[data-evento-principal]"); if(!sec) return;
      var f = function(n){ return $('[data-f="' + n + '"]', sec); };
      var d = ev.d;
      if(d){
        f("dia").textContent = d.getDate();
        f("mes").textContent = cap(d.toLocaleDateString("es-CL", {month:"long", year:"numeric"}));
        f("hora").textContent = cap(d.toLocaleDateString("es-CL", {weekday:"long"})) + (hasTime(d) ? ", " + hora(d) : "");
        f("fecha-larga").textContent = cap(larga(d)) + ".";
      } else {
        $(".date", sec).hidden = true;
      }
      f("titulo").textContent = ev.titulo;
      f("desc").innerHTML = multiline(ev.desc);
      if(ev.lugar){
        var a = f("lugar");
        a.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(ev.lugar);
        $("span", a).textContent = ev.lugar;
        a.hidden = false;
      }
      if(ev.img){
        var box = f("img"), im = $("img", box);
        im.src = ev.img; im.alt = ev.titulo; box.hidden = false;
      }
      var futuro = d && d.getTime() > Date.now();
      var wa = f("wa");
      if(futuro){
        wa.href = "https://wa.me/" + WA + "?text=" + encodeURIComponent("Hola, quiero confirmar mi asistencia a «" + ev.titulo + "» (" + corta(d) + ").");
      } else { wa.hidden = true; }
      if(d) startCountdown(d.getTime()); else f("cuenta").hidden = true;
      sec.hidden = false;
    }

    function slide(ev){
      var s = $("[data-slide-evento]"); if(!s) return;
      var g = function(n){ return $('[data-s="' + n + '"]', s); };
      g("tag").textContent = "Evento" + (ev.d ? " · " + corta(ev.d) : "");
      g("titulo").textContent = ev.titulo;
      var txt = ev.desc.replace(/\s+/g, " ").trim();
      g("desc").textContent = txt.length > 170 ? txt.slice(0, 167).trim() + "…" : txt;
    }

    function lista(sec, all){
      var ul = $(".eventos-list", sec);
      var modo = sec.getAttribute("data-eventos-modo");
      var limit = parseInt(sec.getAttribute("data-limite"), 10) || 0;
      var items;
      if(modo === "proximos"){
        var today = new Date(); today.setHours(0, 0, 0, 0);
        items = all.filter(function(x){ return x.d && x.d >= today; }).sort(function(a, b){ return a.d - b.d; });
      } else {
        items = all.slice(1); // "resto": todo menos el principal, en el orden del panel
      }
      if(limit) items = items.slice(0, limit);
      if(!items.length) return;
      ul.innerHTML = items.map(function(it, k){
        var d = it.d;
        var th = it.img
          ? '<div class="ncard__th ncard__th--img"><img src="' + esc(it.img) + '" alt="" loading="lazy" decoding="async"></div>'
          : '<div class="ncard__th" style="--bg:' + BGS[k % BGS.length] + '"><b>' + (d ? d.getDate() : "") + '</b><small>' +
            (d ? esc(d.toLocaleDateString("es-CL", {month:"long", year:"numeric"})) : "") + '</small></div>';
        return '<li class="ncard" style="animation:pageIn .6s ease ' + ((k % 6) * 0.08) + 's both">' + th +
          '<div class="ncard__b">' + (d && it.img ? '<span class="meta">' + esc(larga(d)) + '</span>' : '') +
          '<h3>' + esc(it.titulo) + '</h3><p>' + multiline(it.desc) + '</p>' +
          (it.lugar ? '<span class="meta">' + esc(it.lugar) + '</span>' : '') + '</div></li>';
      }).join("");
      sec.hidden = false;
    }
  }, "eventos");

  /* ---------- Formulario de contacto → WhatsApp ---------- */
  safe(function(){
    var f = $("#waForm"); if(!f) return;
    var msgEl = $(".form__msg", f);
    f.addEventListener("submit", function(e){
      e.preventDefault();
      var nombre = f.elements.nombre.value.trim(), motivo = f.elements.motivo.value, mensaje = f.elements.mensaje.value.trim();
      if(!mensaje){ msgEl.textContent = "Escribe tu mensaje para continuar."; f.elements.mensaje.focus(); return; }
      msgEl.textContent = "";
      var text = "Hola, " + (nombre ? "soy " + nombre + ". " : "") + "Motivo: " + motivo + ".\n" + mensaje;
      window.open("https://wa.me/" + WA + "?text=" + encodeURIComponent(text), "_blank", "noopener");
    });
  }, "form");

  /* ---------- Bazar + carrito (todas las páginas) ---------- */
  safe(function(){
    // Los productos se editan en /admin → Productos (data/productos.json).
    var CATS = {
      bazar:     { label:"Bazar Dign@",   color:"#E3120B", stamp:"#FFFFFF" },
      emporio:   { label:"Emporio",       color:"#F7D417", stamp:"#0A0A0A" },
      vivero:    { label:"Vivero urbano", color:"#00A651", stamp:"#FFFFFF" },
      artesania: { label:"Artesanía",     color:"#0A0A0A", stamp:"#FFFFFF" },
      libros:    { label:"Libros · Navidad 2026", color:"#E3120B", stamp:"#FFFFFF" }
    };
    // Respaldo por si data/productos.json no se puede cargar.
    var FALLBACK = [
      { id:"chaqueta-mezclilla", cat:"bazar",     name:"Chaqueta de mezclilla reciclada", desc:"Mezclilla recuperada en buen estado, tallas variadas.", price:8900 },
      { id:"poleron-upcycling",  cat:"bazar",     name:"Polerón upcycling",               desc:"Intervenido a mano en nuestro taller de moda circular.", price:7500 },
      { id:"bolso-tela",         cat:"bazar",     name:"Bolso de tela reciclada",         desc:"Tela de descarte con costura reforzada.", price:4500 },
      { id:"polera-algodon",     cat:"bazar",     name:"Polera de algodón",               desc:"Moda circular: prenda revisada y lista para usar.", price:3500 },
      { id:"bufanda-lana",       cat:"artesania", name:"Bufanda de lana",                 desc:"Tejida a palillo con lana natural.", price:6500 },
      { id:"miel-500",           cat:"emporio",   name:"Miel de abeja 500 g",             desc:"Miel de productores locales de la región.", price:5500 },
      { id:"hierbas",            cat:"emporio",   name:"Hierbas medicinales",             desc:"Paquete de hierbas secas para infusión.", price:2500 },
      { id:"mermelada",          cat:"emporio",   name:"Mermelada casera",                desc:"Frasco de fruta de temporada, preparación artesanal.", price:3200 },
      { id:"planta-vivero",      cat:"vivero",    name:"Planta del vivero urbano",        desc:"Planta de interior o exterior en macetero reciclado.", price:3000 },
      { id:"kit-huerto",         cat:"vivero",    name:"Kit de huerto en casa",           desc:"Sustrato, semillas de temporada y almácigo.", price:6900 },
      { id:"muneca-lana",        cat:"artesania", name:"Muñeca de lana artesanal",        desc:"Hecha a mano, pieza única.", price:7900 },
      { id:"lampara-reciclada",  cat:"artesania", name:"Lámpara de material reciclado",   desc:"Pantalla elaborada con material recuperado.", price:9000 }
    ];
    function slugify(s){
      return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    }
    function loadProducts(){
      if(!window.fetch) return Promise.resolve(FALLBACK);
      return fetch("data/productos.json", {cache:"no-store"})
        .then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
        .then(function(d){
          var seen = {};
          return ((d && d.productos) || []).filter(function(x){
            return x && x.nombre && x.disponible !== false && CATS[x.categoria];
          }).map(function(x){
            var base = slugify(x.nombre) || "producto", id = base, n = 2;
            while(seen[id]) id = base + "-" + (n++);
            seen[id] = 1;
            return { id:id, cat:x.categoria, name:String(x.nombre), desc:String(x.descripcion || ""),
                     price:Math.max(0, parseInt(x.precio, 10) || 0), img:mediaPath(x.imagen) };
          });
        })
        .catch(function(){ return FALLBACK; });
    }
    // Libros de la Biblioteca del Barrio (data/biblioteca.json): se muestran en el catálogo,
    // pero se compran en biblioteca.html (cada libro con su QR), no en el carrito.
    function loadBooks(){
      if(!window.fetch || !$("#products")) return Promise.resolve([]);
      return fetch("data/biblioteca.json", {cache:"no-store"})
        .then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
        .then(function(d){
          return ((d && d.libros) || []).filter(function(x){ return x && x.titulo && x.disponible !== false; }).map(function(x){
            var slug = slugify(x.titulo) || "libro";
            return { id:"libro-" + slug, cat:"libros", name:String(x.titulo), book:true,
                     desc:[x.autor, x.detalle].filter(Boolean).join(" · "),
                     price:Math.max(0, parseInt(x.precio, 10) || 0), img:mediaPath(x.portada), tapas:tapasDe(x), href:"biblioteca.html?libro=" + slug };
          });
        })
        .catch(function(){ return []; });
    }
    Promise.all([loadProducts(), loadBooks()]).then(function(r){ safe(function(){ initCart(r[0], r[1]); }, "cart-init"); });

    function initCart(PRODUCTS, BOOKS){
    var byId = {}; PRODUCTS.forEach(function(p){ byId[p.id] = p; });

    var KEY = "no_cart", cart = {};
    try{
      var parsed = JSON.parse(window.localStorage.getItem(KEY) || "{}") || {};
      Object.keys(parsed).forEach(function(id){ var q = parseInt(parsed[id], 10); if(byId[id] && q > 0) cart[id] = Math.min(q, 99); });
    }catch(e){ cart = {}; }
    function save(){ try{ window.localStorage.setItem(KEY, JSON.stringify(cart)); }catch(e){} }

    /* Drawer (se inyecta una sola vez) */
    if(!$("#cart")){
      document.body.insertAdjacentHTML("beforeend",
        '<div class="scrim" id="scrim" aria-hidden="true"></div>' +
        '<aside class="cart" id="cart" role="dialog" aria-modal="true" aria-labelledby="cart-t" inert>' +
          '<div class="cart__h"><h2 id="cart-t">Tu pedido</h2>' +
          '<button class="ibtn" id="cartClose" type="button" aria-label="Cerrar carrito"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button></div>' +
          '<div class="cart__list" id="cartList"></div>' +
          '<div class="cart__f"><div class="total"><span>Total</span><b id="cartTotal">$0</b></div>' +
          '<a class="btn btn--wa send" id="sendBtn" href="https://wa.me/' + WA + '" target="_blank" rel="noopener" aria-disabled="true">' +
          '<svg aria-hidden="true"><use href="#wa"/></svg>Enviar pedido por WhatsApp</a>' +
          '<p class="cart__hint">Coordinamos contigo el pago y el retiro en Rancagua.</p></div>' +
        '</aside>');
    }
    var drawer = $("#cart"), scrim = $("#scrim"), list = $("#cartList"), totalEl = $("#cartTotal"), send = $("#sendBtn"), closeBtn = $("#cartClose");
    var bagBtns = $$("[data-cart-open]"), badges = $$(".bag__n"), lastTrigger = null;

    /* Productos (solo en bazar.html) */
    var grid = $("#products");
    if(grid && grid.children.length === 0 && !PRODUCTS.length){
      grid.innerHTML = '<li class="bazar-empty">Pronto agregaremos nuevos productos. Escríbenos por WhatsApp para consultar disponibilidad.</li>';
    } else if(grid && grid.children.length === 0){
      grid.innerHTML = (BOOKS || []).concat(PRODUCTS).map(function(p, k){
        var c = CATS[p.cat];
        if(p.book){
          return '<li class="card rv" style="--d:' + ((k % 4) * 0.07) + 's" data-cat="libros">' +
            '<div class="card__th card__th--book">' + (p.tapas.length > 1 ? pilaHTML(p.tapas, p.name)
              : p.img ? '<img class="card__img" src="' + esc(p.img) + '" alt="Portada de ' + esc(p.name) + '" loading="lazy" decoding="async">' : '') +
            '<span class="card__cat" style="--cc:' + c.color + '">' + esc(c.label) + '</span></div>' +
            '<div class="card__b"><h3>' + esc(p.name) + '</h3><p>' + esc(p.desc) + '</p>' +
            '<div class="card__f">' + (p.price ? '<span class="price">' + money(p.price) + '</span>' : '<span class="price price--soft">Valor por confirmar</span>') +
            '<a class="add" href="' + esc(p.href) + '" aria-label="Comprar ' + esc(p.name) + ' en la Biblioteca del Barrio">Comprar</a></div></div></li>';
        }
        var thumb = p.img
          ? '<img class="card__img" src="' + esc(p.img) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async">'
          : '<svg viewBox="0 0 100 70" aria-hidden="true" focusable="false"><rect width="100" height="70" fill="' + c.color + '"/>' +
            '<use href="#chakana" x="35" y="20" width="30" height="30" style="color:' + c.stamp + '"/></svg>';
        return '<li class="card rv" style="--d:' + ((k % 4) * 0.07) + 's" data-cat="' + p.cat + '">' +
          '<div class="card__th">' + thumb +
          '<span class="card__cat" style="--cc:' + c.color + '">' + esc(c.label) + '</span></div>' +
          '<div class="card__b"><h3>' + esc(p.name) + '</h3><p>' + esc(p.desc) + '</p>' +
          '<div class="card__f"><span class="price">' + money(p.price) + '</span>' +
          '<button class="add" type="button" data-id="' + p.id + '" aria-label="Agregar ' + esc(p.name) + ' al carrito">Agregar</button></div></div></li>';
      }).join("");
      initPilas(grid);
      if("IntersectionObserver" in window){
        var io = new IntersectionObserver(function(en){ en.forEach(function(x){ if(x.isIntersecting){ x.target.classList.add("in"); io.unobserve(x.target); } }); }, {threshold:0.05});
        $$(".card", grid).forEach(function(c){ io.observe(c); });
        setTimeout(function(){ $$(".card", grid).forEach(function(c){ if(c.getBoundingClientRect().top < window.innerHeight) c.classList.add("in"); }); }, 6000);
      } else { $$(".card", grid).forEach(function(c){ c.classList.add("in"); }); }

      var chips = $$(".chip");
      chips.forEach(function(ch){
        ch.addEventListener("click", function(){
          var f = ch.getAttribute("data-f");
          chips.forEach(function(o){ o.setAttribute("aria-pressed", String(o === ch)); });
          $$(".card", grid).forEach(function(card){
            var show = f === "all" || card.getAttribute("data-cat") === f;
            card.hidden = !show;
            if(show && !reduce){ card.classList.remove("pop"); void card.offsetWidth; card.classList.add("pop"); }
          });
        });
      });

      grid.addEventListener("click", function(e){
        var b = e.target.closest(".add[data-id]"); if(!b) return;
        var id = b.getAttribute("data-id");
        setQty(id, (cart[id] || 0) + 1);
        badges.forEach(function(x){ x.classList.remove("bump"); void x.offsetWidth; x.classList.add("bump"); });
        b.classList.add("ok"); b.textContent = "Agregado ✓";
        setTimeout(function(){ b.classList.remove("ok"); b.textContent = "Agregar"; }, 1400);
      });
    }

    function count(){ return Object.keys(cart).reduce(function(s, id){ return s + cart[id]; }, 0); }
    function total(){ return Object.keys(cart).reduce(function(s, id){ return s + cart[id] * byId[id].price; }, 0); }

    function render(){
      var ids = Object.keys(cart), n = count();
      badges.forEach(function(b){ b.textContent = n; b.setAttribute("data-zero", String(n === 0)); });
      bagBtns.forEach(function(b){ b.setAttribute("aria-label", "Abrir carrito, " + n + (n === 1 ? " producto" : " productos")); });
      if(!ids.length){
        list.innerHTML = '<div class="cart__empty"><strong>Tu carrito está vacío</strong>Agrega productos del Bazar Dign@ y Emporio para armar tu pedido.' +
          (grid ? '' : '<p style="margin-top:1.25rem"><a class="btn btn--ink" href="bazar.html">Ir al bazar</a></p>') + '</div>';
        send.setAttribute("aria-disabled", "true");
        send.setAttribute("href", "https://wa.me/" + WA);
      } else {
        list.innerHTML = ids.map(function(id){
          var p = byId[id], q = cart[id];
          return '<div class="cline"><h3>' + esc(p.name) + '</h3><span class="csub">' + money(p.price * q) + '</span>' +
            '<div class="qty" role="group" aria-label="Cantidad de ' + esc(p.name) + '">' +
            '<button type="button" data-act="dec" data-id="' + id + '" aria-label="Quitar uno">−</button>' +
            '<span aria-live="polite">' + q + '</span>' +
            '<button type="button" data-act="inc" data-id="' + id + '" aria-label="Agregar uno">+</button></div>' +
            '<span class="unit">' + money(p.price) + ' c/u</span></div>';
        }).join("");
        var msg = "Hola, quiero hacer un pedido del Bazar Dign@ y Emporio:\n" +
          ids.map(function(id){ var p = byId[id]; return "• " + cart[id] + " x " + p.name + " (" + money(p.price * cart[id]) + ")"; }).join("\n") +
          "\nTotal: " + money(total());
        send.setAttribute("aria-disabled", "false");
        send.setAttribute("href", "https://wa.me/" + WA + "?text=" + encodeURIComponent(msg));
      }
      totalEl.textContent = money(total());
    }
    function setQty(id, q){
      if(!byId[id]) return;
      if(q <= 0) delete cart[id]; else cart[id] = Math.min(q, 99);
      save(); render();
    }

    list.addEventListener("click", function(e){
      var b = e.target.closest("button[data-act]"); if(!b) return;
      var id = b.getAttribute("data-id"), act = b.getAttribute("data-act");
      setQty(id, (cart[id] || 0) + (act === "inc" ? 1 : -1));
      var again = list.querySelector('button[data-act="' + act + '"][data-id="' + id + '"]');
      (again || closeBtn).focus();
    });
    send.addEventListener("click", function(e){ if(send.getAttribute("aria-disabled") === "true") e.preventDefault(); });

    function openCart(){
      lastTrigger = document.activeElement;
      drawer.removeAttribute("inert");
      drawer.classList.add("open"); scrim.classList.add("open");
      bagBtns.forEach(function(b){ b.setAttribute("aria-expanded", "true"); });
      document.body.classList.add("lock");
      setTimeout(function(){ closeBtn.focus(); }, 40);
    }
    function closeCart(){
      drawer.classList.remove("open"); scrim.classList.remove("open");
      drawer.setAttribute("inert", "");
      bagBtns.forEach(function(b){ b.setAttribute("aria-expanded", "false"); });
      document.body.classList.remove("lock");
      if(lastTrigger && lastTrigger.focus) lastTrigger.focus();
    }
    bagBtns.forEach(function(b){ b.addEventListener("click", openCart); });
    closeBtn.addEventListener("click", closeCart);
    scrim.addEventListener("click", closeCart);
    document.addEventListener("keydown", function(e){
      if(!drawer.classList.contains("open")) return;
      if(e.key === "Escape"){ closeCart(); return; }
      trapTab(drawer, e);
    });

    save(); render();
    }
  }, "cart");
  /* ---------- Biblioteca del Barrio: libros, compra con QR y seguimiento ---------- */
  // Libros y meta: data/biblioteca.json (editable en /admin → Biblioteca).
  // Pedidos, estadísticas y seguimiento: función api/pedidos.js (dirección en data/sistema.json → pedidos_url).
  // El estado de cada libro se cambia en el panel: /admin/pedidos.
  safe(function(){
    var lista = $("#libros-lista"), trk = $("#trk"), camps = $$("[data-campana]");
    if(!lista && !trk && !camps.length) return;

    var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    var TRACK_URL = LOCAL ? new URL("seguimiento.html", location.href).href : "https://www.nuestrosorigenes.cl/seguimiento";
    function num(n){ try{ return Number(n).toLocaleString("es-CL"); }catch(e){ return String(n); } }
    function getJSON(url){ return fetch(url, {cache:"no-store"}).then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); }); }
    // La API responde JSON también en los errores (p. ej. {ok:false, sinConfig:true} si aún no está conectada).
    function apiJSON(url, opts){ return fetch(url, opts || {cache:"no-store"}).then(function(r){ return r.json(); }); }
    function slug(s){ return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
    function trackLink(code){ return TRACK_URL + "?c=" + encodeURIComponent(code); }
    function fecha(iso){
      if(!iso) return "";
      var d = new Date(iso); if(isNaN(d)) return "";
      try{ return d.toLocaleDateString("es-CL", {day:"numeric", month:"short", year:"numeric"}); }catch(e){ return iso.slice(0, 10); }
    }

    var data = Promise.all([
      getJSON("data/biblioteca.json").catch(function(){ return {}; }),
      getJSON("data/sistema.json").catch(function(){ return {}; })
    ]).then(function(r){
      var b = r[0] || {}, api = String((r[1] || {}).pedidos_url || "").trim();
      var ok = /^\/api\/[\w-]+$/.test(api);
      var c = b.campana || {};
      return {
        api: ok ? api : "",
        campana: { meta: Math.max(1, parseInt(c.meta, 10) || 5183), activa: c.activa !== false },
        pago: b.pago || {},
        libros: (b.libros || []).filter(function(l){ return l && l.titulo && l.disponible !== false; }).map(function(l){
          return { titulo:String(l.titulo), autor:String(l.autor || ""), portada:mediaPath(l.portada), tapas:tapasDe(l), detalle:String(l.detalle || ""),
                   descripcion:String(l.descripcion || ""), precio:Math.max(0, parseInt(l.precio, 10) || 0),
                   colores:(l.colores || []).map(String).filter(Boolean), formatos:(l.formatos || []).map(String).filter(Boolean) };
        })
      };
    });

    function statsOf(d){
      if(!d.api) return Promise.resolve(null);
      return apiJSON(d.api + "?accion=estadisticas").then(function(s){
        if(s && s.sinConfig) d.api = "";  // aún sin conectar: la compra va directo a WhatsApp
        return s && s.ok ? s : null;
      }).catch(function(){ return null; });
    }
    function paintStats(root, meta, s){
      $$("[data-meta]", root).forEach(function(el){ el.textContent = num(meta); });
      var prog = $("[data-campana-prog], [data-trk-stats]", root) || (root.matches && root.matches("[data-trk-stats]") ? root : null);
      if(!s || !prog) return;
      ["comprados", "enviados", "entregados"].forEach(function(k){ $$('[data-n="' + k + '"]', root).forEach(function(el){ el.textContent = num(s[k] || 0); }); });
      var pct = Math.min(100, (s.comprados || 0) / meta * 100);
      var bar = $("[role=progressbar]", root);
      if(bar){ bar.setAttribute("aria-valuemax", meta); bar.setAttribute("aria-valuenow", s.comprados || 0); }
      var pctEl = $("[data-pct]", root);
      if(pctEl) pctEl.textContent = pct.toLocaleString("es-CL", {maximumFractionDigits: pct > 0 && pct < 1 ? 2 : 1}) + "% de la meta";
      prog.hidden = false;
      requestAnimationFrame(function(){ requestAnimationFrame(function(){
        var fill = $("[data-bar]", root); if(fill) fill.style.width = Math.max(pct, s.comprados ? 1.5 : 0) + "%";
      }); });
    }

    data.then(function(d){
      camps.forEach(function(el){
        if(d.campana.activa) return;
        if(el.hasAttribute("data-hero")) $$("[data-camp-x], [data-campana-prog]", el).forEach(function(x){ x.hidden = true; });
        else el.closest("section").hidden = true;
      });
      statsOf(d).then(function(s){ camps.forEach(function(el){ paintStats(el, d.campana.meta, s); }); });
      if(lista) safe(function(){ initLibros(d); }, "biblioteca-libros");
      if(trk) safe(function(){ initSeguimiento(d); }, "biblioteca-seguimiento");
    });

    /* QR con la marca de la ONG: assets/qr-ong.js */
    function drawQR(canvas, text){ return !!window.ongQR && window.ongQR.canvas(canvas, text, 8); }
    function downloadQR(code, titulo, cantidad){ if(window.ongQR) window.ongQR.descargar(trackLink(code), code, titulo, cantidad); }
    function nLibros(n){ return num(n) + (n === 1 ? " libro" : " libros"); }

    /* Catálogo + ventana de compra (biblioteca.html) */
    function initLibros(d){
      var libros = d.libros;
      if(!libros.length){ lista.innerHTML = '<li class="bazar-empty">Pronto agregaremos nuevos libros. Escríbenos por WhatsApp para consultar.</li>'; return; }
      lista.innerHTML = libros.map(function(l, i){
        var tags = l.colores.map(function(c){ return '<span><i class="sw" style="--sw:' + swatch(c) + '"></i>' + esc(c) + '</span>'; })
          .concat(l.formatos.map(function(f){ return '<span>' + esc(f) + '</span>'; })).join("");
        return '<li class="book">' +
          '<div class="book__cover">' + (l.tapas.length > 1 ? pilaHTML(l.tapas, l.titulo)
            : l.portada ? '<img src="' + esc(l.portada) + '" alt="Portada de ' + esc(l.titulo) + '" loading="lazy" decoding="async">' : '') + '</div>' +
          '<div class="book__b"><h3>' + esc(l.titulo) + '</h3>' +
          (l.autor ? '<p class="book__by">' + esc(l.autor) + (l.detalle ? ' · ' + esc(l.detalle) : '') + '</p>' : '') +
          '<p class="book__d">' + esc(l.descripcion) + '</p>' +
          (tags ? '<div class="book__tags">' + tags + '</div>' : '') +
          '<div class="book__f">' + (l.precio ? '<span class="price">' + money(l.precio) + '</span>' : '<span class="price price--soft">Valor por confirmar</span>') +
          '<button class="add" type="button" data-libro="' + i + '" aria-label="Comprar ' + esc(l.titulo) + '">Comprar</button></div></div></li>';
      }).join("");
      initPilas(lista);

      var modal = $("#buy"), form = $("#buyForm"), done = $("#buyDone"), msg = $(".form__msg", form), send = $(".buy__send", form);
      var cant = $("#b-cantidad"), MAX_LIBROS = 5000, cur = null, lastTrigger = null, openedAt = 0;

      // Cantidad de libros: número libre (1 a 5.000), botones − + y atajos. Una compra = un solo QR.
      function cantVal(){ var v = String(cant.value).trim(); return /^\d+$/.test(v) ? parseInt(v, 10) : 0; }
      function pintarTotal(){
        var n = cantVal(), ok = n >= 1 && n <= MAX_LIBROS;
        $("#buy-total").textContent = ok ? nLibros(n) : n > MAX_LIBROS ? "Máximo " + num(MAX_LIBROS) + " libros" : "Indica la cantidad";
        $("#buy-total-v").textContent = !ok ? "" : cur && cur.precio ? "Total " + money(cur.precio * n) : "Valor por confirmar";
        $$("[data-cant-set]", form).forEach(function(b){ b.classList.toggle("on", +b.getAttribute("data-cant-set") === n); });
      }
      function ponerCant(n){ cant.value = Math.max(1, Math.min(MAX_LIBROS, n)); pintarTotal(); }
      form.addEventListener("click", function(e){
        var b = e.target.closest("[data-cant], [data-cant-set]"); if(!b) return;
        if(b.hasAttribute("data-cant-set")) ponerCant(+b.getAttribute("data-cant-set"));
        else ponerCant((cantVal() || 1) + +b.getAttribute("data-cant"));
      });
      cant.addEventListener("input", pintarTotal);
      cant.addEventListener("blur", function(){ if(cantVal() < 1) ponerCant(1); });

      function opts(id, name, values, withSwatch){
        var fs = $("#" + id), box = $(".opts__list", fs);
        fs.hidden = !values.length;
        box.innerHTML = values.map(function(v, i){
          return '<label class="opt"><input type="radio" name="' + name + '" value="' + esc(v) + '"' + (values.length === 1 ? " checked" : "") + (i === 0 ? " required" : "") + '>' +
            '<span>' + (withSwatch ? '<i class="sw" style="--sw:' + swatch(v) + '"></i>' : '') + esc(v) + '</span></label>';
        }).join("");
      }
      function open(i, trigger){
        cur = libros[i]; lastTrigger = trigger; openedAt = Date.now();
        $("#buy-t").textContent = cur.titulo;
        $("#buy-by").textContent = cur.autor;
        $("#buy-price").textContent = cur.precio ? money(cur.precio) + " por libro" : "Valor por confirmar";
        var cover = $("#buy-cover");
        cover.innerHTML = cur.tapas.length > 1 ? pilaHTML(cur.tapas, cur.titulo)
          : cur.portada ? '<img src="' + esc(cur.portada) + '" alt="Portada de ' + esc(cur.titulo) + '">' : '';
        cover.hidden = !cover.innerHTML;
        $$("[data-pila]", cover).forEach(function(st){ st.setAttribute("data-fija", ""); });
        tyc(false);
        opts("buy-colores", "color", cur.colores, true);
        opts("buy-formatos", "formato", cur.formatos, false);
        ponerCant(1);
        msg.textContent = ""; form.hidden = false; done.hidden = true; done.innerHTML = "";
        send.disabled = false; send.textContent = "Confirmar compra";
        modal.hidden = false; document.body.classList.add("lock");
        setTimeout(function(){ ($("input[name=color]", form) || $("#b-nombre")).focus(); }, 30);
      }
      // Al elegir un color, esa tapa pasa adelante
      form.addEventListener("change", function(e){
        if(e.target.name !== "color") return;
        var st = $("#buy-cover [data-pila]"); if(st) pilaColor(st, e.target.value);
      });
      // Términos y condiciones: se abren al pasar el cursor (CSS) o al tocar el enlace (celulares y teclado)
      var tycBox = $(".tyc", form), tycBtn = $(".tyc__lnk", form), tycPop = $(".tyc__pop", form), tycFijo = false, tycT = null;
      function tyc(abrir, fijo){
        if(!tycBox) return;
        clearTimeout(tycT);
        tycFijo = abrir && !!fijo;
        tycBox.classList.toggle("is-open", abrir);
        tycBtn.setAttribute("aria-expanded", String(abrir));
      }
      if(tycBox){
        // con el mouse: se abre al pasar por el enlace y se cierra al salir (salvo que se haya hecho clic)
        [tycBtn, tycPop].forEach(function(el){
          el.addEventListener("pointerenter", function(e){ if(e.pointerType === "mouse"){ clearTimeout(tycT); if(!tycBox.classList.contains("is-open")) tyc(true); } });
          el.addEventListener("pointerleave", function(e){ if(e.pointerType === "mouse" && !tycFijo) tycT = setTimeout(function(){ tyc(false); }, 250); });
        });
        tycBtn.addEventListener("click", function(){ if(tycFijo) tyc(false); else tyc(true, true); });
        $(".tyc__x", tycBox).addEventListener("click", function(){ tyc(false); tycBtn.focus(); });
        modal.addEventListener("click", function(e){ if(!e.target.closest(".tyc")) tyc(false); });
      }
      function close(){
        modal.hidden = true; document.body.classList.remove("lock");
        if(lastTrigger && lastTrigger.focus) lastTrigger.focus();
      }
      lista.addEventListener("click", function(e){ var b = e.target.closest("[data-libro]"); if(b) open(+b.getAttribute("data-libro"), b); });
      // Desde el Bazar: biblioteca.html?libro=<titulo-en-minusculas> abre directo la compra de ese libro
      var pedido = new URLSearchParams(location.search).get("libro");
      if(pedido){
        var idx = -1; libros.forEach(function(l, i){ if(idx < 0 && slug(l.titulo) === pedido) idx = i; });
        if(idx >= 0) setTimeout(function(){ open(idx, $('[data-libro="' + idx + '"]', lista)); }, 250);
      }
      done.addEventListener("click", function(e){ var b = e.target.closest("[data-dl]"); if(b) downloadQR(b.getAttribute("data-dl"), b.getAttribute("data-t") || "", +b.getAttribute("data-n") || 1); });
      modal.addEventListener("click", function(e){ if(e.target === modal || e.target.closest("[data-close]")) close(); });
      document.addEventListener("keydown", function(e){
        if(modal.hidden) return;
        if(e.key === "Escape"){
          if(tycBox && tycBox.classList.contains("is-open")){ tyc(false); tycBtn.focus(); return; }
          close(); return;
        }
        trapTab(modal, e);
      });

      function waLink(text){ return "https://wa.me/" + WA + "?text=" + encodeURIComponent(text); }
      form.addEventListener("submit", function(e){
        e.preventDefault();
        var f = form.elements, color = (form.querySelector("input[name=color]:checked") || {}).value || "";
        var formato = (form.querySelector("input[name=formato]:checked") || {}).value || "";
        var p = { libro:cur.titulo, color:color, formato:formato, cantidad:cantVal(),
                  nombre:f.nombre.value.trim(), correo:f.correo.value.trim(), telefono:f.telefono.value.trim(),
                  comuna:f.comuna.value.trim(), dedicatoria:f.dedicatoria.value.trim(), web:f.web.value, t:Date.now() - openedAt,
                  terminos:$("#b-ok").checked };
        var err = cur.colores.length && !color ? ["Elige el color del libro.", form.querySelector("input[name=color]")]
          : cur.formatos.length && !formato ? ["Elige el formato.", form.querySelector("input[name=formato]")]
          : p.cantidad < 1 ? ["Indica cuántos libros quieres comprar.", cant]
          : p.cantidad > MAX_LIBROS ? ["Para más de " + num(MAX_LIBROS) + " libros escríbenos por WhatsApp.", cant]
          : p.nombre.length < 2 ? ["Escribe tu nombre y apellido.", f.nombre]
          : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.correo) ? ["Revisa tu correo electrónico.", f.correo]
          : p.telefono.replace(/\D/g, "").length < 8 ? ["Escribe un teléfono de contacto.", f.telefono]
          : !$("#b-ok").checked ? ["Para continuar, acepta los términos y condiciones.", $("#b-ok")] : null;
        if(err){ msg.textContent = err[0]; err[1].focus(); return; }
        msg.textContent = "";

        function porWhatsApp(){  // sistema de pedidos aún sin conectar: se coordina por WhatsApp
          var t = "Hola, quiero comprar para la Campaña Navidad 2026:\n• " + p.cantidad + " x " + p.libro + (color ? " (" + color + ")" : "") +
            (formato ? " · " + formato : "") + "\nNombre: " + p.nombre + "\nCorreo: " + p.correo + "\nTeléfono: " + p.telefono;
          window.open(waLink(t), "_blank", "noopener");
        }
        if(!d.api){ porWhatsApp(); return; }
        send.disabled = true; send.textContent = "Registrando tu compra…";
        apiJSON(d.api, { method:"POST", body:JSON.stringify(p) })
          .then(function(res){
            if(res && res.sinConfig){
              d.api = ""; send.disabled = false; send.textContent = "Confirmar compra";
              msg.innerHTML = 'Para terminar, <a href="#" data-wa>envíanos tu pedido por WhatsApp</a>.';
              $("[data-wa]", msg).addEventListener("click", function(ev){ ev.preventDefault(); porWhatsApp(); });
              return;
            }
            if(!res || !res.ok) throw new Error((res && res.error) || "");
            if(!res.codigo && !(res.codigos && res.codigos.length)) throw new Error("");
            showDone(res, p);
          })
          .catch(function(x){
            var m = x && x.message ? x.message : "No pudimos registrar tu compra.";
            msg.innerHTML = esc(m) + ' <a href="' + esc(waLink("Hola, quiero comprar " + nLibros(p.cantidad || 1) + " «" + p.libro + "» para la Campaña Navidad 2026.")) +
              '" target="_blank" rel="noopener">' + (/whatsapp/i.test(m) ? "Abrir WhatsApp" : "Escríbenos por WhatsApp") + '</a>.';
            send.disabled = false; send.textContent = "Confirmar compra";
          });
      });

      // Compra registrada: UN código QR para toda la compra, sea de 1 o de 100 libros.
      function showDone(res, p){
        var code = res.codigo || res.codigos[0], n = Math.max(1, parseInt(res.cantidad, 10) || p.cantidad || 1);
        var total = (res.valor || 0) * n, pago = d.pago || {}, uno = n === 1;
        var nombre = p.nombre.split(/\s+/)[0], libroTxt = "«" + res.libro + "»" + (res.color ? " (" + res.color + ")" : "");
        var wa = waLink("Hola, compré " + nLibros(n) + " " + libroTxt + " para la Campaña Navidad 2026. " +
          "Mi nombre es " + p.nombre + ". Código de mi compra: " + code + ". Les envío el comprobante de pago.");
        var link = /^https:\/\//.test(pago.link || "") ? pago.link : "";
        done.innerHTML =
          '<div class="done__ok"><svg aria-hidden="true"><use href="#i-check"/></svg></div>' +
          '<h2>¡Gracias, ' + esc(nombre) + '!</h2>' +
          '<p>Registramos tu compra de <b>' + esc(nLibros(n)) + '</b> ' + esc(libroTxt) + '. ' +
          (uno ? 'Escanea tu código QR y mira el estado de envío hasta que llega a los niños de la residencia.'
               : 'Tu código QR sirve para los ' + esc(num(n)) + ' libros: escanéalo y mira el estado de envío hasta que llegan a los niños de la residencia.') + '</p>' +
          '<div class="qrs qrs--uno"><div class="qr"><canvas data-qr="' + esc(code) + '" aria-label="Código QR de tu compra ' + esc(code) + '" role="img"></canvas>' +
            '<b>' + esc(code) + '</b><span class="qr__n">' + esc(nLibros(n)) + '</span>' +
            '<div class="qr__acts"><button type="button" data-dl="' + esc(code) + '" data-n="' + n + '" data-t="' + esc(res.libro + (res.color ? " · " + res.color : "")) + '">Descargar QR</button>' +
            '<a href="' + esc(trackLink(code)) + '" target="_blank" rel="noopener">Ver seguimiento</a></div></div></div>' +
          '<div class="pay"><h3>Completa tu compra</h3>' +
          '<p><b>Total: ' + esc(nLibros(n)) + ' · ' + (total ? money(total) : "valor por confirmar") + '</b></p>' +
          (pago.instrucciones ? '<p>' + esc(pago.instrucciones) + '</p>' : '') +
          (pago.datos_transferencia ? '<p>' + esc(pago.datos_transferencia) + '</p>' : '') +
          '<div class="btns">' + (link ? '<a class="btn" href="' + esc(link) + '" target="_blank" rel="noopener">Pagar en línea</a>' : '') +
          '<a class="btn btn--wa" href="' + esc(wa) + '" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#wa"/></svg>Enviar por WhatsApp</a></div></div>' +
          '<p>' + (uno ? 'Tu libro suma' : 'Tus libros suman') + ' a la meta cuando confirmemos el pago. <b>Guarda tu código:</b> descarga el QR o toma una captura de pantalla.</p>' +
          '<button class="btn btn--ghost" type="button" data-close>Cerrar</button>';
        $$("canvas[data-qr]", done).forEach(function(cv){ drawQR(cv, trackLink(cv.getAttribute("data-qr"))); });
        form.hidden = true; done.hidden = false; form.reset();
        $(".modal__box", modal).scrollIntoView({block:"start"});
        done.focus();
        statsOf(d).then(function(s){ camps.forEach(function(el){ paintStats(el, d.campana.meta, s); }); });
      }
    }

    /* Seguimiento (seguimiento.html?c=NAV-XXXX-XXXX) */
    function initSeguimiento(d){
      var stats = $("[data-trk-stats]"), main = $("[data-trk-main]"), find = $("[data-trk-find]");
      var code = String(new URLSearchParams(location.search).get("c") || "").trim().toUpperCase();
      var ICON = { "Pendiente de pago":"i-clock", "Comprado":"i-book", "Enviado":"i-truck", "Entregado":"i-gift", "Anulado":"i-x" };
      var ORDEN = ["Comprado", "Enviado", "Entregado"];
      function setIcon(id){
        var ic = $("[data-trk-ic]", main);
        ic.innerHTML = '<svg aria-hidden="true"><use href="#' + id + '"/></svg>';
        ic.classList.remove("is-pop"); void ic.offsetWidth; if(!reduce) ic.classList.add("is-pop");
      }
      function notFound(t){
        main.hidden = true; find.hidden = false;
        $("[data-trk-find-t]", find).textContent = String(t).replace(/\.$/, "");
        $("#trk-code").value = code;
      }
      if(!code){ statsOf(d).then(function(s){ paintStats(stats, d.campana.meta, s); }); return; }
      $("#trk-code").value = code;
      if(!d.api){ notFound("El seguimiento estará disponible muy pronto"); return; }
      find.hidden = true; main.hidden = false;
      $("[data-trk-code]", main).textContent = code;
      apiJSON(d.api + "?accion=seguimiento&codigo=" + encodeURIComponent(code)).then(function(r){
        if(r && r.sinConfig){ notFound("El seguimiento estará disponible muy pronto"); return; }
        if(!r || !r.ok){ notFound((r && r.error) || "No encontramos ese código"); statsOf(d).then(function(s){ paintStats(stats, d.campana.meta, s); }); return; }
        var est = r.estado, idx = ORDEN.indexOf(est);
        trk.setAttribute("data-estado", est);
        setIcon(ICON[est] || "i-clock");
        $("[data-trk-title]", main).textContent =
          est === "Entregado" ? "¡Entregado!" : est === "Enviado" ? "En camino" : est === "Comprado" ? "Comprado" : est === "Anulado" ? "Pedido anulado" : "Compra registrada";
        var n = Math.max(1, parseInt(r.cantidad, 10) || 1), uno = n === 1;
        $("[data-trk-who]", main).textContent = "Compra de " + r.nombre + " · " + nLibros(n) + " «" + r.libro + "»" + (r.color ? " (" + r.color + ")" : "");
        $("[data-trk-note]", main).textContent =
          est === "Pendiente de pago" ? "Estamos confirmando tu pago. Cuando lo confirmemos, " + (uno ? "tu libro suma" : "tus " + num(n) + " libros suman") + " a la meta de la campaña."
          : est === "Entregado" ? (uno ? "Tu libro llegó" : "Tus " + num(n) + " libros llegaron") + " a las niñas, niños y adolescentes de la residencia. ¡Gracias por regalar lectura!"
          : est === "Anulado" ? "Si crees que es un error, escríbenos por WhatsApp al +56 9 2617 5941." : "";
        var fechas = { "Comprado": r.fechas && r.fechas.pago, "Enviado": r.fechas && r.fechas.envio, "Entregado": r.fechas && r.fechas.entrega };
        $$("[data-paso]", main).forEach(function(li, i){
          li.classList.toggle("is-done", idx >= i);
          li.classList.toggle("is-now", idx === i);
          $("time", li).textContent = idx >= i ? fecha(fechas[li.getAttribute("data-paso")]) : "";
        });
        $("[data-trk-line]", main).hidden = est === "Anulado";
        document.title = ($("[data-trk-title]", main).textContent) + " · Seguimiento · ONG Nuestros Orígenes";
        paintStats(stats, d.campana.meta, r.estadisticas || null);
      }).catch(function(){
        notFound("No pudimos consultar tu compra. Intenta de nuevo en unos minutos");
      });
    }
  }, "biblioteca");
})();
