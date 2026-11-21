// Tests de la route /api/kv/* (worker-api.ts) avec une D1 factice en mémoire :
// session Bearer requise (401 sinon), namespacing par compte ("<pseudo>:<cle>" en base),
// POST/GET/DELETE, plafond 1 Mo spécifique sync (l'historique dépasse 64 Ko), 400 sans value.
/* global Env */
import { describe, expect, it } from 'vitest';
import { apiRouter } from '../../../worker-api.js';

// D1 factice : sync_client = Map<cle, valeur>, sessions = Map<token, pseudo>.
function fakeD1(): {
  db: Env['DB'];
  sync: Map<string, string>;
  sessions: Map<string, string>;
} {
  const sync = new Map<string, string>();
  const sessions = new Map<string, string>();
  sessions.set('tok-joris', 'Joris');
  sessions.set('tok-lea', 'Léa');
  const db = {
    prepare(sql: string) {
      let params: unknown[] = [];
      const self = {
        bind(...p: unknown[]) {
          params = p;
          return self;
        },
        async first() {
          if (sql.includes('FROM sessions')) {
            const pseudo = sessions.get(String(params[0]));
            return pseudo ? { pseudo, expire_le: new Date(Date.now() + 1e9).toISOString() } : null;
          }
          const v = sync.get(String(params[0]));
          return v === undefined ? null : { valeur: v };
        },
        async run() {
          if (sql.startsWith('INSERT') || sql.startsWith('DELETE FROM sync_client')) {
            if (sql.startsWith('INSERT')) sync.set(String(params[0]), String(params[1]));
            else sync.delete(String(params[0]));
          } else if (sql.startsWith('DELETE')) sync.delete(String(params[0]));
          return { success: true };
        },
      };
      return self;
    },
  } as unknown as Env['DB'];
  return { db, sync, sessions };
}

function envAvec(db?: Env['DB']): Env {
  return {
    DB: db,
    ENVIRONMENT: 'production',
    APP_VERSION: '0.1.0',
    ALLOWED_ORIGINS: '',
  } as unknown as Env;
}

async function appelKv(
  env: Env,
  cle: string,
  init?: { method?: string; body?: string; token?: string | null }
): Promise<{ status: number; data: { ok?: boolean; value?: unknown; error?: string } }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (init?.token) headers['Authorization'] = `Bearer ${init.token}`;
  const req = new Request(`https://voltquiz.test/api/kv/${cle}`, {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body,
  });
  const res = await apiRouter(req, env, new URL(req.url));
  return { status: res.status, data: (await res.json()) as { ok?: boolean; value?: unknown; error?: string } };
}

describe('/api/kv/* (sync_client namespacé par compte, session requise)', () => {
  it('sans token -> 401 sur GET comme sur POST', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    expect((await appelKv(env, 'voltquiz_xp')).status).toBe(401);
    expect(
      (await appelKv(env, 'voltquiz_xp', { method: 'POST', body: JSON.stringify({ value: 1 }) })).status
    ).toBe(401);
  });

  it('POST puis GET avec token : persisté sous "<pseudo>:<cle>" (namespacé)', async () => {
    const { db, sync } = fakeD1();
    const env = envAvec(db);
    const post = await appelKv(env, 'voltquiz_xp', {
      method: 'POST',
      body: JSON.stringify({ value: { cuisine: 83 } }),
      token: 'tok-joris',
    });
    expect(post.status).toBe(200);
    expect(sync.has('Joris:voltquiz_xp')).toBe(true); // clé namespacée côté serveur
    const get = await appelKv(env, 'voltquiz_xp', { token: 'tok-joris' });
    expect(get.data.value).toEqual({ cuisine: 83 });
  });

  it('namespacing : le token de Léa ne voit PAS les données de Joris', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    await appelKv(env, 'voltquiz_xp', {
      method: 'POST',
      body: JSON.stringify({ value: { secret: 1 } }),
      token: 'tok-joris',
    });
    const getLea = await appelKv(env, 'voltquiz_xp', { token: 'tok-lea' });
    expect(getLea.data.value).toBe(null);
  });

  it('POST sans value -> 400 (avec token)', async () => {
    const { db } = fakeD1();
    const res = await appelKv(envAvec(db), 'x', {
      method: 'POST',
      body: JSON.stringify({}),
      token: 'tok-joris',
    });
    expect(res.status).toBe(400);
  });

  it('POST > 64 Ko sur /api/kv accepté (plafond sync = 1 Mo)', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    const gros = 'a'.repeat(200 * 1024);
    const res = await appelKv(env, 'voltquiz_parties', {
      method: 'POST',
      body: JSON.stringify({ value: { gros } }),
      token: 'tok-joris',
    });
    expect(res.status).toBe(200);
    const get = await appelKv(env, 'voltquiz_parties', { token: 'tok-joris' });
    expect((get.data.value as { gros: string }).gros).toHaveLength(200 * 1024);
  });

  it('POST > 64 Ko sur une autre route -> toujours 400 (plafond général inchangé)', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    const req = new Request('https://voltquiz.test/api/parties', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer tok-joris',
      },
      body: JSON.stringify({ mode: 'solo', gros: 'b'.repeat(100 * 1024) }),
    });
    const res = await apiRouter(req, env, new URL(req.url));
    expect(res.status).toBe(400);
  });

  it('DELETE avec token supprime la clé namespacée', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    await appelKv(env, 'voltquiz_session', {
      method: 'POST',
      body: JSON.stringify({ value: { pseudo: 'Joris' } }),
      token: 'tok-joris',
    });
    const del = await appelKv(env, 'voltquiz_session', { method: 'DELETE', token: 'tok-joris' });
    expect(del.status).toBe(200);
    const get = await appelKv(env, 'voltquiz_session', { token: 'tok-joris' });
    expect(get.data.value).toBe(null);
  });

  it('sans binding DB -> 503 (base non configurée, pas de session possible)', async () => {
    const env = envAvec(undefined);
    const kv = await appelKv(env, 'x', { token: 'tok-joris' });
    expect(kv.status).toBe(503);
  });
});
