// ===== Load & Save =====
const loadUsers = () => JSON.parse(localStorage.getItem('app.users') || '[]');
function saveUsers(users) {
  localStorage.setItem('app.users', JSON.stringify(users));
}

// ===== Delete Logic with Custom Modal =====
let deleteIndex = null;

function deleteUser(index) {
  deleteIndex = index;
  document.getElementById("deleteModal").style.display = "flex";
}

function confirmDelete() {
  const users = loadUsers();
  if (deleteIndex !== null) {
    users.splice(deleteIndex, 1);
    saveUsers(users);
    renderTable();
  }
  closeDeleteModal();
}

function closeDeleteModal() {
  document.getElementById("deleteModal").style.display = "none";
  deleteIndex = null;
}

// ===== Modal Edit Logic =====
let editIndex = null;

function openModal(index) {
  const users = loadUsers();
  const user = users[index];
  editIndex = index;

  document.getElementById("editName").value = user.name;
  document.getElementById("editEmail").value = user.email;
  document.getElementById("editNumber").value = user.number;
  document.getElementById("editAddress").value = user.address;
  document.getElementById("editPassword").value = user.password;

  document.getElementById("editModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("editModal").style.display = "none";
}

// ===== Handle Edit Form Submit =====
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("editForm");
  if (form) {
    form.addEventListener("submit", function(e) {
      e.preventDefault();
      const users = loadUsers();

      users[editIndex] = {
        ...users[editIndex],
        name: document.getElementById("editName").value,
        email: document.getElementById("editEmail").value,
        number: document.getElementById("editNumber").value,
        address: document.getElementById("editAddress").value,
        password: document.getElementById("editPassword").value,
      };

      saveUsers(users);
      renderTable();
      closeModal();
    });
  }
});

// ===== Render Table =====
function renderTable() {
  const users = loadUsers();
  if (!users.length) {
    document.getElementById('tableWrap').innerHTML = '<p>No users found.</p>';
    return;
  }

  const rows = users.map((u, i) => `
    <tr>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${u.number}</td>
      <td>${u.address}</td>
      <td>${u.password}</td>
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

document.addEventListener('DOMContentLoaded', renderTable);

// ===== Search / Filter =====
function filterUsers(query) {
  const users = loadUsers();
  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase())
  );
  renderFilteredTable(filtered);
}

function renderFilteredTable(users) {
  if (!users.length) {
    document.getElementById('tableWrap').innerHTML = '<p>No matching users found.</p>';
    return;
  }

  const rows = users.map((u, i) => `
    <tr>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${u.number}</td>
      <td>${u.address}</td>
      <td>${u.password}</td>
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
  const users = loadUsers();
  users.sort((a, b) => {
    if (a[field] < b[field]) return -1 * sortDirection;
    if (a[field] > b[field]) return 1 * sortDirection;
    return 0;
  });
  sortDirection *= -1;
  saveUsers(users);
  renderTable();
}

// ===== Export Users =====
function exportUsers() {
  const users = loadUsers();
  const blob = new Blob([JSON.stringify(users, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "users-data.json";
  a.click();
  URL.revokeObjectURL(url);
}

// ===== Toggle Add User Form =====
function toggleAddForm(show = true) {
  const box = document.getElementById("addUserBox");
  if (show) {
    box.style.display = "block";
  } else {
    box.style.display = "none";
    document.getElementById("addUserForm").reset();
  }
}

// ===== Handle Add User Form Submit =====
document.addEventListener("DOMContentLoaded", () => {
  const addForm = document.getElementById("addUserForm");
  if (addForm) {
    addForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = document.getElementById("newName").value.trim();
      const email = document.getElementById("newEmail").value.trim();
      const number = document.getElementById("newNumber").value.trim();
      const address = document.getElementById("newAddress").value.trim();
      const password = document.getElementById("newPassword").value.trim();

      if (!name || !email || !number || !address || !password) {
        alert("All fields are required!");
        return;
      }

      const users = loadUsers();
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        alert("This email is already registered!");
        return;
      }

      const newUser = {
        id: 'u_' + Math.random().toString(36).slice(2, 10),
        name,
        email,
        number,
        address,
        password,
        ip: 'Unavailable in client-only app',
        location: null,
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      saveUsers(users);

      localStorage.setItem("app.currentUserId", newUser.id);

      renderTable();
      toggleAddForm(false);
      alert("Account created and logged in as " + name);
    });
  }

  // ===== Search Box Listener =====
  const searchBox = document.getElementById("searchBox");
  if (searchBox) {
    searchBox.addEventListener("input", (e) => filterUsers(e.target.value));
  }
});
