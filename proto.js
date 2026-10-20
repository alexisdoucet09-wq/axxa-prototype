/* AXXA, prototype navigable : bascule sombre / clair qui garde la position, ancres entre pages,
   menu mobile. Chargé à la fin de chaque page ; les tableaux eux-mêmes ne sont pas modifiés ici. */
(function () {
  'use strict';
  var me = document.currentScript;
  var PAGE = me.getAttribute('data-page');
  var THEME = me.getAttribute('data-theme');
  var OTHER = THEME === 'sombre' ? 'clair' : 'sombre';
  var NAV = [['Accueil', 'accueil'], ['Boutique', 'catalogue'], ['Fonctionnement', 'fonctionnement'],
    ['Application', 'application'], ['Entreprises', 'entreprises']];
  var CURRENT = { accueil: 'accueil', produit: 'catalogue', catalogue: 'catalogue', application: 'application',
    fonctionnement: 'fonctionnement', entreprises: 'entreprises' }[PAGE];

  function store(kind, k, v) {
    try { var s = window[kind]; if (v === undefined) return s.getItem(k); s.setItem(k, v); } catch (e) { return null; }
  }
  store('localStorage', 'axxa-theme', THEME);

  // Attend que le runtime ait rendu la page (hauteur stable), puis appelle fn.
  function whenSettled(fn) {
    var last = -1, stable = 0, tries = 0;
    var t = setInterval(function () {
      var h = document.documentElement.scrollHeight;
      stable = h === last ? stable + 1 : 0;
      last = h;
      if ((stable >= 3 && h > window.innerHeight) || ++tries > 60) { clearInterval(t); fn(); }
    }, 80);
  }

  // ---------- bascule de thème : même page, même endroit ----------
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.proto-theme');
    if (!a) return;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    store('sessionStorage', 'axxa-scroll', JSON.stringify({ page: PAGE, r: window.scrollY / max }));
  }, true);

  var saved = null;
  try { saved = JSON.parse(store('sessionStorage', 'axxa-scroll') || 'null'); } catch (e) { saved = null; }
  if (saved) store('sessionStorage', 'axxa-scroll', '');
  if (saved && saved.page === PAGE && !location.hash) {
    whenSettled(function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, Math.round(saved.r * max));
    });
  }

  // ---------- ancre venue d'une autre page (#kits, #documents...) ----------
  if (location.hash.length > 1) {
    var id = decodeURIComponent(location.hash.slice(1));
    whenSettled(function () {
      var el = document.getElementById(id);
      if (el) el.scrollIntoView({ block: 'start' });
    });
  }

  // ---------- menu (mobile surtout : le menu principal est masqué sous 820 px) ----------
  var panel = null;
  function href(p) { return p === PAGE ? '#' : p + '-' + THEME + '.html'; }
  function buildPanel() {
    panel = document.createElement('div');
    panel.className = 'proto-menu proto-menu--' + THEME;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Menu');
    var links = NAV.map(function (n) {
      var cur = n[1] === CURRENT ? ' aria-current="page"' : '';
      return '<a href="' + href(n[1]) + '"' + cur + '>' + n[0] + '</a>';
    }).join('');
    var logoEl = document.querySelector('header img[alt="AXXA"]');
    var logo = logoEl ? logoEl.getAttribute('src') : '';
    var themeHref = (PAGE === 'a-venir' ? 'a-venir-' + OTHER + '.html' + location.search : PAGE + '-' + OTHER + '.html');
    panel.innerHTML =
      '<div class="proto-menu__top">' +
        '<img class="proto-menu__brand" src="' + logo + '" alt="AXXA">' +
        '<button type="button" class="proto-menu__close" aria-label="Fermer le menu">' +
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>' +
        '</button>' +
      '</div>' +
      '<nav class="proto-menu__links" aria-label="Principale">' + links + '</nav>' +
      '<div class="proto-menu__foot">' +
        '<a href="a-venir-' + THEME + '.html?p=panier">Panier</a>' +
        '<a href="' + themeHref + '" class="proto-theme" data-theme-to="' + OTHER + '">' +
          (THEME === 'sombre' ? 'Thème clair' : 'Thème sombre') + '</a>' +
      '</div>';
    document.body.appendChild(panel);
    panel.querySelector('.proto-menu__close').addEventListener('click', closeMenu);
    panel.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (a && a.getAttribute('href') === '#') { e.preventDefault(); closeMenu(); }
    });
  }
  var opener = null;
  function openMenu(btn) {
    if (!panel) buildPanel();
    opener = btn;
    panel.classList.add('is-open');
    document.documentElement.classList.add('proto-lock');
    panel.querySelector('.proto-menu__close').focus();
  }
  function closeMenu() {
    if (!panel) return;
    panel.classList.remove('is-open');
    document.documentElement.classList.remove('proto-lock');
    if (opener) opener.focus();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button[aria-label="Menu"]');
    if (b) { e.preventDefault(); openMenu(b); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel && panel.classList.contains('is-open')) closeMenu();
  });
})();
