/* File: confirmation-scripts.js
   Renders confirmation details from localStorage.lastOrder.
   Redirects to home if not found. Provides print receipt action.
*/

const LS = {
    get(k, fallback){ try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } },
    set(k, v){ localStorage.setItem(k, JSON.stringify(v)); },
    del(k){ localStorage.removeItem(k); }
  };
  
  function bdt(n){ return '৳' + Number(n || 0).toLocaleString('en-US'); }
  
  function renderConfirmation() {
    const order = LS.get('lastOrder', null);
    if (!order || !order.id) {
      // No order state — redirect
      window.location.href = 'index.html';
      return;
    }
  
    // Header meta
    const metaEl = document.getElementById('orderMeta');
    if (metaEl) {
      const dt = new Date(order.createdAt || Date.now());
      metaEl.textContent = `Order ID: ${order.id} • Placed on ${dt.toLocaleString()}`;
    }
  
    // Items
    const itemsEl = document.getElementById('itemsList');
    if (itemsEl) {
      const catalog = LS.get('catalog', []);
      const rows = order.items.map(li => {
        const p = catalog.find(x => x.id === li.id);
        const title = p ? p.title : li.id;
        const price = p ? p.price : null;
        const amount = price ? price * li.qty : null;
        return `
          <div class="summary-item">
            <span>${title} × ${li.qty}</span>
            <span>${amount ? bdt(amount) : ''}</span>
          </div>
        `;
      }).join('');
      itemsEl.innerHTML = rows || '<p>No items found.</p>';
    }
  
    // Summary
    const summaryEl = document.getElementById('summaryBlock');
    const totalEl = document.getElementById('grandTotal');
    const m = order.meta || {};
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="summary-item"><span>Merchandise</span><span>${bdt(m.merchandise || order.total)}</span></div>
        <div class="summary-item"><span>Shipping</span><span>${bdt(m.shipping || 0)}</span></div>
        ${m.discount ? `<div class="summary-item"><span>Discount</span><span>- ${bdt(m.discount)}</span></div>` : ''}
      `;
    }
    if (totalEl) totalEl.textContent = bdt(m.grandTotal || order.total);
  
    // Customer
    const custEl = document.getElementById('customerBlock');
    const c = order.customer || {};
    if (custEl) {
      custEl.innerHTML = `
        <div class="meta"><strong>Name:</strong> ${c.name || '-'}</div>
        <div class="meta"><strong>Phone:</strong> ${c.phone || '-'}</div>
        <div class="meta"><strong>Email:</strong> ${c.email || '-'}</div>
        <div class="meta"><strong>City:</strong> ${c.city || '-'}</div>
        <div class="meta"><strong>Address:</strong> ${c.address || '-'}</div>
      `;
    }
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    renderConfirmation();
    const printBtn = document.getElementById('printReceipt');
    if (printBtn) printBtn.addEventListener('click', () => window.print());
  });
  