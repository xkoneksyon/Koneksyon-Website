(() => {
  'use strict';
  const I18N = window.KXAmbassadorI18N;
  const select = document.getElementById('termsLanguageSelect');

  function apply() {
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      node.textContent = I18N.t(key);
    });
    select.value = I18N.locale;
    document.documentElement.lang = I18N.locale;
    document.title = I18N.t('termsTitle') + ' — Koneksyon';
  }

  const requested = new URLSearchParams(location.search).get('lang');
  if (I18N.supported.includes(requested)) I18N.setLocale(requested);

  select.addEventListener('change', (event) => I18N.setLocale(event.target.value));
  window.addEventListener('kx-ambassador-locale', apply);
  apply();
})();