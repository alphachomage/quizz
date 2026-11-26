/* global Env */
// api/auth.ts — inscription / connexion (PBKDF2 côté serveur, modération du pseudo).
import { trouverTermeBloque } from '../src/lib/moderation.js';
import { json, jsonError, readBody } from './http.js';
import { hashesEqual, pbkdf2 } from './crypto.js';
import { creerSession } from './session.js';
import { normalizePseudo } from './pseudo.js';

// --- Auth : inscription / connexion (PBKDF2 côté serveur) ---
const MAX_MDP = 72; // au-delà, 400 (évite un PBKDF2 sur un body énorme)
// Ligne de la table D1 `comptes` (schéma : migrations/0001_init.sql + 0003_admin_flag.sql).
interface CompteRow {
  pseudo: string;
  pseudo_normalise: string;
  email: string | null;
  hash: string;
  sel: string;
  hash_version: number;
  cree_le: string | null;
  dernier_login: string | null;
  admin: number; // 0/1 — flag admin du compte (promu par UPDATE SQL, voir docs/features/admin.md)
}
export async function routeAuth(
  request: Request,
  env: Env,
  action: string | undefined
): Promise<Response> {
  const body = await readBody(request);
  if (!body || !body.pseudo || !body.password)
    return jsonError('Pseudo et mot de passe requis.', 400);
  if (!env.DB) return jsonError('Base non configurée (binding DB manquant).', 503);
  const pseudo = String(body.pseudo).slice(0, 20);
  const n = normalizePseudo(pseudo);
  const password = String(body.password);
  if (password.length > MAX_MDP) return jsonError(`Mot de passe trop long (${MAX_MDP} max).`, 400);
  if (action === 'inscription') {
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(body.email)))
      return jsonError('E-mail invalide.', 400);
    if (password.length < 8)
      return jsonError('Mot de passe : 8 caractères minimum.', 400);
    // Modération serveur du pseudo (même blocklist que le client, anti-contournement API).
    const bloque = trouverTermeBloque(pseudo);
    if (bloque) return jsonError(`Ce pseudo n'est pas autorisé (modération : ${bloque.categorie}).`, 400);
    const exists = await env.DB.prepare('SELECT pseudo FROM comptes WHERE pseudo_normalise = ?')
      .bind(n)
      .first();
    if (exists) return jsonError('Ce pseudo est déjà pris.', 409);
    const sel = crypto.randomUUID();
    const hash = await pbkdf2(password, sel);
    const now = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO comptes (pseudo, pseudo_normalise, email, hash, sel, hash_version, cree_le, dernier_login) VALUES (?, ?, ?, ?, ?, 2, ?, ?)'
    )
      .bind(pseudo, n, body.email, hash, sel, now, now)
      .run();
    return json({
      ok: true,
      pseudo,
      token: await creerSession(env, pseudo),
    });
  }
  if (action === 'connexion') {
    const account = await env.DB.prepare('SELECT * FROM comptes WHERE pseudo_normalise = ?')
      .bind(n)
      .first<CompteRow>();
    if (!account) {
      // PBKDF2 factice au même coût : pas d'oracle de timing pour énumérer les pseudos.
      await pbkdf2(password, 'sel-factice');
      return jsonError('Aucun compte avec ce pseudo.', 404);
    }
    const hash = await pbkdf2(password, account.sel);
    if (!hashesEqual(hash, account.hash)) return jsonError('Mot de passe incorrect.', 401);
    await env.DB.prepare('UPDATE comptes SET dernier_login = ? WHERE pseudo = ?')
      .bind(new Date().toISOString(), account.pseudo)
      .run();
    return json({
      ok: true,
      pseudo: account.pseudo,
      token: await creerSession(env, account.pseudo),
    });
  }
  return jsonError('Action inconnue.', 404);
}
