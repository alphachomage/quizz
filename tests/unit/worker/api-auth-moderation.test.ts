// Tests de la modération SERVEUR à l'inscription (/api/auth/inscription) :
// la blocklist (src/lib/moderation.ts) est vérifiée côté worker pour bloquer
// aussi les appels directs à l'API qui contournent le client.
/* global Env */
import { describe, expect, it } from 'vitest';
import { apiRouter } from '../../../worker-api.js';

// D1 factice minimale : table comptes (Map pseudo_normalise -> pseudo) + sessions.
function fakeD1(): { db: Env['DB']; comptes: Map<string, string> } {
  const comptes = new Map<string, string>();
  const db = {
    prepare(sql: string) {
      let params: unknown[] = [];
      const self = {
        bind(...p: unknown[]) {
          params = p;
          return self;
        },
        async first() {
          if (sql.includes('FROM comptes')) {
            const pseudo = comptes.get(String(params[0]));
            return pseudo ? { pseudo } : null;
          }
          if (sql.includes('FROM sessions')) return null;
          return null;
        },
        async run() {
          if (sql.startsWith('INSERT INTO comptes')) comptes.set(String(params[1]), String(params[0]));
          if (sql.startsWith('INSERT INTO sessions')) return { success: true };
          if (sql.startsWith('DELETE FROM sessions')) return { success: true };
          return { success: true };
        },
      };
      return self;
    },
  } as unknown as Env['DB'];
  return { db, comptes };
}

function envAvec(db: Env['DB']): Env {
  return {
    DB: db,
    ENVIRONMENT: 'production',
    APP_VERSION: '0.1.0',
    ALLOWED_ORIGINS: '',
  } as unknown as Env;
}

async function inscription(env: Env, pseudo: string): Promise<Response> {
  const url = new URL('https://x.test/api/auth/inscription');
  const req = new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pseudo, email: 't@example.com', password: 'secret123' }),
  });
  return apiRouter(req, env, url);
}

describe("modération serveur à l'inscription", () => {
  it('rejette un pseudo transphobe avec 400 (même en leetspeak)', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    const res = await inscription(env, 'tr4nny');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('transphobie');
  });

  it('rejette un pseudo anti-LGBTQ+ (agenda lgbt) avec 400', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    const res = await inscription(env, 'agendalgbt');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('anti-LGBTQ+');
  });

  it('rejette un pseudo raciste côté serveur aussi', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    const res = await inscription(env, 'n4z1');
    expect(res.status).toBe(400);
  });

  it('accepte un pseudo correct (201/200) et crée le compte', async () => {
    const { db, comptes } = fakeD1();
    const env = envAvec(db);
    const res = await inscription(env, 'Joris');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(comptes.has('joris')).toBe(true);
  });

  it('ne bloque pas les faux positifs (travail, Cassandra)', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    expect((await inscription(env, 'travail')).status).toBe(200);
    expect((await inscription(env, 'Cassandra')).status).toBe(200);
  });
});
