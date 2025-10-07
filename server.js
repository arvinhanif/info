// server.js
// Express + SQLite + Socket.io real-time product updates

const path = require("path");
const express = require("express");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, { cors: { origin: "*" } });

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// SQLite setup
const db = new sqlite3.Database(path.join(__dirname, "cellex.db"));
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      image TEXT,
      description TEXT,
      createdAt TEXT NOT NULL,
      bestSelling INTEGER DEFAULT 0,
      dealOfDay INTEGER DEFAULT 0
    )
  `);
});

// Helpers
function qall(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}
function qrun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

// Routes
// Fetch all products
app.get("/api/products", async (req, res) => {
  try {
    const rows = await qall(
      "SELECT id, name, price, image, description, createdAt, bestSelling, dealOfDay FROM products ORDER BY datetime(createdAt) DESC"
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Admin upload (simple public endpoint; secure behind auth in production)
app.post("/api/admin/upload", async (req, res) => {
  try {
    const { id, name, price, image, description, bestSelling = 0, dealOfDay = 0 } = req.body;

    if (!name || price == null) {
      return res.status(400).json({ error: "Name and price are required" });
    }

    const pid = id || `p_${Date.now()}`;
    const createdAt = new Date().toISOString();

    await qrun(
      `INSERT INTO products (id, name, price, image, description, createdAt, bestSelling, dealOfDay)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [pid, name, Number(price), image || "", description || "", createdAt, bestSelling ? 1 : 0, dealOfDay ? 1 : 0]
    );

    const product = { id: pid, name, price: Number(price), image: image || "", description: description || "", createdAt, bestSelling: bestSelling ? 1 : 0, dealOfDay: dealOfDay ? 1 : 0 };

    // Real-time push
    io.emit("product:new", product);

    res.json({ ok: true, product });
  } catch (e) {
    res.status(500).json({ error: "Failed to upload product" });
  }
});

// Socket.io
io.on("connection", (socket) => {
  // Optional: you can implement rooms by category or admin channels
  socket.on("disconnect", () => {});
});

// Start
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`CellEX server running at http://localhost:${PORT}`);
});
