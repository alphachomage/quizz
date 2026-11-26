/* global Env */
// api/games.ts — parties (D1) : session requise, pseudo forcé = celui du token.
import { json, jsonError, readBody } from './http.js';
import { exigerSession } from './session.js';
import { normalizePseudo } from './pseudo.js';

// --- Parties / records / XP (D1) — session requise, pseudo forcé = celui du token ---
export async function routeGames(request: Request, env: Env, url: URL): Promise<Response> {
  if (!env.DB) return jsonError('Base non configurée.', 503);
  const s = await exigerSession(request, env);
  if (s instanceof Response) return s;
  if (request.method === 'GET') {
    const pseudo = url.searchParams.get('pseudo');
    // Filtre par colonne pseudo dédiée (index idx_parties_pseudo) — jamais de LIKE
    // '%...%' sur la colonne JSON joueurs, l'index ne servirait à rien.
    const requete = pseudo
      ? 'SELECT * FROM parties WHERE pseudo = ? ORDER BY date DESC LIMIT 500'
      : 'SELECT * FROM parties ORDER BY date DESC LIMIT 500';
    const params = pseudo ? [normalizePseudo(pseudo)] : [];
    const res = await env.DB.prepare(requete)
      .bind(...params)
      .all();
    return json({
      ok: true,
      games: res.results || [],
    });
  }
  if (request.method === 'POST') {
    const p = await readBody(request);
    if (!p || !p.mode) return jsonError('Partie invalide.', 400);
    const id = typeof p.id === 'string' && p.id ? p.id : crypto.randomUUID();
    // Colonne pseudo = compte du token (jamais celui du body : un client ne peut pas
    // usurper un autre pseudo). Sert au filtre indexé GET /api/parties?pseudo=.
    const pseudo = normalizePseudo(s.pseudo);
    await env.DB.prepare(
      'INSERT INTO parties (id, mode, niveau, theme_id, pseudo, joueurs, scores, bonnes, total, details, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(
        id,
        p.mode,
        p.niveau || null,
        p.themeId || null,
        pseudo,
        JSON.stringify(p.players || []),
        JSON.stringify(p.scores || []),
        JSON.stringify(p.bonnes || []),
        p.total || 0,
        JSON.stringify(p.details || []),
        p.date || new Date().toISOString()
      )
      .run();
    return json({
      ok: true,
      id,
    });
  }
  return jsonError('Méthode non supportée.', 405);
}
