// login.js
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById('loginForm');
  const signupBtn = document.getElementById('signupBtn');
  const adminBtn = document.getElementById('adminBtn');

  // Toast function
  function showToast(message, color = "rgba(76,156,255,0.95)") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.style.background = color;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  // Load users from localStorage
  const loadUsers = () => JSON.parse(localStorage.getItem('app.users') || '[]');

  // Normal user login
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();

    if (!email || !pass) {
      showToast('Please enter email and password ❌', 'rgba(220,53,69,0.95)');
      return;
    }

    const users = loadUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);

    if (user) {
      localStorage.setItem('app.currentUserId', user.id);
      localStorage.setItem('userLoggedIn', 'true');
      showToast('Login successful 🎉', 'rgba(40,167,69,0.95)');
      setTimeout(() => { window.location.href = "dashboard.html"; }, 1000);
    } else {
      showToast('Invalid email or password ❌', 'rgba(220,53,69,0.95)');
    }
  });

  // Redirect to signup
  if (signupBtn) {
    signupBtn.addEventListener('click', () => {
      window.location.href = "signup.html";
    });
  }

  // Redirect to admin login page
  if (adminBtn) {
    adminBtn.addEventListener('click', () => {
      window.location.href = "admin-login.html";
    });
  }
});
