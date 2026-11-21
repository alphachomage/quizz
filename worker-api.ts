/* global Env */
// worker-api.ts — mini-routeur /api/* de VoltQuiz (zéro dépendance), importé par worker.ts.
// Préparé pour la V2 (comptes serveur, parties, records, XP, rooms de duel) :
// toutes les routes sont fonctionnelles si les bindings D1/KV/DO sont configurés.
// En attendant, le client reste 100 % local (voir src/lib/api.ts + lib/storage.ts).
// Types du runtime (Env, D1Database, KVNamespace...) : durable-objects/workers-env.d.ts.

// --- Helpers ---
function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...extra,
    },
  });
}
function jsonError(error: string, status = 400): Response {
  return json(
    {
      ok: false,
      error: error,
    },
    status
  );
}
const MAX_BODY = 64 * 1024; // 64 Ko max par body JSON (anti-gros payloads)

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return null; // -> 400 côté appelant
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// --- CORS : autorise same-origin + les origines de ALLOWED_ORIGINS (env) ---
function originesAutorisees(env: Env, url: URL): string[] {
  const list = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [url.origin, ...list];
}
function corsAutorise(request: Request, env: Env, url: URL): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return true; // même origine / pas de navigateur (curl, Capacitor natif)
  return originesAutorisees(env, url).includes(origin);
}
function entetesCors(request: Request, env: Env, url: URL): Record<string, string> {
  const origin = request.headers.get('Origin');
  const h: Record<string, string> = {};
  if (origin && corsAutorise(request, env, url)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Vary'] = 'Origin';
    h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}

// Comparaison de hash en temps constant (évite l'oracle de timing sur le login).
function hashesEqual(a: string, b: string): boolean {
  const A = new TextEncoder().encode(a);
  const B = new TextEncoder().encode(b);
  if (A.length !== B.length) return false;
  return crypto.subtle.timingSafeEqual(A, B);
}

// --- KV générique (sync du stockage local -> serveur) ---
async function routeKv(request: Request, env: Env, key: string): Promise<Response> {
  if (!key) return jsonError('Clé manquante.', 400);
  if (request.method === 'GET') {
    const brut = env.DB ? await kvViaD1Get(env, key) : null;
    return json({
      ok: true,
      key,
      value: brut,
    });
  }
  if (request.method === 'POST') {
    const body = await readBody(request);
    if (!body || !('valeur' in body)) return jsonError('Valeur manquante.', 400);
    if (env.DB) await kvViaD1Set(env, key, body.value);
    return json({
      ok: true,
      key,
    });
  }
  return jsonError('Méthode non supportée.', 405);
}

// KV stocké dans D1 (table kv) si le binding DB existe.
async function kvViaD1Get(env: Env, key: string): Promise<unknown> {
  const row = await env.DB.prepare('SELECT valeur FROM kv WHERE cle = ?')
    .bind(key)
    .first<{ valeur: string }>();
  return row ? JSON.parse(row.valeur) : null;
}
async function kvViaD1Set(env: Env, key: string, value: unknown): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO kv (cle, valeur) VALUES (?, ?) ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur'
  )
    .bind(key, JSON.stringify(value))
    .run();
}

// --- Auth : inscription / connexion (PBKDF2 210 000 itérations côté serveur) ---
const PBKDF2_ITERATIONS = 210000;
async function pbkdf2(password: string, sel: string): Promise<string> {
  const data = new TextEncoder().encode(`${sel}::${password}`);
  const key = await crypto.subtle.importKey('raw', data, 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(sel),
      iterations: PBKDF2_ITERATIONS,
    },
    key,
    256
  );
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function normalizePseudo(p: unknown): string {
  return String(p || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}
// Ligne de la table D1 `comptes` (schéma : migrations/0001_init.sql).
interface CompteRow {
  pseudo: string;
  pseudo_normalise: string;
  email: string | null;
  hash: string;
  sel: string;
  hash_version: number;
  cree_le: string | null;
  dernier_login: string | null;
}
async function routeAuth(
  request: Request,
  env: Env,
  action: string | undefined
): Promise<Response> {
  const body = await readBody(request);
  if (!body || !body.pseudo || !body.password)
    return jsonError('Pseudo et mot de passe requis.', 400);
  if (!env.DB) return jsonError('Base non configurée (binding DB manquant).', 503);
  const pseudo = String(body.pseudo).slice(0, 20);
  const n = normalizePseudo(pseudo);
  if (action === 'inscription') {
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(body.email)))
      return jsonError('E-mail invalide.', 400);
    if (String(body.password).length < 8)
      return jsonError('Mot de passe : 8 caractères minimum.', 400);
    const exists = await env.DB.prepare('SELECT pseudo FROM comptes WHERE pseudo_normalise = ?')
      .bind(n)
      .first();
    if (exists) return jsonError('Ce pseudo est déjà pris.', 409);
    const sel = crypto.randomUUID();
    const hash = await pbkdf2(String(body.password), sel);
    const now = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO comptes (pseudo, pseudo_normalise, email, hash, sel, hash_version, cree_le, dernier_login) VALUES (?, ?, ?, ?, ?, 2, ?, ?)'
    )
      .bind(pseudo, n, body.email, hash, sel, now, now)
      .run();
    return json({
      ok: true,
      pseudo,
    });
  }
  if (action === 'connexion') {
    const account = await env.DB.prepare('SELECT * FROM comptes WHERE pseudo_normalise = ?')
      .bind(n)
      .first<CompteRow>();
    if (!account) return jsonError('Aucun compte avec ce pseudo.', 404);
    const hash = await pbkdf2(String(body.password), account.sel);
    if (!hashesEqual(hash, account.hash)) return jsonError('Mot de passe incorrect.', 401);
    await env.DB.prepare('UPDATE comptes SET dernier_login = ? WHERE pseudo = ?')
      .bind(new Date().toISOString(), account.pseudo)
      .run();
    return json({
      ok: true,
      pseudo: account.pseudo,
    });
  }
  return jsonError('Action inconnue.', 404);
}

// --- Parties / records / XP (D1) ---
async function routeGames(request: Request, env: Env, url: URL): Promise<Response> {
  if (!env.DB) return jsonError('Base non configurée.', 503);
  if (request.method === 'GET') {
    const pseudo = url.searchParams.get('pseudo');
    const requete = pseudo
      ? 'SELECT * FROM parties WHERE joueurs LIKE ? ORDER BY date DESC LIMIT 500'
      : 'SELECT * FROM parties ORDER BY date DESC LIMIT 500';
    const params = pseudo ? [`%${normalizePseudo(pseudo)}%`] : [];
    const res = await env.DB.prepare(requete)
      .bind(...params)
      .all();
    return json({
      ok: true,
      games: res.results || [],
    });
  }
  if (request.method === 'POST') {
    const p = await readBody(request);
    if (!p || !p.mode) return jsonError('Partie invalide.', 400);
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO parties (id, mode, niveau, theme_id, joueurs, scores, bonnes, total, details, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(
        id,
        p.mode,
        p.niveau || null,
        p.themeId || null,
        JSON.stringify(p.players || []),
        JSON.stringify(p.scores || []),
        JSON.stringify(p.bonnes || []),
        p.total || 0,
        JSON.stringify(p.details || []),
        p.date || new Date().toISOString()
      )
      .run();
    return json({
      ok: true,
      id,
    });
  }
  return jsonError('Méthode non supportée.', 405);
}
async function routeRecords(
  request: Request,
  env: Env,
  url: URL,
  key: string | null
): Promise<Response> {
  if (!env.DB) return jsonError('Base non configurée.', 503);
  if (request.method === 'GET' && key) {
    const row = await env.DB.prepare('SELECT * FROM records WHERE cle = ?').bind(key).first();
    return json({
      ok: true,
      record: row || null,
    });
  }
  if (request.method === 'POST') {
    const body = await readBody(request);
    if (!body || !body.key || typeof body.value !== 'number')
      return jsonError('cle + valeur requis.', 400);
    await env.DB.prepare(
      'INSERT INTO records (cle, valeur, pseudo, date) VALUES (?, ?, ?, ?) ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur, pseudo = excluded.pseudo, date = excluded.date'
    )
      .bind(body.key, body.value, body.pseudo || null, new Date().toISOString())
      .run();
    return json({
      ok: true,
    });
  }
  return jsonError('Méthode non supportée.', 405);
}
async function routeXp(
  request: Request,
  env: Env,
  url: URL,
  pseudo: string | null,
  themeId: string | null
): Promise<Response> {
  if (!env.DB) return jsonError('Base non configurée.', 503);
  if (request.method === 'GET' && pseudo && themeId) {
    const row = await env.DB.prepare('SELECT xp FROM xp WHERE pseudo_theme = ?')
      .bind(`${pseudo}:${themeId}`)
      .first<{ xp: number }>();
    return json({
      ok: true,
      xp: row ? row.xp : 0,
    });
  }
  if (request.method === 'POST') {
    const body = await readBody(request);
    if (!body || !body.pseudo || !body.themeId || typeof body.xp !== 'number')
      return jsonError('pseudo, themeId, xp requis.', 400);
    await env.DB.prepare(
      'INSERT INTO xp (pseudo_theme, xp) VALUES (?, ?) ON CONFLICT(pseudo_theme) DO UPDATE SET xp = excluded.xp'
    )
      .bind(`${body.pseudo}:${body.themeId}`, body.xp)
      .run();
    return json({
      ok: true,
    });
  }
  return jsonError('Méthode non supportée.', 405);
}

// --- Rooms de duel éphémères (KV) ---
async function routeRoom(
  request: Request,
  env: Env,
  url: URL,
  segment: string | null
): Promise<Response> {
  if (!env.ROOMS) return jsonError('KV ROOMS non configuré.', 503);
  if (request.method === 'POST' && !segment) {
    const body = await readBody(request);
    const id = crypto.randomUUID().slice(0, 8);
    await env.ROOMS.put(
      `room:${id}`,
      JSON.stringify({
        id,
        createur: body?.pseudo || null,
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

// --- Compteurs en mémoire de l'isolate (remis à zéro au redémarrage du Worker) ---
// Exposés via /api/stats pour le tableau de bord admin : rapports CSP reçus et
// hits du rate-limit (429, incrémenté dans worker.ts).
const internalCounters = {
  rapportsCsp: 0,
  hits429: 0,
};

// --- Routeur principal ---
export { internalCounters };
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

  // Portes V2 : tant que V2_ENABLED n'est pas "true", seules les routes de santé
  // (ping/health/csp-report) répondent — les routes D1/KV/DO renvoient 503.
  const ROUTES_OUVERTES = ['/api/ping', '/api/health', '/api/csp-report'];
  if (env.V2_ENABLED !== 'true' && !ROUTES_OUVERTES.includes(p)) {
    return jsonError('V2 non active sur ce déploiement.', 503);
  }
  if (p === '/api/ping' || p === '/api/health') {
    return json({
      ok: true,
      app: 'VoltQuiz',
      version: env.APP_VERSION || '0.1.0',
      v2: env.V2_ENABLED === 'true',
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
  // Stats V2 pour le tableau de bord admin (?admin=1) : gated V2 comme les autres
  // routes -> 503 « V2 non active » si V2_ENABLED n'est pas "true".
  if (p === '/api/stats' && request.method === 'GET') {
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
      v2: env.V2_ENABLED === 'true',
      rooms,
      rapportsCsp: internalCounters.rapportsCsp,
      hits429: internalCounters.hits429,
      hour: new Date().toISOString(),
    });
  }
  if (p.startsWith('/api/kv/'))
    return routeKv(request, env, decodeURIComponent(p.slice('/api/kv/'.length)));
  if (p === '/api/auth/inscription' || p === '/api/auth/connexion') {
    return routeAuth(request, env, p.split('/').pop());
  }
  if (p === '/api/parties') return routeGames(request, env, url);
  if (p.startsWith('/api/records/'))
    return routeRecords(request, env, url, decodeURIComponent(p.slice('/api/records/'.length)));
  if (p === '/api/records') return routeRecords(request, env, url, null);
  if (p.startsWith('/api/xp/')) {
    const [, , , pseudo, themeId] = p.split('/');
    return routeXp(
      request,
      env,
      url,
      decodeURIComponent(pseudo || ''),
      decodeURIComponent(themeId || '')
    );
  }
  if (p === '/api/xp') return routeXp(request, env, url, null, null);
  if (p === '/api/room' || p === '/api/room/rejoindre' || p.startsWith('/api/room/')) {
    const segment =
      p === '/api/room'
        ? null
        : p === '/api/room/rejoindre'
          ? 'rejoindre'
          : p.slice('/api/room/'.length);
    return routeRoom(request, env, url, segment ? decodeURIComponent(segment) : null);
  }
  // WebSocket du duel : délégué au Durable Object DuelRoom (binding DUEL_ROOMS).
  if (p.startsWith('/api/duel/')) {
    const roomId = decodeURIComponent(p.slice('/api/duel/'.length));
    if (!env.DUEL_ROOMS) return jsonError('Durable Object DUEL_ROOMS non configuré.', 503);
    const id = env.DUEL_ROOMS.idFromName(roomId);
    return env.DUEL_ROOMS.get(id).fetch(request);
  }
  return jsonError('Route API inconnue.', 404);
}
