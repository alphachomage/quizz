-- migrations/0001_init.sql — schéma D1 de VoltQuiz (V2 : comptes, parties, records,
-- XP, soumissions côté serveur). Préparé maintenant, appliqué plus tard :
--   npx wrangler d1 migrations apply voltquiz --remote
-- En local : npx wrangler d1 migrations apply voltquiz --local

CREATE TABLE IF NOT EXISTS comptes (
  pseudo TEXT PRIMARY KEY,
  pseudo_normalise TEXT UNIQUE,
  email TEXT,
  hash TEXT NOT NULL,          -- hash du mot de passe (PBKDF2 côté serveur en V2)
  sel TEXT NOT NULL,
  hash_version INTEGER DEFAULT 2,
  avatar TEXT,
  cree_le TEXT,
  dernier_login TEXT
);

CREATE TABLE IF NOT EXISTS parties (
  id TEXT PRIMARY KEY,
  mode TEXT,                   -- solo | duel | survie | quotidien
  niveau TEXT,
  theme_id TEXT,
  joueurs TEXT,                -- JSON [{ nom, score, bonnes }]
  scores TEXT,                 -- JSON [..]
  bonnes TEXT,                 -- JSON [..]
  total INTEGER,
  details TEXT,                -- JSON question par question
  date TEXT
);

CREATE TABLE IF NOT EXISTS records (
  cle TEXT PRIMARY KEY,        -- "<mode>:<niveau|mix>:<themeId>"
  valeur INTEGER,
  pseudo TEXT,
  date TEXT
);

CREATE TABLE IF NOT EXISTS xp (
  pseudo_theme TEXT PRIMARY KEY, -- "<pseudo>:<themeId>"
  xp INTEGER
);

CREATE TABLE IF NOT EXISTS soumissions (
  id TEXT PRIMARY KEY,
  pseudo TEXT,
  theme_id TEXT,
  q TEXT,
  reponses TEXT,               -- JSON
  bonne INTEGER,
  niveau TEXT,
  info TEXT,
  etat TEXT,                   -- 'attente' | 'validee' | 'refusee'
  date TEXT
);

CREATE INDEX IF NOT EXISTS idx_parties_date ON parties(date);
CREATE INDEX IF NOT EXISTS idx_parties_pseudo ON parties(joueurs);

-- Stockage clé/valeur générique (sync du localStorage côté serveur en V2).
CREATE TABLE IF NOT EXISTS kv (
  cle TEXT PRIMARY KEY,
  valeur TEXT
);
