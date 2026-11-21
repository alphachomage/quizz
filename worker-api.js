// worker-api.js — mini-routeur /api/* de VoltQuiz (zéro dépendance), importé par worker.js.
// Préparé pour la V2 (comptes serveur, parties, records, XP, rooms de duel) :
// toutes les routes sont fonctionnelles si les bindings D1/KV/DO sont configurés.
// En attendant, le client reste 100 % local (voir src/lib/api.js + lib/storage.js).

// --- Helpers ---
function json(data, status = 200, extra = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...extra } });
}

function jsonErreur(erreur, status = 400) {
  return json({ ok: false, erreur }, status);
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// --- KV générique (sync du stockage local -> serveur) ---
async function routeKv(request, env, key) {
  if (!key) return jsonErreur('Clé manquante.', 400);
  if (request.method === 'GET') {
    const brut = env.DB ? await kvViaD1Get(env, key) : null;
    return json({ ok: true, key, valeur: brut });
  }
  if (request.method === 'POST') {
    const body = await readBody(request);
    if (!body || !('valeur' in body)) return jsonErreur('Valeur manquante.', 400);
    if (env.DB) await kvViaD1Set(env, key, body.valeur);
    return json({ ok: true, key });
  }
  return jsonErreur('Méthode non supportée.', 405);
}

// KV stocké dans D1 (table kv) si le binding DB existe.
async function kvViaD1Get(env, key) {
  const row = await env.DB.prepare('SELECT valeur FROM kv WHERE cle = ?').bind(key).first();
  return row ? JSON.parse(row.valeur) : null;
}
async function kvViaD1Set(env, key, valeur) {
  await env.DB.prepare(
    'INSERT INTO kv (cle, valeur) VALUES (?, ?) ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur'
  ).bind(key, JSON.stringify(valeur)).run();
}

// --- Auth : inscription / connexion (PBKDF2 210 000 itérations côté serveur) ---
const PBKDF2_ITERATIONS = 210000;

async function pbkdf2(mdp, sel) {
  const donnees = new TextEncoder().encode(`${sel}::${mdp}`);
  const key = await crypto.subtle.importKey('raw', donnees, 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(sel), iterations: PBKDF2_ITERATIONS },
    key,
    256
  );
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function normalizePseudo(p) {
  return String(p || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

async function routeAuth(request, env, action) {
  const body = await readBody(request);
  if (!body || !body.pseudo || !body.mdp) return jsonErreur('Pseudo et mot de passe requis.', 400);
  if (!env.DB) return jsonErreur('Base non configurée (binding DB manquant).', 503);
  const pseudo = String(body.pseudo).slice(0, 20);
  const n = normalizePseudo(pseudo);

  if (action === 'inscription') {
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email)) return jsonErreur('E-mail invalide.', 400);
    if (String(body.mdp).length < 8) return jsonErreur('Mot de passe : 8 caractères minimum.', 400);
    const existe = await env.DB.prepare('SELECT pseudo FROM comptes WHERE pseudo_normalise = ?').bind(n).first();
    if (existe) return jsonErreur('Ce pseudo est déjà pris.', 409);
    const sel = crypto.randomUUID();
    const hash = await pbkdf2(body.mdp, sel);
    const maintenant = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO comptes (pseudo, pseudo_normalise, email, hash, sel, hash_version, cree_le, dernier_login) VALUES (?, ?, ?, ?, ?, 2, ?, ?)'
    ).bind(pseudo, n, body.email, hash, sel, maintenant, maintenant).run();
    return json({ ok: true, pseudo });
  }

  if (action === 'connexion') {
    const account = await env.DB.prepare('SELECT * FROM comptes WHERE pseudo_normalise = ?').bind(n).first();
    if (!account) return jsonErreur('Aucun compte avec ce pseudo.', 404);
    const hash = await pbkdf2(body.mdp, account.sel);
    if (hash !== account.hash) return jsonErreur('Mot de passe incorrect.', 401);
    await env.DB.prepare('UPDATE comptes SET dernier_login = ? WHERE pseudo = ?').bind(new Date().toISOString(), account.pseudo).run();
    return json({ ok: true, pseudo: account.pseudo });
  }

  return jsonErreur('Action inconnue.', 404);
}

// --- Parties / records / XP (D1) ---
async function routeGames(request, env, url) {
  if (!env.DB) return jsonErreur('Base non configurée.', 503);
  if (request.method === 'GET') {
    const pseudo = url.searchParams.get('pseudo');
    const requete = pseudo
      ? 'SELECT * FROM parties WHERE joueurs LIKE ? ORDER BY date DESC LIMIT 500'
      : 'SELECT * FROM parties ORDER BY date DESC LIMIT 500';
    const params = pseudo ? [`%${normalizePseudo(pseudo)}%`] : [];
    const res = await env.DB.prepare(requete).bind(...params).all();
    return json({ ok: true, games: res.results || [] });
  }
  if (request.method === 'POST') {
    const p = await readBody(request);
    if (!p || !p.mode) return jsonErreur('Partie invalide.', 400);
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO parties (id, mode, niveau, theme_id, joueurs, scores, bonnes, total, details, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id, p.mode, p.niveau || null, p.themeId || null,
      JSON.stringify(p.players || []), JSON.stringify(p.scores || []), JSON.stringify(p.bonnes || []),
      p.total || 0, JSON.stringify(p.details || []), p.date || new Date().toISOString()
    ).run();
    return json({ ok: true, id });
  }
  return jsonErreur('Méthode non supportée.', 405);
}

async function routeRecords(request, env, url, key) {
  if (!env.DB) return jsonErreur('Base non configurée.', 503);
  if (request.method === 'GET' && key) {
    const row = await env.DB.prepare('SELECT * FROM records WHERE cle = ?').bind(key).first();
    return json({ ok: true, record: row || null });
  }
  if (request.method === 'POST') {
    const body = await readBody(request);
    if (!body || !body.key || typeof body.valeur !== 'number') return jsonErreur('cle + valeur requis.', 400);
    await env.DB.prepare(
      'INSERT INTO records (cle, valeur, pseudo, date) VALUES (?, ?, ?, ?) ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur, pseudo = excluded.pseudo, date = excluded.date'
    ).bind(body.key, body.valeur, body.pseudo || null, new Date().toISOString()).run();
    return json({ ok: true });
  }
  return jsonErreur('Méthode non supportée.', 405);
}

async function routeXp(request, env, url, pseudo, themeId) {
  if (!env.DB) return jsonErreur('Base non configurée.', 503);
  if (request.method === 'GET' && pseudo && themeId) {
    const row = await env.DB.prepare('SELECT xp FROM xp WHERE pseudo_theme = ?').bind(`${pseudo}:${themeId}`).first();
    return json({ ok: true, xp: row ? row.xp : 0 });
  }
  if (request.method === 'POST') {
    const body = await readBody(request);
    if (!body || !body.pseudo || !body.themeId || typeof body.xp !== 'number') return jsonErreur('pseudo, themeId, xp requis.', 400);
    await env.DB.prepare(
      'INSERT INTO xp (pseudo_theme, xp) VALUES (?, ?) ON CONFLICT(pseudo_theme) DO UPDATE SET xp = excluded.xp'
    ).bind(`${body.pseudo}:${body.themeId}`, body.xp).run();
    return json({ ok: true });
  }
  return jsonErreur('Méthode non supportée.', 405);
}

// --- Rooms de duel éphémères (KV) ---
async function routeRoom(request, env, url, segment) {
  if (!env.ROOMS) return jsonErreur('KV ROOMS non configuré.', 503);
  if (request.method === 'POST' && !segment) {
    const body = await readBody(request);
    const id = crypto.randomUUID().slice(0, 8);
    await env.ROOMS.put(`room:${id}`, JSON.stringify({ id, createur: body?.pseudo || null, creeLe: new Date().toISOString() }), { expirationTtl: 3600 });
    return json({ ok: true, id });
  }
  if (request.method === 'POST' && segment === 'rejoindre') {
    const body = await readBody(request);
    if (!body || !body.id) return jsonErreur('id de room requis.', 400);
    const brut = await env.ROOMS.get(`room:${body.id}`);
    if (!brut) return jsonErreur('Room inconnue ou expirée.', 404);
    return json({ ok: true, room: JSON.parse(brut) });
  }
  if (request.method === 'GET' && segment) {
    const brut = await env.ROOMS.get(`room:${segment}`);
    if (!brut) return jsonErreur('Room inconnue ou expirée.', 404);
    return json({ ok: true, room: JSON.parse(brut) });
  }
  return jsonErreur('Route room invalide.', 404);
}

// --- Routeur principal ---
export async function apiRouter(request, env, url) {
  const p = url.pathname; // ex: /api/kv/xxx

  if (p === '/api/ping' || p === '/api/health') {
    return json({ ok: true, app: 'VoltQuiz', version: env.APP_VERSION || '0.1.0', heure: new Date().toISOString() });
  }
  if (p === '/api/csp-report' && request.method === 'POST') {
    await request.text().catch(() => '');
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  }
  if (p.startsWith('/api/kv/')) return routeKv(request, env, decodeURIComponent(p.slice('/api/kv/'.length)));
  if (p === '/api/auth/inscription' || p === '/api/auth/connexion') {
    return routeAuth(request, env, p.split('/').pop());
  }
  if (p === '/api/parties') return routeGames(request, env, url);
  if (p.startsWith('/api/records/')) return routeRecords(request, env, url, decodeURIComponent(p.slice('/api/records/'.length)));
  if (p === '/api/records') return routeRecords(request, env, url, null);
  if (p.startsWith('/api/xp/')) {
    const [, , , pseudo, themeId] = p.split('/');
    return routeXp(request, env, url, decodeURIComponent(pseudo || ''), decodeURIComponent(themeId || ''));
  }
  if (p === '/api/xp') return routeXp(request, env, url, null, null);
  if (p === '/api/room' || p === '/api/room/rejoindre' || p.startsWith('/api/room/')) {
    const segment = p === '/api/room' ? null : p === '/api/room/rejoindre' ? 'rejoindre' : p.slice('/api/room/'.length);
    return routeRoom(request, env, url, segment ? decodeURIComponent(segment) : null);
  }
  // WebSocket du duel : délégué au Durable Object DuelRoom (binding DUEL_ROOMS).
  if (p.startsWith('/api/duel/')) {
    const roomId = decodeURIComponent(p.slice('/api/duel/'.length));
    if (!env.DUEL_ROOMS) return jsonErreur('Durable Object DUEL_ROOMS non configuré.', 503);
    const id = env.DUEL_ROOMS.idFromName(roomId);
    return env.DUEL_ROOMS.get(id).fetch(request);
  }

  return jsonErreur('Route API inconnue.', 404);
}
