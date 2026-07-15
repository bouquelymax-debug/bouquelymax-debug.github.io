// Dock façon macOS pour l'admin : barre flottante en bas, icônes qui grossissent
// à l'approche du curseur. Injecté sur toutes les pages admin (comme pwa.js).
(function () {
  var ITEMS = [
    { href: 'dashboard.html', label: 'Tableau de bord', svg: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>' },
    { href: 'calendrier.html', label: 'Calendrier', svg: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>' },
    { href: 'finances.html', label: 'Finances', svg: '<path d="M3 21h18M6 21V9M10 21V5M14 21v-8M18 21V11"/>' },
    { href: 'leads.html', label: 'Demandes', svg: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>' },
    { href: 'devis.html', label: 'Devis', svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>' },
    { href: 'facture.html', label: 'Facture', svg: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM8 8h8M8 12h8M8 16h5"/>' },
    { href: 'archives.html', label: 'Archives', svg: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M9 12h6"/>' }
  ];

  var here = (location.pathname.split('/').pop() || 'dashboard.html');
  if (here === '' || here === 'index.html') return; // pas de dock sur l'écran de connexion

  // Styles du dock (injectés ici pour marcher sur toutes les pages, même sans admin.css)
  // Navigation principale : dock centré EN HAUT (dans l'en-tête).
  var css = document.createElement('style');
  css.textContent =
    '.mmdock{position:fixed;left:50%;top:11px;transform:translateX(-50%);z-index:60;display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:100px;background:rgba(251,249,245,.75);backdrop-filter:blur(18px) saturate(1.4);-webkit-backdrop-filter:blur(18px) saturate(1.4);border:1px solid rgba(226,219,205,.9);box-shadow:0 8px 26px rgba(21,23,27,.14)}' +
    '.mmdock-item{position:relative;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#3A3E46;background:#fff;border:1px solid #E2DBCD;text-decoration:none;transform-origin:center;transition:transform .16s cubic-bezier(.22,.68,.4,1),color .2s,background .2s;will-change:transform}' +
    '.mmdock-item svg{width:19px;height:19px}' +
    '.mmdock-item:hover{color:#15171B}' +
    '.mmdock-item.on{color:#fff;background:#15171B;border-color:#15171B}' +
    '.mmdock-item.on::after{content:"";position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:#A8916D}' +
    '.mmdock-tip{position:absolute;top:calc(100% + 9px);left:50%;transform:translateX(-50%) translateY(-4px);background:#15171B;color:#fff;font-family:"Space Mono",monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;padding:5px 10px;border-radius:7px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease}' +
    '.mmdock-item:hover .mmdock-tip{opacity:1;transform:translateX(-50%) translateY(0)}' +
    '@media(max-width:760px){.mmdock{top:auto;bottom:12px;gap:4px;padding:7px 10px}.mmdock-item{width:38px;height:38px}.mmdock-item svg{width:17px;height:17px}.mmdock-tip{top:auto;bottom:calc(100% + 9px)}body{padding-bottom:86px}}' +
    '@media print{.mmdock{display:none!important}}';
  document.head.appendChild(css);

  var dock = document.createElement('nav');
  dock.className = 'mmdock';
  dock.setAttribute('aria-label', 'Navigation admin');
  dock.innerHTML = ITEMS.map(function (it) {
    var on = it.href === here ? ' on' : '';
    return '<a class="mmdock-item' + on + '" href="' + it.href + '" data-label="' + it.label + '">'
      + '<span class="mmdock-tip">' + it.label + '</span>'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + it.svg + '</svg>'
      + '</a>';
  }).join('');
  document.body.appendChild(dock);

  var items = Array.prototype.slice.call(dock.querySelectorAll('.mmdock-item'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Effet loupe : chaque icône grossit selon sa distance au curseur (scale seul, marche en haut comme en bas)
  var SIGMA = 66, MAX = 0.55;
  function magnify(mx) {
    items.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var c = r.left + r.width / 2;
      var d = mx - c;
      var f = Math.exp(-(d * d) / (2 * SIGMA * SIGMA)); // 1 au centre → 0 loin
      el.style.transform = 'scale(' + (1 + MAX * f) + ')';
    });
  }
  function reset() { items.forEach(function (el) { el.style.transform = ''; }); }

  if (!reduce) {
    dock.addEventListener('mousemove', function (e) { magnify(e.clientX); });
    dock.addEventListener('mouseleave', reset);
  }
})();
