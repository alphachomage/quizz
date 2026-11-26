/* global Env */
// api/kv.ts — sync générique localStorage <-> D1 (/api/kv/*).
import { json, jsonError, readBody, MAX_BODY_SYNC } from './http.js';
import { exigerSession } from './session.js';

// --- Sync générique (miroir serveur du localStorage -> table D1 sync_client) ---
// Session requise + NAMESPACING par compte : la clé réelle en base est
// "<pseudo>:<cle>" — un client ne peut lire/écrire que SON espace, jamais celui
// d'un autre (les clés voltquiz_* seules ne donnent accès à rien sans token valide).
export async function routeKv(request: Request, env: Env, key: string): Promise<Response> {
  if (!key) return jsonError('Clé manquante.', 400);
  const s = await exigerSession(request, env);
  if (s instanceof Response) return s;
  const cleReelle = `${s.pseudo}:${key}`;
  if (request.method === 'GET') {
    const brut = await syncViaD1Get(env, cleReelle);
    return json({
      ok: true,
      key,
      value: brut,
    });
  }
  if (request.method === 'POST') {
    const body = await readBody(request, MAX_BODY_SYNC);
    if (!body || !('value' in body) || body.value === undefined) return jsonError('Valeur manquante.', 400);
    await syncViaD1Set(env, cleReelle, body.value);
    return json({
      ok: true,
      key,
    });
  }
  if (request.method === 'DELETE') {
    await syncViaD1Delete(env, cleReelle);
    return json({
      ok: true,
      key,
    });
  }
  return jsonError('Méthode non supportée.', 405);
}

// sync_client = table D1 cle/valeur (JSON) qui miroir les clés localStorage du client.
async function syncViaD1Get(env: Env, key: string): Promise<unknown> {
  const row = await env.DB.prepare('SELECT valeur FROM sync_client WHERE cle = ?')
    .bind(key)
    .first<{ valeur: string }>();
  return row ? JSON.parse(row.valeur) : null;
}
async function syncViaD1Set(env: Env, key: string, value: unknown): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO sync_client (cle, valeur) VALUES (?, ?) ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur'
  )
    .bind(key, JSON.stringify(value))
    .run();
}
async function syncViaD1Delete(env: Env, key: string): Promise<void> {
  await env.DB.prepare('DELETE FROM sync_client WHERE cle = ?').bind(key).run();
}
