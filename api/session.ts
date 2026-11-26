/* global Env */
// api/session.ts — sessions serveur (token Bearer) et gardes d'accès session/admin.
import { jsonError } from './http.js';
import { normalizePseudo } from './pseudo.js';

// --- Sessions serveur : token Bearer renvoyé par /api/auth/*, vérifié sur toutes les
// routes de données. Une session par compte (la connexion révoque l'ancienne). ---
export const DUREE_SESSION_MS = 30 * 24 * 3600 * 1000; // 30 jours
export async function creerSession(env: Env, pseudo: string): Promise<string> {
  const token = crypto.randomUUID() + crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare('DELETE FROM sessions WHERE pseudo = ?').bind(pseudo).run();
  await env.DB.prepare(
    'INSERT INTO sessions (token, pseudo, cree_le, expire_le) VALUES (?, ?, ?, ?)'
  )
    .bind(token, pseudo, new Date(now).toISOString(), new Date(now + DUREE_SESSION_MS).toISOString())
    .run();
  return token;
}

// Lit le token Bearer et renvoie le pseudo associé (ou null si absent/invalide/expiré).
export async function sessionValide(request: Request, env: Env): Promise<string | null> {
  const m = /^Bearer (.+)$/.exec(request.headers.get('Authorization') || '');
  if (!m || !env.DB) return null;
  const row = await env.DB
    .prepare('SELECT pseudo, expire_le FROM sessions WHERE token = ?')
    .bind(m[1])
    .first<{ pseudo: string; expire_le: string }>();
  if (!row || new Date(row.expire_le).getTime() < Date.now()) return null;
  return row.pseudo;
}
// Variante pour le WebSocket (pas de header custom en navigateur) : token en query ?token=.
export async function sessionValideParToken(token: string | null, env: Env): Promise<string | null> {
  if (!token || !env.DB) return null;
  const row = await env.DB
    .prepare('SELECT pseudo, expire_le FROM sessions WHERE token = ?')
    .bind(token)
    .first<{ pseudo: string; expire_le: string }>();
  if (!row || new Date(row.expire_le).getTime() < Date.now()) return null;
  return row.pseudo;
}

/** Exige une session valide -> { pseudo } ou une réponse 503 (pas de DB) / 401. */
export async function exigerSession(request: Request, env: Env): Promise<{ pseudo: string } | Response> {
  if (!env.DB) return jsonError('Base non configurée.', 503);
  const pseudo = await sessionValide(request, env);
  if (!pseudo) return jsonError('Session requise : connecte-toi d’abord.', 401);
  return { pseudo };
}
/** Exige une session valide + admin = 1 sur le compte (table comptes). */
export async function exigerAdmin(request: Request, env: Env): Promise<{ pseudo: string } | Response> {
  const s = await exigerSession(request, env);
  if (s instanceof Response) return s;
  if (!env.DB) return jsonError('Base non configurée.', 503);
  const row = await env.DB
    .prepare('SELECT admin FROM comptes WHERE pseudo_normalise = ?')
    .bind(normalizePseudo(s.pseudo))
    .first<{ admin: number }>();
  if (!row || !row.admin) return jsonError('Accès admin refusé.', 403);
  return s;
}
