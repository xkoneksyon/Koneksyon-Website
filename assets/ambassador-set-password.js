(() => {
  'use strict';
  const SUPABASE_URL = 'https://rsarqljktqecndsfklyf.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_54kw0Xak6mnPxGZ6RSQ9tQ_qClVhFQ-';
  const $ = (id) => document.getElementById(id);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = hash.get('access_token');

  if (!accessToken) {
    $('passwordError').textContent = 'This access link is missing or expired. Return to the Ambassador Portal and request a new access email.';
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
      $('passwordError').textContent = 'Use at least 8 characters.';
      $('passwordError').hidden = false;
      return;
    }
    if (password !== confirm) {
      $('passwordError').textContent = 'Passwords do not match.';
      $('passwordError').hidden = false;
      return;
    }

    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const response = await fetch(SUPABASE_URL + '/auth/v1/user', {
        method: 'PUT',
        headers: {
          'apikey': PUBLISHABLE_KEY,
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password }),
        cache: 'no-store',
        credentials: 'omit'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.msg || data.message || 'Unable to update password.');

      history.replaceState(null, '', 'ambassador-set-password.html');
      $('newPassword').value = '';
      $('confirmPassword').value = '';
      $('passwordStatus').textContent = 'Password saved. You can now sign in to the Ambassador Portal.';
      const link = document.createElement('a');
      link.href = 'ambassador.html';
      link.className = 'secondary';
      link.textContent = 'Open Ambassador Portal';
      link.style.textAlign = 'center';
      event.currentTarget.appendChild(link);
    } catch (error) {
      $('passwordError').textContent = error.message || 'Unable to update password.';
      $('passwordError').hidden = false;
      button.disabled = false;
    }
  });
})();