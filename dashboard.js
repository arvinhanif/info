// dashboard.js - full client-side dashboard logic (fixed logout + theme bindings)

// ---------- Toast ----------
function showToast(message, color = "rgba(76,156,255,0.95)") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.style.background = color;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ---------- Navigation ----------
function goBack() {
  if (document.referrer && document.referrer !== window.location.href) history.back();
  else window.location.href = "index.html";
}

// ---------- Storage helpers ----------
function readJSON(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}
function writeJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// ---------- User helpers ----------
function getCurrentUser() {
  const id = localStorage.getItem("app.currentUserId");
  const users = readJSON("app.users", []);
  if (!id || !Array.isArray(users)) return null;
  return users.find(u => String(u.id) === String(id)) || null;
}
function saveUser(user) {
  const users = readJSON("app.users", []);
  const idx = users.findIndex(u => String(u.id) === String(user.id));
  if (idx >= 0) { users[idx] = user; writeJSON("app.users", users); return; }
  users.push(user); writeJSON("app.users", users);
}

// ---------- Hydrate profile ----------
function hydrateProfile(user) {
  if (!user) return;
  document.querySelectorAll(".name").forEach(el => el.textContent = user.name || "Guest");
  document.querySelectorAll(".title").forEach(el => el.textContent = user.email || "—");
  document.querySelectorAll(".location").forEach(el => el.textContent = user.address || "—");
  document.querySelectorAll(".number").forEach(el => el.textContent = user.number || "—");
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("title");
  const locInput = document.getElementById("location");
  const numInput = document.getElementById("number");
  if (nameInput) nameInput.value = user.name || "";
  if (emailInput) emailInput.value = user.email || "";
  if (locInput) locInput.value = user.address || "";
  if (numInput) numInput.value = user.number || "";
  const pic = document.querySelector(".profile-pic img");
  if (user.photo && pic) pic.src = user.photo;
}

// ---------- Dialog controls ----------
function openDialogById(id) {
  const overlay = document.getElementById("overlay");
  if (overlay) overlay.style.display = "block";
  const el = document.getElementById(id);
  if (el) el.style.display = "block";
}
function closeDialog() {
  const overlay = document.getElementById("overlay");
  if (overlay) overlay.style.display = "none";
  [
    "dialog","messageDialog","followersDialog","photoPreview",
    "wishlistDialog","ordersDialog","notifDialog","changePassDialog","deleteConfirmDialog","confirmDeleteSmall"
  ].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}
document.addEventListener("keydown", e => { if (e.key === "Escape") closeDialog(); });

// ---------- Open Edit Dialog ----------
function openDialog() {
  const overlay = document.getElementById("overlay");
  const dialog = document.getElementById("dialog");
  const user = getCurrentUser();
  if (user) hydrateProfile(user);
  // reset file input UI
  const photoInput = document.getElementById("photoInput");
  const photoName = document.getElementById("photoName");
  const photoThumbImg = document.getElementById("photoThumbImg");
  const photoClearBtn = document.getElementById("photoClearBtn");
  if (photoInput) photoInput.value = "";
  if (photoName) photoName.textContent = "No file chosen";
  if (photoThumbImg) {
    const pic = document.querySelector(".profile-pic img");
    photoThumbImg.src = pic?.src || "https://via.placeholder.com/72";
  }
  if (photoClearBtn) photoClearBtn.style.display = "none";
  if (overlay) overlay.style.display = "block";
  if (dialog) dialog.style.display = "block";
}

// ---------- Save profile ----------
function saveProfile() {
  const name = (document.getElementById("name")?.value || "").trim();
  const email = (document.getElementById("title")?.value || "").trim();
  const address = (document.getElementById("location")?.value || "").trim();
  const number = (document.getElementById("number")?.value || "").trim();
  const photoInput = document.getElementById("photoInput");

  const users = readJSON("app.users", []);
  const id = localStorage.getItem("app.currentUserId");
  if (!id) { showToast("No current user found.", "rgba(234,84,85,0.95)"); return; }
  const idx = users.findIndex(u => String(u.id) === String(id));
  if (idx === -1) { showToast("User record not found.", "rgba(234,84,85,0.95)"); return; }

  users[idx].name = name;
  users[idx].email = email;
  users[idx].address = address;
  users[idx].number = number;

  if (photoInput && photoInput.files && photoInput.files[0]) {
    const file = photoInput.files[0];
    const reader = new FileReader();
    reader.onload = e => {
      users[idx].photo = e.target.result;
      try { writeJSON("app.users", users); }
      catch { showToast("Could not save profile (storage).", "rgba(234,84,85,0.95)"); return; }
      hydrateProfile(users[idx]);
      closeDialog();
      showToast("Profile updated successfully!");
    };
    reader.onerror = () => showToast("Failed to read photo file.", "rgba(234,84,85,0.95)");
    reader.readAsDataURL(file);
    return;
  }

  try { writeJSON("app.users", users); }
  catch { showToast("Could not save profile (storage).", "rgba(234,84,85,0.95)"); return; }

  hydrateProfile(users[idx]);
  closeDialog();
  showToast("Profile updated successfully!");
}

// ---------- Profile photo preview (click avatar) ----------
function showProfilePhoto(){
  if (document.getElementById("photoPreview")) return;
  const src = document.querySelector(".profile-pic img")?.src || "https://via.placeholder.com/300";
  const overlay = document.getElementById("overlay");
  const preview = document.createElement("div");
  preview.className = "message-dialog";
  preview.id = "photoPreview";
  preview.style.display = "block";
  preview.style.maxWidth = "520px";
  preview.innerHTML = `<div style="padding:12px;"><img src="${src}" style="max-width:100%; border-radius:12px; display:block; margin-bottom:12px;"><div class="dialog-actions"><button class="btn secondary" onclick="closeDialog()">Close</button></div></div>`;
  document.body.appendChild(preview);
  if (overlay) overlay.style.display = "block";
}

// ---------- Followers ----------
function openFollowers(){
  const overlay = document.getElementById("overlay");
  const dialog = document.getElementById("followersDialog");
  const listEl = document.getElementById("followersList");
  const followers = readJSON("followers.list", []);
  if (!listEl) return;
  if (!followers.length) listEl.innerHTML = "<p>No followers yet.</p>";
  else listEl.innerHTML = followers.map(f => `<div class="item" onclick="viewFollower('${f.id}')" style="cursor:pointer"><img src="${f.photo || 'https://via.placeholder.com/40'}" alt="${f.name||''}"><div style="flex:1"><div style="font-weight:700">${f.name||''}</div><div style="color:rgba(74,88,117,0.9);font-size:0.92rem">${f.email||''}</div></div></div>`).join("");
  if (overlay) overlay.style.display = 'block';
  if (dialog) dialog.style.display = 'block';
}
function viewFollower(id){
  const followers = readJSON("followers.list", []);
  const f = followers.find(x => String(x.id) === String(id));
  if (!f) return;
  alert(`Name: ${f.name || ""}\nEmail: ${f.email || ""}\nNumber: ${f.number || ""}`);
}

// ---------- Messaging ----------
function openMessageDialog(recipientName='User'){
  const overlay = document.getElementById("overlay");
  const dialog = document.getElementById("messageDialog");
  const recipientEl = document.getElementById("messageRecipient");
  const textEl = document.getElementById("messageText");
  if (recipientEl) recipientEl.textContent = recipientName;
  if (textEl) textEl.value = "";
  if (overlay) overlay.style.display = 'block';
  if (dialog) dialog.style.display = 'block';
}
function sendMessage(){
  const to = document.getElementById("messageRecipient")?.textContent || "User";
  const text = (document.getElementById("messageText")?.value || "").trim();
  if (!text) { showToast("Write a message first.", "rgba(234,84,85,0.95)"); return; }
  const key = `messages`;
  const existing = readJSON(key, []);
  existing.push({ to, text, at: new Date().toISOString() });
  writeJSON(key, existing);
  const textEl = document.getElementById("messageText");
  if (textEl) textEl.value = "";
  closeDialog();
  showToast("Message sent!");
}

// ---------- Follow button ----------
function initFollowButton(){
  const btn = document.getElementById("followBtn");
  const countEl = document.getElementById("followCount");
  const followingEl = document.getElementById("followingCount");
  if (!btn || !countEl || !followingEl) return;
  let count = parseInt(localStorage.getItem("followers.count") || "0", 10) || 0;
  let following = parseInt(localStorage.getItem("following.count") || "0", 10) || 0;
  let followed = localStorage.getItem("followed") === "true";
  countEl.textContent = `${count} Followers`;
  followingEl.textContent = `${following} Following`;
  btn.textContent = followed ? "Unfollow" : "Follow";
  btn.onclick = () => {
    followed = !followed;
    if (followed) { count++; following++; } else { count = Math.max(0, count - 1); following = Math.max(0, following - 1); }
    localStorage.setItem("followers.count", String(count));
    localStorage.setItem("following.count", String(following));
    localStorage.setItem("followed", followed ? "true" : "false");
    countEl.textContent = `${count} Followers`;
    followingEl.textContent = `${following} Following`;
    btn.textContent = followed ? "Unfollow" : "Follow";
    showToast(followed ? "Followed successfully!" : "Unfollowed.");
  };
}

// ---------- Wishlist ----------
function getWishlistKey(userId) { return `wishlist.${userId}`; }
function getWishlist(userId) { return readJSON(getWishlistKey(userId), []); }
function saveWishlist(userId, list) { writeJSON(getWishlistKey(userId), list); }
function openWishlist() {
  const user = getCurrentUser(); if (!user) return;
  const list = getWishlist(user.id);
  const container = document.getElementById("wishlistList");
  if (!container) return;
  if (!list.length) container.innerHTML = "<p>No items in wishlist.</p>";
  else container.innerHTML = list.map(item => `<div class="item" style="display:flex;gap:10px;align-items:center;padding:8px;border-bottom:1px solid rgba(0,0,0,0.04);"><img src="${item.image||'https://via.placeholder.com/60'}" alt="${item.name||''}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;"><div style="flex:1"><div style="font-weight:700">${item.name||''}</div><div style="color:rgba(74,88,117,0.9)">${item.price ? '৳'+item.price : ''}</div></div><div style="display:flex;gap:6px;"><button class="btn secondary" onclick="viewProductFromWishlist('${user.id}','${item.id}')">View</button><button class="btn logout" onclick="removeFromWishlist('${user.id}','${item.id}')">Remove</button></div></div>`).join("");
  openDialogById("wishlistDialog");
}
function addToWishlist(userId, product) { const list = getWishlist(userId); if (list.find(p => String(p.id) === String(product.id))) return; list.push(product); saveWishlist(userId, list); showToast("Added to wishlist"); }
function removeFromWishlist(userId, productId) { let list = getWishlist(userId); list = list.filter(p => String(p.id) !== String(productId)); saveWishlist(userId, list); openWishlist(); }
function viewProductFromWishlist(userId, productId){ localStorage.setItem("selectedProductId", productId); window.location.href = "product-details.html"; }

// ---------- Orders ----------
function getOrdersKey(userId) { return `orders.${userId}`; }
function getOrders(userId) { return readJSON(getOrdersKey(userId), []); }
function addOrder(userId, order) { const arr = getOrders(userId); arr.unshift(order); writeJSON(getOrdersKey(userId), arr); }
function openOrders() {
  const user = getCurrentUser(); if (!user) return;
  const orders = getOrders(user.id);
  const container = document.getElementById("ordersList");
  if (!container) return;
  if (!orders.length) container.innerHTML = "<p>No orders yet.</p>";
  else container.innerHTML = orders.map(o => `<div style="padding:10px;border-bottom:1px solid rgba(0,0,0,0.04);"><div style="display:flex;justify-content:space-between;align-items:center;"><div><div style="font-weight:700">${o.id || '—'}</div><div style="color:rgba(74,88,117,0.9);font-size:0.95rem">${o.items?.length || 0} item(s) • ${new Date(o.at).toLocaleString()}</div></div><div style="text-align:right"><div style="font-weight:800">৳${o.total || 0}</div><div style="color:rgba(74,88,117,0.9)">${o.status || 'Processing'}</div></div></div></div>`).join("");
  openDialogById("ordersDialog");
}

// ---------- Notifications ----------
function getNotifKey(userId) { return `app.notifications.${userId}`; }
function getNotifPrefs(userId) { return readJSON(getNotifKey(userId), {email:true,sms:false,inapp:true}); }
function saveNotifPrefs(userId,prefs){ writeJSON(getNotifKey(userId), prefs); }
function openNotifications() {
  const user = getCurrentUser(); if (!user) return;
  const prefs = getNotifPrefs(user.id);
  document.getElementById("notif_email").checked = !!prefs.email;
  document.getElementById("notif_sms").checked = !!prefs.sms;
  document.getElementById("notif_inapp").checked = !!prefs.inapp;
  openDialogById("notifDialog");
}

// ---------- Change password ----------
function openChangePassword() { openDialogById("changePassDialog"); }
function changePassword() {
  const current = (document.getElementById("currentPass")?.value || "").trim();
  const newer = (document.getElementById("newPass")?.value || "").trim();
  const confirm = (document.getElementById("confirmPass")?.value || "").trim();
  const user = getCurrentUser();
  if (!user) { showToast("No user", "rgba(234,84,85,0.95)"); return; }
  const stored = user.password || "";
  if (stored && current !== stored) { showToast("Current password incorrect", "rgba(234,84,85,0.95)"); return; }
  if (newer.length < 6) { showToast("New password too short", "rgba(234,84,85,0.95)"); return; }
  if (newer !== confirm) { showToast("Passwords do not match", "rgba(234,84,85,0.95)"); return; }
  user.password = newer;
  saveUser(user);
  closeDialog();
  showToast("Password changed");
}

// ---------- Export / Delete ----------
function exportUserData() {
  const user = getCurrentUser(); if (!user) return;
  const payload = { user, wishlist: getWishlist(user.id), orders: getOrders(user.id), followers: readJSON("followers.list", []), messages: readJSON("messages", []) };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `cellex-user-${user.id || 'profile'}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); showToast("Export started");
}
function confirmDeleteAccount() { openDialogById("deleteConfirmDialog"); }
function deleteAccount() {
  const user = getCurrentUser(); if (!user) return;
  let users = readJSON("app.users", []); users = users.filter(u => String(u.id) !== String(user.id)); writeJSON("app.users", users);
  localStorage.removeItem("app.currentUserId"); localStorage.setItem("userLoggedIn", "false");
  localStorage.removeItem(getWishlistKey(user.id)); localStorage.removeItem(getOrdersKey(user.id)); localStorage.removeItem(getNotifKey(user.id));
  showToast("Account deleted", "rgba(234,84,85,0.95)"); setTimeout(()=> window.location.href = "index.html", 900);
}

// ---------- Theme ----------
function applyTheme(theme) { document.documentElement.setAttribute("data-theme", theme); localStorage.setItem("app.theme", theme); }
function toggleTheme() { const current = localStorage.getItem("app.theme") || "light"; const next = current === "light" ? "dark" : "light"; applyTheme(next); showToast(`${next[0].toUpperCase() + next.slice(1)} theme applied`); }
function initTheme() { const t = localStorage.getItem("app.theme") || "light"; applyTheme(t); }

// ---------- Messages viewer ----------
function getMessages(){ return readJSON("messages", []); }
function showMessages(){ const msgs = getMessages(); if(!msgs.length){ alert("No messages yet."); return; } alert(msgs.map(m=>`${m.to} → ${m.text} (${new Date(m.at).toLocaleString()})`).join("\n\n")); }

// ---------- File input UI (init) ----------
function initProfileFileInput() {
  const input = document.getElementById("photoInput");
  const thumbImg = document.getElementById("photoThumbImg");
  const nameEl = document.getElementById("photoName");
  const chooseBtn = document.getElementById("photoChooseBtn");
  const clearBtn = document.getElementById("photoClearBtn");
  if (!input) return;
  chooseBtn?.addEventListener("click", (e) => { e.preventDefault(); input.click(); });
  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (!file) { nameEl.textContent = "No file chosen"; thumbImg.src = document.querySelector(".profile-pic img")?.src || "https://via.placeholder.com/72"; clearBtn.style.display = "none"; return; }
    const shortName = file.name.length > 40 ? file.name.slice(0,36) + "…" : file.name;
    nameEl.textContent = shortName; clearBtn.style.display = "inline-flex";
    if (file.type && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => { thumbImg.src = e.target.result; };
      reader.readAsDataURL(file);
    } else { thumbImg.src = "https://via.placeholder.com/72?text=FILE"; }
  });
  clearBtn?.addEventListener("click", (e) => { e.preventDefault(); input.value = ""; nameEl.textContent = "No file chosen"; thumbImg.src = document.querySelector(".profile-pic img")?.src || "https://via.placeholder.com/72"; clearBtn.style.display = "none"; });
  const wrapper = document.getElementById("profileFile");
  if (wrapper) wrapper.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); }});
}

// ---------- Robust global logout and theme wiring ----------
window.logout = function logout() {
  try { localStorage.setItem("userLoggedIn", "false"); } catch (e) {}
  window.location.href = "login.html";
};

// ---------- Init wiring ----------
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  const user = getCurrentUser();
  if (!user) { window.location.href = "login.html"; return; }
  hydrateProfile(user);
  initFollowButton();

  // account button behavior
  const accountBtn = document.getElementById("accountBtn");
  if (accountBtn) accountBtn.addEventListener("click", (e)=>{ e.preventDefault(); const loggedIn = localStorage.getItem("userLoggedIn")==="true"; const currentUser = localStorage.getItem("app.currentUserId"); if(loggedIn && currentUser) window.location.href="dashboard.html"; else window.location.href="login.html"; });

  // attach actions (using safe DOM calls)
  document.getElementById("openWishlistBtn")?.addEventListener("click", openWishlist);
  document.getElementById("openOrdersBtn")?.addEventListener("click", openOrders);
  document.getElementById("openNotifBtn")?.addEventListener("click", openNotifications);
  document.getElementById("changePassBtn")?.addEventListener("click", openChangePassword);
  document.getElementById("exportDataBtn")?.addEventListener("click", exportUserData);
  document.getElementById("deleteAccountBtn")?.addEventListener("click", confirmDeleteAccount);
  document.getElementById("themeToggleBtn")?.addEventListener("click", toggleTheme);

  const saveNotifBtn = document.getElementById("saveNotifBtn");
  if (saveNotifBtn) { saveNotifBtn.addEventListener("click", () => { const user = getCurrentUser(); if (!user) return; const prefs = { email: !!document.getElementById("notif_email")?.checked, sms: !!document.getElementById("notif_sms")?.checked, inapp: !!document.getElementById("notif_inapp")?.checked }; saveNotifPrefs(user.id, prefs); closeDialog(); showToast("Notification preferences saved"); }); }

  const doChangeBtn = document.getElementById("doChangePassBtn");
  if (doChangeBtn) doChangeBtn.addEventListener("click", changePassword);
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  if (confirmDeleteBtn) confirmDeleteBtn.addEventListener("click", deleteAccount);

  // attach logout to all matching elements
  document.querySelectorAll(".logout, .logout-btn, #logoutBtn").forEach(btn => {
    if (!btn.hasAttribute('data-logout-bound')) {
      btn.addEventListener("click", window.logout);
      btn.setAttribute('data-logout-bound', '1');
    }
  });

  // keyboard accessibility for theme toggle
  const themeToggle = document.getElementById("themeToggleBtn");
  if (themeToggle) {
    themeToggle.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); themeToggle.click(); }});
  }

  // saveNotifPrefs helper exposure
  window.saveNotifPrefs = (id, prefs) => writeJSON(getNotifKey(id), prefs);

  // file input UI init
  initProfileFileInput();

  // Expose some helpers used by inline handlers
  window.openWishlist = openWishlist;
  window.openOrders = openOrders;
  window.openNotifications = openNotifications;
  window.openChangePassword = openChangePassword;
  window.addToWishlist = addToWishlist;
  window.viewProductFromWishlist = viewProductFromWishlist;
  window.removeFromWishlist = removeFromWishlist;
});
