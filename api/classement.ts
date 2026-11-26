/* global Env */
// api/classement.ts — classement global agrégé côté serveur (GET /api/classement).
import { json, jsonError } from './http.js';
import { exigerSession } from './session.js';

// --- Classement global : GET /api/classement?mode=&niveau=&periode= ---
// Top 20 par mode, agrégé côté serveur sur la table D1 « parties » : meilleur score
// par joueur (colonne pseudo du compte, sinon nom du 1er joueur de la partie).
// Filtres : niveau (solo : facile|moyen|dur) et periode=semaine (depuis lundi 00:00 UTC).
export async function routeClassement(request: Request, env: Env, url: URL): Promise<Response> {
  if (!env.DB) return jsonError('Base non configurée.', 503);
  const s = await exigerSession(request, env);
  if (s instanceof Response) return s;
  if (request.method !== 'GET') return jsonError('Méthode non supportée.', 405);
  const mode = url.searchParams.get('mode') || 'solo';
  if (!['solo', 'duel', 'rogue', 'quotidien'].includes(mode)) return jsonError('Mode inconnu.', 400);
  const niveau = url.searchParams.get('niveau');
  const periode = url.searchParams.get('periode');
  // lundi 00:00 UTC de la semaine en cours (même logique que isThisWeek côté client)
  let depuis: string | null = null;
  if (periode === 'semaine') {
    const m = new Date();
    const lundi = (m.getUTCDay() + 6) % 7; // lundi = 0
    depuis = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate() - lundi)).toISOString();
  }
  const conditions = ['mode = ?'];
  const params: string[] = [mode];
  if (niveau && ['facile', 'moyen', 'dur'].includes(niveau)) {
    conditions.push('niveau = ?');
    params.push(niveau);
  }
  if (depuis) {
    conditions.push('date >= ?');
    params.push(depuis);
  }
  // json_each sur la colonne joueurs : une ligne par joueur de chaque partie.
  // MAX(score) + colonnes nues : SQLite prend les autres colonnes de la ligne du max.
  const res = await env.DB.prepare(
    `SELECT nom, MAX(score) AS score, bonnes, total, theme_id AS themeId, niveau, MAX(date) AS date
     FROM (
       SELECT COALESCE(NULLIF(pseudo, ''), json_extract(joueurs, '$[0].nom')) AS nom,
              CAST(json_extract(j.value, '$.score') AS INTEGER) AS score,
              CAST(json_extract(j.value, '$.bonnes') AS INTEGER) AS bonnes,
              total, theme_id, niveau, date
       FROM parties, json_each(parties.joueurs) j
       WHERE ${conditions.join(' AND ')}
     )
     GROUP BY nom
     ORDER BY score DESC
     LIMIT 20`
  )
    .bind(...params)
    .all();
  return json({
    ok: true,
    rows: res.results || [],
  });
}
