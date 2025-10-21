// forgot-password.js

document.addEventListener('DOMContentLoaded', () => {
  const form      = document.getElementById('reset-form');
  const msgEl     = document.getElementById('reset-msg');
  const toggleBtn = document.querySelector('.toggle-pass');

  // Toggle new-password visibility
  toggleBtn.addEventListener('click', () => {
    const pwd  = document.getElementById('new-password');
    const icon = toggleBtn.querySelector('i');
    if (pwd.type === 'password') {
      pwd.type = 'text';
      icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
      pwd.type = 'password';
      icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    msgEl.textContent = '';
    msgEl.classList.remove('error');

    // Gather inputs
    const email    = document.getElementById('reset-email').value.trim().toLowerCase();
    const code     = document.getElementById('reset-code').value.trim().toUpperCase();
    const pwd1     = document.getElementById('new-password').value;
    const pwd2     = document.getElementById('confirm-password').value;

    if (!email || !code || !pwd1 || !pwd2) {
      msgEl.textContent = 'All fields are required.';
      msgEl.classList.add('error');
      return;
    }
    if (pwd1 !== pwd2) {
      msgEl.textContent = 'Passwords do not match.';
      msgEl.classList.add('error');
      return;
    }

    // Load users
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const idx   = users.findIndex(u => u.email === email);

    if (idx === -1) {
      msgEl.textContent = 'Email not found.';
      msgEl.classList.add('error');
      return;
    }
    if (users[idx].recoveryCode !== code) {
      msgEl.textContent = 'Invalid recovery code.';
      msgEl.classList.add('error');
      return;
    }

    // Update password (and clear code so it can't be reused)
    users[idx].password     = pwd1;
    users[idx].recoveryCode = null;
    localStorage.setItem('users', JSON.stringify(users));

    msgEl.textContent = 'Password has been reset!';
    form.reset();
  });
});
