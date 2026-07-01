// Animations GSAP — Maison Matière
// Parti pris : sobre et élégant. Mouvements courts, transitions douces.
// Le contenu reste 100 % visible si GSAP ne charge pas (aucun état caché en CSS),
// et toutes les animations sont désactivées si l'utilisateur préfère moins de mouvement.

(function () {
  if (typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  // Courbe d'animation unique pour une cohérence sur tout le site
  var EASE = 'power2.out';

  // Éléments qui apparaissent au scroll (regroupés par bloc, sans surcharge)
  var REVEAL = [
    '.section .eyebrow',
    '.section h2',
    '.section .lead',
    '.grid3 .card',
    '.shot',
    '.direct-card',
    '.testi',
    '.cta-band',
    '.info .row',
    '.form > div'
  ].join(',');

  var mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', function () {

    // 1. Entrée du hero au chargement — discrète et nette
    var heroBits = gsap.utils.toArray('.hero .eyebrow, .hero h1, .hero .lead, .hero-in > *');
    if (heroBits.length) {
      gsap.from(heroBits, {
        autoAlpha: 0,
        y: 16,
        duration: 0.8,
        ease: EASE,
        stagger: 0.1,
        clearProps: 'transform'   // nettoie les styles une fois fini
      });
    }

    // 2. Révélation au scroll, par lots, pour le reste de la page
    var reveals = gsap.utils.toArray(REVEAL).filter(function (el) {
      return !el.closest('.hero');
    });
    if (!reveals.length) return;

    gsap.set(reveals, { autoAlpha: 0, y: 18 });

    ScrollTrigger.batch(reveals, {
      start: 'top 90%',
      onEnter: function (els) {
        gsap.to(els, {
          autoAlpha: 1,
          y: 0,
          duration: 0.65,
          ease: EASE,
          stagger: 0.07,
          overwrite: true,
          clearProps: 'transform'  // retire le translate après coup → layout propre
        });
      }
    });

    // Parallaxe douce du fond du hero (si photo)
    var heroBg = document.querySelector('.hero-bg');
    if (heroBg) {
      gsap.to(heroBg, {
        yPercent: 18, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    }

    // Parallaxe légère des photos de la galerie
    gsap.utils.toArray('.shot[data-has-img="1"]').forEach(function (el) {
      gsap.fromTo(el, { backgroundPositionY: '40%' }, {
        backgroundPositionY: '60%', ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // Recalcule les déclencheurs une fois polices et images chargées
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  });

  // Sécurité : si pour une raison quelconque un élément reste invisible, on le révèle
  window.addEventListener('load', function () {
    setTimeout(function () {
      document.querySelectorAll('.shot, .card').forEach(function (el) {
        if (getComputedStyle(el).visibility === 'hidden') {
          el.style.visibility = 'visible';
          el.style.opacity = '1';
        }
      });
    }, 2500);
  });
})();
