// worker.js — point d'entrée Cloudflare Worker de VoltQuiz.
//
// Avec `run_worker_first = true` (wrangler.toml), CHAQUE requête passe par ici :
// le Worker sert les fichiers statiques via le binding ASSETS (dist/client),
// pose les en-têtes de sécurité sur CHAQUE réponse (CSP d'abord en Report-Only,
// voir CSP_REPORT_ONLY dans wrangler.toml), gère le cache, et laisse un endroit
// propre pour l'API (V2 : duel en ligne, classements, sync D1 — voir le plan).

// --- En-têtes de sécurité appliqués à CHAQUE réponse ---
// estProd = variable ENVIRONMENT + hôte non local (localhost = dev Vite/HMR).
function entetesSecurite(env, hote = '') {
  const estLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(hote);
  const estProd = !estLocal && (env.ENVIRONMENT || 'production') === 'production';
  // En dev (localhost), Vite HMR a besoin de 'unsafe-inline'/'unsafe-eval' pour les scripts.
  const scriptSrc = estProd ? "'self'" : "'self' 'unsafe-inline' 'unsafe-eval'";
  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'", // styles inline React (attributs style)
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' ws: wss:", // HMR en dev, WebSocket V2 plus tard
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(estProd ? ['upgrade-insecure-requests'] : []),
  ].join('; ');

  const h = new Headers();
  // CSP d'abord en Report-Only (48 h d'observation) puis appliquée : CSP_REPORT_ONLY=true/false
  if (env.CSP_REPORT_ONLY === 'true' || !estProd) {
    h.set('Content-Security-Policy-Report-Only', `${csp}; report-uri /api/csp-report`);
  } else {
    h.set('Content-Security-Policy', csp);
  }
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('X-Frame-Options', 'DENY');
  h.set('Cross-Origin-Opener-Policy', 'same-origin');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  if (estProd) h.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  return h;
}

// Pose les en-têtes de sécurité + cache sur une réponse existante.
function securiser(reponse, env, cacheControl, hote = '') {
  const headers = new Headers(reponse.headers);
  for (const [cle, valeur] of entetesSecurite(env, hote)) headers.set(cle, valeur);
  if (cacheControl) headers.set('Cache-Control', cacheControl);
  return new Response(reponse.body, { status: reponse.status, statusText: reponse.statusText, headers });
}

// --- Rate limiting simple en mémoire (30 req/min/IP sur /api/*) ---
const fenetres = new Map(); // ip -> [timestamps]
function rateLimite(bee, ip) {
  const maintenant = Date.now();
  const fenetre = 60000;
  const liste = (fenetres.get(ip) || []).filter((t) => maintenant - t < fenetre);
  if (liste.length >= 30) return false;
  liste.push(maintenant);
  fenetres.set(ip, liste);
  if (fenetres.size > 5000) fenetres.clear(); // borne mémoire (redémarrage doux)
  return true;
}

export default {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);
    const ip = request.headers.get('cf-connecting-ip') || 'inconnu';

    // --- API ---
    if (url.pathname.startsWith('/api/')) {
      // Rate limiting : 30 requêtes/minute/IP, sinon 429.
      if (!rateLimite(env, ip)) {
        return new Response(JSON.stringify({ ok: false, erreur: 'Trop de requêtes, réessaie dans une minute.' }), {
          status: 429,
          headers: { ...Object.fromEntries(entetesSecurite(env, url.host)), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
      }

      // Ping / health (monitoring).
      if (url.pathname === '/api/ping' || url.pathname === '/api/health') {
        return Response.json(
          { ok: true, app: 'VoltQuiz', version: env.APP_VERSION || '0.1.0', heure: new Date().toISOString() },
          { headers: { ...Object.fromEntries(entetesSecurite(env, url.host)), 'Cache-Control': 'no-store' } }
        );
      }

      // Réception des rapports CSP (Report-Only) : on les accepte et on les ignore
      // (visibles via `npx wrangler tail`).
      if (url.pathname === '/api/csp-report' && request.method === 'POST') {
        await request.text().catch(() => '');
        return new Response(null, {
          status: 204,
          headers: { ...Object.fromEntries(entetesSecurite(env, url.host)), 'Cache-Control': 'no-store' },
        });
      }

      // Toute autre route API : 404 JSON propre (les routes V2 arrivent ici).
      return Response.json(
        { ok: false, erreur: 'Route API inconnue.' },
        { status: 404, headers: { ...Object.fromEntries(entetesSecurite(env, url.host)), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
      );
    }

    // --- Service worker de la WPA : ne jamais le mettre en cache ---
    if (url.pathname === '/sw.js') {
      const r = await env.ASSETS.fetch(request);
      return securiser(r, env, 'no-cache', url.host);
    }

    // --- Fichiers statiques (contenu du dossier dist/client) ---
    const reponse = await env.ASSETS.fetch(request);

    // Les fichiers dans /assets/ ont un hash dans leur nom : leur contenu ne
    // change jamais, on autorise donc le cache navigateur 1 an.
    if (reponse.status === 200 && url.pathname.startsWith('/assets/')) {
      return securiser(reponse, env, 'public, max-age=31536000, immutable', url.host);
    }

    // --- Repli SPA : une URL sans extension qui ne correspond à aucun fichier
    //     renvoie index.html (comportement d'une appli monopage) ---
    if (reponse.status === 404 && request.method === 'GET') {
      const avecExtension = /\.[a-z0-9]{1,8}$/i.test(url.pathname);
      if (!avecExtension) {
        const index = await env.ASSETS.fetch(new URL('/index.html', url));
        return securiser(index, env, 'no-cache', url.host);
      }
    }

    // index.html, manifest, JSON perso, icônes : jamais de cache agressif.
    if (reponse.status === 200 && (url.pathname === '/' || url.pathname === '/index.html' || url.pathname.endsWith('.json') || url.pathname.endsWith('.webmanifest'))) {
      return securiser(reponse, env, 'no-cache', url.host);
    }

    return securiser(reponse, env, reponse.status === 200 ? 'public, max-age=3600' : undefined, url.host);
  },
};
