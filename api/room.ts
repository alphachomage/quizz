/* global Env */
// api/room.ts — rooms de duel éphémères (KV) et proxy WebSocket vers le Durable Object.
import { json, jsonError, readBody } from './http.js';
import { exigerSession, sessionValideParToken } from './session.js';

// --- Rooms de duel éphémères (KV) — session requise ---
export async function routeRoom(
  request: Request,
  env: Env,
  url: URL,
  segment: string | null
): Promise<Response> {
  if (!env.ROOMS) return jsonError('KV ROOMS non configuré.', 503);
  const s = await exigerSession(request, env);
  if (s instanceof Response) return s;
  if (request.method === 'POST' && !segment) {
    const id = crypto.randomUUID().slice(0, 8);
    await env.ROOMS.put(
      `room:${id}`,
      JSON.stringify({
        id,
        createur: s.pseudo, // compte du token
        createdAt: new Date().toISOString(),
      }),
      {
        expirationTtl: 3600,
      }
    );
    return json({
      ok: true,
      id,
    });
  }
  if (request.method === 'POST' && segment === 'rejoindre') {
    const body = await readBody(request);
    if (!body || !body.id) return jsonError('id de room requis.', 400);
    const brut = await env.ROOMS.get(`room:${body.id}`);
    if (!brut) return jsonError('Room inconnue ou expirée.', 404);
    return json({
      ok: true,
      room: JSON.parse(brut),
    });
  }
  if (request.method === 'GET' && segment) {
    const brut = await env.ROOMS.get(`room:${segment}`);
    if (!brut) return jsonError('Room inconnue ou expirée.', 404);
    return json({
      ok: true,
      room: JSON.parse(brut),
    });
  }
  return jsonError('Route room invalide.', 404);
}

// WebSocket du duel : délégué au Durable Object DuelRoom (binding DUEL_ROOMS).
// Session requise via ?token= (un WebSocket navigateur ne peut pas poser de header
// Authorization custom) — vérifiée AVANT l'upgrade 101. Le pseudo du joueur est
// forcé = celui du token : il est posé en header x-voltquiz-pseudo sur la requête
// forwardée au DO (jamais pris de la query string, un client ne peut pas usurper
// l'identité d'un autre joueur dans la room).
export async function routeDuel(request: Request, env: Env, url: URL): Promise<Response> {
  const roomId = decodeURIComponent(url.pathname.slice('/api/duel/'.length));
  const pseudo = await sessionValideParToken(url.searchParams.get('token'), env);
  if (!pseudo) return jsonError('Session requise pour le duel.', 401);
  if (!env.DUEL_ROOMS) return jsonError('Durable Object DUEL_ROOMS non configuré.', 503);
  const id = env.DUEL_ROOMS.idFromName(roomId);
  const headers = new Headers(request.headers);
  headers.set('x-voltquiz-pseudo', pseudo);
  const reqDo = new Request(request, { headers });
  return env.DUEL_ROOMS.get(id).fetch(reqDo);
}
