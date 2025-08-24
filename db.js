import sqlite3 from "sqlite3";
sqlite3.verbose();

export const db = new sqlite3.Database(process.env.DATABASE_URL?.replace("file:", "") || "./db.sqlite");

export function initDb() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'student',
      balance REAL DEFAULT 10000,
      verified INTEGER DEFAULT 0,
      code TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS logs(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      event TEXT,
      details TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS overrides(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT,
      price REAL,
      open REAL, high REAL, low REAL, close REAL,
      time INTEGER,              -- ms since epoch for candle
      ts INTEGER                 -- inserted at
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS ticks(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT,
      price REAL,
      ts INTEGER
    )`);
  });
}
