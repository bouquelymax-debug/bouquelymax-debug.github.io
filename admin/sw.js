// Service worker de l'admin Maison Matière (PWA).
// Stratégie : réseau d'abord (données à jour), avec repli sur le cache hors-ligne.
const CACHE = 'mm-admin-v1';
const SHELL = [
  'dashboard.html', 'calendrier.html', 'finances.html', 'leads.html',
  'archives.html', 'devis.html', 'facture.html', 'chantier.html', 'index.html',
  '../css/style.css', '../css/admin.css',
  'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // On ne touche pas aux appels API (Supabase, EmailJS, CDN externes) : toujours en direct
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        // Met en cache les pages/ressources internes réussies
        if (res && res.ok && (req.mode === 'navigate' || SHELL.some((s) => url.pathname.endsWith(s.replace('../', ''))))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('dashboard.html')))
  );
});
