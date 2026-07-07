// Active la PWA de l'admin : métadonnées d'installation + service worker.
// Un seul fichier à inclure dans chaque page admin : <script src="../js/pwa.js"></script>
(function () {
  var head = document.head;
  function add(tag, attrs) {
    var el = document.createElement(tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    head.appendChild(el);
  }
  // Manifeste (si pas déjà présent)
  if (!document.querySelector('link[rel="manifest"]')) add('link', { rel: 'manifest', href: 'manifest.webmanifest' });
  // Couleur de la barre + plein écran iOS
  if (!document.querySelector('meta[name="theme-color"]')) add('meta', { name: 'theme-color', content: '#15171B' });
  add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
  add('meta', { name: 'mobile-web-app-capable', content: 'yes' });
  add('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' });
  add('meta', { name: 'apple-mobile-web-app-title', content: 'MM Admin' });
  add('link', { rel: 'apple-touch-icon', href: 'icons/apple-touch-icon.png' });

  // Enregistrement du service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
