(() => {
  'use strict';
  const SUPABASE_URL = 'https://rsarqljktqecndsfklyf.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_54kw0Xak6mnPxGZ6RSQ9tQ_qClVhFQ-';
  const FUNCTION_URL = SUPABASE_URL + '/functions/v1/ambassador-applications';
  const TOKEN_KEY = 'kx_ambassador_admin_session_v1';
  const $ = (id) => document.getElementById(id);
  let session = null;

  function setSession(value) {
    session = value;
    if (value) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(TOKEN_KEY);
  }

  function headers() {
    if (!session?.access_token) throw new Error('Sign in required.');
    return {
      'apikey': PUBLISHABLE_KEY,
      'Authorization': 'Bearer ' + session.access_token,
      'Content-Type': 'application/json'
    };
  }

  async function signIn(email, password) {
    const response = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'apikey': PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
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

  async function api(body) {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      cache: 'no-store',
      credentials: 'omit'
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) throw new Error(data.error || 'Admin access required.');
    if (!response.ok) throw new Error(data.error || 'Unable to complete request.');
    return data;
  }

  function showLogin() {
    $('adminLoginView').hidden = false;
    $('adminDashboard').hidden = true;
    $('adminLogoutBtn').hidden = true;
  }

  function showDashboard() {
    $('adminLoginView').hidden = true;
    $('adminDashboard').hidden = false;
    $('adminLogoutBtn').hidden = false;
  }

  function formatDate(value) {
    if (!value) return '—';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }

  function addDetail(container, label, value) {
    if (!value && value !== 0) return;
    const item = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = label;
    const text = document.createElement('span');
    text.textContent = String(value);
    item.append(strong, text);
    container.appendChild(item);
  }

  function actionButton(label, className) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    return button;
  }

  function renderApplication(app) {
    const card = document.createElement('article');
    card.className = 'application-card';

    const top = document.createElement('div');
    top.className = 'application-top';
    const heading = document.createElement('div');
    const h2 = document.createElement('h2');
    h2.textContent = app.full_name;
    const meta = document.createElement('div');
    meta.className = 'application-meta';
    meta.textContent = app.email + ' • ' + formatDate(app.created_at);
    heading.append(h2, meta);
    const badge = document.createElement('span');
    badge.className = 'status-badge ' + app.status;
    badge.textContent = app.status;
    top.append(heading, badge);

    const details = document.createElement('div');
    details.className = 'application-details';
    addDetail(details, 'Phone / WhatsApp', app.phone_whatsapp);
    addDetail(details, 'Location', [app.city, app.country].filter(Boolean).join(', '));
    addDetail(details, 'Platform', app.social_platform);
    addDetail(details, 'Username', app.social_handle);
    addDetail(details, 'Social link', app.social_url);
    addDetail(details, 'Audience', app.audience_size?.toLocaleString?.() ?? app.audience_size);

    const reason = document.createElement('div');
    reason.className = 'application-reason';
    reason.textContent = app.why_ambassador;

    card.append(top, details, reason);

    if (app.status === 'pending') {
      const controls = document.createElement('div');
      controls.className = 'review-controls';

      const targetLabel = document.createElement('label');
      targetLabel.textContent = 'Qualified goal';
      const target = document.createElement('input');
      target.type = 'number'; target.min = '1'; target.value = '2000';
      targetLabel.appendChild(target);

      const rewardLabel = document.createElement('label');
      rewardLabel.textContent = 'Reward (USD)';
      const reward = document.createElement('input');
      reward.type = 'number'; reward.min = '0'; reward.step = '0.01'; reward.value = '500';
      rewardLabel.appendChild(reward);

      const daysLabel = document.createElement('label');
      daysLabel.textContent = 'Campaign days';
      const days = document.createElement('input');
      days.type = 'number'; days.min = '1'; days.max = '366'; days.value = '30';
      daysLabel.appendChild(days);

      const approve = actionButton('Approve', 'primary');
      const reject = actionButton('Reject', 'danger');

      approve.addEventListener('click', async () => {
        if (!confirm('Approve ' + app.full_name + ' as a Koneksyon ambassador?')) return;
        approve.disabled = true; reject.disabled = true;
        try {
          await api({
            action: 'approve',
            application_id: app.id,
            target_qualified: Number(target.value),
            reward_amount: Number(reward.value),
            campaign_days: Number(days.value)
          });
          $('adminNotice').textContent = app.full_name + ' was approved. Their ambassador access email was triggered.';
          $('adminNotice').hidden = false;
          await loadApplications();
        } catch (error) {
          $('adminError').textContent = error.message || 'Approval failed.';
          $('adminError').hidden = false;
        } finally {
          approve.disabled = false; reject.disabled = false;
        }
      });

      reject.addEventListener('click', async () => {
        const note = prompt('Optional internal note for this rejection:', '') ?? '';
        if (!confirm('Reject ' + app.full_name + "'s application?")) return;
        approve.disabled = true; reject.disabled = true;
        try {
          await api({ action: 'reject', application_id: app.id, review_note: note });
          $('adminNotice').textContent = app.full_name + ' was rejected.';
          $('adminNotice').hidden = false;
          await loadApplications();
        } catch (error) {
          $('adminError').textContent = error.message || 'Rejection failed.';
          $('adminError').hidden = false;
        } finally {
          approve.disabled = false; reject.disabled = false;
        }
      });

      controls.append(targetLabel, rewardLabel, daysLabel, approve, reject);
      card.appendChild(controls);
    } else {
      const reviewed = document.createElement('p');
      reviewed.className = 'application-meta';
      reviewed.textContent = 'Reviewed ' + formatDate(app.reviewed_at) + (app.review_note ? ' • ' + app.review_note : '');
      card.appendChild(reviewed);
    }

    return card;
  }

  async function loadApplications() {
    $('adminError').hidden = true;
    const data = await api({ action: 'list' });
    showDashboard();
    const container = $('applications');
    container.replaceChildren();
    const applications = data.applications || [];
    if (!applications.length) {
      const empty = document.createElement('div');
      empty.className = 'notice';
      empty.textContent = 'No ambassador applications yet.';
      container.appendChild(empty);
      return;
    }
    applications.forEach((app) => container.appendChild(renderApplication(app)));
  }

  $('adminLoginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const errorNode = $('adminLoginError');
    errorNode.hidden = true;
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await signIn($('adminEmail').value.trim(), $('adminPassword').value);
      await loadApplications();
      $('adminPassword').value = '';
    } catch (error) {
      setSession(null);
      errorNode.textContent = error.message || 'Unable to sign in.';
      errorNode.hidden = false;
      showLogin();
    } finally {
      button.disabled = false;
    }
  });

  $('refreshApplicationsBtn').addEventListener('click', () => loadApplications().catch((error) => {
    $('adminError').textContent = error.message || 'Unable to refresh.';
    $('adminError').hidden = false;
  }));

  $('adminLogoutBtn').addEventListener('click', () => {
    setSession(null);
    showLogin();
  });

  try {
    const stored = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null');
    if (stored?.access_token && Number(stored.expires_at || 0) > Math.floor(Date.now() / 1000) + 30) {
      session = stored;
      loadApplications().catch(() => { setSession(null); showLogin(); });
    } else {
      showLogin();
    }
  } catch {
    setSession(null);
    showLogin();
  }
})();