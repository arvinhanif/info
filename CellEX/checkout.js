// checkout.js
(function(){
  const form = document.getElementById('checkoutForm');
  const saveBtn = document.getElementById('saveBtn');
  const saveLaterCheckbox = document.getElementById('saveLaterCheckbox');
  const placeOrderBtn = document.getElementById('placeOrder');
  const toast = document.getElementById('toast');
  const previewBtn = document.getElementById('previewBtn');

  const DRAFT_KEY = 'checkoutDraft';
  const ORDERS_KEY = 'adminOrders';

  function showToast(text = 'Saved') {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(()=> toast.classList.remove('show'), 2500);
  }

  function getFormData() {
    if (!form) return {};
    const fd = new FormData(form);
    const data = {};
    for (const [k,v] of fd.entries()) data[k] = v;
    return data;
  }

  function fillFormFromDraft() {
    if (!form) return;
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      for (const k in data) {
        const el = form.elements[k];
        if (!el) continue;
        // handle radio groups and checkboxes
        if (el.type === 'radio' || el.type === 'checkbox') {
          if (el.length) {
            [...el].forEach(r => r.checked = (r.value === data[k]));
          } else {
            el.checked = !!data[k];
          }
        } else {
          el.value = data[k];
        }
      }
      syncPaymentUI();
    } catch(e){ console.error('fillFormFromDraft error', e); }
  }

  function saveDraft() {
    if (!form) return;
    const data = getFormData();
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    showToast('Draft saved');
  }

  function clearDraft() { localStorage.removeItem(DRAFT_KEY); }

  function pushOrder(order) {
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      let list = [];
      try { list = raw ? JSON.parse(raw) : []; } catch(e){ list = []; }
      list.unshift(order);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(list));
      // notify other tabs/pages
      window.dispatchEvent(new Event('storage'));
    } catch(e) {
      console.error('pushOrder error', e);
    }
  }

  function syncPaymentUI() {
    document.querySelectorAll('.payment-option').forEach(opt=>{
      const radio = opt.querySelector('input[type="radio"]');
      if (radio && radio.checked) opt.classList.add('checked'); else opt.classList.remove('checked');
    });
  }

  // Payment option interactions (click & keyboard)
  function setupPaymentOptions() {
    document.querySelectorAll('.payment-option').forEach(opt=>{
      const radio = opt.querySelector('input[type="radio"]');
      if (!opt) return;

      // click handler toggles radio
      opt.addEventListener('click', (e)=>{
        // prevent double toggling if clicking inner interactive element
        if (radio) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      // keyboard support
      opt.addEventListener('keydown', (e)=>{
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      });

      // update UI on change
      if (radio) radio.addEventListener('change', syncPaymentUI);
    });
  }

  // restore draft into form on load
  document.addEventListener('DOMContentLoaded', () => {
    fillFormFromDraft();
    setupPaymentOptions();
  });

  // Event bindings
  if (saveBtn) saveBtn.addEventListener('click', saveDraft);

  if (placeOrderBtn) {
    placeOrderBtn.addEventListener('click', ()=>{
      if (!form) return;
      const name = (form.name && form.name.value || '').trim();
      const email = (form.email && form.email.value || '').trim();
      const phone = (form.phone && form.phone.value || '').trim();
      const country = (form.country && form.country.value || '').trim();
      const address = (form.address && form.address.value || '').trim();
      const paymentEls = form.querySelectorAll('input[name="payment"]');
      let payment = '';
      paymentEls.forEach(r=> { if (r.checked) payment = r.value; });

      if (!name || !email || !phone || !country || !payment || !address) {
        showToast('Please complete all fields');
        return;
      }

      // Attach product snapshot if available in localStorage.selectedProduct
      let productSnapshot = null;
      try {
        const sel = localStorage.getItem('selectedProduct');
        if (sel) productSnapshot = JSON.parse(sel);
      } catch(e) { productSnapshot = null; }

      const order = {
        id: 'ord_' + Date.now(),
        createdAt: new Date().toISOString(),
        name, email, phone, country, payment, address,
        product: productSnapshot ? {
          id: productSnapshot.id || null,
          name: productSnapshot.name || '',
          image: productSnapshot.image || '',
          details: productSnapshot.details || productSnapshot.description || ''
        } : null
      };

      pushOrder(order);

      if (!saveLaterCheckbox || !saveLaterCheckbox.checked) clearDraft();

      showToast('Order placed');
      // short delay so toast is visible then navigate
      setTimeout(()=> { window.location.href = 'admin-orders.html'; }, 500);
    });
  }

  if (saveLaterCheckbox) {
    saveLaterCheckbox.addEventListener('change', ()=> { if (saveLaterCheckbox.checked) saveDraft(); });
  }

  if (previewBtn) previewBtn.addEventListener('click', ()=> {
    const data = getFormData();
    const lines = Object.entries(data).map(([k,v]) => `${k}: ${v}`);
    alert(lines.join('\n'));
  });

  // keyboard shortcut to save draft (Ctrl/Cmd+S)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveDraft();
    }
  });

})();
