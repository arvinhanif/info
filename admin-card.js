// admin-card.js
// Responsibilities:
// - Capture cart changes (storage events + manual scan) and create admin inbox entries
// - Persist inbox to localStorage under key "admin.inbox"
// - Provide UI for confirm/reject/delete and counts
// - Attempt to attach user profile snapshot using app.currentUserId and app.users

// ---- Utilities ----
function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }
  function writeJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function nowISO() { return new Date().toISOString(); }
  function uid() { return 'ac_' + Math.random().toString(36).slice(2,10); }
  function formatShort(ts) { return new Date(ts).toLocaleString(); }
  function safe(src, fallback){ return src || fallback || 'https://via.placeholder.com/120?text=No+Image'; }
  
  // ---- Keys ----
  const INBOX_KEY = 'admin.inbox';
  
  // ---- Inbox model helpers ----
  function loadInbox() { return readJSON(INBOX_KEY, []); }
  function saveInbox(arr) { writeJSON(INBOX_KEY, arr); }
  
  // Create a single inbox entry
  function createInboxEntry({ userId, userSnapshot, product, qty = 1, source = 'cart' }) {
    const entry = {
      id: uid(),
      at: nowISO(),
      source,
      qty: qty || 1,
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image || null
      },
      user: userSnapshot || null,
      status: 'pending' // pending | confirmed | rejected
    };
    const arr = loadInbox();
    arr.unshift(entry);
    saveInbox(arr);
    renderInbox();
    return entry;
  }
  
  // Try to build a user snapshot from app.users and app.currentUserId
  function buildUserSnapshot(forUserId) {
    const users = readJSON('app.users', []);
    if (!forUserId) return null;
    const u = users.find(x => String(x.id) === String(forUserId));
    if (!u) return null;
    return {
      id: u.id,
      name: u.name || 'Guest',
      email: u.email || '',
      number: u.number || '',
      photo: u.photo || null,
      createdAt: u.createdAt || null
    };
  }
  
  // ---- Capture logic ----
  // When cart changes, capture an entry per new item for the current user (app.currentUserId).
  // To avoid duplicates we store a small seen set keyed by cartSnapshotHash on each user.
  function captureFromCartSnapshot() {
    try {
      const cart = readJSON('cart', []);
      const currentUserId = localStorage.getItem('app.currentUserId') || null;
      if (!cart.length || !currentUserId) return;
  
      // Compose a fingerprint for current cart content
      const fingerprint = cart.map(i => `${i.id}:${i.qty||1}`).join('|') + '::' + (currentUserId || '');
      const seenKey = `admin.cartSeen.${currentUserId}`;
      const last = localStorage.getItem(seenKey);
      if (last === fingerprint) return; // already captured
      localStorage.setItem(seenKey, fingerprint);
  
      // create entries for each item
      const userSnap = buildUserSnapshot(currentUserId);
      cart.forEach(item => {
        createInboxEntry({ userId: currentUserId, userSnapshot: userSnap, product: item, qty: item.qty || 1, source: 'cart' });
      });
    } catch (err) {
      console.error('captureFromCartSnapshot error', err);
    }
  }
  
  // storage event listener for cross-window changes
  window.addEventListener('storage', (e) => {
    if (!document.getElementById('autoCapture')?.checked) return;
    if (e.key === 'cart') {
      // small delay to allow other page to write any user keys
      setTimeout(() => captureFromCartSnapshot(), 120);
    }
    // Also watch app.currentUserId changes (user login)
    if (e.key === 'app.currentUserId' && document.getElementById('autoCapture')?.checked) {
      setTimeout(() => captureFromCartSnapshot(), 120);
    }
  });
  
  // Manual scan across users: find carts saved per user (if you store per-user cart keys like "cart.u_<id>")
  // and also attempt to create entries from global 'cart' when app.currentUserId exists.
  // This scan will create entries only if they are not already present.
  function scanAllUsersAndCarts() {
    // Capture global cart if present
    captureFromCartSnapshot();
  
    // Scan known users and their personal keys if such convention used (wishlist, orders etc)
    const users = readJSON('app.users', []);
    users.forEach(u => {
      // check per-user cart key pattern 'cart.u_<id>' or 'cart.<id>'
      const candidates = [`cart.${u.id}`, `cart.u_${u.id}`, `user.cart.${u.id}`];
      candidates.forEach(key => {
        const c = readJSON(key, []);
        if (Array.isArray(c) && c.length) {
          // fingerprint check to avoid duplicates
          const fingerprint = c.map(i => `${i.id}:${i.qty||1}`).join('|') + '::' + (u.id || '');
          const seenKey = `admin.cartSeen.${u.id}`;
          const last = localStorage.getItem(seenKey);
          if (last === fingerprint) return;
          localStorage.setItem(seenKey, fingerprint);
          const userSnap = buildUserSnapshot(u.id);
          c.forEach(item => createInboxEntry({ userId: u.id, userSnapshot: userSnap, product: item, qty: item.qty || 1, source: key }));
        }
      });
    });
  }
  
  // ---- Rendering ----
  function renderInbox() {
    const wrap = document.getElementById('inboxWrap');
    const tpl = document.getElementById('entryTpl');
    const inbox = loadInbox();
    wrap.innerHTML = '';
    if (!inbox.length) {
      wrap.innerHTML = `<div class="empty">Inbox is empty. Waiting for cart activity or press Scan users & carts.</div>`;
    } else {
      inbox.forEach((entry, idx) => {
        const node = tpl.content.cloneNode(true);
        const article = node.querySelector('.card-entry');
        const img = node.querySelector('.prod-img');
        const prodName = node.querySelector('.prod-name');
        const prodPrice = node.querySelector('.prod-price');
        const prodQty = node.querySelector('.prod-qty');
        const userName = node.querySelector('.user-name');
        const userEmail = node.querySelector('.user-email');
        const userNumber = node.querySelector('.user-number');
        const ts = node.querySelector('.ts');
  
        img.src = safe(entry.product.image, '');
        img.alt = entry.product.name || 'Product';
        prodName.textContent = entry.product.name || 'Product';
        prodPrice.textContent = entry.product.price ? `৳${entry.product.price}` : '';
        prodQty.textContent = `Qty: ${entry.qty || 1}`;
        userName.textContent = entry.user?.name || 'Guest';
        userEmail.textContent = entry.user?.email || '';
        userNumber.textContent = entry.user?.number || '';
        ts.textContent = formatShort(entry.at);
  
        // actions
        const confirmBtn = node.querySelector('.btn.confirm');
        const rejectBtn = node.querySelector('.btn.reject');
        const deleteBtn = node.querySelector('.btn.delete');
  
        confirmBtn.addEventListener('click', () => updateEntryStatus(entry.id, 'confirmed'));
        rejectBtn.addEventListener('click', () => updateEntryStatus(entry.id, 'rejected'));
        deleteBtn.addEventListener('click', () => removeEntry(entry.id));
  
        if (entry.status === 'confirmed') {
          article.style.border = '1px solid rgba(40,167,69,0.12)';
          article.style.opacity = '0.95';
        } else if (entry.status === 'rejected') {
          article.style.border = '1px solid rgba(233,84,85,0.10)';
          article.style.opacity = '0.9';
        }
  
        wrap.appendChild(node);
      });
    }
  
    // update counts
    const total = inbox.length;
    const pending = inbox.filter(i => i.status === 'pending').length;
    const confirmed = inbox.filter(i => i.status === 'confirmed').length;
    document.getElementById('totalCount').textContent = total;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('confirmedCount').textContent = confirmed;
  }
  
  function updateEntryStatus(id, status) {
    const arr = loadInbox();
    const idx = arr.findIndex(x => x.id === id);
    if (idx === -1) return;
    arr[idx].status = status;
    saveInbox(arr);
    renderInbox();
  }
  
  // remove entry
  function removeEntry(id) {
    let arr = loadInbox();
    arr = arr.filter(x => x.id !== id);
    saveInbox(arr);
    renderInbox();
  }
  
  // clear inbox
  function clearInbox() {
    saveInbox([]);
    renderInbox();
  }
  
  // ---- Helpers for UI buttons ----
  document.addEventListener('DOMContentLoaded', () => {
    renderInbox();
  
    document.getElementById('refreshBtn')?.addEventListener('click', () => renderInbox());
    document.getElementById('scanAllBtn')?.addEventListener('click', () => scanAllUsersAndCarts());
    document.getElementById('clearInboxBtn')?.addEventListener('click', () => { if (confirm('Clear inbox completely?')) clearInbox(); });
    document.getElementById('autoCapture')?.addEventListener('change', (e) => {
      writeJSON('admin.autoCapture', !!e.target.checked);
    });
  
    // initialize autoCapture value from storage
    const auto = readJSON('admin.autoCapture', true);
    const cb = document.getElementById('autoCapture');
    if (cb) cb.checked = !!auto;
  
    // Immediately try to capture current global cart (useful when admin opens page after activity)
    setTimeout(() => {
      try { if (document.getElementById('autoCapture')?.checked) captureFromCartSnapshot(); } catch(e){/*ignore*/ }
      // also scan per-user carts
      scanAllUsersAndCarts();
    }, 120);
  });
  