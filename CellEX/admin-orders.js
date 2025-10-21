(function(){
  const KEY_INBOX = 'adminOrders';
  const KEY_CONF = 'confirmedOrders';
  const KEY_REJ = 'rejectedOrders';

  const elList = document.getElementById('orders');
  const tpl = document.getElementById('orderTpl');
  const empty = document.getElementById('empty');
  const countConfirmed = document.getElementById('countConfirmed');
  const countRejected = document.getElementById('countRejected');
  const clearAllBtn = document.getElementById('clearAll');

  function read(key){ try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } }
  function write(key, arr){ localStorage.setItem(key, JSON.stringify(arr)); }

  function render() {
    const list = read(KEY_INBOX);
    elList.innerHTML = '';
    countConfirmed.textContent = read(KEY_CONF).length;
    countRejected.textContent = read(KEY_REJ).length;

    if (!list.length) { empty.style.display = 'block'; return; }
    empty.style.display = 'none';

    list.forEach(order => {
      const node = tpl.content.cloneNode(true);
      const card = node.querySelector('.order-card');

      const imgEl = node.querySelector('.prod-thumb img');
      const titleEl = node.querySelector('.order-product-title');
      const descEl = node.querySelector('.order-product-desc');
      const metaEl = node.querySelector('.order-meta');
      const addrEl = node.querySelector('.order-address');
      const timeEl = node.querySelector('.order-time');
      const idEl = node.querySelector('.order-id');

      // product data fallback
      const product = order.product || {};
      imgEl.src = product.image || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="84" height="84"><rect width="100%" height="100%" fill="%23f3f5f8"/><text x="50%" y="50%" fill="%23b0b7c6" font-size="12" text-anchor="middle" alignment-baseline="middle">No image</text></svg>';
      imgEl.alt = product.name || 'product';

      titleEl.textContent = product.name || order.name || 'Order';
      descEl.textContent = product.details || '';
      metaEl.textContent = `${order.email} · ${order.phone} · ${order.country} · ${order.payment}`;
      addrEl.textContent = order.address;
      timeEl.textContent = `Placed: ${new Date(order.createdAt).toLocaleString()}`;
      idEl.textContent = `#${order.id}`;

      node.querySelector('.btn.confirm').addEventListener('click', ()=> moveOrder(order.id, 'confirm'));
      node.querySelector('.btn.reject').addEventListener('click', ()=> moveOrder(order.id, 'reject'));
      node.querySelector('.btn.view').addEventListener('click', ()=> showDetail(order));

      elList.appendChild(node);
    });
  }

  function moveOrder(id, action){
    let inbox = read(KEY_INBOX);
    const idx = inbox.findIndex(o => o.id === id);
    if (idx === -1) return;
    const [order] = inbox.splice(idx,1);
    order.status = action === 'confirm' ? 'confirmed' : 'rejected';
    order.handledAt = new Date().toISOString();

    if (action === 'confirm'){
      const conf = read(KEY_CONF); conf.unshift(order); write(KEY_CONF, conf);
    } else {
      const rej = read(KEY_REJ); rej.unshift(order); write(KEY_REJ, rej);
    }
    write(KEY_INBOX, inbox);
    render();
    window.dispatchEvent(new Event('storage'));
  }

  function showDetail(order){
    const product = order.product || {};
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="product">
          <div class="thumb"><img src="${product.image || ''}" alt="${product.name || ''}" onerror="this.style.display='none'"/></div>
          <div class="meta">
            <div class="title">${product.name || order.name || 'Order'}</div>
            <div class="details">${product.details || ''}</div>
          </div>
        </div>

        <div class="fields">
          <div class="row"><strong>Name</strong><span>${order.name}</span></div>
          <div class="row"><strong>Email</strong><span>${order.email}</span></div>
          <div class="row"><strong>Phone</strong><span>${order.phone}</span></div>
          <div class="row"><strong>Country</strong><span>${order.country}</span></div>
          <div class="row"><strong>Payment</strong><span>${order.payment}</span></div>
          <div class="row"><strong>Address</strong><span>${order.address}</span></div>
          <div class="row"><strong>Placed</strong><span>${new Date(order.createdAt).toLocaleString()}</span></div>
          <div class="row"><strong>Status</strong><span>${order.status || 'inbox'}</span></div>
        </div>

        <button class="close">Close</button>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.close').onclick = ()=> modal.remove();
    modal.addEventListener('click', (e)=> { if (e.target === modal) modal.remove(); });
  }

  clearAllBtn.addEventListener('click', ()=>{
    if (!confirm('Clear all orders in inbox? This cannot be undone.')) return;
    localStorage.removeItem(KEY_INBOX);
    render();
    window.dispatchEvent(new Event('storage'));
  });

  render();
  window.addEventListener('storage', render);
})();
