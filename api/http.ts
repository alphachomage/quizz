/* global Env */
// api/http.ts — helpers HTTP partagés : réponses JSON, lecture de body bornée, CORS.

export function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...extra,
    },
  });
}
export function jsonError(error: string, status = 400): Response {
  return json(
    {
      ok: false,
      error: error,
    },
    status
  );
}
export const MAX_BODY = 64 * 1024; // 64 Ko max par body JSON (anti-gros payloads)
// Les grosses clés sync (ex. voltquiz_parties = historique des 500 dernières parties avec
// le détail des questions) dépassent 64 Ko : plafond spécifique pour /api/kv.
export const MAX_BODY_SYNC = 1024 * 1024; // 1 Mo max pour /api/kv (table sync_client)

export async function readBody(
  request: Request,
  max = MAX_BODY
): Promise<Record<string, unknown> | null> {
  try {
    const text = await request.text();
    if (text.length > max) return null; // -> 400 côté appelant
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// --- CORS : autorise same-origin + les origines de ALLOWED_ORIGINS (env) ---
export function originesAutorisees(env: Env, url: URL): string[] {
  const list = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [url.origin, ...list];
}
export function corsAutorise(request: Request, env: Env, url: URL): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return true; // même origine / pas de navigateur (curl, Capacitor natif)
  return originesAutorisees(env, url).includes(origin);
}
export function entetesCors(request: Request, env: Env, url: URL): Record<string, string> {
  const origin = request.headers.get('Origin');
  const h: Record<string, string> = {};
  if (origin && corsAutorise(request, env, url)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Vary'] = 'Origin';
    h['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}
