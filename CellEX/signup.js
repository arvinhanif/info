// File: signup.js
// Sends signup data to server so accounts are stored centrally (not only localStorage)

document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById('signupForm');

  function showToast(message, color = "rgba(76,156,255,0.95)") {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = message;
      toast.style.background = color;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 3000);
    } else alert(message);
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

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const number = document.getElementById('number').value.trim();
    const address = document.getElementById('address').value.trim();
    const pass = document.getElementById('password').value.trim();
    const confirm = document.getElementById('confirm').value.trim();

    if (!name || !email || !number || !address || !pass || !confirm) {
      showToast('Please fill all fields', 'rgba(220,53,69,0.95)');
      return;
    }
    if (pass !== confirm) {
      showToast('Passwords do not match', 'rgba(220,53,69,0.95)');
      return;
    }

    const location = await getGeoLocation();

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, number, address, password: pass, location, ip: 'client' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');

      if (data.token) localStorage.setItem('app.userToken', data.token);
      if (data.user && data.user.id) localStorage.setItem('app.currentUserId', data.user.id);

      showToast('Account created successfully', 'rgba(40,167,69,0.95)');
      setTimeout(() => { location.href = 'login.html'; }, 800);
    } catch (err) {
      showToast(err.message || 'Signup error', 'rgba(220,53,69,0.95)');
    }
  });
});
