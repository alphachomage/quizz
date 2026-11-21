// Tests des routes /api/records et /api/xp (worker-api.ts) avec une D1 factice :
// namespacing par compte — la clé stockée est "<pseudo>:<cle>" (records) /
// "<pseudo>:<themeId>" (xp), le pseudo vient TOUJOURS du token Bearer, jamais du
// body ni de l'URL. Un joueur ne peut ni lire ni écraser les données d'un autre.
/* global Env */
import { describe, expect, it } from 'vitest';
import { apiRouter } from '../../../worker-api.js';

// D1 factice : sessions (token -> pseudo), records (cle -> ligne), xp (pseudo_theme -> xp).
function fakeD1(): {
  db: Env['DB'];
  sessions: Map<string, string>;
  records: Map<string, unknown[]>;
  xp: Map<string, number>;
} {
  const sessions = new Map<string, string>();
  const records = new Map<string, unknown[]>();
  const xp = new Map<string, number>();
  sessions.set('tok-alice', 'Alice');
  sessions.set('tok-bob', 'Bob');
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
          if (sql.includes('FROM records')) {
            const row = records.get(String(params[0]));
            return row ? { cle: row[0], valeur: row[1], pseudo: row[2], date: row[3] } : null;
          }
          if (sql.includes('FROM xp')) {
            const valeur = xp.get(String(params[0]));
            return valeur === undefined ? null : { xp: valeur };
          }
          return null;
        },
        async run() {
          if (sql.startsWith('INSERT INTO records')) records.set(String(params[0]), params);
          if (sql.startsWith('INSERT INTO xp')) xp.set(String(params[0]), Number(params[1]));
          return { success: true };
        },
      };
      return self;
    },
  } as unknown as Env['DB'];
  return { db, sessions, records, xp };
}

function envAvec(db?: Env['DB']): Env {
  return {
    DB: db,
    ENVIRONMENT: 'production',
    APP_VERSION: '0.1.0',
    ALLOWED_ORIGINS: '',
  } as unknown as Env;
}

async function appel(
  env: Env,
  chemin: string,
  init?: { method?: string; body?: string; token?: string | null }
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (init?.token) headers['Authorization'] = `Bearer ${init.token}`;
  const req = new Request(`https://voltquiz.test${chemin}`, {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body,
  });
  const res = await apiRouter(req, env, new URL(req.url));
  return { status: res.status, data: (await res.json()) as Record<string, unknown> };
}

describe('/api/records (session requise, clé namespacée <pseudo>:<cle>)', () => {
  it('401 sans token, 503 sans DB', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    expect((await appel(env, '/api/records/solo:mix:t1')).status).toBe(401);
    expect((await appel(env, '/api/records/solo:mix:t1', { token: 'inconnu' })).status).toBe(401);
    const envSansDb = envAvec(undefined);
    expect(
      (await appel(envSansDb, '/api/records/solo:mix:t1', { token: 'tok-alice' })).status
    ).toBe(503);
  });

  it('POST : la clé stockée est namespacée et le pseudo du body est ignoré (pas d’usurpation)', async () => {
    const { db, records } = fakeD1();
    const env = envAvec(db);
    const res = await appel(env, '/api/records', {
      method: 'POST',
      token: 'tok-alice',
      body: JSON.stringify({ key: 'solo:mix:t1', value: 120, pseudo: 'Bob' }),
    });
    expect(res.status).toBe(200);
    // clé = "alice:solo:mix:t1" (pseudo normalisé du token), colonne pseudo = "alice"
    expect(records.has('alice:solo:mix:t1')).toBe(true);
    expect(records.get('alice:solo:mix:t1')?.[2]).toBe('alice');
    expect(records.has('solo:mix:t1')).toBe(false); // jamais de clé globale
  });

  it('GET : chaque compte ne lit que son propre record', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    await appel(env, '/api/records', {
      method: 'POST',
      token: 'tok-alice',
      body: JSON.stringify({ key: 'solo:mix:t1', value: 120 }),
    });
    await appel(env, '/api/records', {
      method: 'POST',
      token: 'tok-bob',
      body: JSON.stringify({ key: 'solo:mix:t1', value: 999 }),
    });
    const alice = await appel(env, '/api/records/solo:mix:t1', { token: 'tok-alice' });
    const bob = await appel(env, '/api/records/solo:mix:t1', { token: 'tok-bob' });
    expect((alice.data.record as { valeur: number }).valeur).toBe(120);
    expect((bob.data.record as { valeur: number }).valeur).toBe(999);
  });
});

describe('/api/xp (session requise, pseudo forcé = token)', () => {
  it('POST : pseudo_theme = <pseudo du token>:<themeId>, le pseudo du body est ignoré', async () => {
    const { db, xp } = fakeD1();
    const env = envAvec(db);
    const res = await appel(env, '/api/xp', {
      method: 'POST',
      token: 'tok-alice',
      body: JSON.stringify({ pseudo: 'Bob', themeId: 'cuisine', xp: 500 }),
    });
    expect(res.status).toBe(200);
    expect(xp.get('alice:cuisine')).toBe(500);
    expect(xp.has('bob:cuisine')).toBe(false);
  });

  it('GET : le segment <pseudo> de l’URL est ignoré, on lit l’XP du compte du token', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    await appel(env, '/api/xp', {
      method: 'POST',
      token: 'tok-bob',
      body: JSON.stringify({ themeId: 'cuisine', xp: 777 }),
    });
    // Alice demande l'URL avec le pseudo de Bob : elle doit recevoir SON xp (0), pas 777.
    const res = await appel(env, '/api/xp/Bob/cuisine', { token: 'tok-alice' });
    expect(res.status).toBe(200);
    expect(res.data.xp).toBe(0);
    const bob = await appel(env, '/api/xp/alice/cuisine', { token: 'tok-bob' });
    expect(bob.data.xp).toBe(777); // idem dans l'autre sens
  });

  it('401 sans token', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    expect((await appel(env, '/api/xp/alice/cuisine')).status).toBe(401);
    expect(
      (await appel(env, '/api/xp', { method: 'POST', body: JSON.stringify({ themeId: 't', xp: 1 }) }))
        .status
    ).toBe(401);
  });
});
