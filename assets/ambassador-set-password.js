(() => {
  'use strict';
  const SUPABASE_URL = 'https://rsarqljktqecndsfklyf.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_54kw0Xak6mnPxGZ6RSQ9tQ_qClVhFQ-';
  const I18N = window.KXAmbassadorI18N;
  const $ = (id) => document.getElementById(id);
  const query = new URLSearchParams(window.location.search);
  const requested = query.get('lang');
  if (I18N.supported.includes(requested)) I18N.setLocale(requested);

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = hash.get('access_token');

  function t(key) { return I18N.t(key); }

  function apply() {
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      node.textContent = t(key);
    });
    $('passwordLanguageSelect').value = I18N.locale;
    $('backPortalLink').href = 'ambassador.html?lang=' + encodeURIComponent(I18N.locale);
    document.documentElement.lang = I18N.locale;
    document.title = t('pwdTitle') + ' — Koneksyon';
  }

  $('passwordLanguageSelect').addEventListener('change', (event) => I18N.setLocale(event.target.value));
  window.addEventListener('kx-ambassador-locale', apply);
  apply();

  if (!accessToken) {
    $('passwordError').textContent = t('pwdMissing');
    $('passwordError').hidden = false;
    $('setPasswordForm').querySelector('button').disabled = true;
  }

  $('setPasswordForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    $('passwordError').hidden = true;
    $('passwordStatus').textContent = '';
    const password = $('newPassword').value;
    const confirm = $('confirmPassword').value;

    if (password.length < 8) {
      $('passwordError').textContent = t('pwdShort');
      $('passwordError').hidden = false;
      return;
    }
    if (password !== confirm) {
      $('passwordError').textContent = t('pwdMismatch');
      $('passwordError').hidden = false;
      return;
    }

    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const response = await fetch(SUPABASE_URL + '/auth/v1/user', {
        method:'PUT',
        headers:{
          apikey:PUBLISHABLE_KEY,
          Authorization:'Bearer ' + accessToken,
          'Content-Type':'application/json'
        },
        body:JSON.stringify({ password }),
        cache:'no-store',
        credentials:'omit'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.msg || data.message || t('genericError'));

      history.replaceState(null, '', 'ambassador-set-password.html?lang=' + encodeURIComponent(I18N.locale));
      $('newPassword').value = '';
      $('confirmPassword').value = '';
      $('passwordStatus').textContent = t('pwdSaved');

      if (!document.getElementById('openPortalAfterPassword')) {
        const link = document.createElement('a');
        link.id = 'openPortalAfterPassword';
        link.href = 'ambassador.html?lang=' + encodeURIComponent(I18N.locale);
        link.className = 'secondary';
        link.textContent = t('openPortal');
        link.style.textAlign = 'center';
        event.currentTarget.appendChild(link);
      }
    } catch (error) {
      $('passwordError').textContent = error.message || t('genericError');
      $('passwordError').hidden = false;
      button.disabled = false;
    }
  });
})();