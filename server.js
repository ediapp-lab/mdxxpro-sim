import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import { db, initDb } from "./db.js";
import { sendConfirmationEmail } from "./mailer.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const BINANCE_BASE = process.env.BINANCE_BASE || "https://api.binance.com";

function now() { return Date.now(); }
function log(event, details) { db.run("INSERT INTO logs(ts,event,details) VALUES(?,?,?)", [now(), event, details]); }

/* ---- Auth helpers ---- */
function sign(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "2h" });
}
function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!t) return res.status(401).json({ error: "Missing token" });
  try { req.user = jwt.verify(t, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: "Invalid token" }); }
}
function admin(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admins only" });
  next();
}

/* ---- Auth routes ---- */
app.post("/auth/register", (req, res) => {
  const { email, password } = req.body;
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  db.run("INSERT INTO users(email,password,role,balance,verified,code) VALUES(?,?,'student',10000,0,?)",
    [email, password, code],
    (err) => {
      if (err) return res.status(400).json({ error: "Email already exists" });
      sendConfirmationEmail(email, code).catch(()=>{});
      log("register", email);
      res.json({ message: "Registered. Check email for confirmation code." });
    });
});

app.post("/auth/verify", (req, res) => {
  const { email, code } = req.body;
  db.get("SELECT * FROM users WHERE email=? AND code=?", [email, code], (err, row) => {
    if (!row) return res.status(400).json({ error: "Invalid code" });
    db.run("UPDATE users SET verified=1 WHERE email=?", [email]);
    log("verify", email);
    res.json({ message: "Email verified" });
  });
});

app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT * FROM users WHERE email=? AND password=?", [email, password], (err, row) => {
    if (!row) return res.status(400).json({ error: "Invalid credentials" });
    if (!row.verified) return res.status(400).json({ error: "Email not verified" });
    const token = sign(row);
    log("login", email);
    res.json({ token, user: { id: row.id, email: row.email, role: row.role } });
  });
});

/* ---- Student ---- */
app.get("/user/balance", auth, (req, res) => {
  db.get("SELECT balance FROM users WHERE id=?", [req.user.id], (err, r) => {
    res.json({ balance: r?.balance || 0 });
  });
});

/* ---- Admin ---- */
app.get("/admin/users", auth, admin, (req, res) => {
  db.all("SELECT id,email,balance FROM users WHERE role='student'", [], (err, rows) => res.json(rows||[]));
});
app.get("/admin/logs", auth, admin, (req, res) => {
  db.all("SELECT * FROM logs ORDER BY ts DESC LIMIT 200", [], (err, rows) => res.json(rows||[]));
});
app.post("/admin/adjust-balance", auth, admin, (req, res) => {
  const { userId, delta } = req.body;
  db.run("UPDATE users SET balance=balance+? WHERE id=?", [Number(delta), userId], (err) => {
    if (err) return res.status(400).json({ error: "Failed" });
    log("adjust_balance", `user:${userId} delta:${delta}`);
    res.json({ success: true });
  });
});
app.post("/admin/override", auth, admin, (req, res) => {
  const { symbol, price, ohlc } = req.body;
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  if (price != null) {
    db.run("INSERT INTO overrides(symbol, price, ts) VALUES(?,?,?)", [symbol.toUpperCase(), Number(price), now()]);
  }
  if (ohlc && typeof ohlc === "object") {
    const t = ohlc.time ?? now();
    db.run("INSERT INTO overrides(symbol, open, high, low, close, time, ts) VALUES(?,?,?,?,?,?,?)",
      [symbol.toUpperCase(), ohlc.open, ohlc.high, ohlc.low, ohlc.close, t, now()]);
  }
  log("override", JSON.stringify({ symbol, price, ohlc }));
  res.json({ success: true });
});

/* ---- Market data (Binance + overrides) ---- */
app.get("/api/price/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    // last override price if any
    db.get("SELECT price FROM overrides WHERE symbol=? AND price IS NOT NULL ORDER BY ts DESC LIMIT 1",
      [symbol], async (err, row) => {
        if (row?.price != null) return res.json({ symbol, price: row.price });
        const url = `${BINANCE_BASE}/api/v3/ticker/price?symbol=${symbol}`;
        const r = await fetch(url);
        const j = await r.json();
        res.json({ symbol, price: j.price ? Number(j.price) : null });
      });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Candles: merges real data with most recent override OHLC (if provided)
app.get("/api/candles/:symbol/:interval", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const interval = req.params.interval || "1m";
  try {
    const url = `${BINANCE_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=200`;
    const r = await fetch(url);
    const rows = await r.json();
    let candles = rows.map(k => ({
      time: Math.floor(k[0]/1000),
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4])
    }));

    // override OHLC if present (apply to latest bar)
    db.get("SELECT open,high,low,close,time FROM overrides WHERE symbol=? AND open IS NOT NULL ORDER BY ts DESC LIMIT 1",
      [symbol], (err, o) => {
        if (o && candles.length) {
          const last = candles[candles.length - 1];
          const t = o.time ? Math.floor(o.time/1000) : last.time;
          candles[candles.length - 1] = {
            time: t,
            open: Number(o.open), high: Number(o.high), low: Number(o.low), close: Number(o.close)
          };
        }
        res.json(candles);
      });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---- Serve frontend build ---- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));

/* ---- Start ---- */
initDb();
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`MDXX Pro running on :${PORT}`));

