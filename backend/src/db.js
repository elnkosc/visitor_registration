const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbPath = process.env.DATABASE_PATH || './data/visitors.db';
const db = new Database(path.resolve(dbPath));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      email           TEXT NOT NULL UNIQUE,
      password_hash   TEXT,
      role            TEXT NOT NULL CHECK(role IN ('admin','receptionist','employee')),
      first_name      TEXT,
      tussenvoegsel   TEXT,
      last_name       TEXT,
      phone           TEXT,
      is_active       INTEGER NOT NULL DEFAULT 0,
      confirm_token   TEXT,
      confirm_expires INTEGER,
      created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at      INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS visitors (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name      TEXT NOT NULL,
      tussenvoegsel   TEXT,
      last_name       TEXT NOT NULL,
      company         TEXT,
      email           TEXT,
      phone           TEXT,
      license_plate   TEXT,
      host_user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      expected_date   TEXT NOT NULL,
      checked_in_at   INTEGER,
      checked_out_at  INTEGER,
      status          TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','checked_in','checked_out','cancelled')),
      created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at      INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS config (
      key       TEXT PRIMARY KEY,
      value     TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_visitors_last_name ON visitors(last_name);
    CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors(status);
    CREATE INDEX IF NOT EXISTS idx_visitors_date ON visitors(expected_date);
    CREATE INDEX IF NOT EXISTS idx_visitors_host ON visitors(host_user_id);
  `);

  // Seed default config values
  const upsertConfig = db.prepare(`
    INSERT INTO config(key, value) VALUES(?, ?)
    ON CONFLICT(key) DO NOTHING
  `);
  const defaultConfigs = [
    ['smtp_host', ''],
    ['smtp_port', '587'],
    ['smtp_secure', 'false'],
    ['smtp_user', ''],
    ['smtp_pass', ''],
    ['smtp_from', ''],
    ['allowed_domains', '[]'],
    ['company_name', 'Mijn Bedrijf'],
  ];
  for (const [key, value] of defaultConfigs) {
    upsertConfig.run(key, value);
  }

  // Seed default admin if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
  if (userCount.cnt === 0) {
    const hash = bcrypt.hashSync('admin123', 12);
    db.prepare(`
      INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
      VALUES ('admin@localhost', ?, 'admin', 'Admin', 'Gebruiker', 1)
    `).run(hash);
    console.log('Default admin created: admin@localhost / admin123');
  }
}

function fullName(user) {
  if (!user) return '';
  return [user.first_name, user.tussenvoegsel, user.last_name].filter(Boolean).join(' ');
}

module.exports = { db, initDb, fullName };
