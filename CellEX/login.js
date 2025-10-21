// login.js — authenticate against users stored in localStorage
document.addEventListener('DOMContentLoaded', () => {
  const form      = document.getElementById('login-form');
  const emailEl   = document.getElementById('login-email');
  const passEl    = document.getElementById('login-password');
  const msgEl     = document.getElementById('login-msg');
  const toggleBtn = document.querySelector('.toggle-pass');

  // Toggle password visibility
  toggleBtn.addEventListener('click', () => {
    const icon = toggleBtn.querySelector('i');
    if (passEl.type === 'password') {
      passEl.type = 'text';
      icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
      passEl.type = 'password';
      icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    msgEl.textContent = '';
    msgEl.classList.remove('error', 'success');

    const email    = emailEl.value.trim().toLowerCase();
    const password = passEl.value;

    // Load users from localStorage
    const users = JSON.parse(localStorage.getItem('users') || '[]');

    // Find matching user
    const user = users.find(u =>
      u.email === email &&
      u.password === password
    );

    if (!user) {
      msgEl.textContent = 'Invalid user credentials';
      msgEl.classList.add('error');
      return;
    }

    // Successful login
    msgEl.textContent = 'Login successful! Redirecting...';
    msgEl.classList.add('success');

    // Save session (optional)
    localStorage.setItem('loggedInUser', JSON.stringify(user));

    setTimeout(() => {
      window.location.href = 'account.html';
    }, 800);
  });
});
