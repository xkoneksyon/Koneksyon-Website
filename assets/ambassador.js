(() => {
  'use strict';
  const SUPABASE_URL = 'https://rsarqljktqecndsfklyf.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_54kw0Xak6mnPxGZ6RSQ9tQ_qClVhFQ-';
  const FUNCTION_URL = SUPABASE_URL + '/functions/v1/ambassador-applications';
  const TOKEN_KEY = 'kx_ambassador_session_v1';
  const LOCATION_API = 'https://countriesnow.space/api/v0.1/countries';
  const $ = (id) => document.getElementById(id);
  let session = null;
  let locationData = new Map();

  const FALLBACK_LOCATIONS = {
    'Haiti': ['Cap-Haïtien','Carrefour','Delmas','Gonaïves','Jacmel','Léogâne','Les Cayes','Pétion-Ville','Port-au-Prince','Saint-Marc'],
    'United States': ['Atlanta','Boston','Chicago','Fort Lauderdale','Houston','Los Angeles','Miami','New York','Orlando','Philadelphia','Tampa','Washington'],
    'Canada': ['Calgary','Edmonton','Montréal','Ottawa','Québec City','Toronto','Vancouver','Winnipeg'],
    'France': ['Bordeaux','Lille','Lyon','Marseille','Montpellier','Nantes','Nice','Paris','Strasbourg','Toulouse'],
    'Dominican Republic': ['Bávaro','La Romana','Puerto Plata','Punta Cana','Santiago de los Caballeros','Santo Domingo'],
    'Mexico': ['Cancún','Guadalajara','Mexico City','Monterrey','Playa del Carmen','Tijuana'],
    'Italy': ['Bologna','Florence','Milan','Naples','Rome','Turin'],
    'Martinique': ['Fort-de-France','Le Lamentin','Le Robert','Sainte-Marie','Schoelcher'],
    'Guadeloupe': ['Basse-Terre','Baie-Mahault','Le Gosier','Les Abymes','Pointe-à-Pitre'],
    'Jamaica': ['Kingston','Montego Bay','Ocho Rios','Portmore','Spanish Town'],
    'Trinidad and Tobago': ['Arima','Chaguanas','Port of Spain','San Fernando','Scarborough'],
    'Bahamas': ['Freeport','Nassau'],
    'Barbados': ['Bridgetown','Oistins','Speightstown'],
    'Saint Kitts and Nevis': ['Basseterre','Charlestown'],
    'Puerto Rico': ['Bayamón','Caguas','Carolina','Ponce','San Juan'],
    'Cuba': ['Camagüey','Havana','Holguín','Santiago de Cuba'],
    'Curaçao': ['Willemstad'],
    'Aruba': ['Noord','Oranjestad','San Nicolas'],
    'United Kingdom': ['Birmingham','Bristol','Leeds','Liverpool','London','Manchester'],
    'Spain': ['Barcelona','Madrid','Málaga','Seville','Valencia'],
    'Belgium': ['Antwerp','Brussels','Charleroi','Ghent','Liège'],
    'Switzerland': ['Basel','Bern','Geneva','Lausanne','Zürich'],
    'Germany': ['Berlin','Cologne','Frankfurt','Hamburg','Munich'],
    'Netherlands': ['Amsterdam','Eindhoven','Rotterdam','The Hague','Utrecht']
  };

  function setCityOptions(cities, placeholder = 'Select city') {
    const citySelect = $('appCity');
    citySelect.replaceChildren();
    const first = document.createElement('option');
    first.value = '';
    first.textContent = placeholder;
    citySelect.appendChild(first);

    const uniqueCities = [...new Set((cities || []).map((city) => String(city || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));

    for (const city of uniqueCities) {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      citySelect.appendChild(option);
    }

    citySelect.disabled = uniqueCities.length === 0;
  }

  function populateCountries(dataMap) {
    const countrySelect = $('appCountry');
    countrySelect.replaceChildren();

    const first = document.createElement('option');
    first.value = '';
    first.textContent = 'Select country';
    countrySelect.appendChild(first);

    [...dataMap.keys()].sort((a, b) => a.localeCompare(b)).forEach((country) => {
      const option = document.createElement('option');
      option.value = country;
      option.textContent = country;
      countrySelect.appendChild(option);
    });
  }

  function applyFallbackLocations() {
    locationData = new Map(Object.entries(FALLBACK_LOCATIONS));
    populateCountries(locationData);
    setCityOptions([], 'Select country first');
    $('locationStatus').textContent = 'Choose your country first, then select your city.';
  }

  async function loadLocations() {
    $('locationStatus').textContent = 'Loading countries and cities…';
    try {
      const response = await fetch(LOCATION_API, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'force-cache',
        credentials: 'omit'
      });
      if (!response.ok) throw new Error('Location service unavailable.');

      const payload = await response.json();
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      const nextMap = new Map();

      for (const row of rows) {
        const country = String(row?.country || row?.name || '').trim();
        const cities = Array.isArray(row?.cities) ? row.cities : [];
        if (!country || !cities.length) continue;
        nextMap.set(country, cities);
      }

      if (!nextMap.size) throw new Error('No location data returned.');
      locationData = nextMap;
      populateCountries(locationData);
      setCityOptions([], 'Select country first');
      $('locationStatus').textContent = 'Choose your country first, then select your city.';
    } catch {
      applyFallbackLocations();
      $('locationStatus').textContent = 'Country and city selection is available from the local fallback list.';
    }
  }

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

  $('appCountry').addEventListener('change', () => {
    const country = $('appCountry').value;
    if (!country) {
      setCityOptions([], 'Select country first');
      $('locationStatus').textContent = 'Choose your country first, then select your city.';
      return;
    }

    const cities = locationData.get(country) || [];
    setCityOptions(cities, cities.length ? 'Select city' : 'No cities available');
    $('locationStatus').textContent = cities.length
      ? 'Select your city from the list.'
      : 'No city list is available for this country right now.';
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
      if (!result.already_pending) {
        event.currentTarget.reset();
        setCityOptions([], 'Select country first');
        $('locationStatus').textContent = 'Choose your country first, then select your city.';
      }
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
  applyFallbackLocations();
  loadLocations();
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