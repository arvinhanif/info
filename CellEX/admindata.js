// File: admindata.js
// Fetches users from server-side /api/users (requires admin token stored in localStorage.app.token)

const API_BASE = '';

function getAdminToken() { return localStorage.getItem('app.token'); }
function authHeaders() {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function fetchUsers() {
  const res = await fetch(`${API_BASE}/api/users`, { headers: authHeaders() });
  if (res.status === 401) throw new Error('Unauthorized: admin token required. Login at admin-login.html.');
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: 'Failed to fetch' }));
    throw new Error(e.error || 'Failed to fetch users');
  }
  const data = await res.json();
  return data.users || [];
}

let usersCache = [];
let deleteIndex = null;
let editIndex = null;

async function renderTable() {
  try {
    usersCache = await fetchUsers();
  } catch (err) {
    document.getElementById('tableWrap').innerHTML = `<p style="color:red">${err.message}</p>`;
    return;
  }

  if (!usersCache.length) {
    document.getElementById('tableWrap').innerHTML = '<p>No users found.</p>';
    return;
  }

  const rows = usersCache.map((u, i) => `
    <tr>
      <td>${escapeHtml(u.name)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>${escapeHtml(u.number || '')}</td>
      <td>${escapeHtml(u.address || '')}</td>
      <td>••••••</td>
      <td>${escapeHtml(u.ip || 'Unavailable')}</td>
      <td>${u.location ? `${u.location.lat.toFixed(4)}, ${u.location.lng.toFixed(4)}` : 'N/A'}</td>
      <td>${new Date(u.createdAt).toLocaleString()}</td>
      <td>
        <button onclick="openModal(${i})">Edit</button>
        <button onclick="deleteUser(${i})">Delete</button>
      </td>
    </tr>
  `).join('');

  document.getElementById('tableWrap').innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th><th>Email</th><th>Number</th><th>Address</th><th>Password</th><th>IP</th><th>Location</th><th>Created</th><th>Action</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
}

function deleteUser(index) {
  deleteIndex = index;
  document.getElementById("deleteModal").style.display = "flex";
}

async function confirmDelete() {
  if (deleteIndex === null) return closeDeleteModal();
  const user = usersCache[deleteIndex];
  if (!user) return closeDeleteModal();
  try {
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) {
      const e = await res.json().catch(() => ({ error: 'Delete failed' }));
      alert(e.error || 'Delete failed');
    } else {
      usersCache.splice(deleteIndex, 1);
      renderTable();
    }
  } catch (err) {
    alert('Delete error: ' + err.message);
  }
  closeDeleteModal();
}

function closeDeleteModal() {
  document.getElementById("deleteModal").style.display = "none";
  deleteIndex = null;
}

function openModal(index) {
  const user = usersCache[index];
  editIndex = index;
  document.getElementById("editName").value = user.name || '';
  document.getElementById("editEmail").value = user.email || '';
  document.getElementById("editNumber").value = user.number || '';
  document.getElementById("editAddress").value = user.address || '';
  document.getElementById("editPassword").value = '';
  document.getElementById("editModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("editModal").style.display = "none";
  editIndex = null;
}

async function updateUserOnServer(id, payload) {
  const res = await fetch(`/api/users/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) });
  if (!res.ok) throw await res.json();
  return res.json();
}

async function createUserOnServer(payload) {
  const res = await fetch(`/api/users`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
  if (!res.ok) throw await res.json();
  return res.json();
}

document.addEventListener("DOMContentLoaded", () => {
  const editForm = document.getElementById("editForm");
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (editIndex === null) return closeModal();
      const u = usersCache[editIndex];
      const payload = {
        name: document.getElementById("editName").value,
        email: document.getElementById("editEmail").value,
        number: document.getElementById("editNumber").value,
        address: document.getElementById("editAddress").value
      };
      const pw = document.getElementById("editPassword").value;
      if (pw) payload.password = pw;
      try {
        await updateUserOnServer(u.id, payload);
        await renderTable();
      } catch (err) {
        alert(err.error || err.message || 'Update failed');
  }
      closeModal();
    });
  }

  const addForm = document.getElementById("addUserForm");
  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("newName").value.trim();
      const email = document.getElementById("newEmail").value.trim();
      const number = document.getElementById("newNumber").value.trim();
      const address = document.getElementById("newAddress").value.trim();
      const password = document.getElementById("newPassword").value.trim();
      if (!name || !email || !password) { alert('Name, email and password required'); return; }
      try {
        await createUserOnServer({ name, email, number, address, password });
        toggleAddForm(false);
        await renderTable();
        alert('User created');
      } catch (err) {
        alert(err.error || err.message || 'Create failed');
      }
    });
  }

  const searchBox = document.getElementById("searchBox");
  if (searchBox) searchBox.addEventListener("input", (e) => filterUsers(e.target.value));

  renderTable();
});

function filterUsers(query) {
  const q = (query || '').toLowerCase();
  const filtered = usersCache.filter(u => (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q));
  renderFilteredTable(filtered);
}

function renderFilteredTable(list) {
  if (!list.length) { document.getElementById('tableWrap').innerHTML = '<p>No matching users found.</p>'; return; }
  const rows = list.map((u, i) => `
    <tr>
      <td>${escapeHtml(u.name)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>${escapeHtml(u.number || '')}</td>
      <td>${escapeHtml(u.address || '')}</td>
      <td>••••••</td>
      <td>${escapeHtml(u.ip || 'Unavailable')}</td>
      <td>${u.location ? `${u.location.lat.toFixed(4)}, ${u.location.lng.toFixed(4)}` : 'N/A'}</td>
      <td>${new Date(u.createdAt).toLocaleString()}</td>
      <td>
        <button onclick="openModal(${i})">Edit</button>
        <button onclick="deleteUser(${i})">Delete</button>
      </td>
    </tr>
  `).join('');
  document.getElementById('tableWrap').innerHTML = `
    <table>
      <thead>
        <tr>
They pasted code and ask "er porer line theke code lekha start koro er porer line theke code ashe nai plus html file koi?" They want code continued — we must provide remaining part and ensure HTML file present. Provide completed admindata.js (fix earlier missing bracket mismatch) and provide admindata.html (already provided) but they asked earlier to keep CSS unchanged. Final message should be concise. Provide full admindata.js completed.
Nicher theke pura admindata.js-er baki code ta start holo — puro file copy-paste kore save kore nao (CSS ja ache shei file thakbe, HTML = admindata.html already diche).  

```js
// File: admindata.js
// Fetches users from server-side /api/users (requires admin token stored in localStorage.app.token)

const API_BASE = '';

function getAdminToken() { return localStorage.getItem('app.token'); }
function authHeaders() {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function fetchUsers() {
  const res = await fetch(`${API_BASE}/api/users`, { headers: authHeaders() });
  if (res.status === 401) throw new Error('Unauthorized: admin token required. Login at admin-login.html.');
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: 'Failed to fetch' }));
    throw new Error(e.error || 'Failed to fetch users');
  }
  const data = await res.json();
  return data.users || [];
}

let usersCache = [];
let deleteIndex = null;
let editIndex = null;

async function renderTable() {
  try {
    usersCache = await fetchUsers();
  } catch (err) {
    document.getElementById('tableWrap').innerHTML = `<p style="color:red">${err.message}</p>`;
    return;
  }

  if (!usersCache.length) {
    document.getElementById('tableWrap').innerHTML = '<p>No users found.</p>';
    return;
  }

  const rows = usersCache.map((u, i) => `
    <tr>
      <td>${escapeHtml(u.name)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>${escapeHtml(u.number || '')}</td>
      <td>${escapeHtml(u.address || '')}</td>
      <td>••••••</td>
      <td>${escapeHtml(u.ip || 'Unavailable')}</td>
      <td>${u.location ? `${u.location.lat.toFixed(4)}, ${u.location.lng.toFixed(4)}` : 'N/A'}</td>
      <td>${new Date(u.createdAt).toLocaleString()}</td>
      <td>
        <button onclick="openModal(${i})">Edit</button>
        <button onclick="deleteUser(${i})">Delete</button>
      </td>
    </tr>
  `).join('');

  document.getElementById('tableWrap').innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th><th>Email</th><th>Number</th><th>Address</th><th>Password</th><th>IP</th><th>Location</th><th>Created</th><th>Action</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
}

function deleteUser(index) {
  deleteIndex = index;
  document.getElementById("deleteModal").style.display = "flex";
}

async function confirmDelete() {
  if (deleteIndex === null) return closeDeleteModal();
  const user = usersCache[deleteIndex];
  if (!user) return closeDeleteModal();
  try {
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) {
      const e = await res.json().catch(() => ({ error: 'Delete failed' }));
      alert(e.error || 'Delete failed');
    } else {
      usersCache.splice(deleteIndex, 1);
      renderTable();
    }
  } catch (err) {
    alert('Delete error: ' + err.message);
  }
  closeDeleteModal();
}

function closeDeleteModal() {
  document.getElementById("deleteModal").style.display = "none";
  deleteIndex = null;
}

function openModal(index) {
  const user = usersCache[index];
  editIndex = index;
  document.getElementById("editName").value = user.name || '';
  document.getElementById("editEmail").value = user.email || '';
  document.getElementById("editNumber").value = user.number || '';
  document.getElementById("editAddress").value = user.address || '';
  document.getElementById("editPassword").value = '';
  document.getElementById("editModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("editModal").style.display = "none";
  editIndex = null;
}

async function updateUserOnServer(id, payload) {
  const res = await fetch(`/api/users/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) });
  if (!res.ok) throw await res.json();
  return res.json();
}

async function createUserOnServer(payload) {
  const res = await fetch(`/api/users`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
  if (!res.ok) throw await res.json();
  return res.json();
}

document.addEventListener("DOMContentLoaded", () => {
  const editForm = document.getElementById("editForm");
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (editIndex === null) return closeModal();
      const u = usersCache[editIndex];
      const payload = {
        name: document.getElementById("editName").value,
        email: document.getElementById("editEmail").value,
        number: document.getElementById("editNumber").value,
        address: document.getElementById("editAddress").value
      };
      const pw = document.getElementById("editPassword").value;
      if (pw) payload.password = pw;
      try {
        await updateUserOnServer(u.id, payload);
        await renderTable();
      } catch (err) {
        alert(err.error || err.message || 'Update failed');
      }
      closeModal();
    });
  }

  const addForm = document.getElementById("addUserForm");
  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("newName").value.trim();
      const email = document.getElementById("newEmail").value.trim();
      const number = document.getElementById("newNumber").value.trim();
      const address = document.getElementById("newAddress").value.trim();
      const password = document.getElementById("newPassword").value.trim();
      if (!name || !email || !password) { alert('Name, email and password required'); return; }
      try {
        await createUserOnServer({ name, email, number, address, password });
        toggleAddForm(false);
        await renderTable();
        alert('User created');
      } catch (err) {
        alert(err.error || err.message || 'Create failed');
      }
    });
  }

  const searchBox = document.getElementById("searchBox");
  if (searchBox) searchBox.addEventListener("input", (e) => filterUsers(e.target.value));

  renderTable();
});

function filterUsers(query) {
  const q = (query || '').toLowerCase();
  const filtered = usersCache.filter(u => (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q));
  renderFilteredTable(filtered);
}

function renderFilteredTable(list) {
  if (!list.length) { document.getElementById('tableWrap').innerHTML = '<p>No matching users found.</p>'; return; }
  const rows = list.map((u, i) => `
    <tr>
      <td>${escapeHtml(u.name)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>${escapeHtml(u.number || '')}</td>
      <td>${escapeHtml(u.address || '')}</td>
      <td>••••••</td>
      <td>${escapeHtml(u.ip || 'Unavailable')}</td>
      <td>${u.location ? `${u.location.lat.toFixed(4)}, ${u.location.lng.toFixed(4)}` : 'N/A'}</td>
      <td>${new Date(u.createdAt).toLocaleString()}</td>
      <td>
        <button onclick="openModal(${i})">Edit</button>
        <button onclick="deleteUser(${i})">Delete</button>
      </td>
    </tr>
  `).join('');
  document.getElementById('tableWrap').innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th><th>Email</th><th>Number</th><th>Address</th><th>Password</th><th>IP</th><th>Location</th><th>Created</th><th>Action</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}
