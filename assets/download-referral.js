(() => {
  'use strict';
  const params = new URLSearchParams(window.location.search);
  const raw = String(params.get('ref') || '').trim().toUpperCase();
  const ref = /^[A-Z0-9_-]{3,40}$/.test(raw) ? raw : '';

  if (!ref) return;

  try {
    localStorage.setItem('kx_ambassador_referral_v1', JSON.stringify({
      code: ref,
      captured_at: new Date().toISOString()
    }));
  } catch {}

  const google = [...document.querySelectorAll('a[href*="play.google.com/store/apps/details"]')][0];
  if (google) {
    try {
      const url = new URL(google.href);
      url.searchParams.set('referrer', 'utm_source=ambassador&utm_medium=referral&ref=' + ref);
      google.href = url.toString();
    } catch {}
  }

  document.documentElement.dataset.ambassadorReferral = ref;
})();