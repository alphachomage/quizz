/* global Env */
// api/soumissions.ts — soumissions de questions, modération admin, questions communautaires.
import { json, jsonError, readBody } from './http.js';
import { exigerAdmin, exigerSession } from './session.js';
import { normalizePseudo } from './pseudo.js';

// --- Soumissions de questions des joueurs (D1, table soumissions) ---
// POST (session requise, pseudo forcé = token) -> ajoute/remplace une soumission
// (etat forcé à 'attente'). GET (admin requis) ?etat=attente -> liste de modération.
export async function routeSoumissions(request: Request, env: Env, url: URL): Promise<Response> {
  if (!env.DB) return jsonError('Base non configurée.', 503);
  if (request.method === 'GET') {
    const a = await exigerAdmin(request, env);
    if (a instanceof Response) return a;
    const etat = url.searchParams.get('etat');
    const requete = etat
      ? 'SELECT * FROM soumissions WHERE etat = ? ORDER BY date DESC LIMIT 500'
      : 'SELECT * FROM soumissions ORDER BY date DESC LIMIT 500';
    const res = await env.DB.prepare(requete)
      .bind(...(etat ? [etat] : []))
      .all();
    return json({
      ok: true,
      soumissions: res.results || [],
    });
  }
  if (request.method === 'POST') {
    const s = await exigerSession(request, env);
    if (s instanceof Response) return s;
    const body = await readBody(request);
    if (
      !body ||
      typeof body.id !== 'string' ||
      typeof body.q !== 'string' ||
      !Array.isArray(body.reponses) ||
      typeof body.bonne !== 'number' ||
      body.bonne < 0 ||
      body.bonne >= body.reponses.length
    )
      return jsonError('Soumission invalide.', 400);
    await env.DB.prepare(
      'INSERT INTO soumissions (id, pseudo, theme_id, q, reponses, bonne, niveau, info, etat, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET q = excluded.q, reponses = excluded.reponses, bonne = excluded.bonne, niveau = excluded.niveau, info = excluded.info, etat = excluded.etat, date = excluded.date'
    )
      .bind(
        body.id,
        normalizePseudo(s.pseudo), // pseudo forcé = compte du token
        typeof body.themeId === 'string' ? body.themeId : null,
        body.q.slice(0, 500),
        JSON.stringify(body.reponses).slice(0, 2000),
        body.bonne,
        typeof body.niveau === 'string' ? body.niveau : 'facile',
        typeof body.info === 'string' ? body.info.slice(0, 1000) : null,
        'attente',
        typeof body.date === 'string' ? body.date : new Date().toISOString()
      )
      .run();
    return json({
      ok: true,
      id: body.id,
    });
  }
  return jsonError('Méthode non supportée.', 405);
}

// --- Questions communautaires validées (GET /api/questions, session requise) ---
// Paginé : ?themeId=...&page=0&limit=50 (limit max 100). Renvoie uniquement les
// soumissions en etat='validee' (validées par un admin côté serveur), avec `reponses`
// parsé (JSON) — les lignes illisibles sont ignorées. `total` = nb total pour paginer.
export async function routeQuestionsCommunautaires(
  request: Request,
  env: Env,
  url: URL
): Promise<Response> {
  if (!env.DB) return jsonError('Base non configurée.', 503);
  const s = await exigerSession(request, env);
  if (s instanceof Response) return s;
  if (request.method !== 'GET') return jsonError('Méthode non supportée.', 405);
  const themeId = url.searchParams.get('themeId');
  const page = Math.max(0, parseInt(url.searchParams.get('page') || '0', 10) || 0);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50)
  );
  const offset = page * limit;
  const requete = themeId
    ? 'SELECT * FROM soumissions WHERE etat = ? AND theme_id = ? ORDER BY date DESC LIMIT ? OFFSET ?'
    : 'SELECT * FROM soumissions WHERE etat = ? ORDER BY date DESC LIMIT ? OFFSET ?';
  const params: (string | number)[] = themeId
    ? ['validee', themeId, limit, offset]
    : ['validee', limit, offset];
  const res = await env.DB.prepare(requete).bind(...params).all();
  const questions = (res.results || [])
    .map((r) => {
      try {
        return { ...r, reponses: JSON.parse(String(r.reponses)) };
      } catch {
        return null; // ligne illisible : ignorée
      }
    })
    .filter(Boolean);
  const totalRow = await env.DB.prepare(
    themeId
      ? 'SELECT COUNT(*) as n FROM soumissions WHERE etat = ? AND theme_id = ?'
      : 'SELECT COUNT(*) as n FROM soumissions WHERE etat = ?'
  )
    .bind(...(themeId ? ['validee', themeId] : ['validee']))
    .first<{ n: number }>();
  return json({
    ok: true,
    questions,
    total: totalRow?.n || 0,
    page,
    limit,
  });
}

// --- Validation/refus d'une soumission côté serveur (admin requis) ---
// POST /api/soumissions/valider  body { id } -> etat='validee' (servie par /api/questions)
// POST /api/soumissions/refuser  body { id } -> etat='refusee'
export async function routeSoumissionEtat(
  request: Request,
  env: Env,
  action: 'valider' | 'refuser'
): Promise<Response> {
  if (!env.DB) return jsonError('Base non configurée.', 503);
  const a = await exigerAdmin(request, env);
  if (a instanceof Response) return a;
  if (request.method !== 'POST') return jsonError('Méthode non supportée.', 405);
  const body = await readBody(request);
  if (!body || typeof body.id !== 'string') return jsonError('id requis.', 400);
  const etat = action === 'valider' ? 'validee' : 'refusee';
  await env.DB.prepare('UPDATE soumissions SET etat = ? WHERE id = ?').bind(etat, body.id).run();
  return json({
    ok: true,
    id: body.id,
    etat,
  });
}
