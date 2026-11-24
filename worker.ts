/* global Env, ExecutionContext */
// worker.ts — point d'entrée Cloudflare Worker de VQuizz.
//
// Avec `run_worker_first = true` (wrangler.toml), CHAQUE requête passe par ici :
// le Worker sert les fichiers statiques via le binding ASSETS (dist/client),
// pose les en-têtes de sécurité sur CHAQUE réponse (CSP d'abord en Report-Only,
// voir CSP_REPORT_ONLY dans wrangler.toml), gère le cache, et route l'API
// (/api/*, voir worker-api.ts : base D1 par défaut — sync_client, comptes, parties,
// records, XP, soumissions — + rooms de duel KV/DO).
// Les types du runtime (Env, Fetcher, D1Database...) sont déclarés localement dans
// durable-objects/workers-env.d.ts (pas de @cloudflare/workers-types, règle 8).

// --- En-têtes de sécurité appliqués à CHAQUE réponse ---
// estProd = variable ENVIRONMENT + hôte non local (localhost = dev Vite/HMR).
function securityHeaders(env: Env, hote = ''): Headers {
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(hote);
  const isProd = !isLocal && (env.ENVIRONMENT || 'production') === 'production';
  // En dev (localhost), Vite HMR a besoin de 'unsafe-inline'/'unsafe-eval' pour les scripts.
  const scriptSrc = isProd ? "'self'" : "'self' 'unsafe-inline' 'unsafe-eval'";
  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    // styles inline React (attributs style)
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // Prod : connect-src 'self' suffit (le wss:// vers la même origine est couvert par 'self').
    // Dev : on autorise ws:/wss: pour le HMR Vite.
    isProd ? "connect-src 'self'" : "connect-src 'self' ws: wss:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProd ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
  const h = new Headers();
  // CSP : en Report-Only tant que CSP_REPORT_ONLY=true (ou en dev local pour le HMR) ;
  // appliquée en prod (CSP_REPORT_ONLY=false) AVEC un second header Report-Only qui
  // continue de remonter les violations sur /api/csp-report pour surveiller.
  if (env.CSP_REPORT_ONLY === 'true' || !isProd) {
    h.set('Content-Security-Policy-Report-Only', `${csp}; report-uri /api/csp-report`);
  } else {
    h.set('Content-Security-Policy', csp);
    h.set('Content-Security-Policy-Report-Only', `${csp}; report-uri /api/csp-report`);
  }
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('X-Frame-Options', 'DENY');
  h.set('Cross-Origin-Opener-Policy', 'same-origin');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  if (isProd) h.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  return h;
}

// Pose les en-têtes de sécurité + cache sur une réponse existante.
function secure(answer: Response, env: Env, cacheControl?: string, hote = ''): Response {
  // Réponse 101 (WebSocket upgrade) : on recrée la Response SANS body mais en copiant
  // la propriété webSocket, sinon le socket est perdu côté workerd.
  if (answer.status === 101 && answer.webSocket) {
    const headers = new Headers();
    for (const [key, value] of securityHeaders(env, hote)) headers.set(key, value);
    headers.set('Cache-Control', 'no-store');
    return new Response(null, {
      status: 101,
      webSocket: answer.webSocket,
      headers,
    });
  }
  const headers = new Headers(answer.headers);
  for (const [key, value] of securityHeaders(env, hote)) headers.set(key, value);
  if (cacheControl) headers.set('Cache-Control', cacheControl);
  return new Response(answer.body, {
    status: answer.status,
    statusText: answer.statusText,
    headers,
  });
}

// --- Rate limiting simple en mémoire (30 req/min/IP sur /api/*, 5/min sur /api/auth/*
// contre le brute-force de mots de passe) ---
const fenetres = new Map<string, number[]>(); // ip -> [timestamps]
function rateLimite(bee: Env, ip: string, limite = 30): boolean {
  const now = Date.now();
  const fenetre = 60000;
  const list = (fenetres.get(ip) || []).filter((t) => now - t < fenetre);
  if (list.length >= limite) return false;
  list.push(now);
  fenetres.set(ip, list);
  if (fenetres.size > 5000) fenetres.clear(); // borne mémoire (redémarrage doux)
  return true;
}
import { apiRouter, internalCounters } from './worker-api.js';
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const ip = request.headers.get('cf-connecting-ip') || 'inconnu';

    // --- API : rate limiting (30 req/min/IP, 5/min sur /api/auth/*) puis routeur ---
    if (url.pathname.startsWith('/api/')) {
      const limite = url.pathname.startsWith('/api/auth/') ? 5 : 30;
      if (!rateLimite(env, ip, limite)) {
        internalCounters.hits429 += 1; // exposé via /api/stats (tableau de bord admin)
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'Trop de requêtes, réessaie dans une minute.',
          }),
          {
            status: 429,
            headers: {
              ...Object.fromEntries(securityHeaders(env, url.host)),
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store',
            },
          }
        );
      }
      const apiResponse = await apiRouter(request, env, url);
      return secure(apiResponse, env, 'no-store', url.host);
    }

    // --- Service worker de la WPA : ne jamais le mettre en cache ---
    if (url.pathname === '/sw.js') {
      const r = await env.ASSETS.fetch(request);
      const rep = secure(r, env, 'no-cache', url.host);
      rep.headers.set('Service-Worker-Allowed', '/'); // autorise le scope racine
      return rep;
    }

    // --- Fichiers statiques (contenu du dossier dist/client) ---
    const answer = await env.ASSETS.fetch(request);

    // Les fichiers dans /assets/ ont un hash dans leur nom : leur contenu ne
    // change jamais, on autorise donc le cache navigateur 1 an.
    if (answer.status === 200 && url.pathname.startsWith('/assets/')) {
      return secure(answer, env, 'public, max-age=31536000, immutable', url.host);
    }

    // --- Repli SPA : une URL sans extension qui ne correspond à aucun fichier
    //     renvoie index.html (comportement d'une appli monopage) ---
    if (answer.status === 404 && request.method === 'GET') {
      const hasExtension = /\.[a-z0-9]{1,8}$/i.test(url.pathname);
      if (!hasExtension) {
        const index = await env.ASSETS.fetch(new URL('/index.html', url));
        return secure(index, env, 'no-cache', url.host);
      }
    }

    // index.html, manifest, JSON personal, icônes : jamais de cache agressif.
    if (
      answer.status === 200 &&
      (url.pathname === '/' ||
        url.pathname === '/index.html' ||
        url.pathname.endsWith('.json') ||
        url.pathname.endsWith('.webmanifest'))
    ) {
      return secure(answer, env, 'no-cache', url.host);
    }
    return secure(
      answer,
      env,
      answer.status === 200 ? 'public, max-age=3600' : undefined,
      url.host
    );
  },
};

// Classe Durable Object exportée (requise par wrangler pour le binding DUEL_ROOMS).
export { DuelRoom } from './durable-objects/DuelRoom.js';
