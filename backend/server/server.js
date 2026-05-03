const express = require("express");
const Database = require("better-sqlite3");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const db = new Database("./tv_carousel.db");

// ✅ Define dist path ONCE — used consistently below
const DIST = path.join(__dirname, "dist");

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

fs.mkdirSync("./uploads", { recursive: true });

db.exec(`
  CREATE TABLE IF NOT EXISTS media (
    id            TEXT PRIMARY KEY,
    filename      TEXT NOT NULL,
    original_name TEXT NOT NULL,
    type          TEXT NOT NULL CHECK(type IN ('photo','video')),
    order_index   INTEGER NOT NULL DEFAULT 0,
    uploaded_at   TEXT NOT NULL,
    duration_ms   INTEGER DEFAULT 5000
  )
`);

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, crypto.randomUUID() + ext);
  },
});
const upload = multer({ storage });

app.use(express.static(DIST));

app.get("/api/media/max-order", (req, res) => {
  const result = db.prepare("SELECT MAX(order_index) as max FROM media").get();
  res.json({ max: result.max ?? -1 });
});

app.get("/api/media", (req, res) => {
  const rows = db.prepare("SELECT * FROM media ORDER BY order_index ASC").all();
  res.json(rows);
});

app.get("/api/media/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM media WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

app.post("/api/media", upload.single("file"), (req, res) => {
  const { id, original_name, type, order_index, uploaded_at, duration_ms } =
    req.body;
  const filename = req.file.filename;
  db.prepare(
    `
    INSERT INTO media (id, filename, original_name, type, order_index, uploaded_at, duration_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    id,
    filename,
    original_name,
    type,
    parseInt(order_index),
    uploaded_at,
    parseInt(duration_ms) || 5000,
  );
  res.json({ success: true, filename });
});

app.delete("/api/media/:id", (req, res) => {
  const row = db
    .prepare("SELECT filename FROM media WHERE id = ?")
    .get(req.params.id);
  if (row) {
    fs.rmSync(`./uploads/${row.filename}`, { force: true });
    db.prepare("DELETE FROM media WHERE id = ?").run(req.params.id);
  }
  res.json({ success: true });
});

app.patch("/api/media/reorder", (req, res) => {
  const items = req.body;
  const stmt = db.prepare("UPDATE media SET order_index = ? WHERE id = ?");
  for (const item of items) stmt.run(item.order_index, item.id);
  res.json({ success: true });
});

app.patch("/api/media/:id/duration", (req, res) => {
  db.prepare("UPDATE media SET duration_ms = ? WHERE id = ?").run(
    req.body.duration_ms,
    req.params.id,
  );
  res.json({ success: true });
});

// ✅ Bug 2 fix: consistent path with DIST constant
app.use((req, res, next) => {
  if (!req.path.startsWith("/api") && !req.path.startsWith("/uploads")) {
    res.sendFile(path.join(DIST, "index.html"));
  } else {
    next();
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(3001, () => console.log("Server running on http://localhost:3001"));
