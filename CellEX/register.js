// register.js

document.addEventListener('DOMContentLoaded', () => {
  const form     = document.getElementById('register-form');
  const msgEl    = document.getElementById('register-msg');
  const codeDiv  = document.getElementById('code-container');
  const codeSpan = document.getElementById('recovery-code');
  const toggle   = document.querySelector('.toggle-pass');

  toggle.addEventListener('click', () => {
    const pwd  = document.getElementById('reg-password');
    const icon = toggle.querySelector('i');
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
    codeDiv.style.display = 'none';

    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim().toLowerCase();
    const phone    = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;

    if (!name || !email || !phone || !password) {
      msgEl.textContent = 'All fields are required.';
      msgEl.classList.add('error');
      return;
    }

    const users = JSON.parse(localStorage.getItem('users')) || [];

    // enforce one account per email
    if (users.some(u => u.email === email)) {
      msgEl.textContent = 'This email is already registered.';
      msgEl.classList.add('error');
      return;
    }
    // enforce one account per phone
    if (users.some(u => u.phone === phone)) {
      msgEl.textContent = 'This phone number is already registered.';
      msgEl.classList.add('error');
      return;
    }

    // generate 6-char recovery code
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();

    users.push({
      id: Date.now(),
      name,
      email,
      phone,
      password,
      recoveryCode: code
    });
    localStorage.setItem('users', JSON.stringify(users));

    msgEl.textContent = 'Account created successfully!';
    form.reset();

    codeSpan.textContent = code;
    codeDiv.style.display = 'block';
  });
});
