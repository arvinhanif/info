/* File: scripts.js
   API-first frontend script for CellEX
   - Fetch catalog from API (fallback localStorage)
   - Product grid rendering
   - Product detail rendering
   - Cart helpers
   - Cart page rendering
   - Modal, countdown, UI interactions
*/

const API_BASE = (function(){
  try {
    const host = window.location.hostname;
    return (host === 'localhost' || host === '127.0.0.1') ? 'http://localhost:4000/api' : null;
  } catch { return null; }
})();

/* ===========================
   LocalStorage helpers
   =========================== */
const LS = {
  get(k, fallback = null) { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

/* ===========================
   Catalog fetch (API-first)
   =========================== */
async function fetchCatalog(q='', category='') {
  if (!API_BASE) return LS.get('catalog', []);
  try {
    const url = new URL(API_BASE + '/products');
    if (q) url.searchParams.set('q', q);
    if (category && category !== 'All') url.searchParams.set('category', category);
    const res = await fetch(url);
    const data = await res.json();
    return data.items || [];
  } catch (e) {
    console.warn('API fetch failed, fallback to localStorage', e);
    return LS.get('catalog', []);
  }
}

async function fetchProduct(id) {
  if (!API_BASE) {
    const catalog = LS.get('catalog', []);
    return catalog.find(p => p.id === id) || null;
  }
  try {
    const res = await fetch(API_BASE + '/products/' + encodeURIComponent(id));
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('API fetch failed', e);
    return null;
  }
}

/* ===========================
   CART helpers
   =========================== */
function getCart(){ return LS.get('cart', []); }
function setCart(c){ LS.set('cart', c); updateCartCount(); }
function updateCartCount(){
  const el = document.getElementById('cartCount'); if (!el) return;
  const total = getCart().reduce((s,i)=> s + (i.qty||0), 0);
  el.textContent = total;
}
function addToCart(item){
  if (!item || !item.id) return;
  const cart = getCart();
  const idx = cart.findIndex(x=>x.id===item.id);
  if (idx >= 0) cart[idx].qty = (cart[idx].qty || 0) + (item.qty || 1);
  else cart.push({...item, qty: item.qty || 1});
  setCart(cart);
}
function removeFromCart(id){
  const cart = getCart().filter(i=>i.id !== id);
  setCart(cart);
}
function updateCartItemQty(id, qty){
  const cart = getCart();
  const idx = cart.findIndex(i=>i.id===id);
  if (idx >= 0){
    cart[idx].qty = Math.max(1, Number(qty) || 1);
    setCart(cart);
  }
}
function calcCartTotal(){ return getCart().reduce((s,i)=> s + (Number(i.price)||0) * (i.qty||1), 0); }

/* ===========================
   Render product grid
   =========================== */
async function renderGrid(filter='All', q=''){
  const grid = document.getElementById('productGrid');
  if (!grid) return;
  const items = await fetchCatalog(q, filter);
  grid.innerHTML = items.map(p => `
    <div class="col-sm-6 col-md-4 col-lg-3">
      <div class="product-card" data-category="${escapeHtml(p.category)}" data-id="${escapeHtml(p.id)}">
        <a href="product.html?id=${encodeURIComponent(p.id)}"><img src="${escapeAttr(p.image)}" loading="lazy" alt="${escapeAttr(p.title)}"></a>
        <h4><a href="product.html?id=${encodeURIComponent(p.id)}">${escapeHtml(p.title)}</a></h4>
        <p class="spec">${escapeHtml(p.spec || '')}</p>
        <div class="price-row">
          <div class="price">৳${Number(p.price).toLocaleString('en-US')}</div>
          <div class="actions">
            <button class="btn add-to-cart" data-id="${escapeAttr(p.id)}" data-title="${escapeAttr(p.title)}" data-price="${p.price}" data-image="${escapeAttr(p.image)}"><i class="fa-solid fa-cart-plus"></i> Add</button>
            <a class="btn btn-outline" href="product.html?id=${encodeURIComponent(p.id)}"><i class="fa-solid fa-eye"></i> View</a>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

/* ===========================
   Product detail render
   =========================== */
window.App = window.App || {};
App.renderProductPage = async function(id){
  const p = await fetchProduct(id);
  const container = document.getElementById('productDetail');
  if (!container) return;
  if (!p) { container.innerHTML = '<p>Product not found.</p>'; return; }

  container.innerHTML = `
    <div class="product-gallery">
      <img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.title)}" loading="lazy">
    </div>
    <div class="product-info">
      <h1>${escapeHtml(p.title)}</h1>
      <div class="price">৳${Number(p.price).toLocaleString('en-US')}</div>
      <div class="spec">${escapeHtml(p.spec || '')}</div>
      <p class="desc">${escapeHtml(p.desc || 'No description available.')}</p>
      <div class="actions">
        <button id="addToCartBtn" class="btn primary"><i class="fa-solid fa-cart-plus"></i> Add to Cart</button>
        <div class="qty-wrap">
          <label for="qtyInput" style="font-weight:600;">Qty</label>
          <input id="qtyInput" class="qty" type="number" min="1" value="1" />
        </div>
      </div>
      <div style="margin-top:12px; color:#666; font-size:13px;">
        <strong>Category:</strong> ${escapeHtml(p.category || '—')}
      </div>
    </div>
  `;

  const addBtn = document.getElementById('addToCartBtn');
  if (addBtn) addBtn.addEventListener('click', () => {
    const qty = Math.max(1, Number(document.getElementById('qtyInput').value || 1));
    addToCart({ id: p.id, title: p.title, price: Number(p.price), image: p.image, qty });
    openModal(`${p.title} (x${qty}) has been added to your cart.`, 'Added to cart');
    updateCartCount();
  });
};

/* ===========================
   Cart page rendering
   =========================== */
function renderCartPage(){
  const el = document.getElementById('cartContainer');
  if (!el) return;
  const cart = getCart();
  if (!cart.length) {
    el.innerHTML = '<p>Your cart is empty.</p>';
    updateCartCount();
    return;
  }

  const rows = cart.map(item => `
    <div class="cart-row" data-id="${escapeAttr(item.id)}">
      <img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.title)}" class="cart-thumb">
      <div class="cart-info">
        <div class="cart-title">${escapeHtml(item.title)}</div>
        <div class="cart-spec">${escapeHtml(item.spec||'')}</div>
      </div>
      <div class="cart-qty">
        <button class="qty-minus" data-id="${escapeAttr(item.id)}">-</button>
        <input class="qty-input" data-id="${escapeAttr(item.id)}" value="${item.qty}" type="number" min="1">
        <button class="qty-plus" data-id="${escapeAttr(item.id)}">+</button>
      </div>
      <div class="cart-price">৳${Number(item.price).toLocaleString('en-US')}</div>
      <div class="cart-remove"><button class="btn-icon remove-item" data-id="${escapeAttr(item.id)}"><i class="fa-solid fa-trash"></i></button></div>
    </div>
  `).join('');
  el.innerHTML = rows + `<div class="cart-summary">Total: <strong>৳${calcCartTotal().toLocaleString('en-US')}</strong></div>`;

  // Bind events
  el.querySelectorAll('.qty-plus').forEach(btn => btn.addEventListener('click', e=>{
    const id = e.current