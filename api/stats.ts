/* global Env */
// api/stats.ts — compteurs en mémoire de l'isolate et route /api/stats.
import { json } from './http.js';
import { exigerSession } from './session.js';

// --- Compteurs en mémoire de l'isolate (remis à zéro au redémarrage du Worker) ---
// Exposés via /api/stats pour le tableau de bord admin : rapports CSP reçus et
// hits du rate-limit (429, incrémenté dans worker.ts).
export const internalCounters = {
  rapportsCsp: 0,
  hits429: 0,
};


// Stats pour le tableau de bord admin (?admin=1) : rooms KV, rapports CSP, hits 429.
// Session requise (n'importe quel compte connecté).
export async function routeStats(request: Request, env: Env): Promise<Response> {
  const s = await exigerSession(request, env);
  if (s instanceof Response) return s;
  let rooms = 0;
  if (env.ROOMS) {
    try {
      rooms = (
        await env.ROOMS.list({
          prefix: 'room:',
        })
      ).keys.length;
    } catch {
      rooms = 0; // KV indisponible : on affiche 0 plutôt que de planter
    }
  }
  return json({
    ok: true,
    rooms,
    rapportsCsp: internalCounters.rapportsCsp,
    hits429: internalCounters.hits429,
    hour: new Date().toISOString(),
  });
}
