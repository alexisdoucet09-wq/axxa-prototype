/* AXXA, section « Le coffret » : ouverture au défilement + pièces qui sortent du coffret au survol.
   Prototype (desktop, version claire). Données : coffret/manifest.js (window.COFFRET). */
(function () {
  'use strict';
  var M = window.COFFRET;
  if (!M) return;
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = M.w, H = M.h; // repère de la photo (px)

  function whenReady(fn) {
    var t = setInterval(function () {
      var card = document.querySelector('#coffret .kit-img > div');
      var descs = document.querySelectorAll('#coffret .kit-item');
      if (card && descs.length === M.order.length) { clearInterval(t); fn(card, Array.prototype.slice.call(descs)); }
    }, 40);
  }

  function el(tag, cls, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }

  whenReady(function (card, descs) {
    var kitbox = document.querySelector('#coffret .kitbox');
    card.classList.add('cf-card');
    var stage = el('div', 'cf-stage', card);
    var frame = el('div', 'cf-frame', stage);
    var box = el('div', 'cf-box', frame);
    var canvas = el('canvas', 'cf-seq', box);
    var ctx = canvas.getContext('2d');
    var holesLayer = el('div', 'cf-holes', box);
    var fly = el('div', 'cf-fly', stage);

    // ---------- pièces ----------
    var items = {};
    M.items.forEach(function (it) {
      var o = { def: it };
      if (it.hole) {
        o.hole = el('img', 'cf-hole', holesLayer);
        o.hole.src = it.hole.src; o.hole.alt = '';
        o.hole.style.left = (it.hole.x / W * 100) + '%';
        o.hole.style.top = (it.hole.y / H * 100) + '%';
        o.hole.style.width = (it.hole.w / W * 100) + '%';
        o.hole.style.height = (it.hole.h / H * 100) + '%';
      }
      if (it.crop) {
        o.crop = el('img', 'cf-crop', fly);
        o.crop.src = it.crop; o.crop.alt = '';
      }
      if (it.hero) {
        o.shadow = el('div', 'cf-shadow', fly);
        o.hero = el('div', 'cf-hero', fly);
        var img = el('img', 'cf-hero-img', o.hero);
        img.src = it.hero; img.alt = it.alt || '';
        o.heroImg = img;
      }
      items[it.key] = o;
    });

    // ---------- géométrie ----------
    var G = {};
    function layout() {
      var cr = card.getBoundingClientRect();
      var fr = frame.getBoundingClientRect();
      G.cw = cr.width; G.ch = cr.height;
      G.fx = fr.left - cr.left; G.fy = fr.top - cr.top; G.fw = fr.width; G.fh = fr.height;
      G.k = fr.width / W;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(fr.width * dpr);
      canvas.height = Math.round(fr.height * dpr);
      drawn = -1;
      M.items.forEach(function (it) {
        var o = items[it.key];
        if (!o.crop) return;
        var s = it.slot;
        var sr = { x: G.fx + s.x * G.k, y: G.fy + s.y * G.k, w: s.w * G.k, h: s.h * G.k };
        // cible : centrée dans la carte, ajustée au format du rendu
        var maxW = G.cw * it.heroW, maxH = G.ch * (it.heroH || 0.62);
        var hw = maxW, hh = maxW / it.heroRatio;
        if (hh > maxH) { hh = maxH; hw = maxH * it.heroRatio; }
        var hr = { x: (G.cw - hw) / 2, y: (G.ch - hh) / 2 - G.ch * 0.02, w: hw, h: hh };
        o.sr = sr; o.hr = hr;
        // pièce dans le coffret : à sa place exacte
        o.crop.style.left = sr.x + 'px'; o.crop.style.top = sr.y + 'px';
        o.crop.style.width = sr.w + 'px'; o.crop.style.height = sr.h + 'px';
        // rendu haute définition : à sa place de vedette
        o.hero.style.left = hr.x + 'px'; o.hero.style.top = hr.y + 'px';
        o.hero.style.width = hr.w + 'px'; o.hero.style.height = hr.h + 'px';
        o.shadow.style.left = (hr.x + hr.w * 0.12) + 'px'; o.shadow.style.width = (hr.w * 0.76) + 'px';
        o.shadow.style.top = (hr.y + hr.h + G.ch * 0.035) + 'px';
        // FLIP : facteur d'échelle entre la case et la vedette
        var sc = Math.min(hr.w / sr.w, hr.h / sr.h);
        var dx = (hr.x + hr.w / 2) - (sr.x + sr.w / 2), dy = (hr.y + hr.h / 2) - (sr.y + sr.h / 2);
        o.cropOut = 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ')' + (it.tilt ? ' rotate(' + it.tilt + 'deg)' : '');
        o.heroIn = 'translate(' + (-dx) + 'px,' + (-dy) + 'px) scale(' + (1 / sc) + ')' + (it.tilt ? ' rotate(' + (-it.tilt) + 'deg)' : '');
        applyItem(it.key, true);
      });
    }

    // ---------- séquence d'images ----------
    var frames = [], loaded = [], N = M.frames.count;
    function loadFrames() {
      if (frames.length) return;
      for (var i = 0; i < N; i++) {
        (function (i) {
          var im = new Image();
          im.decoding = 'async';
          im.onload = function () { loaded[i] = true; drawn = -1; };
          im.src = M.frames.list ? M.frames.list[i] : M.frames.pattern.replace('{i}', String(i).padStart(3, '0'));
          frames[i] = im;
        })(i);
      }
    }
    function nearestLoaded(i, dir) {
      for (var d = 0; d < N; d++) {
        var a = i - d * dir, b = i + d * dir;
        if (a >= 0 && a < N && loaded[a]) return a;
        if (b >= 0 && b < N && loaded[b]) return b;
      }
      return -1;
    }
    var drawn = -1;
    function draw(p) {
      var f = p * (N - 1);
      if (Math.abs(f - drawn) < 0.004) return;
      drawn = f;
      var i0 = Math.floor(f), a = f - i0, i1 = Math.min(i0 + 1, N - 1);
      var cw = canvas.width, ch = canvas.height;
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cw, ch);
      var j0 = loaded[i0] ? i0 : nearestLoaded(i0, 1);
      if (j0 < 0) return;
      ctx.drawImage(frames[j0], 0, 0, cw, ch);
      if (a > 0.01 && loaded[i1] && i1 !== j0) { ctx.globalAlpha = a; ctx.drawImage(frames[i1], 0, 0, cw, ch); ctx.globalAlpha = 1; }
    }

    // ---------- état ----------
    var active = null, source = null, clearTimer = 0, lifted = null, releasedAt = -1e9;
    var lid = REDUCE ? 1 : 0, scrollP = 0, last = performance.now();

    function scrollProgress() {
      var r = card.getBoundingClientRect(), vh = window.innerHeight;
      var start = vh * 0.92, end = vh * 0.52 - r.height / 2;
      var t = (start - r.top) / (start - end);
      t = Math.max(0, Math.min(1, t));
      return t * t * (3 - 2 * t); // lissage aux deux bouts
    }

    function setActive(key, src) {
      clearTimeout(clearTimer);
      if (key === active) { if (key) source = src; return; }
      active = key; source = key ? src : null;
      descs.forEach(function (d, i) { d.classList.toggle('cf-on', M.order[i] === key); });
      kitbox.classList.toggle('cf-has-on', !!key);
    }
    function scheduleClear() {
      clearTimeout(clearTimer);
      clearTimer = setTimeout(function () { setActive(null, null); }, 90);
    }

    function applyItem(key, instant) {
      var o = items[key];
      if (!o || !o.crop) return;
      var on = lifted === key;
      [o.crop, o.hero, o.shadow, o.hole].forEach(function (e) { if (e) e.classList.toggle('is-on', on); });
      if (instant) [o.crop, o.hero].forEach(function (e) { e.style.transition = 'none'; });
      o.crop.style.transform = on ? o.cropOut : 'none';
      o.hero.style.transform = on ? 'none' : o.heroIn;
      if (instant) { void o.crop.offsetWidth; [o.crop, o.hero].forEach(function (e) { e.style.transition = ''; }); }
    }
    function setLifted(key) {
      if (key === lifted) return;
      var prev = lifted;
      lifted = key;
      if (prev && !key) releasedAt = performance.now();
      if (prev) applyItem(prev);
      if (key) applyItem(key);
      stage.classList.toggle('is-focus', !!key);
    }

    // ---------- boucle ----------
    var visible = false;
    function tick(now) {
      var dt = Math.min(64, now - last); last = now;
      if (visible) {
        scrollP = scrollProgress();
        var wantsItem = active && active !== 'coffret';
        // le couvercle attend qu'une pièce soit revenue à sa place avant de se refermer
        var landing = lifted || now - releasedAt < 660;
        var target = REDUCE ? 1 : (active === 'coffret' ? (landing ? 1 : 0) : (wantsItem ? 1 : scrollP));
        var tau = active === 'coffret' || (wantsItem && lid < 1) ? 210 : 110;
        lid += (target - lid) * (1 - Math.exp(-dt / tau));
        if (Math.abs(target - lid) < 0.0008) lid = target;
        draw(lid);
        var open = lid >= 0.999;
        stage.classList.toggle('cf-open', open);
        setLifted(open && wantsItem ? active : null);
      }
      requestAnimationFrame(tick);
    }

    // ---------- interactions ----------
    descs.forEach(function (d, i) {
      var key = M.order[i];
      d.setAttribute('tabindex', '0');
      d.addEventListener('mouseenter', function () { setActive(key, 'list'); });
      d.addEventListener('mouseleave', scheduleClear);
      d.addEventListener('focus', function () { setActive(key, 'list'); });
      d.addEventListener('blur', scheduleClear);
    });

    function inRect(x, y, r, pad) { pad = pad || 0; return x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad; }
    stage.addEventListener('pointermove', function (e) {
      var cr = card.getBoundingClientRect();
      var x = e.clientX - cr.left, y = e.clientY - cr.top;
      // une pièce sortie garde le focus tant que la souris est sur elle
      if (source === 'box' && lifted && inRect(x, y, items[lifted].hr, 12)) { setActive(lifted, 'box'); return; }
      if (source === 'box' && active === 'coffret' && inRect(x, y, { x: G.fx, y: G.fy, w: G.fw, h: G.fh }, 0)) { setActive('coffret', 'box'); return; }
      var px = (x - G.fx) / G.k, py = (y - G.fy) / G.k, hit = null;
      if (lid >= 0.999) {
        M.items.forEach(function (it) { if (!hit && it.slot && inRect(px, py, it.slot, 6)) hit = it.key; });
      }
      if (!hit && M.lidZone && inRect(px, py, M.lidZone, 0)) hit = 'coffret';
      if (hit) setActive(hit, 'box'); else if (source === 'box') scheduleClear();
    });
    stage.addEventListener('pointerleave', function () { if (source === 'box') scheduleClear(); });

    // ---------- démarrage ----------
    new IntersectionObserver(function (es) {
      es.forEach(function (en) { visible = en.isIntersecting; if (visible) loadFrames(); });
    }, { rootMargin: '1200px 0px' }).observe(card);
    window.addEventListener('resize', layout);
    // attendre que la carte ait sa taille finale
    requestAnimationFrame(function () { layout(); requestAnimationFrame(tick); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  });
})();
