// File: server.js
// Simple demo API with signup/login (JWT), users CRUD for admin, products/orders/upload kept minimal.
// Storage: ./data (JSON files). NOT FOR PRODUCTION.

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const { nanoid } = require('nanoid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '1d';

const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Helpers
function readJson(filePath, fallback = []) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
}
function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Seed admin if not exists (default credentials)
if (!fs.existsSync(ADMIN_FILE)) {
  const hash = bcrypt.hashSync('adminpassword', 10);
  writeJson(ADMIN_FILE, { email: 'admin@cellex.local', passwordHash: hash });
}
if (!fs.existsSync(USERS_FILE)) writeJson(USERS_FILE, []);

// JWT helpers
function signToken(payload) { return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY }); }
function verifyToken(token) { try { return jwt.verify(token, JWT_SECRET); } catch { return null; } }

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public'))); // serve frontend
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2,8) + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

// Admin auth middleware
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = auth.slice(7);
  const decoded = verifyToken(token);
  if (!decoded || !decoded.admin) return res.status(401).json({ error: 'Invalid token' });
  req.admin = decoded;
  next();
}

// Routes

app.get('/api/health', (req, res) => res.json({ ok: true }));

// AUTH: admin login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const admin = readJson(ADMIN_FILE, {});
  if (!admin || !admin.passwordHash) return res.status(500).json({ error: 'Admin not configured' });
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken({ admin: true, email: admin.email });
  res.json({ token, expiresIn: TOKEN_EXPIRY });
});

// AUTH: public signup (creates user stored server-side)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, number, address, password, location, ip } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing required fields' });

    const users = readJson(USERS_FILE, []);
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const id = 'u_' + nanoid(8);
    const password_hash = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();
    const user = {
      id, name, email, number: number || '', address: address || '',
      passwordHash: password_hash,
      ip: ip || null,
      location: location || null,
      createdAt
    };
    users.push(user);
    writeJson(USERS_FILE, users);

    // issue a token for client (note: token here is simple user token, not admin)
    const token = signToken({ userId: id, email });
    res.json({ message: 'Account created', token, user: { id, name, email, number, address, createdAt } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// AUTH: public login for users (returns token)
app.post('/api/auth/user-login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });
    const users = readJson(USERS_FILE, []);
    const user = users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken({ userId: user.id, email: user.email });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ADMIN: get all users (protected)
app.get('/api/users', requireAdmin, (req, res) => {
  const users = readJson(USERS_FILE, []).map(u => ({
    id: u.id, name: u.name, email: u.email, number: u.number, address: u.address,
    ip: u.ip, location: u.location, createdAt: u.createdAt
  }));
  res.json({ users });
});

// ADMIN: create user
app.post('/api/users', requireAdmin, async (req, res) => {
  try {
    const { name, email, number, address, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'name,email,password required' });
    const users = readJson(USERS_FILE, []);
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) return res.status(409).json({ error: 'Email exists' });
    const id = 'u_' + nanoid(8);
    const passwordHash = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();
    const user = { id, name, email, number: number || '', address: address || '', passwordHash, ip: null, location: null, createdAt };
    users.push(user);
    writeJson(USERS_FILE, users);
    res.status(201).json({ user: { id, name, email, number, address, createdAt } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ADMIN: update user
app.put('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body || {};
    const users = readJson(USERS_FILE, []);
    const idx = users.findIndex(u => u.id === id);
    if (idx < 0) return res.status(404).json({ error: 'User not found' });
    if (updates.password) users[idx].passwordHash = await bcrypt.hash(updates.password, 10);
    if (updates.name !== undefined) users[idx].name = updates.name;
    if (updates.email !== undefined) users[idx].email = updates.email;
    if (updates.number !== undefined) users[idx].number = updates.number;
    if (updates.address !== undefined) users[idx].address = updates.address;
    writeJson(USERS_FILE, users);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ADMIN: delete user
app.delete('/api/users/:id', requireAdmin, (req, res) => {
  try {
    const id = req.params.id;
    let users = readJson(USERS_FILE, []);
    if (!users.some(u => u.id === id)) return res.status(404).json({ error: 'User not found' });
    users = users.filter(u => u.id !== id);
    writeJson(USERS_FILE, users);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload (admin)
app.post('/api/upload', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: '/uploads/' + req.file.filename });
});

// Admin info
app.get('/api/admin/me', requireAdmin, (req, res) => res.json({ email: req.admin.email || 'admin' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err && err.stack ? err.stack : err);
  res.status(500).json({ error: 'Server error', message: String(err && err.message ? err.message : err) });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
