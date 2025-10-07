// admin.js
// Attach logout handler and minor accessibility helpers

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');

  // Reuse existing logout function if present, otherwise define it here
  if (typeof logout === 'function') {
    logoutBtn.addEventListener('click', logout);
  } else {
    logoutBtn.addEventListener('click', () => {
      localStorage.setItem('userLoggedIn', 'false');
      window.location.href = 'login.html';
    });
  }

  // Keyboard shortcut: press "g" then a key to jump quick links (g + o = Orders, g + p = Products, g + u = Users)
  let gMode = false;
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'g') { gMode = true; return; }
    if (!gMode) return;
    const map = {
      o: 'admin-orders.html',
      c: 'admin-confirmed.html',
      r: 'admin-rejected.html',
      p: 'adminproducts.html',
      u: 'users.html',
      d: 'admindata.html',
      s: 'settings.html'
    };
    const dest = map[e.key.toLowerCase()];
    if (dest) window.location.href = dest;
    gMode = false;
  });

  // Make all shortcut anchors focusable and keyboard friendly
  document.querySelectorAll('.admin-shortcuts .shortcut').forEach(a => {
    a.setAttribute('role', 'button');
    a.setAttribute('tabindex', '0');
    a.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        window.location.href = a.href;
      }
    });
  });
});