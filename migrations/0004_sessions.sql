-- migrations/0004_sessions.sql — sessions serveur (token Bearer) pour authentifier
-- les routes de données (/api/kv/*, /api/parties, /api/records, /api/xp,
-- /api/soumissions, /api/room*, /api/duel/*, /api/admin/check, /api/stats).
-- Le token est renvoyé par /api/auth/inscription|connexion, stocké côté client
-- (clé localStorage locale, jamais synchronisée), envoyé en header
-- Authorization: Bearer <token>. Une session par compte (la connexion révoque
-- l'ancienne). TTL 30 jours (worker-api.ts), révocable par DELETE de la ligne.

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  pseudo TEXT NOT NULL,
  cree_le TEXT NOT NULL,
  expire_le TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_pseudo ON sessions(pseudo);
