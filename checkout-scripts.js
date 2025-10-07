/* File: checkout-scripts.js
   Checkout with coupon, shipping, success toast, and redirect to confirmation.html.
*/

const LS = {
    get(k, fallback){ try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } },
    set(k, v){ localStorage.setItem(k, JSON.stringify(v)); },
    del(k){ localStorage.removeItem(k); }
  };
  
  const API_BASE = (() => {
    const host = window.location.hostname;
    return (host === 'localhost' || host === '127.0.0.1') ? 'http://localhost:4000/api' : null;
  })();
  
  /* Format as BDT */
  function bdt(n){ return '৳' + Number(n || 0).toLocaleString('en-US'); }
  
  /* Shipping: free over 100k, else flat 120 BDT */
  function calcShipping(total){ return total >= 100000 ? 0 : 120; }
  
  /* Coupon: "SAVE200" -> 200 off if merchandise >= 5000 */
  function applyCoupon(merchandise, code){
    const c = (code || '').trim().toUpperCase();
    if (!c) return { code:'', discount:0, message:'' };
    if (c === 'SAVE200' && merchandise >= 5000) return { code:c, discount:200, message:'Coupon applied: ৳200 off' };
    return { code:c, discount:0, message:'Invalid coupon' };
  }
  
  /* Toast */
  function showToast(msg){
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg || '';
    t.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => t.classList.remove('show'), 2000);
  }
  
  /* Render summary */
  function renderSummary() {
    const itemsEl = document.getElementById('summaryItems');
    const totalEl = document.getElementById('summaryTotal');
    const couponInput = document.getElementById('coupon');
    const couponMsgEl = document.getElementById('couponMsg');
    const cart = LS.get('cart', []);
  
    if (!itemsEl || !totalEl) return;
  
    if (!cart.length) {
      itemsEl.innerHTML = '<p>No items in cart.</p>';
      totalEl.textContent = bdt(0);
      return;
    }
  
    const merchandise = cart.reduce((s,i)=> s + Number(i.price) * Math.max(1, Number(i.qty)), 0);
    const couponCode = couponInput ? couponInput.value : '';
    const coupon = applyCoupon(merchandise, couponCode);
    if (couponMsgEl) couponMsgEl.textContent = coupon.message;
  
    const shipping = calcShipping(merchandise);
    const grandBeforeCoupon = merchandise + shipping;
    const grand = Math.max(0, grandBeforeCoupon - coupon.discount);
  
    itemsEl.innerHTML = cart.map(i => `
      <div class="summary-item">
        <span>${i.title} × ${Math.max(1, Number(i.qty))}</span>
        <span>${bdt(Number(i.price) * Math.max(1, Number(i.qty)))}</span>
      </div>
    `).join('');
  
    itemsEl.insertAdjacentHTML('beforeend', `
      <div class="summary-item"><span>Merchandise</span><span>${bdt(merchandise)}</span></div>
      <div class="summary-item"><span>Shipping</span><span>${bdt(shipping)}</span></div>
      ${coupon.discount ? `<div class="summary-item"><span>Coupon (${coupon.code})</span><span>- ${bdt(coupon.discount)}</span></div>` : ''}
    `);
  
    totalEl.textContent = bdt(grand);
  
    LS.set('checkoutSummary', { merchandise, shipping, coupon: coupon.code, discount: coupon.discount, grand });
  }
  
  /* Validate form */
  function validateForm() {
    const name = document.getElementById('name')?.value.trim();
    const phone = document.getElementById('phone')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const city = document.getElementById('city')?.value.trim();
    const address = document.getElementById('address')?.value.trim();
    const payment = document.getElementById('payment')?.value;
    const notes = document.getElementById('notes')?.value.trim();
  
    const errors = [];
    if (!name) errors.push('Name');
    if (!phone) errors.push('Phone');
    if (phone && !/^(\+?8801|01)\d{9}$/.test(phone)) errors.push('Phone format');
    if (!city) errors.push('City');
    if (!address) errors.push('Address');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email format');
  
    if (errors.length) {
      alert('Please provide: ' + errors.join(', '));
      return null;
    }
    return { name, phone, email, city, address, payment, notes };
  }
  
  /* Build payload */
  function buildPayload(customer) {
    const cart = LS.get('cart', []);
    const summary = LS.get('checkoutSummary', { merchandise:0, shipping:0, discount:0, grand:0 });
    const couponCode = document.getElementById('coupon')?.value.trim().toUpperCase() || '';
  
    return {
      items: cart.map(i => ({ id: i.id, qty: Math.max(1, Number(i.qty || 1)) })),
      customer: {
        name: customer.name, phone: customer.phone, email: customer.email,
        address: customer.address, city: customer.city
      },
      payment: { method: customer.payment, notes: customer.notes },
      meta: {
        shipping: summary.shipping,
        merchandise: summary.merchandise,
        coupon: couponCode,
        discount: summary.discount,
        grandTotal: summary.grand
      }
    };
  }
  
  /* Place order */
  async function placeOrder() {
    const cart = LS.get('cart', []);
    if (!cart.length) { alert('Your cart is empty.'); return; }
  
    const customer = validateForm();
    if (!customer) return;
  
    renderSummary();
    const payload = buildPayload(customer);
  
    const btn = document.getElementById('placeOrder');
    const status = document.getElementById('orderStatus');
    if (!btn || !status) return;
    btn.disabled = true;
    status.style.display = 'none';
  
    try {
      let res;
      if (API_BASE) {
        const resp = await fetch(API_BASE + '/orders', {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error(`Failed to place order (${resp.status})`);
        res = await resp.json();
      } else {
        res = { orderId: 'demo_' + Math.random().toString(36).slice(2,8), total: payload.meta.grandTotal };
      }
  
      LS.set('lastOrder', {
        id: res.orderId,
        total: res.total,
        customer: payload.customer,
        items: payload.items,
        meta: payload.meta,
        createdAt: new Date().toISOString()
      });
      LS.set('cart', []);
  
      showToast('Order placed successfully!');
      status.textContent = `Order placed! ID: ${res.orderId}. Total: ${bdt(res.total)}`;
      status.style.display = 'block';
  
      setTimeout(() => { window.location.href = 'confirmation.html'; }, 900);
    } catch (err) {
      alert('Order failed: ' + err.message);
    } finally {
      btn.disabled = false;
    }
  }
  
  /* Init */
  document.addEventListener('DOMContentLoaded', () => {
    renderSummary();
  
    const btn = document.getElementById('placeOrder');
    if (btn) btn.addEventListener('click', placeOrder);
  
    const couponInput = document.getElementById('coupon');
    if (couponInput) couponInput.addEventListener('input', renderSummary);
  });