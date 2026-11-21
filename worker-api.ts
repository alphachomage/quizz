/* global Env */
// worker-api.ts — mini-routeur /api/* de VoltQuiz (zéro dépendance), importé par worker.ts.
// La base D1 est le stockage par défaut (plus de porte V2_ENABLED) : toutes les routes
// répondent dès que les bindings sont présents ; une route renvoie 503 « binding
// manquant » si D1/KV/DO n'est pas configuré (voir chaque handler).
// Tables D1 (migrations/) : sync_client (miroir des clés localStorage), comptes,
// parties, records, xp, soumissions. KV ROOMS + DO DUEL_ROOMS = duel en ligne (préparé).
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
// Les grosses clés sync (ex. voltquiz_parties = historique des 500 dernières parties avec
// le détail des questions) dépassent 64 Ko : plafond spécifique pour /api/kv.
const MAX_BODY_SYNC = 1024 * 1024; // 1 Mo max pour /api/kv (table sync_client)

async function readBody(
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
    h['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, OPTIONS';
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

// --- Sync générique (miroir serveur du localStorage -> table D1 sync_client) ---
// Session requise + NAMESPACING par compte : la clé réelle en base est
// "<pseudo>:<cle>" — un client ne peut lire/écrire que SON espace, jamais celui
// d'un autre (les clés voltquiz_* seules ne donnent accès à rien sans token valide).
async function routeKv(request: Request, env: Env, key: string): Promise<Response> {
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

// --- Sessions serveur : token Bearer renvoyé par /api/auth/*, vérifié sur toutes les
// routes de données. Une session par compte (la connexion révoque l'ancienne). ---
const DUREE_SESSION_MS = 30 * 24 * 3600 * 1000; // 30 jours
async function creerSession(env: Env, pseudo: string): Promise<string> {
  const token = crypto.randomUUID() + crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare('DELETE FROM sessions WHERE pseudo = ?').bind(pseudo).run();
  await env.DB.prepare(
    'INSERT INTO sessions (token, pseudo, cree_le, expire_le) VALUES (?, ?, ?, ?)'
  )
    .bind(token, pseudo, new Date(now).toISOString(), new Date(now + DUREE_SESSION_MS).toISOString())
    .run();
  return token;
}

// Lit le token Bearer et renvoie le pseudo associé (ou null si absent/invalide/expiré).
async function sessionValide(request: Request, env: Env): Promise<string | null> {
  const m = /^Bearer (.+)$/.exec(request.headers.get('Authorization') || '');
  if (!m || !env.DB) return null;
  const row = await env.DB
    .prepare('SELECT pseudo, expire_le FROM sessions WHERE token = ?')
    .bind(m[1])
    .first<{ pseudo: string; expire_le: string }>();
  if (!row || new Date(row.expire_le).getTime() < Date.now()) return null;
  return row.pseudo;
}
// Variante pour le WebSocket (pas de header custom en navigateur) : token en query ?token=.
async function sessionValideParToken(token: string | null, env: Env): Promise<string | null> {
  if (!token || !env.DB) return null;
  const row = await env.DB
    .prepare('SELECT pseudo, expire_le FROM sessions WHERE token = ?')
    .bind(token)
    .first<{ pseudo: string; expire_le: string }>();
  if (!row || new Date(row.expire_le).getTime() < Date.now()) return null;
  return row.pseudo;
}

/** Exige une session valide -> { pseudo } ou une réponse 503 (pas de DB) / 401. */
async function exigerSession(request: Request, env: Env): Promise<{ pseudo: string } | Response> {
  if (!env.DB) return jsonError('Base non configurée.', 503);
  const pseudo = await sessionValide(request, env);
  if (!pseudo) return jsonError('Session requise : connecte-toi d’abord.', 401);
  return { pseudo };
}
/** Exige une session valide + admin = 1 sur le compte (table comptes). */
async function exigerAdmin(request: Request, env: Env): Promise<{ pseudo: string } | Response> {
  const s = await exigerSession(request, env);
  if (s instanceof Response) return s;
  if (!env.DB) return jsonError('Base non configurée.', 503);
  const row = await env.DB
    .prepare('SELECT admin FROM comptes WHERE pseudo_normalise = ?')
    .bind(normalizePseudo(s.pseudo))
    .first<{ admin: number }>();
  if (!row || !row.admin) return jsonError('Accès admin refusé.', 403);
  return s;
}

// --- Auth : inscription / connexion (PBKDF2 210 000 itérations côté serveur) ---
const PBKDF2_ITERATIONS = 210000;
const MAX_MDP = 72; // au-delà, 400 (évite un PBKDF2 sur un body énorme)
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
// Ligne de la table D1 `comptes` (schéma : migrations/0001_init.sql + 0003_admin_flag.sql).
interface CompteRow {
  pseudo: string;
  pseudo_normalise: string;
  email: string | null;
  hash: string;
  sel: string;
  hash_version: number;
  cree_le: string | null;
  dernier_login: string | null;
  admin: number; // 0/1 — flag admin du compte (promu par UPDATE SQL, voir docs/features/admin.md)
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
  const password = String(body.password);
  if (password.length > MAX_MDP) return jsonError(`Mot de passe trop long (${MAX_MDP} max).`, 400);
  if (action === 'inscription') {
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(body.email)))
      return jsonError('E-mail invalide.', 400);
    if (password.length < 8)
      return jsonError('Mot de passe : 8 caractères minimum.', 400);
    const exists = await env.DB.prepare('SELECT pseudo FROM comptes WHERE pseudo_normalise = ?')
      .bind(n)
      .first();
    if (exists) return jsonError('Ce pseudo est déjà pris.', 409);
    const sel = crypto.randomUUID();
    const hash = await pbkdf2(password, sel);
    const now = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO comptes (pseudo, pseudo_normalise, email, hash, sel, hash_version, cree_le, dernier_login) VALUES (?, ?, ?, ?, ?, 2, ?, ?)'
    )
      .bind(pseudo, n, body.email, hash, sel, now, now)
      .run();
    return json({
      ok: true,
      pseudo,
      token: await creerSession(env, pseudo),
    });
  }
  if (action === 'connexion') {
    const account = await env.DB.prepare('SELECT * FROM comptes WHERE pseudo_normalise = ?')
      .bind(n)
      .first<CompteRow>();
    if (!account) {
      // PBKDF2 factice au même coût : pas d'oracle de timing pour énumérer les pseudos.
      await pbkdf2(password, 'sel-factice');
      return jsonError('Aucun compte avec ce pseudo.', 404);
    }
    const hash = await pbkdf2(password, account.sel);
    if (!hashesEqual(hash, account.hash)) return jsonError('Mot de passe incorrect.', 401);
    await env.DB.prepare('UPDATE comptes SET dernier_login = ? WHERE pseudo = ?')
      .bind(new Date().toISOString(), account.pseudo)
      .run();
    return json({
      ok: true,
      pseudo: account.pseudo,
      token: await creerSession(env, account.pseudo),
    });
  }
  return jsonError('Action inconnue.', 404);
}

// --- Parties / records / XP (D1) — session requise, pseudo forcé = celui du token ---
async function routeGames(request: Request, env: Env, url: URL): Promise<Response> {
  if (!env.DB) return jsonError('Base non configurée.', 503);
  const s = await exigerSession(request, env);
  if (s instanceof Response) return s;
  if (request.method === 'GET') {
    const pseudo = url.searchParams.get('pseudo');
    // Filtre par colonne pseudo dédiée (index idx_parties_pseudo) — jamais de LIKE
    // '%...%' sur la colonne JSON joueurs, l'index ne servirait à rien.
    const requete = pseudo
      ? 'SELECT * FROM parties WHERE pseudo = ? ORDER BY date DESC LIMIT 500'
      : 'SELECT * FROM parties ORDER BY date DESC LIMIT 500';
    const params = pseudo ? [normalizePseudo(pseudo)] : [];
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
    const id = typeof p.id === 'string' && p.id ? p.id : crypto.randomUUID();
    // Colonne pseudo = compte du token (jamais celui du body : un client ne peut pas
    // usurper un autre pseudo). Sert au filtre indexé GET /api/parties?pseudo=.
    const pseudo = normalizePseudo(s.pseudo);
    await env.DB.prepare(
      'INSERT INTO parties (id, mode, niveau, theme_id, pseudo, joueurs, scores, bonnes, total, details, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(
        id,
        p.mode,
        p.niveau || null,
        p.themeId || null,
        pseudo,
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
  const s = await exigerSession(request, env);
  if (s instanceof Response) return s;
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
      // pseudo forcé = compte du token (pas celui du body).
      .bind(body.key, body.value, normalizePseudo(s.pseudo), new Date().toISOString())
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
  const s = await exigerSession(request, env);
  if (s instanceof Response) return s;
  if (request.method === 'GET' && pseudo && themeId) {
    const row = await env.DB.prepare('SELECT xp FROM xp WHERE pseudo_theme = ?')
      .bind(`${normalizePseudo(pseudo)}:${themeId}`)
      .first<{ xp: number }>();
    return json({
      ok: true,
      xp: row ? row.xp : 0,
    });
  }
  if (request.method === 'POST') {
    const body = await readBody(request);
    if (!body || !body.themeId || typeof body.xp !== 'number')
      return jsonError('themeId + xp requis.', 400);
    // pseudo forcé = compte du token.
    await env.DB.prepare(
      'INSERT INTO xp (pseudo_theme, xp) VALUES (?, ?) ON CONFLICT(pseudo_theme) DO UPDATE SET xp = excluded.xp'
    )
      .bind(`${normalizePseudo(s.pseudo)}:${body.themeId}`, body.xp)
      .run();
    return json({
      ok: true,
    });
  }
  return jsonError('Méthode non supportée.', 405);
}

// --- Soumissions de questions des joueurs (D1, table soumissions) ---
// POST (session requise, pseudo forcé = token) -> ajoute/remplace une soumission
// (etat forcé à 'attente'). GET (admin requis) ?etat=attente -> liste de modération.
async function routeSoumissions(request: Request, env: Env, url: URL): Promise<Response> {
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

// --- Accès admin : GET /api/admin/check (header Authorization: Bearer <token>) ->
// 200 { ok, admin: true } si le compte DU TOKEN a admin = 1 en table `comptes`,
// 401 sans session valide, 403 si compte non admin. Le flag vit EN BASE (colonne
// comptes.admin, migration 0003), pas dans une var d'env : aucun secret dans
// wrangler.toml. Le pseudo n'est pas pris en paramètre : il vient du token, un client
// ne peut pas tester les pseudos des autres.
// Promotion d'un compte (bootstrap du 1er admin) :
//   npx wrangler d1 execute voltquiz --remote --command \
//     "UPDATE comptes SET admin = 1 WHERE pseudo_normalise = 'tonpseudo'" ---
async function routeAdminCheck(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return jsonError('Méthode non supportée.', 405);
  const a = await exigerAdmin(request, env);
  if (a instanceof Response) return a;
  return json({
    ok: true,
    admin: true,
  });
}

// --- Rooms de duel éphémères (KV) — session requise ---
async function routeRoom(
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

  // Plus de porte V2_ENABLED : la base D1 est le stockage par défaut. Les routes de
  // santé répondent toujours ; chaque route métier renvoie 503 si son binding manque.
  if (p === '/api/ping' || p === '/api/health') {
    return json({
      ok: true,
      app: 'VoltQuiz',
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
  // Stats pour le tableau de bord admin (?admin=1) : rooms KV, rapports CSP, hits 429.
  // Session requise (n'importe quel compte connecté).
  if (p === '/api/stats' && request.method === 'GET') {
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
  if (p === '/api/admin/check') return routeAdminCheck(request, env);
  if (p === '/api/soumissions') return routeSoumissions(request, env, url);
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
  // Session requise via ?token= (un WebSocket navigateur ne peut pas poser de header
  // Authorization custom) — vérifiée AVANT l'upgrade 101.
  if (p.startsWith('/api/duel/')) {
    const roomId = decodeURIComponent(p.slice('/api/duel/'.length));
    const pseudo = await sessionValideParToken(url.searchParams.get('token'), env);
    if (!pseudo) return jsonError('Session requise pour le duel.', 401);
    if (!env.DUEL_ROOMS) return jsonError('Durable Object DUEL_ROOMS non configuré.', 503);
    const id = env.DUEL_ROOMS.idFromName(roomId);
    return env.DUEL_ROOMS.get(id).fetch(request);
  }
  return jsonError('Route API inconnue.', 404);
}
