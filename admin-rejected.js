(function(){
    const KEY = 'rejectedOrders';
    const el = document.getElementById('rejected');
    const empty = document.getElementById('emptyRej');
  
    function read(){ try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
    function write(list){ localStorage.setItem(KEY, JSON.stringify(list)); }
  
    function render(){
      el.innerHTML = '';
      const list = read();
      if (!list.length){ empty.style.display = 'block'; return; }
      empty.style.display = 'none';
      list.forEach(o=>{
        const div = document.createElement('article');
        div.className = 'order-card rejected';
        const product = o.product || {};
        div.innerHTML = `
          <div class="prod-thumb"><img src="${product.image || ''}" alt="${product.name || ''}" onerror="this.style.display='none'"/></div>
          <div class="order-main">
            <div class="order-top"><div class="order-product-title">${product.name || o.name}</div><div class="order-id">#${o.id}</div></div>
            <div class="order-product-desc">${product.details || ''}</div>
            <div class="order-meta">${o.email} · ${o.phone} · ${o.country} · ${o.payment}</div>
            <div class="order-address">${o.address}</div>
            <div class="order-time">Placed: ${new Date(o.createdAt).toLocaleString()} · Rejected: ${new Date(o.handledAt).toLocaleString()}</div>
          </div>
          <div class="order-actions">
            <button class="btn undo">Undo</button>
            <button class="btn delete">Delete</button>
          </div>`;
        div.querySelector('.undo').onclick = ()=> undo(o.id);
        div.querySelector('.delete').onclick = ()=> remove(o.id);
        el.appendChild(div);
      });
    }
  
    function undo(id){
      let list = read();
      const idx = list.findIndex(x=>x.id===id);
      if (idx === -1) return;
      const [order] = list.splice(idx,1);
      order.status = undefined;
      const inbox = JSON.parse(localStorage.getItem('adminOrders') || '[]');
      inbox.unshift(order);
      localStorage.setItem('adminOrders', JSON.stringify(inbox));
      write(list);
      render();
      window.dispatchEvent(new Event('storage'));
    }
  
    function remove(id){
      if (!confirm('Delete this rejected order permanently?')) return;
      let list = read();
      list = list.filter(x=>x.id!==id);
      write(list);
      render();
    }
  
    render();
    window.addEventListener('storage', render);
  })();
  