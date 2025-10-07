// signup.js
document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById('signupForm');
  const loginBtn = document.getElementById('loginBtn');

  function showToast(message, color = "rgba(76,156,255,0.95)") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.style.background = color;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  const getGeoLocation = () =>
    new Promise((resolve) => {
      if (!("geolocation" in navigator)) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });

  const loadUsers = () => JSON.parse(localStorage.getItem('app.users') || '[]');
  const saveUsers = (users) => localStorage.setItem('app.users', JSON.stringify(users));
  const genId = () => 'u_' + Math.random().toString(36).slice(2, 10);

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const number = document.getElementById('number').value.trim();
    const address = document.getElementById('address').value.trim();
    const pass = document.getElementById('password').value.trim();
    const confirm = document.getElementById('confirm').value.trim();

    if (!name || !email || !number || !address || !pass || !confirm) {
      showToast('Please fill all fields ❌', 'rgba(220,53,69,0.95)');
      return;
    }
    if (pass !== confirm) {
      showToast('Passwords do not match ❌', 'rgba(220,53,69,0.95)');
      return;
    }

    const users = loadUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      showToast('Email already registered ❌', 'rgba(220,53,69,0.95)');
      return;
    }

    const location = await getGeoLocation();
    const newUser = {
      id: genId(),
      name,
      email,
      number,
      address,
      password: pass,
      ip: 'Unavailable in client-only app',
      location, // {lat,lng} or null
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);
    localStorage.setItem('app.currentUserId', newUser.id);

    showToast('Account created successfully ✅', 'rgba(40,167,69,0.95)');
    setTimeout(() => { window.location.href = "login.html"; }, 1200);
  });

  if (loginBtn) {
    loginBtn.addEventListener('click', () => { window.location.href = "login.html"; });
  }
});
