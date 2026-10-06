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
      artesania: { label:"Artesanía",     color:"#0A0A0A", stamp:"#FFFFFF" }
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
    loadProducts().then(function(PRODUCTS){ safe(function(){ initCart(PRODUCTS); }, "cart-init"); });

    function initCart(PRODUCTS){
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
      grid.innerHTML = PRODUCTS.map(function(p, k){
        var c = CATS[p.cat];
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
        var b = e.target.closest(".add"); if(!b) return;
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
})();
