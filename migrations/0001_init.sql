-- Site içeriği (JSON), anahtar/değer
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tek yönetici hesabı. Parola yalnızca PBKDF2 özeti olarak saklanır.
CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  username TEXT NOT NULL,
  pw_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Oturum kimliği olarak çerezdeki belirtecin SHA-256 özeti tutulur.
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  csrf TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);

-- Yüklenen dosyalar (R2 anahtarları sunucuda üretilir, istemciden alınmaz)
CREATE TABLE assets (
  key TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('video','poster','portrait')),
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  attached INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- Devam eden parçalı (multipart) video yüklemeleri
CREATE TABLE uploads (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL,
  upload_id TEXT NOT NULL,
  mime TEXT,
  declared_size INTEGER NOT NULL,
  received INTEGER NOT NULL DEFAULT 0,
  parts TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  video_key TEXT NOT NULL,
  poster_key TEXT,
  video_size INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_projects_order ON projects (published, sort_order);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  mailed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
