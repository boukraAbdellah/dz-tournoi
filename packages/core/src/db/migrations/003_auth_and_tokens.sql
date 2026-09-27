-- 003_auth_and_tokens.sql - users and registration tokens for RBAC & Turso
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'LEAGUE_MANAGER' CHECK (role IN ('ADMIN', 'LEAGUE_MANAGER')),
  wilaya_id INTEGER REFERENCES wilaya(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_wilaya ON users(wilaya_id);

CREATE TABLE IF NOT EXISTS registration_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  competition_id INTEGER NOT NULL REFERENCES competition(id) ON DELETE CASCADE,
  wilaya_id INTEGER NOT NULL REFERENCES wilaya(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reg_tokens_comp ON registration_tokens(competition_id);
CREATE INDEX IF NOT EXISTS idx_reg_tokens_token ON registration_tokens(token);
