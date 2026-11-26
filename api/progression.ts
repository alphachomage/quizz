/* global Env */
// api/progression.ts — records et XP (D1) : clés namespacées par compte, pseudo forcé = token.
import { json, jsonError, readBody } from './http.js';
import { exigerSession } from './session.js';
import { normalizePseudo } from './pseudo.js';

export async function routeRecords(
  request: Request,
  env: Env,
  url: URL,
  key: string | null
): Promise<Response> {
  if (!env.DB) return jsonError('Base non configurée.', 503);
  const s = await exigerSession(request, env);
  if (s instanceof Response) return s;
  if (request.method === 'GET' && key) {
    // Clé namespacée par compte (comme sync_client) : un joueur ne lit que SES records.
    const row = await env.DB
      .prepare('SELECT * FROM records WHERE cle = ?')
      .bind(`${normalizePseudo(s.pseudo)}:${key}`)
      .first();
    return json({
      ok: true,
      record: row || null,
    });
  }
  if (request.method === 'POST') {
    const body = await readBody(request);
    if (!body || !body.key || typeof body.value !== 'number')
      return jsonError('cle + valeur requis.', 400);
    await env.DB.prepare(
      'INSERT INTO records (cle, valeur, pseudo, date) VALUES (?, ?, ?, ?) ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur, pseudo = excluded.pseudo, date = excluded.date'
    )
      // cle namespacée + pseudo forcé = compte du token (jamais celui du body :
      // un client ne peut ni lire ni écraser les records d'un autre compte).
      .bind(
        `${normalizePseudo(s.pseudo)}:${body.key}`,
        body.value,
        normalizePseudo(s.pseudo),
        new Date().toISOString()
      )
      .run();
    return json({
      ok: true,
    });
  }
  return jsonError('Méthode non supportée.', 405);
}
export async function routeXp(
  request: Request,
  env: Env,
  url: URL,
  themeId: string | null
): Promise<Response> {
  if (!env.DB) return jsonError('Base non configurée.', 503);
  const s = await exigerSession(request, env);
  if (s instanceof Response) return s;
  if (request.method === 'GET' && themeId) {
    // pseudo forcé = compte du token : le segment d'URL /api/xp/<pseudo>/... est
    // conservé pour compatibilité client mais IGNORÉ (pas de lecture cross-joueurs).
    const row = await env.DB.prepare('SELECT xp FROM xp WHERE pseudo_theme = ?')
      .bind(`${normalizePseudo(s.pseudo)}:${themeId}`)
      .first<{ xp: number }>();
    return json({
      ok: true,
      xp: row ? row.xp : 0,
    });
  }
  if (request.method === 'POST') {
    const body = await readBody(request);
    if (!body || !body.themeId || typeof body.xp !== 'number')
      return jsonError('themeId + xp requis.', 400);
    // pseudo forcé = compte du token.
    await env.DB.prepare(
      'INSERT INTO xp (pseudo_theme, xp) VALUES (?, ?) ON CONFLICT(pseudo_theme) DO UPDATE SET xp = excluded.xp'
    )
      .bind(`${normalizePseudo(s.pseudo)}:${body.themeId}`, body.xp)
      .run();
    return json({
      ok: true,
    });
  }
  return jsonError('Méthode non supportée.', 405);
}
