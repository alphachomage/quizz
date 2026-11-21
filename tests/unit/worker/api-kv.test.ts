// Tests de la route /api/kv/* (worker-api.ts) avec une D1 factice en mémoire :
// POST/GET/DELETE, plafond de body spécifique kv (1 Mo — l'historique des parties
// dépasse les 64 Ko généraux), 400 sans value, 503 si V2 off.
/* global Env */
import { describe, expect, it } from 'vitest';
import { apiRouter } from '../../../worker-api.js';

// D1 factice : table kv = Map<string, string>.
function fakeD1(): { db: Env['DB']; kv: Map<string, string> } {
  const kv = new Map<string, string>();
  const db = {
    prepare(sql: string) {
      let params: unknown[] = [];
      const self = {
        bind(...p: unknown[]) {
          params = p;
          return self;
        },
        async first() {
          const v = kv.get(String(params[0]));
          return v === undefined ? null : { valeur: v };
        },
        async run() {
          if (sql.startsWith('INSERT')) kv.set(String(params[0]), String(params[1]));
          else if (sql.startsWith('DELETE')) kv.delete(String(params[0]));
          return { success: true };
        },
      };
      return self;
    },
  } as unknown as Env['DB'];
  return { db, kv };
}

function envAvec(db: Env['DB'], v2 = 'true'): Env {
  return {
    DB: db,
    V2_ENABLED: v2,
    ENVIRONMENT: 'production',
    APP_VERSION: '0.1.0',
    ALLOWED_ORIGINS: '',
  } as unknown as Env;
}

async function appelKv(
  env: Env,
  cle: string,
  init?: { method?: string; body?: string }
): Promise<{ status: number; data: { ok?: boolean; value?: unknown; error?: string } }> {
  const req = new Request(`https://voltquiz.test/api/kv/${cle}`, {
    method: init?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: init?.body,
  });
  const res = await apiRouter(req, env, new URL(req.url));
  return { status: res.status, data: (await res.json()) as { ok?: boolean; value?: unknown; error?: string } };
}

describe('/api/kv/* (D1 factice)', () => {
  it('POST puis GET : la valeur est persistée et relue', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    const post = await appelKv(env, 'voltquiz_xp', {
      method: 'POST',
      body: JSON.stringify({ value: { cuisine: 83 } }),
    });
    expect(post.status).toBe(200);
    expect(post.data.ok).toBe(true);
    const get = await appelKv(env, 'voltquiz_xp');
    expect(get.data.value).toEqual({ cuisine: 83 });
  });

  it('POST sans value -> 400', async () => {
    const { db } = fakeD1();
    const res = await appelKv(envAvec(db), 'x', { method: 'POST', body: JSON.stringify({}) });
    expect(res.status).toBe(400);
  });

  it('POST > 64 Ko sur /api/kv accepté (plafond kv = 1 Mo, l’historique des parties grossit)', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    const gros = 'a'.repeat(200 * 1024); // ~200 Ko > 64 Ko
    const res = await appelKv(env, 'voltquiz_parties', {
      method: 'POST',
      body: JSON.stringify({ value: { gros } }),
    });
    expect(res.status).toBe(200);
    const get = await appelKv(env, 'voltquiz_parties');
    expect((get.data.value as { gros: string }).gros).toHaveLength(200 * 1024);
  });

  it('POST > 64 Ko sur une autre route -> toujours 400 (plafond général inchangé)', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    const req = new Request('https://voltquiz.test/api/parties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gros: 'b'.repeat(100 * 1024) }),
    });
    const res = await apiRouter(req, env, new URL(req.url));
    expect(res.status).toBe(400);
  });

  it('DELETE supprime la clé côté serveur', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    await appelKv(env, 'voltquiz_session', {
      method: 'POST',
      body: JSON.stringify({ value: { pseudo: 'x' } }),
    });
    const del = await appelKv(env, 'voltquiz_session', { method: 'DELETE' });
    expect(del.status).toBe(200);
    const get = await appelKv(env, 'voltquiz_session');
    expect(get.data.value).toBe(null);
  });

  it('V2 off : /api/kv -> 503 mais /api/health répond encore', async () => {
    const { db } = fakeD1();
    const env = envAvec(db, 'false');
    const kv = await appelKv(env, 'x');
    expect(kv.status).toBe(503);
    const health = await apiRouter(
      new Request('https://voltquiz.test/api/health'),
      env,
      new URL('https://voltquiz.test/api/health')
    );
    expect(health.status).toBe(200);
  });
});
