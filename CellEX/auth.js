// auth.js — Combined Register, Login & Reset flows with OTP fix
'use strict';

(() => {
  const $ = id => document.getElementById(id);

  // Produce a pure 6-digit OTP (no trailing space)
  function randomOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Tab navigation (if you’re showing/hiding sections)
  ['register','login','reset'].forEach(tab => {
    $(`tab-${tab}`).onclick = () => {
      document.querySelectorAll('.user-section')
        .forEach(sec => sec.classList.add('hidden'));
      $(`section-${tab}`).classList.remove('hidden');
    };
  });

  let pendingOTP   = null;
  let pendingEmail = null;

  // ─── REGISTER FLOW ─────────────────────────────
  $('register-form').onsubmit = e => {
    e.preventDefault();
    const msgEl    = $('register-msg');
    const name     = $('reg-name').value.trim();
    const emailRaw = $('reg-email').value.trim();
    const email    = emailRaw.toLowerCase();
    const mobile   = $('reg-mobile').value.trim();
    const password = $('reg-password').value;

    msgEl.textContent = '';
    msgEl.className   = '';

    // Basic validation
    if (!name || !email.endsWith('@gmail.com') || !mobile || password.length < 8) {
      msgEl.textContent = 'Invalid input. Check all fields.';
      msgEl.className   = 'error';
      return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (users.some(u => u.email === email)) {
      msgEl.textContent = 'Email already registered!';
      msgEl.className   = 'error';
      return;
    }

    // Send OTP
    pendingOTP   = randomOTP();
    pendingEmail = email;
    console.log('🛡 Sent OTP:', pendingOTP);

    $('otp-verification').classList.remove('hidden');
    msgEl.textContent = 'OTP sent to your email (check console).';
    msgEl.className   = 'success';
  };

  // Verify OTP and store new user
  $('verify-otp-btn').onclick = () => {
    const code  = $('reg-otp').value.trim();
    const msgEl = $('otp-msg');
    msgEl.textContent = '';
    msgEl.className   = '';

    if (code !== pendingOTP) {
      msgEl.textContent = 'Wrong OTP!';
      msgEl.className   = 'error';
      return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    users.push({
      name:     $('reg-name').value.trim(),
      email:    pendingEmail,
      mobile:   $('reg-mobile').value.trim(),
      password: $('reg-password').value
    });
    localStorage.setItem('users', JSON.stringify(users));

    msgEl.textContent = 'Email verified – account created!';
    msgEl.className   = 'success';

    setTimeout(() => window.location.reload(), 1500);
  };

  // ─── LOGIN FLOW ─────────────────────────────────
  $('login-form').onsubmit = e => {
    e.preventDefault();
    const msgEl   = $('login-msg');
    const email   = $('login-email').value.trim().toLowerCase();
    const pass    = $('login-password').value;

    msgEl.textContent = '';
    msgEl.className   = '';

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user  = users.find(u => u.email === email && u.password === pass);

    if (!user) {
      msgEl.textContent = 'Invalid credentials.';
      msgEl.className   = 'error';
      return;
    }

    msgEl.textContent = `Welcome back, ${user.name}!`;
    msgEl.className   = 'success';

    setTimeout(() => {
      // Redirect or next step
      // window.location.href = 'dashboard.html';
      alert(`Login successful for ${user.name}`);
    }, 500);
  };

  // ─── RESET PASSWORD FLOW ───────────────────────
  $('reset-form').onsubmit = e => {
    e.preventDefault();
    const msgEl = $('reset-msg');
    const email = $('reset-email').value.trim().toLowerCase();

    msgEl.textContent = '';
    msgEl.className   = '';

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (!users.some(u => u.email === email)) {
      msgEl.textContent = 'Email not registered.';
      msgEl.className   = 'error';
      return;
    }

    pendingEmail = email;
    pendingOTP   = randomOTP();
    console.log('🔐 Reset OTP:', pendingOTP);

    $('reset-otp-verify').classList.remove('hidden');
    msgEl.textContent = 'OTP sent (check console).';
    msgEl.className   = 'success';
  };

  // Verify reset OTP & set new password
  $('reset-pass-btn').onclick = () => {
    const code    = $('reset-otp').value.trim();
    const newPass = $('reset-new-pass').value;
    const msgEl   = $('reset-msg');

    msgEl.textContent = '';
    msgEl.className   = '';

    if (code !== pendingOTP || newPass.length < 8) {
      msgEl.textContent = 'Invalid OTP or password too short.';
      msgEl.className   = 'error';
      return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]')
      .map(u => {
        if (u.email === pendingEmail) u.password = newPass;
        return u;
      });
    localStorage.setItem('users', JSON.stringify(users));

    msgEl.textContent = 'Password reset successful!';
    msgEl.className   = 'success';

    setTimeout(() => window.location.reload(), 1500);
  };
})();
