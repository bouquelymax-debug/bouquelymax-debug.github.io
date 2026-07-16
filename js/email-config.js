// ===== Configuration des e-mails automatiques (EmailJS) — version 1 modèle =====
// Un seul modèle EmailJS suffit. Il doit contenir :
//   To Email : {{to_email}}     Subject : {{sujet}}     Contenu : {{message}}
// Tant que SERVICE_ID est vide, les e-mails sont simplement ignorés (rien ne plante).

window.MM_EMAIL = {
  PUBLIC_KEY: '_eZElxudAzQEPqkXt',
  SERVICE_ID: 'service_s1f0gdj',
  TEMPLATE_ID: 'template_2ldl5el',
  REVIEW_URL: 'https://g.page/r/CTv9VnEVY0qbEBM/review',  // lien direct « laisser un avis » de la fiche Google
  ARTISAN_EMAIL: 'maisonmatiere58@gmail.com'  // reçoit les notifications internes (nouveau lead, etc.)
};

// Initialise EmailJS si configuré
(function () {
  var c = window.MM_EMAIL;
  if (c && c.PUBLIC_KEY && typeof emailjs !== 'undefined') {
    try { emailjs.init({ publicKey: c.PUBLIC_KEY }); } catch (e) {}
  }
})();

// Envoie un e-mail. params = { to_email, to_name, sujet, message }
// Toujours une promesse résolue (jamais bloquant).
window.mmSendEmail = function (params) {
  return new Promise(function (resolve) {
    var c = window.MM_EMAIL;
    if (!c || !c.PUBLIC_KEY || !c.SERVICE_ID || !c.TEMPLATE_ID || typeof emailjs === 'undefined') {
      resolve({ skipped: true });
      return;
    }
    emailjs.send(c.SERVICE_ID, c.TEMPLATE_ID, params)
      .then(function () { resolve({ ok: true }); })
      .catch(function (err) { console.warn('Email non envoyé:', err); resolve({ error: true }); });
  });
};
