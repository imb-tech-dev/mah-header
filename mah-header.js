/* ==========================================================
   Mobile App Header — JS (GitHub / jsDelivr se load hota hai)
   - Sticky bar, drawer, search, cart, rotating placeholder
   - Instant navigation (prerender/prefetch)
   - Diwali fireworks 🎆
   Har section apna config <script class="mah-config"> se deta hai.
   ========================================================== */
(function () {
  'use strict';

  function readConfig(root) {
    var el = root.querySelector('script.mah-config');
    if (!el) return {};
    try { return JSON.parse(el.textContent); } catch (e) { return {}; }
  }

  function isVisible(el) {
    if (!el) return false;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  /* Purane (theme editor reload ke baad bache) sticky/drawer hatao */
  function cleanupStale(id) {
    document.querySelectorAll('.mah-sticky[data-section-id="' + id + '"], .mah__drawer[data-section-id="' + id + '"]').forEach(function (el) {
      if (el.parentNode === document.body) el.remove();
    });
  }

  /* ==========================================================
     INIT — ek header section
     ========================================================== */
  function init(root) {
    if (!root || root.__mahReady) return;
    root.__mahReady = true;

    var id = root.getAttribute('data-section-id');
    var cfg = readConfig(root);
    var cartUrl = cfg.cartUrl || '/cart';

    cleanupStale(id);

    /* Sticky + drawer ko <body> me le jao — theme wrapper ka
       transform/overflow position:fixed ko trap kar deta hai */
    var sticky = document.getElementById('MAHS-' + id);
    if (sticky && sticky.parentNode !== document.body) document.body.appendChild(sticky);

    var drawer = root.querySelector('.js-mah-drawer');
    if (drawer && drawer.parentNode !== document.body) document.body.appendChild(drawer);

    var scopes = [root];
    if (sticky) scopes.push(sticky);
    function qAll(sel) {
      var out = [];
      scopes.forEach(function (s) {
        s.querySelectorAll(sel).forEach(function (el) { out.push(el); });
      });
      return out;
    }
    function isMine(el) { return root.contains(el) || (sticky && sticky.contains(el)); }

    /* ---------- Rotating search placeholder ---------- */
    var rot = root.querySelector('.js-mah-rotator');
    if (rot) {
      var items = rot.querySelectorAll('.mah__ph-item');
      if (items.length > 1) {
        var ri = 0;
        setInterval(function () {
          var cur = items[ri], nxt = items[(ri + 1) % items.length];
          cur.classList.remove('is-active'); cur.classList.add('is-out');
          nxt.classList.remove('is-out'); void nxt.offsetWidth; nxt.classList.add('is-active');
          setTimeout(function () { cur.classList.remove('is-out'); }, 500);
          ri = (ri + 1) % items.length;
        }, (cfg.rotateSpeed || 2) * 1000);
      }
    }

    /* ---------- MENU: pehle Split Nav, warna apna drawer ---------- */
    qAll('.js-mah-open').forEach(function (b) {
      b.addEventListener('click', function () {
        if (typeof window.openSplitNav === 'function') { window.openSplitNav(); return; }
        if (drawer) {
          drawer.classList.add('is-open');
          document.body.style.overflow = 'hidden';
        }
      });
    });
    if (drawer) {
      drawer.querySelectorAll('.js-mah-close').forEach(function (b) {
        b.addEventListener('click', function () {
          drawer.classList.remove('is-open');
          document.body.style.overflow = '';
        });
      });
    }

    /* ---------- SEARCH: Premium search drawer khol do ---------- */
    qAll('[data-mah-search]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var psd = document.querySelector('[id^="premium-search-drawer-"]');
        if (!psd) return; // default /search navigation

        e.preventDefault();
        var openTrigger = psd.querySelector('[data-open-search]');
        if (openTrigger) {
          openTrigger.click();
        } else {
          psd.classList.add('is-open');
          document.documentElement.style.overflow = 'hidden';
          document.body.style.overflow = 'hidden';
          var inp = psd.querySelector('[data-search-input]');
          if (inp) setTimeout(function () { inp.focus(); }, 200);
        }
      });
    });

    /* ---------- Cart count live ---------- */
    ['cart:updated', 'cart:refresh'].forEach(function (evt) {
      document.addEventListener(evt, function () {
        fetch(cartUrl + '.js')
          .then(function (r) { return r.json(); })
          .then(function (c) {
            qAll('.js-mah-count').forEach(function (el) {
              el.textContent = c.item_count;
              el.style.display = c.item_count > 0 ? '' : 'none';
            });
          })
          .catch(function () {});
      });
    });

    /* ---------- CART: Shopflo / theme drawer ---------- */
    var CART_SELECTOR = cfg.cartSelector || '';

    function pick(selector) {
      if (!selector) return null;
      var list;
      try { list = document.querySelectorAll(selector); } catch (e) { return null; }
      for (var i = 0; i < list.length; i++) {
        if (!isMine(list[i])) return list[i];
      }
      return null;
    }

    function drawerOpened() {
      var locked = getComputedStyle(document.body).overflow === 'hidden'
                || getComputedStyle(document.documentElement).overflow === 'hidden';
      if (locked) return true;
      if (isVisible(document.getElementById('cart-drawer'))) return true;
      var flo = document.querySelector('iframe[src*="shopflo" i], [id*="shopflo" i], [class*="shopflo" i], [class*="flo-cart" i]');
      return isVisible(flo);
    }

    qAll('[data-mah-cart]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var custom = pick(CART_SELECTOR);
        if (custom) { e.preventDefault(); custom.click(); return; }

        var themeCart = pick('[data-testid="cart-drawer-trigger"], [aria-controls="cart-drawer"], .action__cart, #header-component a[href$="/cart"]');
        if (!themeCart) return;

        e.preventDefault();
        themeCart.click();
        setTimeout(function () {
          if (!drawerOpened()) window.location.href = cartUrl;
        }, 400);
      });
    });

    /* ---------- STICKY on scroll ---------- */
    var searchWrap = root.querySelector('.mah__searchwrap');
    var showAfter = 120;
    function measure() {
      if (searchWrap && window.scrollY < 5) {
        var r = searchWrap.getBoundingClientRect();
        showAfter = Math.max(60, r.bottom + window.scrollY);
      }
    }
    var ticking = false;
    function updateSticky() {
      ticking = false;
      if (!sticky || !sticky.isConnected) return;
      var show = window.scrollY > (showAfter - 10);
      sticky.classList.toggle('is-visible', show);
      sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
    }
    measure();
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(updateSticky); }
    }, { passive: true });
    window.addEventListener('resize', function () { measure(); updateSticky(); }, { passive: true });
    updateSticky();

    /* ---------- APP-LIKE INSTANT NAVIGATION ---------- */
    var catUrls = [];
    root.querySelectorAll('.mah__cat[href]').forEach(function (a) {
      var u = a.getAttribute('href');
      if (u && u !== '#' && catUrls.indexOf(u) === -1) catUrls.push(u);
    });

    if (catUrls.length && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {
      var spec = document.createElement('script');
      spec.type = 'speculationrules';
      spec.textContent = JSON.stringify({
        prerender: [{ urls: catUrls.slice(0, 8), eagerness: 'moderate' }],
        prefetch: [{ urls: catUrls, eagerness: 'moderate' }]
      });
      document.body.appendChild(spec);
    } else {
      var done = {};
      var prefetch = function (u) {
        if (done[u]) return; done[u] = 1;
        var l = document.createElement('link');
        l.rel = 'prefetch'; l.href = u; l.as = 'document';
        document.head.appendChild(l);
      };
      root.querySelectorAll('.mah__cat[href]').forEach(function (a) {
        ['pointerenter', 'touchstart', 'focus'].forEach(function (evt) {
          a.addEventListener(evt, function () { prefetch(a.href); }, { passive: true });
        });
      });
    }

    /* ---------- Banner images warm-up ---------- */
    var bannerImages = cfg.bannerImages || [];
    function warmImages() {
      bannerImages.forEach(function (src) {
        if (!src) return;
        var img = new Image();
        img.decoding = 'async';
        img.fetchPriority = 'low';
        img.src = src;
      });
    }
    if ('requestIdleCallback' in window) requestIdleCallback(warmImages, { timeout: 3000 });
    else setTimeout(warmImages, 1500);

    /* ---------- Fireworks ---------- */
    var canvases = qAll('.js-mah-fx');
    if (canvases.length) startFireworks(canvases, cfg.fx || {});
  }

  /* ==========================================================
     DIWALI FIREWORKS 🎆
     Rocket neeche se uthta hai (chingari trail), upar dheema
     hota hai aur blast. Hidden tab / off-screen pe pause.
     ========================================================== */
  function startFireworks(canvases, fx) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var now = new Date();
    if (fx.start) {
      var s = new Date(fx.start + 'T00:00:00');
      if (!isNaN(s) && now < s) { canvases.forEach(function (c) { c.remove(); }); return; }
    }
    if (fx.end) {
      var e = new Date(fx.end + 'T23:59:59');
      if (!isNaN(e) && now > e) { canvases.forEach(function (c) { c.remove(); }); return; }
    }

    var COLORS = (fx.colors || []).map(function (c) { return String(c).trim(); })
      .filter(function (c) { return /^#?[0-9a-f]{3,8}$/i.test(c) || /^(rgb|hsl)/i.test(c); })
      .map(function (c) { return (c.charAt(0) === '#' || /^(rgb|hsl)/i.test(c)) ? c : '#' + c; });
    if (!COLORS.length) COLORS = ['#FFD700', '#FF9F1C', '#FF4D6D', '#FF2E93', '#00BBF9', '#9B5DE5'];

    var opts = {
      colors: COLORS,
      speed: Math.max(0.3, fx.speed || 1),
      interval: Math.max(0.5, fx.interval || 1.5),
      particles: Math.max(10, Math.min(120, fx.particles || 45))
    };

    canvases.forEach(function (c) { Fireworks(c, opts); });
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function Fireworks(canvas, o) {
    if (canvas.__mahFx) return;
    canvas.__mahFx = true;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    function pickColor() { return o.colors[(Math.random() * o.colors.length) | 0]; }

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;
    var rockets = [], sparks = [], flashes = [];
    var running = false, raf = 0, last = 0, time = 0, nextLaunch = 0.4;
    var onScreen = true;

    function resize() {
      var r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function launch() {
      if (w < 20 || h < 20) return;
      var tx = rand(0.08, 0.92) * w;
      var x = tx + rand(-0.05, 0.05) * w;
      var ty = rand(0.12, 0.42) * h;
      var dist = h + 6 - ty;
      var t = rand(0.95, 1.4) / o.speed;
      var acc = 2 * dist / (t * t);
      rockets.push({ x: x, y: h + 6, vx: (tx - x) / t, vy: -acc * t, acc: acc, ty: ty, color: pickColor(), trail: [] });
    }

    function explode(r) {
      var n = Math.round(o.particles * rand(0.8, 1.2));
      var R = Math.min(w, h * 2.2) * rand(0.15, 0.25);
      var k = 2.8;
      var base = r.color;
      var alt = Math.random() < 0.45 ? pickColor() : base;
      var ring = Math.random() < 0.25;
      var g = h * 0.22 + 25;

      for (var i = 0; i < n; i++) {
        var ang = (i / n) * Math.PI * 2 + rand(-0.1, 0.1);
        var sp = ring ? R * k * rand(0.92, 1.05) : R * k * Math.sqrt(Math.random()) * rand(0.6, 1.05);
        sparks.push({
          x: r.x, y: r.y,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          k: k, g: g, life: 1,
          decay: rand(0.55, 0.85) * o.speed,
          color: Math.random() < 0.5 ? base : alt,
          size: rand(1.2, 2.2),
          twinkle: Math.random() < 0.45,
          seed: Math.random() * 10,
          streak: 0.045
        });
      }
      flashes.push({ x: r.x, y: r.y, r: R * 0.55, life: 1, color: base });
    }

    function emitEmber(r) {
      if (sparks.length > 700) return;
      sparks.push({
        x: r.x + rand(-1, 1), y: r.y + 2,
        vx: rand(-14, 14), vy: rand(10, 35),
        k: 2, g: 40, life: 1, decay: rand(2.2, 3.5),
        color: '#FFC857', size: rand(0.8, 1.4),
        twinkle: true, seed: Math.random() * 10, streak: 0
      });
    }

    function step(dt) {
      time += dt;

      if (time >= nextLaunch) {
        launch();
        if (Math.random() < 0.28) launch();
        nextLaunch = time + o.interval * rand(0.6, 1.4);
      }

      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';

      /* Rockets */
      for (var i = rockets.length - 1; i >= 0; i--) {
        var r = rockets[i];
        r.trail.push(r.x, r.y);
        if (r.trail.length > 20) r.trail.splice(0, 2);

        r.vy += r.acc * dt;
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        if (Math.random() < 0.6) emitEmber(r);

        var tl = r.trail.length / 2;
        for (var j = 1; j < tl; j++) {
          ctx.globalAlpha = (j / tl) * 0.8;
          ctx.strokeStyle = '#FFB347';
          ctx.lineWidth = 1 + (j / tl) * 1.2;
          ctx.beginPath();
          ctx.moveTo(r.trail[(j - 1) * 2], r.trail[(j - 1) * 2 + 1]);
          ctx.lineTo(r.trail[j * 2], r.trail[j * 2 + 1]);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#FFF1C1';
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2, 0, Math.PI * 2);
        ctx.fill();

        if (r.vy >= -r.acc * 0.05 || r.y <= r.ty) {
          explode(r);
          rockets.splice(i, 1);
        }
      }

      /* Blast flash */
      for (var f = flashes.length - 1; f >= 0; f--) {
        var fl = flashes[f];
        fl.life -= dt * 4.5;
        if (fl.life <= 0) { flashes.splice(f, 1); continue; }
        var grd = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, fl.r);
        grd.addColorStop(0, fl.color);
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = fl.life * 0.45;
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, fl.r, 0, Math.PI * 2);
        ctx.fill();
      }

      /* Sparks */
      for (var s = sparks.length - 1; s >= 0; s--) {
        var p = sparks[s];
        var drag = Math.exp(-p.k * dt);
        p.vx *= drag; p.vy *= drag;
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= p.decay * dt;
        if (p.life <= 0 || p.y > h + 10) { sparks.splice(s, 1); continue; }

        var a = Math.min(1, p.life * 1.4);
        if (p.twinkle) a *= 0.55 + 0.45 * Math.sin(time * 28 + p.seed);
        ctx.globalAlpha = Math.max(0, a);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * p.streak, p.y - p.vy * p.streak);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function frame(ts) {
      raf = 0;
      if (!running) return;
      if (!canvas.isConnected) { stop(); return; } // theme editor me section hat gaya
      if (!last) last = ts;
      var dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      step(dt);
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (running) return;
      running = true; last = 0;
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
    function sync() {
      if (onScreen && !document.hidden && canvas.isConnected) start(); else stop();
    }

    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        if (onScreen) resize();
        sync();
      }).observe(canvas);
    }
    document.addEventListener('visibilitychange', sync);
    sync();
  }

  /* ==========================================================
     BOOT + Shopify theme editor support
     ========================================================== */
  function boot() {
    document.querySelectorAll('.mobile-app-header[data-section-id]').forEach(init);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  document.addEventListener('shopify:section:load', function (e) {
    var r = e.target && e.target.querySelector('.mobile-app-header[data-section-id]');
    if (r) init(r);
  });
  document.addEventListener('shopify:section:unload', function (e) {
    var r = e.target && e.target.querySelector('.mobile-app-header[data-section-id]');
    if (r) cleanupStale(r.getAttribute('data-section-id'));
  });
})();
