// Burger menu
document.addEventListener('DOMContentLoaded', function () {
  var burger = document.querySelector('.burger');
  var nav = document.querySelector('.nav');
  if (burger) burger.addEventListener('click', function () { nav.classList.toggle('open'); });

  // Active nav link based on current page
  var page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.links a[data-page]').forEach(function (a) {
    if (a.getAttribute('data-page') === page) a.classList.add('on');
  });

  // Lightbox
  var overlay = document.getElementById('lightbox');
  if (overlay) {
    document.querySelectorAll('.shot[data-img]').forEach(function (shot) {
      shot.style.cursor = 'pointer';
      shot.addEventListener('click', function () {
        var img = overlay.querySelector('img');
        var cap = overlay.querySelector('.lb-cap');
        img.src = shot.getAttribute('data-img');
        if (cap) cap.textContent = shot.querySelector('.cap') ? shot.querySelector('.cap').textContent : '';
        overlay.classList.add('open');
      });
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.classList.contains('lb-close')) overlay.classList.remove('open');
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') overlay.classList.remove('open'); });
  }

  // Web3Forms
  var form = document.getElementById('devisForm');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type=submit]');
      var result = document.getElementById('formResult');
      btn.disabled = true;
      btn.textContent = 'Envoi en cours…';
      var data = new FormData(form);
      try {
        var res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: data });
        var json = await res.json();
        if (json.success) {
          result.textContent = '✓ Demande envoyée ! Nous vous recontactons très vite.';
          result.style.color = 'green';
          if (typeof window.mmOnContactSuccess === 'function') { try { window.mmOnContactSuccess(form); } catch (e) {} }
          form.reset();
        } else {
          throw new Error(json.message);
        }
      } catch (err) {
        result.textContent = 'Une erreur est survenue. Écrivez-nous directement par e-mail.';
        result.style.color = 'red';
      }
      btn.disabled = false;
      btn.textContent = 'Envoyer ma demande';
    });
  }
});

// ===== Améliorations design & fonctionnalités =====

// Favicon (le logo dans l'onglet du navigateur)
(function () {
  if (!document.querySelector('link[rel="icon"]')) {
    var l = document.createElement('link');
    l.rel = 'icon'; l.href = 'assets/logo.png';
    document.head.appendChild(l);
  }
})();

document.addEventListener('DOMContentLoaded', function () {

  // Galerie : afficher la vraie photo si data-img est rempli
  document.querySelectorAll('.shot[data-img]').forEach(function (shot) {
    var url = shot.getAttribute('data-img');
    if (url && url.trim()) {
      shot.style.backgroundImage = 'url("' + url + '")';
      shot.setAttribute('data-has-img', '1');
    } else {
      shot.style.cursor = 'default';
    }
  });

  // Boutons flottants : Devis (toujours) + Appeler (mobile)
  var page = location.pathname.split('/').pop() || 'index.html';
  var fab = document.createElement('div');
  fab.className = 'fab';
  var html = '';
  if (page !== 'contact.html') {
    html += '<a class="fab-devis" href="contact.html">✉️ <span class="txt">Devis gratuit</span></a>';
  }
  html += '<a class="fab-call" href="tel:0699835652">📞 Appeler</a>';
  fab.innerHTML = html;
  document.body.appendChild(fab);

  // FAQ accordéon
  document.querySelectorAll('.faq-q').forEach(function (q) {
    q.addEventListener('click', function () {
      var item = q.closest('.faq-item');
      var ans = item.querySelector('.faq-a');
      var open = item.classList.toggle('open');
      ans.style.maxHeight = open ? (ans.scrollHeight + 'px') : '0';
    });
  });

  // Barre de progression de lecture
  var rb = document.createElement('div');
  rb.id = 'readbar';
  document.body.appendChild(rb);
  function updRead() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    rb.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', updRead, { passive: true });
  window.addEventListener('resize', updRead); updRead();

  // Compteurs animés (chiffres clés)
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var dur = 1200, start = null;
    function step(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      var val = Math.floor(p * target * (2 - p)); // easing out
      el.textContent = val + suffix;
      if (p < 1) requestAnimationFrame(step); else el.textContent = target + suffix;
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animateCount(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { io.observe(c); });
  } else { counters.forEach(animateCount); }

  // Mode sombre
  var savedTheme = localStorage.getItem('mm_theme');
  if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  var nav = document.querySelector('.nav');
  if (nav) {
    var tg = document.createElement('button');
    tg.className = 'theme-toggle';
    tg.setAttribute('aria-label', 'Changer le thème');
    tg.setAttribute('title', 'Mode clair / sombre');
    // Icône soleil + lune superposées : une seule bascule par CSS selon le thème
    tg.innerHTML =
      '<svg class="ico-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>' +
      '<svg class="ico-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
    tg.addEventListener('click', function () {
      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (dark) { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('mm_theme', 'light'); }
      else { document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('mm_theme', 'dark'); }
    });
    nav.appendChild(tg);
  }

  // Hero plein écran si une photo assets/hero.jpg existe
  var hero = document.querySelector('.hero');
  if (hero) {
    var probe = new Image();
    probe.onload = function () {
      var bg = document.createElement('div');
      bg.className = 'hero-bg';
      bg.style.backgroundImage = "url('assets/hero.jpg')";
      hero.insertBefore(bg, hero.firstChild);
      hero.classList.add('hero-full');
    };
    probe.src = 'assets/hero.jpg';
  }

  // Carrousel (témoignages)
  document.querySelectorAll('.carousel').forEach(function (car) {
    var track = car.querySelector('.carousel-track');
    var slides = track ? track.children : [];
    if (!track || slides.length < 2) return;
    var i = 0;
    var dotsWrap = document.createElement('div'); dotsWrap.className = 'carousel-dots';
    for (var d = 0; d < slides.length; d++) {
      (function (idx) {
        var b = document.createElement('button');
        b.addEventListener('click', function () { go(idx); });
        dotsWrap.appendChild(b);
      })(d);
    }
    car.appendChild(dotsWrap);
    var prev = document.createElement('button'); prev.className = 'carousel-nav prev'; prev.innerHTML = '‹';
    var next = document.createElement('button'); next.className = 'carousel-nav next'; next.innerHTML = '›';
    prev.addEventListener('click', function () { go(i - 1); });
    next.addEventListener('click', function () { go(i + 1); });
    car.appendChild(prev); car.appendChild(next);
    function go(n) {
      i = (n + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (-i * 100) + '%)';
      dotsWrap.querySelectorAll('button').forEach(function (b, k) { b.classList.toggle('on', k === i); });
    }
    go(0);
    var timer = setInterval(function () { go(i + 1); }, 6000);
    car.addEventListener('mouseenter', function () { clearInterval(timer); });
  });

  // Lightbox galerie : navigation + glissement
  var overlay = document.getElementById('lightbox');
  if (overlay) {
    var imgEl = overlay.querySelector('img');
    var capEl = overlay.querySelector('.lb-cap');
    var gImgs = [];
    document.querySelectorAll('.shot[data-img]').forEach(function (s) {
      var u = s.getAttribute('data-img');
      if (u && u.trim()) gImgs.push({ src: u, cap: s.querySelector('.cap') ? s.querySelector('.cap').textContent : '' });
    });
    var gi = 0;
    function show(n) {
      if (!gImgs.length) return;
      gi = (n + gImgs.length) % gImgs.length;
      imgEl.src = gImgs[gi].src;
      if (capEl) capEl.textContent = gImgs[gi].cap;
    }
    if (gImgs.length > 1) {
      var lprev = document.createElement('button'); lprev.className = 'carousel-nav prev'; lprev.style.cssText = 'position:absolute;left:18px;top:50%;color:#fff;background:rgba(255,255,255,.12);border:none'; lprev.innerHTML = '‹';
      var lnext = document.createElement('button'); lnext.className = 'carousel-nav next'; lnext.style.cssText = 'position:absolute;right:18px;top:50%;color:#fff;background:rgba(255,255,255,.12);border:none'; lnext.innerHTML = '›';
      lprev.addEventListener('click', function (e) { e.stopPropagation(); show(gi - 1); });
      lnext.addEventListener('click', function (e) { e.stopPropagation(); show(gi + 1); });
      overlay.appendChild(lprev); overlay.appendChild(lnext);
    }
    document.querySelectorAll('.shot[data-img]').forEach(function (s) {
      var u = s.getAttribute('data-img');
      if (!u || !u.trim()) return;
      s.addEventListener('click', function () {
        var idx = gImgs.findIndex(function (g) { return g.src === u; });
        show(idx < 0 ? 0 : idx);
      });
    });
    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'ArrowLeft') show(gi - 1);
      if (e.key === 'ArrowRight') show(gi + 1);
    });
    var sx = 0;
    overlay.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    overlay.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(dx < 0 ? gi + 1 : gi - 1);
    });
  }

  // Comparateur Avant / Après
  document.querySelectorAll('.ba').forEach(function (ba) {
    var after = ba.querySelector('.ba-after');
    var line = ba.querySelector('.ba-line');
    var handle = ba.querySelector('.ba-handle');
    function setPos(clientX) {
      var r = ba.getBoundingClientRect();
      var p = (clientX - r.left) / r.width;
      p = Math.max(0, Math.min(1, p));
      var pct = (p * 100).toFixed(1);
      if (after) after.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
      if (line) line.style.left = pct + '%';
      if (handle) handle.style.left = pct + '%';
    }
    var dragging = false;
    ba.addEventListener('pointerdown', function (e) { dragging = true; ba.setPointerCapture(e.pointerId); setPos(e.clientX); });
    ba.addEventListener('pointermove', function (e) { if (dragging) setPos(e.clientX); });
    ba.addEventListener('pointerup', function () { dragging = false; });
    ba.addEventListener('pointercancel', function () { dragging = false; });
  });
});
