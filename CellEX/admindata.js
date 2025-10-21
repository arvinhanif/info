// File: public/admindata.js
// Uses /api/users admin endpoints. Requires admin token in localStorage.app.token

const API_BASE = '';

function getToken() { return localStorage.getItem('app.token'); }
function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

// ===== Server interactions =====
async function fetchUsers() {
  const res = await fetch(`${API_BASE}/api/users`, { headers: authHeaders() });
  if (res.status === 401) throw new Error('Unauthorized. Admin token required.');
  if (!res.ok) {
    const e = await res.json().catch(()=>({ error: 'Failed to fetch' }));
    throw new Error(e.error || 'Failed to fetch users');
  }
  const data = await res.json();
  return data.users || [];
}

async function createUserOnServer(payload) {
  const res = await fetch(`${API_BASE}/api/users`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
  if (!res.ok) throw await res.json();
  return res.json();
}
async function updateUserOnServer(id, payload) {
  const res = await fetch(`${API_BASE}/api/users/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) });
  if (!res.ok) throw await res.json();
  return res.json();
}
async function deleteUserOnServer(id) {
  const res = await fetch(`${API_BASE}/api/users/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!res.ok) throw await res.json();
  return res.json();
}

// ===== UI state =====
let usersCache = [];
let deleteIndex = null;
let editIndex = null;

// ===== Render table =====
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
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${u.number || ''}</td>
      <td>${u.address || ''}</td>
      <td>••••••</td>
      <td>${u.ip || 'Unavailable'}</td>
      <td>${u.location ? `${u.location.lat.toFixed(4)}, ${u.location.lng.toFixed(4)}` : 'N/A'}</td>
      <td>${new Date(u.createdAt).toLocaleString()}</td>
      <td>
        <button class="action-btn edit" onclick="openModal(${i})">Edit</button>
        <button class="action-btn delete" onclick="deleteUser(${i})">Delete</button>
      </td>
    </tr>
  `).join('');
  document.getElementById('tableWrap').innerHTML = `
    <table>
      <thead>
        <tr>
          <th onclick="sortUsers('name')">Name ⬍</th>
          <th onclick="sortUsers('email')">Email ⬍</th>
          <th>Number</th><th>Address</th>
          <th>Password</th><th>IP</th><th>Location</th><th>Created</th><th>Action</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ===== Search/filter =====
function filterUsers(query) {
  const q = (query || '').toLowerCase();
  const filtered = usersCache.filter(u =>
    (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q)
  );
  renderFilteredTable(filtered);
}
function renderFilteredTable(list) {
  if (!list.length) { document.getElementById('tableWrap').innerHTML = '<p>No matching users found.</p>'; return; }
  const rows = list.map((u, i) => `
    <tr>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${u.number || ''}</td>
      <td>${u.address || ''}</td>
      <td>••••••</td>
      <td>${u.ip || 'Unavailable'}</td>
      <td>${u.location ? `${u.location.lat.toFixed(4)}, ${u.location.lng.toFixed(4)}` : 'N/A'}</td>
      <td>${new Date(u.createdAt).toLocaleString()}</td>
      <td>
        <button class="action-btn edit" onclick="openModal(${i})">Edit</button>
        <button class="action-btn delete" onclick="deleteUser(${i})">Delete</button>
      </td>
    </tr>
  `).join('');
  document.getElementById('tableWrap').innerHTML = `
    <table>
      <thead>
        <tr>
          <th onclick="sortUsers('name')">Name ⬍</th>
          <th onclick="sortUsers('email')">Email ⬍</th>
          <th>Number</th><th>Address</th>
          <th>Password</th><th>IP</th><th>Location</th><th>Created</th><th>Action</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ===== Sorting =====
let sortDirection = 1;
function sortUsers(field) {
  usersCache.sort((a,b) => {
    if ((a[field]||'') < (b[field]||'')) return -1 * sortDirection;
    if ((a[field]||'') > (b[field]||'')) return 1 * sortDirection;
    return 0;
  });
  sortDirection *= -1;
  renderFilteredTable(usersCache);
}

// ===== Delete flow =====
function deleteUser(index) {
  deleteIndex = index;
  document.getElementById("deleteModal").style.display = "flex";
}
async function confirmDelete() {
  if (deleteIndex === null) return closeDeleteModal();
  const u = usersCache[deleteIndex];
  if (!u) return closeDeleteModal();
  try {
    await deleteUserOnServer(u.id);
    usersCache.splice(deleteIndex, 1);
    renderFilteredTable(usersCache);
  } catch (err) { alert(err.error || err.message || 'Delete failed'); }
  closeDeleteModal();
}
function closeDeleteModal() { document.getElementById("deleteModal").style.display = "none"; deleteIndex = null; }

// ===== Edit flow =====
function openModal(index) {
  const u = usersCache[index];
  editIndex = index;
  document.getElementById("editName").value = u.name || '';
  document.getElementById("editEmail").value = u.email || '';
  document.getElementById("editNumber").value = u.number || '';
  document.getElementById("editAddress").value = u.address || '';
  document.getElementById("editPassword").value = '';
  document.getElementById("editModal").style.display = "flex";
}
function closeModal() { document.getElementById("editModal").style.display = "none"; editIndex = null; }

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
      } catch (err) { alert(err.error || err.message || 'Update failed'); }
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
      } catch (err) { alert(err.error || err.message || 'Create failed'); }
    });
  }

  const searchBox = document.getElementById("searchBox");
  if (searchBox) searchBox.addEventListener("input", (e) => filterUsers(e.target.value));

  renderTable();
});

// ===== Export =====
function exportUsers() {
  if (!usersCache || !usersCache.length) { alert('No users'); return; }
  const blob = new Blob([JSON.stringify(usersCache, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "users-data.json"; a.click();
  URL.revokeObjectURL(url);
}

// ===== Toggle add form =====
function toggleAddForm(show = true) {
  const box = document.getElementById("addUserBox");
  if (!box) return;
  if (show) box.style.display = "block"; else { box.style.display = "none"; document.getElementById("addUserForm").reset(); }
}
