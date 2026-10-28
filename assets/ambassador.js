(() => {
  'use strict';
  const SUPABASE_URL = 'https://rsarqljktqecndsfklyf.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_54kw0Xak6mnPxGZ6RSQ9tQ_qClVhFQ-';
  const FUNCTION_URL = SUPABASE_URL + '/functions/v1/ambassador-applications';
  const TOKEN_KEY = 'kx_ambassador_session_v1';
  const $ = (id) => document.getElementById(id);
  let session = null;

  function publicHeaders() {
    return { 'apikey': PUBLISHABLE_KEY, 'Content-Type': 'application/json' };
  }

  function setSession(value) {
    session = value;
    if (value) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(TOKEN_KEY);
  }

  function authHeaders() {
    if (!session?.access_token) throw new Error('Not signed in.');
    return {
      'apikey': PUBLISHABLE_KEY,
      'Authorization': 'Bearer ' + session.access_token,
      'Content-Type': 'application/json'
    };
  }

  async function callFunction(body) {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: publicHeaders(),
      body: JSON.stringify(body),
      cache: 'no-store',
      credentials: 'omit'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to complete this request.');
    return data;
  }

  async function rpc(name, body = {}) {
    const response = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + encodeURIComponent(name), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
      cache: 'no-store',
      credentials: 'omit'
    });
    if (response.status === 401) throw new Error('Your session expired. Please sign in again.');
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || 'Unable to load ambassador data.');
    return data;
  }

  async function signIn(email, password) {
    const response = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: publicHeaders(),
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
      credentials: 'omit'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.access_token) throw new Error('Invalid email or password.');
    setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600)
    });
  }

  function showEntry() {
    $('entryView').hidden = false;
    $('dashboardView').hidden = true;
    $('logoutBtn').hidden = true;
  }

  function showDashboard() {
    $('entryView').hidden = true;
    $('dashboardView').hidden = false;
    $('logoutBtn').hidden = false;
  }

  function showTab(name) {
    const signIn = name === 'signin';
    $('signInPanel').hidden = !signIn;
    $('applyPanel').hidden = signIn;
    $('signInTab').classList.toggle('active', signIn);
    $('applyTab').classList.toggle('active', !signIn);
    $('signInTab').setAttribute('aria-selected', String(signIn));
    $('applyTab').setAttribute('aria-selected', String(!signIn));
  }

  function clearQr() {
    const node = $('qrCode');
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function renderQr(url) {
    clearQr();
    if (!window.QRCode) {
      $('dashboardError').textContent = 'QR generator could not load. Your referral link is still available.';
      $('dashboardError').hidden = false;
      return;
    }
    new window.QRCode($('qrCode'), {
      text: url,
      width: 206,
      height: 206,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel.M
    });
  }

  function formatDate(value) {
    if (!value) return '';
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
  }

  async function loadDashboard() {
    $('dashboardError').hidden = true;
    const data = await rpc('get_my_ambassador_dashboard_v1');
    if (!data?.is_ambassador) throw new Error('This account has not been approved as a Koneksyon ambassador.');
    showDashboard();
    $('statusPill').textContent = data.ambassador_status || 'Active';
    $('referralCode').value = data.referral_code || '';
    $('referralUrl').value = data.referral_url || '';
    renderQr(data.referral_url || '');

    const campaign = data.campaign;
    $('noCampaign').hidden = !!campaign;
    $('campaignContent').hidden = !campaign;
    if (!campaign) return;

    const qualified = Number(campaign.qualified || 0);
    const pending = Number(campaign.pending || 0);
    const rejected = Number(campaign.rejected || 0);
    const target = Number(campaign.target_qualified || 0);
    const percent = target > 0 ? Math.min(100, Math.round((qualified / target) * 100)) : 0;

    $('qualifiedCount').textContent = qualified.toLocaleString();
    $('pendingCount').textContent = pending.toLocaleString();
    $('rejectedCount').textContent = rejected.toLocaleString();
    $('targetCount').textContent = target.toLocaleString();
    $('progressText').textContent = qualified.toLocaleString() + ' / ' + target.toLocaleString() + ' qualified';
    $('percentText').textContent = percent + '%';
    $('progressBar').style.width = percent + '%';
    $('campaignDates').textContent = formatDate(campaign.starts_at) + ' – ' + formatDate(campaign.ends_at);
    $('campaignReward').textContent = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: campaign.reward_currency || 'USD'
    }).format(Number(campaign.reward_amount || 0));
  }

  $('signInTab').addEventListener('click', () => showTab('signin'));
  $('applyTab').addEventListener('click', () => showTab('apply'));

  $('showAccessFormBtn').addEventListener('click', () => {
    $('accessForm').hidden = !$('accessForm').hidden;
    if (!$('accessForm').hidden) $('accessEmail').focus();
  });

  $('accessForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    $('accessStatus').textContent = '';
    try {
      const result = await callFunction({ action: 'request_access', email: $('accessEmail').value.trim() });
      $('accessStatus').textContent = result.message || 'If approved, an access email will be sent.';
    } catch {
      $('accessStatus').textContent = 'If this email belongs to an approved ambassador, an access email will be sent.';
    } finally {
      button.disabled = false;
    }
  });

  $('applicationForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    $('applicationError').hidden = true;
    $('applicationStatus').textContent = '';
    try {
      const result = await callFunction({
        action: 'apply',
        full_name: $('appFullName').value,
        email: $('appEmail').value,
        phone_whatsapp: $('appPhone').value,
        country: $('appCountry').value,
        city: $('appCity').value,
        social_platform: $('appPlatform').value,
        social_handle: $('appHandle').value,
        social_url: $('appSocialUrl').value,
        audience_size: $('appAudience').value,
        why_ambassador: $('appReason').value,
        website: $('appWebsite').value
      });
      $('applicationStatus').textContent = result.message || 'Application submitted. Our team will review it.';
      if (!result.already_pending) event.currentTarget.reset();
    } catch (error) {
      $('applicationError').textContent = error.message || 'Unable to submit application.';
      $('applicationError').hidden = false;
    } finally {
      button.disabled = false;
    }
  });

  $('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const errorNode = $('loginError');
    errorNode.hidden = true;
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await signIn($('email').value.trim(), $('password').value);
      await loadDashboard();
      $('password').value = '';
    } catch (error) {
      setSession(null);
      errorNode.textContent = error.message || 'Unable to sign in.';
      errorNode.hidden = false;
      showEntry();
    } finally {
      button.disabled = false;
    }
  });

  $('logoutBtn').addEventListener('click', () => {
    setSession(null);
    clearQr();
    showEntry();
  });

  $('copyLinkBtn').addEventListener('click', async () => {
    const text = $('referralUrl').value;
    try {
      await navigator.clipboard.writeText(text);
      $('copyStatus').textContent = 'Referral link copied.';
    } catch {
      $('referralUrl').select();
      document.execCommand('copy');
      $('copyStatus').textContent = 'Referral link copied.';
    }
  });

  $('downloadQrBtn').addEventListener('click', () => {
    const canvas = $('qrCode').querySelector('canvas');
    const image = $('qrCode').querySelector('img');
    let url = '';
    if (canvas) url = canvas.toDataURL('image/png');
    else if (image) url = image.src;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'koneksyon-referral-' + ($('referralCode').value || 'qr') + '.png';
    a.rel = 'noopener';
    a.click();
  });

  showTab('signin');
  try {
    const stored = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null');
    if (stored?.access_token && Number(stored.expires_at || 0) > Math.floor(Date.now() / 1000) + 30) {
      session = stored;
      loadDashboard().catch(() => { setSession(null); showEntry(); });
    } else {
      setSession(null);
      showEntry();
    }
  } catch {
    setSession(null);
    showEntry();
  }
})();