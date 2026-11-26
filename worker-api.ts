/* global Env */
// worker-api.ts — mini-routeur /api/* de VQuizz (zéro dépendance), importé par worker.ts.
// Routeur fin : la logique de chaque route vit dans api/ (http, session, crypto, kv, auth,
// games, classement, progression, soumissions, admin, room, stats).
// La base D1 est le stockage par défaut (plus de porte V2_ENABLED) : toutes les routes
// répondent dès que les bindings sont présents ; une route renvoie 503 « binding
// manquant » si D1/KV/DO n'est pas configuré (voir chaque handler).
// Tables D1 (migrations/) : sync_client (miroir des clés localStorage), comptes,
// parties, records, xp, soumissions. KV ROOMS + DO DUEL_ROOMS = duel en ligne (préparé).
// Types du runtime (Env, D1Database, KVNamespace...) : durable-objects/workers-env.d.ts.
import { json, jsonError, corsAutorise, entetesCors } from './api/http.js';
import { routeKv } from './api/kv.js';
import { routeAuth } from './api/auth.js';
import { routeGames } from './api/games.js';
import { routeClassement } from './api/classement.js';
import { routeRecords, routeXp } from './api/progression.js';
import { routeSoumissions, routeQuestionsCommunautaires, routeSoumissionEtat } from './api/soumissions.js';
import { routeAdminCheck } from './api/admin.js';
import { routeRoom, routeDuel } from './api/room.js';
import { routeStats, internalCounters } from './api/stats.js';

// Ré-export public : worker.ts et les tests importent depuis worker-api.
export { internalCounters };

// --- Routeur principal ---
export async function apiRouter(request: Request, env: Env, url: URL): Promise<Response> {
  const p = url.pathname; // ex: /api/kv/xxx

  // Preflight CORS (appli mobile Capacitor = autre origine).
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...entetesCors(request, env, url),
        'Cache-Control': 'no-store',
      },
    });
  }

  // Les écritures cross-origin sont refusées sauf origine autorisée (ALLOWED_ORIGINS).
  if (request.method !== 'GET' && !corsAutorise(request, env, url)) {
    return jsonError('Origine non autorisée.', 403);
  }

  // Plus de porte V2_ENABLED : la base D1 est le stockage par défaut. Les routes de
  // santé répondent toujours ; chaque route métier renvoie 503 si son binding manque.
  if (p === '/api/ping' || p === '/api/health') {
    return json({
      ok: true,
      app: 'VQuizz',
      version: env.APP_VERSION || '0.1.0',
      hour: new Date().toISOString(),
    });
  }
  if (p === '/api/csp-report' && request.method === 'POST') {
    await request.text().catch(() => '');
    internalCounters.rapportsCsp += 1;
    return new Response(null, {
      status: 204,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }
  // Stats admin (session requise) : voir api/stats.ts.
  if (p === '/api/stats' && request.method === 'GET') return routeStats(request, env);
  if (p === '/api/admin/check') return routeAdminCheck(request, env);
  if (p === '/api/questions') return routeQuestionsCommunautaires(request, env, url);
  if (p === '/api/soumissions/valider') return routeSoumissionEtat(request, env, 'valider');
  if (p === '/api/soumissions/refuser') return routeSoumissionEtat(request, env, 'refuser');
  if (p === '/api/soumissions') return routeSoumissions(request, env, url);
  if (p.startsWith('/api/kv/'))
    return routeKv(request, env, decodeURIComponent(p.slice('/api/kv/'.length)));
  if (p === '/api/auth/inscription' || p === '/api/auth/connexion') {
    return routeAuth(request, env, p.split('/').pop());
  }
  if (p === '/api/parties') return routeGames(request, env, url);
  if (p === '/api/classement') return routeClassement(request, env, url);
  if (p.startsWith('/api/records/'))
    return routeRecords(request, env, url, decodeURIComponent(p.slice('/api/records/'.length)));
  if (p === '/api/records') return routeRecords(request, env, url, null);
  if (p.startsWith('/api/xp/')) {
    // /api/xp/<pseudo>/<themeId> : le segment <pseudo> est ignoré côté serveur
    // (le pseudo vient du token Bearer dans routeXp — jamais de la confiance à l'URL).
    const [, , , , themeId] = p.split('/');
    return routeXp(request, env, url, decodeURIComponent(themeId || ''));
  }
  if (p === '/api/xp') return routeXp(request, env, url, null);
  if (p === '/api/room' || p === '/api/room/rejoindre' || p.startsWith('/api/room/')) {
    const segment =
      p === '/api/room'
        ? null
        : p === '/api/room/rejoindre'
          ? 'rejoindre'
          : p.slice('/api/room/'.length);
    return routeRoom(request, env, url, segment ? decodeURIComponent(segment) : null);
  }
  // WebSocket du duel : session via ?token= vérifiée dans routeDuel (api/room.ts).
  if (p.startsWith('/api/duel/')) return routeDuel(request, env, url);
  return jsonError('Route API inconnue.', 404);
}
