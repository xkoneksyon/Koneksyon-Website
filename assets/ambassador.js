(() => {
  'use strict';

  const SUPABASE_URL = 'https://rsarqljktqecndsfklyf.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_54kw0Xak6mnPxGZ6RSQ9tQ_qClVhFQ-';
  const FUNCTION_URL = SUPABASE_URL + '/functions/v1/ambassador-applications';
  const TOKEN_KEY = 'kx_ambassador_session_v1';
  const LOCATION_API = 'https://countriesnow.space/api/v0.1/countries';
  const I18N = window.KXAmbassadorI18N;
  const $ = (id) => document.getElementById(id);

  let session = null;
  let locationData = new Map();
  let paymentDetails = {};
  let dashboardData = null;

  const requestedLocale = new URLSearchParams(window.location.search).get('lang');
  if (I18N?.supported?.includes(requestedLocale)) I18N.setLocale(requestedLocale);

  const FALLBACK_LOCATIONS = {
    'Haiti': { iso2:'HT', cities:['Cap-Haïtien','Carrefour','Delmas','Gonaïves','Jacmel','Léogâne','Les Cayes','Pétion-Ville','Port-au-Prince','Saint-Marc'] },
    'United States': { iso2:'US', cities:['Atlanta','Boston','Chicago','Fort Lauderdale','Houston','Los Angeles','Miami','New York','Orlando','Philadelphia','Tampa','Washington'] },
    'Canada': { iso2:'CA', cities:['Calgary','Edmonton','Montréal','Ottawa','Québec City','Toronto','Vancouver','Winnipeg'] },
    'France': { iso2:'FR', cities:['Bordeaux','Lille','Lyon','Marseille','Montpellier','Nantes','Nice','Paris','Strasbourg','Toulouse'] },
    'Dominican Republic': { iso2:'DO', cities:['Bávaro','La Romana','Puerto Plata','Punta Cana','Santiago de los Caballeros','Santo Domingo'] },
    'Mexico': { iso2:'MX', cities:['Cancún','Guadalajara','Mexico City','Monterrey','Playa del Carmen','Tijuana'] },
    'Italy': { iso2:'IT', cities:['Bologna','Florence','Milan','Naples','Rome','Turin'] },
    'Martinique': { iso2:'MQ', cities:['Fort-de-France','Le Lamentin','Le Robert','Sainte-Marie','Schoelcher'] },
    'Guadeloupe': { iso2:'GP', cities:['Basse-Terre','Baie-Mahault','Le Gosier','Les Abymes','Pointe-à-Pitre'] },
    'Jamaica': { iso2:'JM', cities:['Kingston','Montego Bay','Ocho Rios','Portmore','Spanish Town'] },
    'Trinidad and Tobago': { iso2:'TT', cities:['Arima','Chaguanas','Port of Spain','San Fernando','Scarborough'] },
    'Bahamas': { iso2:'BS', cities:['Freeport','Nassau'] },
    'Barbados': { iso2:'BB', cities:['Bridgetown','Oistins','Speightstown'] },
    'Saint Kitts and Nevis': { iso2:'KN', cities:['Basseterre','Charlestown'] },
    'Puerto Rico': { iso2:'PR', cities:['Bayamón','Caguas','Carolina','Ponce','San Juan'] },
    'Cuba': { iso2:'CU', cities:['Camagüey','Havana','Holguín','Santiago de Cuba'] },
    'Curaçao': { iso2:'CW', cities:['Willemstad'] },
    'Aruba': { iso2:'AW', cities:['Noord','Oranjestad','San Nicolas'] },
    'United Kingdom': { iso2:'GB', cities:['Birmingham','Bristol','Leeds','Liverpool','London','Manchester'] },
    'Spain': { iso2:'ES', cities:['Barcelona','Madrid','Málaga','Seville','Valencia'] },
    'Belgium': { iso2:'BE', cities:['Antwerp','Brussels','Charleroi','Ghent','Liège'] },
    'Switzerland': { iso2:'CH', cities:['Basel','Bern','Geneva','Lausanne','Zürich'] },
    'Germany': { iso2:'DE', cities:['Berlin','Cologne','Frankfurt','Hamburg','Munich'] },
    'Netherlands': { iso2:'NL', cities:['Amsterdam','Eindhoven','Rotterdam','The Hague','Utrecht'] }
  };

  const BANKS = ['Unibank','Capital Bank',"Banque de L'Union Haitienne",'Sogebel','Sogebank'];

  function t(key) {
    return I18N?.t(key) || key;
  }

  function localeTag() {
    return ({ en:'en-US', fr:'fr-FR', ht:'fr-HT', es:'es-ES' })[I18N?.locale || 'en'] || 'en-US';
  }

  function publicHeaders() {
    return { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json' };
  }

  function setSession(value) {
    session = value;
    if (value) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(TOKEN_KEY);
  }

  function authHeaders() {
    if (!session?.access_token) throw new Error(t('sessionExpired'));
    return {
      apikey: PUBLISHABLE_KEY,
      Authorization: 'Bearer ' + session.access_token,
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
    if (!response.ok) throw new Error(data.error || t('genericError'));
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
    if (response.status === 401) throw new Error(t('sessionExpired'));
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || t('genericError'));
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
    if (!response.ok || !data.access_token) throw new Error(t('invalidLogin'));
    setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600)
    });
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (key) node.textContent = t(key);
    });
    $('languageSelect').value = I18N.locale;
    document.title = t('program') + ' — Koneksyon';
    $('appCountry').setAttribute('aria-label', t('country'));
    $('appCity').setAttribute('aria-label', t('city'));
    const termsLink = document.querySelector('a[href^="ambassador-terms.html"]');
    if (termsLink) termsLink.href = 'ambassador-terms.html?lang=' + encodeURIComponent(I18N.locale);

    const selectedCountry = $('appCountry').value;
    const selectedCity = $('appCity').value;
    populateCountries(locationData, selectedCountry);
    if (selectedCountry) {
      const item = locationData.get(selectedCountry);
      setCityOptions(item?.cities || [], t('selectCity'), selectedCity);
    } else {
      setCityOptions([], t('selectCountryFirst'));
    }

    if ($('paymentMethod').value) renderPaymentFields($('paymentMethod').value, paymentDetails);
    if (dashboardData) renderDashboard(dashboardData);
  }

  function localizedCountryName(country, iso2) {
    if (!iso2 || !Intl.DisplayNames) return country;
    try {
      return new Intl.DisplayNames([localeTag()], { type:'region' }).of(iso2) || country;
    } catch {
      return country;
    }
  }

  function populateCountries(dataMap, preserveValue = '') {
    const countrySelect = $('appCountry');
    const options = [...dataMap.entries()].map(([country, info]) => ({
      country,
      label: localizedCountryName(country, info?.iso2)
    })).sort((a,b) => a.label.localeCompare(b.label, localeTag()));

    countrySelect.replaceChildren();
    const first = document.createElement('option');
    first.value = '';
    first.textContent = t('selectCountry');
    countrySelect.appendChild(first);

    options.forEach(({ country, label }) => {
      const option = document.createElement('option');
      option.value = country;
      option.textContent = label;
      countrySelect.appendChild(option);
    });

    if (preserveValue && dataMap.has(preserveValue)) countrySelect.value = preserveValue;
  }

  function setCityOptions(cities, placeholder = null, preserveValue = '') {
    const citySelect = $('appCity');
    citySelect.replaceChildren();
    const first = document.createElement('option');
    first.value = '';
    first.textContent = placeholder || t('selectCity');
    citySelect.appendChild(first);

    const uniqueCities = [...new Set((cities || []).map((city) => String(city || '').trim()).filter(Boolean))]
      .sort((a,b) => a.localeCompare(b, localeTag()));

    uniqueCities.forEach((city) => {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      citySelect.appendChild(option);
    });

    citySelect.disabled = uniqueCities.length === 0;
    if (preserveValue && uniqueCities.includes(preserveValue)) citySelect.value = preserveValue;
  }

  function applyFallbackLocations() {
    locationData = new Map(Object.entries(FALLBACK_LOCATIONS));
    populateCountries(locationData);
    setCityOptions([], t('selectCountryFirst'));
    $('locationStatus').textContent = t('locationHelp');
  }

  async function loadLocations() {
    $('locationStatus').textContent = t('loadingLocations');
    try {
      const response = await fetch(LOCATION_API, {
        method:'GET',
        headers:{ Accept:'application/json' },
        cache:'force-cache',
        credentials:'omit'
      });
      if (!response.ok) throw new Error('location');
      const payload = await response.json();
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      const nextMap = new Map();

      rows.forEach((row) => {
        const country = String(row?.country || row?.name || '').trim();
        const cities = Array.isArray(row?.cities) ? row.cities : [];
        const iso2 = String(row?.iso2 || '').trim().toUpperCase();
        if (country && cities.length) nextMap.set(country, { iso2, cities });
      });

      if (!nextMap.size) throw new Error('location');
      locationData = nextMap;
      populateCountries(locationData);
      setCityOptions([], t('selectCountryFirst'));
      $('locationStatus').textContent = t('locationHelp');
    } catch {
      applyFallbackLocations();
      $('locationStatus').textContent = t('fallbackLocations');
    }
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
    $('qrCode').replaceChildren();
  }

  function renderQr(url) {
    clearQr();
    if (!window.QRCode || !url) {
      $('dashboardError').textContent = t('genericError');
      $('dashboardError').hidden = false;
      return;
    }
    new window.QRCode($('qrCode'), {
      text:url,
      width:206,
      height:206,
      colorDark:'#000000',
      colorLight:'#ffffff',
      correctLevel:window.QRCode.CorrectLevel.M
    });
  }

  function formatDate(value) {
    if (!value) return '—';
    return new Intl.DateTimeFormat(localeTag(), { year:'numeric', month:'short', day:'numeric' }).format(new Date(value));
  }

  function money(value, digits = 2) {
    return new Intl.NumberFormat(localeTag(), {
      style:'currency',
      currency:'USD',
      minimumFractionDigits:digits,
      maximumFractionDigits:digits
    }).format(Number(value || 0));
  }

  function renderDashboard(data) {
    dashboardData = data;
    const campaign = data?.campaign;
    if (!campaign) return;

    const qualified = Number(campaign.qualified || 0);
    const pending = Number(campaign.pending || 0);
    const rejected = Number(campaign.rejected || 0);
    const target = Number(campaign.target_qualified || 0);
    const percent = target > 0 ? Math.min(100, Math.round((qualified / target) * 100)) : 0;

    $('statusPill').textContent = data.ambassador_status === 'active' ? t('active') : String(data.ambassador_status || '');
    $('qualifiedCount').textContent = qualified.toLocaleString(localeTag());
    $('pendingCount').textContent = pending.toLocaleString(localeTag());
    $('rejectedCount').textContent = rejected.toLocaleString(localeTag());
    $('targetCount').textContent = target.toLocaleString(localeTag());
    $('progressText').textContent = qualified.toLocaleString(localeTag()) + ' / ' + target.toLocaleString(localeTag()) + ' ' + t('qualifiedWord');
    $('percentText').textContent = percent + '%';
    $('progressBar').style.width = percent + '%';
    $('campaignDates').textContent = formatDate(campaign.starts_at) + ' – ' + formatDate(campaign.ends_at);
    $('campaignReward').textContent = money(campaign.reward_amount);

    $('ratePerUser').textContent = money(campaign.rate_per_qualified, 2);
    $('unpaidQualified').textContent = Number(campaign.unpaid_qualified || 0).toLocaleString(localeTag());
    $('pendingPayout').textContent = money(campaign.pending_payout_total_usd);
    $('paidTotal').textContent = money(campaign.paid_total_usd);
    $('thresholdValue').textContent = Number(campaign.payout_min_qualified || 100).toLocaleString(localeTag());
    $('usersRemainingValue').textContent = Number(campaign.qualified_until_first_payout || 0).toLocaleString(localeTag());
    $('nextPayoutValue').textContent = formatDate(campaign.next_payout_at);

    document.querySelector('[data-i18n="every14Value"]').textContent =
      campaign.payout_interval_days === 14 ? t('every14Value') : String(campaign.payout_interval_days) + ' days';
  }

  async function loadDashboard() {
    $('dashboardError').hidden = true;
    const data = await rpc('get_my_ambassador_dashboard_v1');
    if (!data?.is_ambassador) throw new Error(t('approvedOnly'));

    showDashboard();
    $('referralCode').value = data.referral_code || '';
    $('referralUrl').value = data.referral_url || '';
    renderQr(data.referral_url || '');

    $('noCampaign').hidden = !!data.campaign;
    $('campaignContent').hidden = !data.campaign;
    if (data.campaign) renderDashboard(data);

    await Promise.all([loadPaymentSettings(), loadPayoutHistory()]);
  }

  function createInput(id, labelKey, value = '', type = 'text') {
    const label = document.createElement('label');
    const span = document.createElement('span');
    span.textContent = t(labelKey);
    const input = document.createElement('input');
    input.id = id;
    input.type = type;
    input.value = value || '';
    input.autocomplete = 'off';
    input.required = !['swift'].includes(id);
    label.append(span, input);
    return label;
  }

  function renderPaymentFields(method, details = {}) {
    const container = $('paymentFields');
    container.replaceChildren();

    if (method === 'cashapp') {
      container.appendChild(createInput('payCashtag','cashtag',details.cashtag || ''));
      return;
    }

    if (method === 'zelle') {
      container.appendChild(createInput('payZelleContact','zelleContact',details.contact || ''));
      return;
    }

    if (method === 'moneygram') {
      container.append(
        createInput('payRecipientName','recipientName',details.recipient_name || ''),
        createInput('payCountry','payoutCountry',details.country || ''),
        createInput('payCity','payoutCity',details.city || '')
      );
      return;
    }

    if (method === 'bank_transfer_usd') {
      const bankLabel = document.createElement('label');
      const bankSpan = document.createElement('span');
      bankSpan.textContent = t('bank');
      const bankSelect = document.createElement('select');
      bankSelect.id = 'payBank';
      bankSelect.required = true;

      const first = document.createElement('option');
      first.value = '';
      first.textContent = t('chooseBank');
      bankSelect.appendChild(first);

      BANKS.forEach((bank) => {
        const option = document.createElement('option');
        option.value = bank;
        option.textContent = bank;
        bankSelect.appendChild(option);
      });
      bankSelect.value = details.bank_name || '';
      bankLabel.append(bankSpan, bankSelect);

      container.append(
        bankLabel,
        createInput('payAccountHolder','accountHolder',details.account_holder || ''),
        createInput('payAccountNumber','accountNumber',details.account_number || ''),
        createInput('paySwift','swift',details.swift || '')
      );
    }
  }

  async function loadPaymentSettings() {
    const data = await rpc('get_my_ambassador_payment_v2');
    paymentDetails = data?.details || {};
    $('paymentMethod').value = data?.configured ? (data.payment_method || '') : '';
    renderPaymentFields($('paymentMethod').value, paymentDetails);
    if (!data?.configured && dashboardData?.campaign?.pending_payout_total_usd > 0) {
      $('paymentStatus').textContent = t('paymentRequired');
    }
  }

  function paymentPayload(method) {
    if (method === 'cashapp') return { cashtag:$('payCashtag')?.value.trim() || '' };
    if (method === 'zelle') return { contact:$('payZelleContact')?.value.trim() || '' };
    if (method === 'moneygram') {
      return {
        recipient_name:$('payRecipientName')?.value.trim() || '',
        country:$('payCountry')?.value.trim() || '',
        city:$('payCity')?.value.trim() || ''
      };
    }
    if (method === 'bank_transfer_usd') {
      return {
        bank_name:$('payBank')?.value || '',
        account_holder:$('payAccountHolder')?.value.trim() || '',
        account_number:$('payAccountNumber')?.value.trim() || '',
        swift:$('paySwift')?.value.trim() || ''
      };
    }
    return {};
  }

  async function loadPayoutHistory() {
    const list = $('payoutList');
    list.replaceChildren();
    const payouts = await rpc('get_my_ambassador_growth_payouts_v1');
    if (!Array.isArray(payouts) || payouts.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = t('noPayouts');
      list.appendChild(empty);
      return;
    }

    payouts.forEach((payout) => {
      const row = document.createElement('article');
      row.className = 'payout-row';

      const left = document.createElement('div');
      const period = document.createElement('strong');
      period.textContent = formatDate(payout.period_start) + ' – ' + formatDate(payout.period_end);
      const meta = document.createElement('span');
      meta.textContent = Number(payout.qualified_count || 0).toLocaleString(localeTag()) + ' ' + t('users');
      left.append(period, meta);

      const right = document.createElement('div');
      const amount = document.createElement('strong');
      amount.textContent = money(payout.amount_usd);
      const status = document.createElement('span');
      status.className = 'status-badge ' + String(payout.status || '');
      status.textContent = t(String(payout.status || 'pending'));
      right.append(amount, status);

      row.append(left, right);
      list.appendChild(row);
    });
  }

  $('languageSelect').addEventListener('change', (event) => {
    I18N.setLocale(event.target.value);
  });

  window.addEventListener('kx-ambassador-locale', () => {
    applyTranslations();
    $('locationStatus').textContent = $('appCountry').value ? t('selectCity') : t('locationHelp');
    if (session?.access_token) loadPayoutHistory().catch(() => {});
  });

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
      await callFunction({
        action:'request_access',
        email:$('accessEmail').value.trim(),
        locale:I18N.locale
      });
      $('accessStatus').textContent = t('accessSent');
    } catch {
      $('accessStatus').textContent = t('accessSent');
    } finally {
      button.disabled = false;
    }
  });

  $('appCountry').addEventListener('change', () => {
    const country = $('appCountry').value;
    if (!country) {
      setCityOptions([], t('selectCountryFirst'));
      $('locationStatus').textContent = t('locationHelp');
      return;
    }
    const item = locationData.get(country);
    setCityOptions(item?.cities || [], t('selectCity'));
    $('locationStatus').textContent = t('selectCity');
  });

  $('applicationForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    $('applicationError').hidden = true;
    $('applicationStatus').textContent = '';

    if (!$('appTerms').checked) {
      $('applicationError').textContent = t('requiredError');
      $('applicationError').hidden = false;
      button.disabled = false;
      return;
    }

    try {
      const result = await callFunction({
        action:'apply',
        full_name:$('appFullName').value,
        email:$('appEmail').value,
        phone_whatsapp:$('appPhone').value,
        country:$('appCountry').value,
        city:$('appCity').value,
        social_platform:$('appPlatform').value,
        social_handle:$('appHandle').value,
        social_url:$('appSocialUrl').value,
        audience_size:$('appAudience').value,
        why_ambassador:$('appReason').value,
        locale:I18N.locale,
        terms_accepted:true,
        terms_version:I18N.TERMS_VERSION,
        website:$('appWebsite').value
      });

      $('applicationStatus').textContent = result.already_pending ? t('alreadyPending') : t('appSubmitted');
      if (!result.already_pending) {
        event.currentTarget.reset();
        populateCountries(locationData);
        setCityOptions([], t('selectCountryFirst'));
        $('locationStatus').textContent = t('locationHelp');
      }
    } catch (error) {
      $('applicationError').textContent = error.message || t('genericError');
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
      errorNode.textContent = error.message || t('genericError');
      errorNode.hidden = false;
      showEntry();
    } finally {
      button.disabled = false;
    }
  });

  $('logoutBtn').addEventListener('click', () => {
    setSession(null);
    clearQr();
    dashboardData = null;
    showEntry();
  });

  $('copyLinkBtn').addEventListener('click', async () => {
    const text = $('referralUrl').value;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      $('referralUrl').select();
      document.execCommand('copy');
    }
    $('copyStatus').textContent = t('copied');
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

  $('paymentMethod').addEventListener('change', () => {
    paymentDetails = {};
    renderPaymentFields($('paymentMethod').value, {});
  });

  $('paymentForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const method = $('paymentMethod').value;
    const button = event.currentTarget.querySelector('button[type="submit"]');
    $('paymentError').hidden = true;
    $('paymentStatus').textContent = '';
    button.disabled = true;

    try {
      if (!method) throw new Error(t('chooseMethod'));
      const details = paymentPayload(method);
      const result = await rpc('set_my_ambassador_payment_v2', {
        p_method:method,
        p_details:details
      });
      if (!result?.success) throw new Error(result?.error || t('genericError'));
      paymentDetails = details;
      $('paymentStatus').textContent = t('paymentSaved');
      await loadDashboard();
    } catch (error) {
      $('paymentError').textContent = error.message || t('genericError');
      $('paymentError').hidden = false;
    } finally {
      button.disabled = false;
    }
  });

  showTab('signin');
  applyFallbackLocations();
  applyTranslations();
  loadLocations();

  try {
    const stored = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null');
    if (stored?.access_token && Number(stored.expires_at || 0) > Math.floor(Date.now() / 1000) + 30) {
      session = stored;
      loadDashboard().catch(() => {
        setSession(null);
        showEntry();
      });
    } else {
      setSession(null);
      showEntry();
    }
  } catch {
    setSession(null);
    showEntry();
  }
})();