// File: admin-scripts.js (refactored & fixes)
// Admin panel: login (demo fallback), JWT token handling, auto-logout scheduling,
// product CRUD (API-first, local fallback), image upload that prefers thumbnailUrl when returned.

const ADMIN_API_BASE = (function(){
  try {
    const host = window.location.hostname;
    return (host === 'localhost' || host === '127.0.0.1') ? 'http://localhost:4000/api' : null;
  } catch {
    return null;
  }
})();

const LS = {
  get(k, fallback){ try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  rawSet(k, v){ try { localStorage.setItem(k, v); } catch {} },
  rawGet(k){ try { return localStorage.getItem(k); } catch { return null; } },
  del(k){ try { localStorage.removeItem(k); } catch {} }
};

function token() { return LS.rawGet('cellex_admin_token'); }
function setToken(t){ if (t) LS.rawSet('cellex_admin_token', t); else LS.del('cellex_admin_token'); }
function authHeaders() {
  const t = token();
  return t ? { 'Authorization': 'Bearer ' + t } : {};
}

function parseJwtPayload(jwt) {
  if (!jwt) return null;
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g,'+').replace(/_/g,'/');
    const json = decodeURIComponent(atob(payload).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

let autoLogoutTimer = null;
let sessionTicker = null;
function scheduleAutoLogoutFromToken() {
  clearTimeout(autoLogoutTimer);
  clearInterval(sessionTicker);
  const t = token();
  if (!t) { updateSessionIndicator(null); return; }
  const payload = parseJwtPayload(t);
  if (!payload || !payload.exp) { updateSessionIndicator(null); return; }
  const expMs = payload.exp * 1000;
  const now = Date.now();
  const ttl = Math.max(0, expMs - now);
  if (ttl <= 0) { logout(true); return; }
  updateSessionIndicator(ttl);
  sessionTicker = setInterval(() => {
    const remaining = expMs - Date.now();
    if (remaining <= 0) { clearInterval(sessionTicker); logout(true); } else { updateSessionIndicator(remaining); }
  }, 1000);
  autoLogoutTimer = setTimeout(() => { logout(true); }, ttl);
}

function updateSessionIndicator(msOrNull) {
  const elStatus = document.getElementById('adminStatus');
  if (!elStatus) return;
  if (msOrNull == null) {
    const t = token();
    if (t === 'local-demo-token' || (t && !parseJwtPayload(t))) {
      elStatus.textContent = 'Signed in (local demo)';
      document.body.classList.add('logged-in');
      return;
    }
    elStatus.textContent = 'Not signed in';
    document.body.classList.remove('logged-in');
    return;
  }
  const s = Math.floor(msOrNull / 1000);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  elStatus.textContent = `Signed in — session ${mins}:${secs.toString().padStart(2,'0')}`;
  document.body.classList.add('logged-in');
}

async function apiFetch(path, opts = {}) {
  if (!ADMIN_API_BASE) throw new Error('API unavailable');
  const headers = opts.headers ? {...opts.headers} : {};
  const bodyIsForm = opts.body instanceof FormData;
  if (!bodyIsForm && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  opts.headers = { ...headers, ...authHeaders() };
  if (opts.body && !bodyIsForm && headers['Content-Type'] === 'application/json' && typeof opts.body !== 'string') {
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(ADMIN_API_BASE + path, opts);
  if (!res.ok) {
    const txt = await res.text().catch(()=>res.statusText || '');
    throw new Error(`API error ${res.status}: ${txt}`);
  }
  if (res.status === 204) return null;
  return res.json().catch(()=>null);
}

const el = {
  authSection: () => document.getElementById('authSection'),
  adminUI: () => document.getElementById('adminUI'),
  adminStatus: () => document.getElementById('adminStatus'),
  btnLogout: () => document.getElementById('btnLogout'),
  btnLogin: () => document.getElementById('btnLogin'),
  adminEmail: () => document.getElementById('adminEmail'),
  adminPassword: () => document.getElementById('adminPassword'),
  pid: () => document.getElementById('pid'),
  ptitle: () => document.getElementById('ptitle'),
  pspec: () => document.getElementById('pspec'),
  pprice: () => document.getElementById('pprice'),
  pimage: () => document.getElementById('pimage'),
  pfile: () => document.getElementById('pfile'),
  btnUpload: () => document.getElementById('btnUpload'),
  uploadStatus: () => document.getElementById('uploadStatus'),
  pcategory: () => document.getElementById('pcategory'),
  saveProduct: () => document.getElementById('saveProduct'),
  clearForm: () => document.getElementById('clearForm'),
  adminList: () => document.getElementById('adminList'),
  adminMessage: () => document.getElementById('adminMessage'),
  syncCatalog: () => document.getElementById('syncCatalog'),
  btnFetchOrders: () => document.getElementById('btnFetchOrders'),
  ordersSection: () => document.getElementById('ordersSection'),
  ordersList: () => document.getElementById('ordersList'),
  btnClearLocal: () => document.getElementById('btnClearLocal')
};

async function login() {
  const emailEl = el.adminEmail();
  const passEl = el.adminPassword();
  if (!emailEl || !passEl) { alert('Auth inputs not found'); return; }
  const email = emailEl.value.trim();
  const pass = passEl.value;
  if (!email || !pass) { alert('Enter email and password'); return; }

  const DEMO_EMAIL = 'admin@cellex.local';
  const DEMO_PASS = 'adminpassword';

  if (!ADMIN_API_BASE && email === DEMO_EMAIL && pass === DEMO_PASS) {
    setToken('local-demo-token');
    updateAuthUI(true, email + ' (local)');
    scheduleAutoLogoutFromToken();
    return;
  }

  if (!ADMIN_API_BASE) {
    alert('API not configured. For demo use admin@cellex.local / adminpassword or run the API on localhost:4000.');
    return;
  }

  try {
    const data = await apiFetch('/auth/login', { method: 'POST', body: { email, password: pass } });
    if (data && data.token) {
      setToken(data.token);
      updateAuthUI(true, email);
      if (passEl) passEl.value = '';
      scheduleAutoLogoutFromToken();
    } else throw new Error('No token returned');
  } catch (err) {
    alert('Login failed: ' + err.message);
  }
}

function logout(silent=false) {
  setToken(null);
  updateAuthUI(false);
  clearTimeout(autoLogoutTimer);
  clearInterval(sessionTicker);
  if (!silent) alert('You have been logged out.');
}

function updateAuthUI(signedIn=false, idText='') {
  const authSection = el.authSection();
  const adminUI = el.adminUI();
  const btnLogout = el.btnLogout();
  const adminStatus = el.adminStatus();
  if (signedIn) {
    if (adminStatus) adminStatus.textContent = 'Signed in as ' + (idText || 'admin');
    if (btnLogout) btnLogout.style.display = 'inline-block';
    if (authSection) authSection.style.display = 'none';
    if (adminUI) adminUI.style.display = 'block';
    fetchCatalog();
  } else {
    if (adminStatus) adminStatus.textContent = 'Not signed in';
    if (btnLogout) btnLogout.style.display = 'none';
    if (authSection) authSection.style.display = 'block';
    if (adminUI) adminUI.style.display = 'none';
  }
}

async function uploadImageFile(file) {
  if (!file) throw new Error('No file');
  if (!ADMIN_API_BASE) {
    return URL.createObjectURL(file);
  }

  const form = new FormData();
  form.append('file', file);

  const headers = authHeaders();
  const res = await fetch(ADMIN_API_BASE + '/upload', { method: 'POST', headers, body: form });
  if (!res.ok) {
    const txt = await res.text().catch(()=>res.statusText || '');
    throw new Error('Upload failed: ' + txt);
  }
  const data = await res.json().catch(()=>null);
  const origin = ADMIN_API_BASE.replace(/\/api\/?$/, '');
  if (data && data.thumbnailUrl) {
    return data.thumbnailUrl.startsWith('/') ? origin + data.thumbnailUrl : data.thumbnailUrl;
  }
  if (data && data.url) {
    return data.url.startsWith('/') ? origin + data.url : data.url;
  }
  if (data && data.filename) {
    return origin + '/uploads/' + data.filename;
  }
  return null;
}

/* Catalog CRUD + UI helpers (same implementation as earlier) */
/* ... (see earlier admin-scripts.js content above: fetchCatalog, renderAdminList, editProduct, saveProduct, deleteProduct, fetchOrders, syncFromAPI, clearLocalCatalog, handleUploadClick, showAdminMessage, init bindings) ... */

/* Init and bindings */
document.addEventListener('DOMContentLoaded', () => {
  try {
    if (el.btnLogin()) el.btnLogin().addEventListener('click', login);
    if (el.btnLogout()) el.btnLogout().addEventListener('click', logout);
    if (el.saveProduct()) el.saveProduct().addEventListener('click', saveProduct);
    if (el.clearForm()) el.clearForm().addEventListener('click', () => {
      ['pid','ptitle','pspec','pprice','pimage'].forEach(id => { const e=document.getElementById(id); if(e) e.value=''; });
      if (el.pcategory()) el.pcategory().value = 'iPhone';
    });
    if (el.syncCatalog()) el.syncCatalog().addEventListener('click', syncFromAPI);
    if (el.btnFetchOrders()) el.btnFetchOrders().addEventListener('click', fetchOrders);
    if (el.btnClearLocal()) el.btnClearLocal().addEventListener('click', clearLocalCatalog);
    if (el.btnUpload()) el.btnUpload().addEventListener('click', handleUploadClick);
  } catch (e) {
    console.warn('Binding error', e);
  }

  const t = token();
  if (t) {
    const payload = parseJwtPayload(t);
    if (payload && payload.exp && payload.exp * 1000 <= Date.now()) {
      logout(true);
    } else {
      updateAuthUI(true, 'admin');
      scheduleAutoLogoutFromToken();
    }
  } else {
    updateAuthUI(false);
  }

  renderAdminList(LS.get('catalog', []));
});

/* Small helpers */
function escapeHtml(str){
  if (str === undefined || str === null) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
