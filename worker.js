// worker.js — point d'entrée Cloudflare Worker de VoltQuiz.
//
// Avec `run_worker_first = true` (wrangler.toml), CHAQUE requête passe par ici :
// le Worker sert les fichiers statiques via le binding ASSETS (dist/client),
// pose les bons en-têtes pour la WPA, et laisse un endroit propre pour
// brancher plus tard une vraie API (V2 : duel en ligne, classements, etc.).

export default {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);

    // --- Service worker de la WPA : ne jamais le mettre en cache ---
    // (sinon le navigateur risque de garder une vieille version de sw.js)
    if (url.pathname === '/sw.js') {
      const r = await env.ASSETS.fetch(request);
      const headers = new Headers(r.headers);
      headers.set('Cache-Control', 'no-cache');
      headers.set('Service-Worker-Allowed', '/'); // autorise le scope racine
      return new Response(r.body, { status: r.status, headers });
    }

    // --- Petite API d'exemple (à développer en V2) ---
    // Teste-la avec : https://voltquiz.joris-leo81.workers.dev/api/ping
    if (url.pathname === '/api/ping') {
      return Response.json({
        ok: true,
        app: 'VoltQuiz',
        heure: new Date().toISOString(),
      });
    }

    // --- Fichiers statiques (contenu du dossier dist/client) ---
    const reponse = await env.ASSETS.fetch(request);

    // Les fichiers dans /assets/ ont un hash dans leur nom (index-CEb8GYjQ.js...) :
    // leur contenu ne change jamais, on autorise donc le cache navigateur 1 an.
    if (reponse.status === 200 && url.pathname.startsWith('/assets/')) {
      const headers = new Headers(reponse.headers);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      return new Response(reponse.body, { status: reponse.status, headers });
    }

    // --- Repli SPA : une URL sans extension qui ne correspond à aucun fichier
    //     renvoie index.html (comportement d'une appli monopage) ---
    if (reponse.status === 404 && request.method === 'GET') {
      const avecExtension = /\.[a-z0-9]{1,8}$/i.test(url.pathname);
      if (!avecExtension) {
        const index = await env.ASSETS.fetch(new URL('/index.html', url));
        return new Response(index.body, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
    }

    return reponse;
  },
};
