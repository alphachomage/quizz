// Tests des routes sécurisées (worker-api.ts) avec une D1 factice en mémoire :
// /api/admin/check (401 sans token, 403 non-admin, 200 admin), /api/soumissions
// (POST session + pseudo forcé = token, GET admin), /api/parties (pseudo forcé).
/* global Env */
import { describe, expect, it } from 'vitest';
import { apiRouter } from '../../../worker-api.js';

// D1 factice : comptes (pseudo_normalise -> admin), sessions (token -> pseudo),
// soumissions/parties (id -> params du INSERT).
function fakeD1(): {
  db: Env['DB'];
  comptes: Map<string, number>;
  sessions: Map<string, string>;
  soumissions: Map<string, unknown[]>;
  parties: Map<string, unknown[]>;
} {
  const comptes = new Map<string, number>();
  const sessions = new Map<string, string>();
  const soumissions = new Map<string, unknown[]>();
  const parties = new Map<string, unknown[]>();
  sessions.set('tok-admin', 'Boss');
  sessions.set('tok-user', 'Testeur');
  comptes.set('boss', 1);
  comptes.set('testeur', 0);
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
          if (sql.includes('FROM comptes')) {
            const admin = comptes.get(String(params[0]));
            return admin === undefined ? null : { admin };
          }
          return null;
        },
        async all() {
          if (sql.includes('FROM soumissions')) {
            let rows = [...soumissions.values()];
            if (sql.includes('WHERE etat')) rows = rows.filter((r) => r[8] === params[0]);
            return { results: rows, success: true };
          }
          if (sql.includes('FROM parties')) {
            let rows = [...parties.values()];
            if (sql.includes('WHERE pseudo')) rows = rows.filter((r) => r[4] === params[0]);
            return { results: rows, success: true };
          }
          return { results: [], success: true };
        },
        async run() {
          if (sql.startsWith('INSERT INTO soumissions')) soumissions.set(String(params[0]), params);
          if (sql.startsWith('INSERT INTO parties')) parties.set(String(params[0]), params);
          return { success: true };
        },
      };
      return self;
    },
  } as unknown as Env['DB'];
  return { db, comptes, sessions, soumissions, parties };
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

describe('GET /api/admin/check (session + flag comptes.admin)', () => {
  it('401 sans token, 403 avec un token non-admin, 200 avec un token admin', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    expect((await appel(env, '/api/admin/check')).status).toBe(401);
    expect((await appel(env, '/api/admin/check', { token: 'tok-user' })).status).toBe(403);
    const res = await appel(env, '/api/admin/check', { token: 'tok-admin' });
    expect(res.status).toBe(200);
    expect(res.data.admin).toBe(true);
  });

  it('503 sans binding DB même avec un token', async () => {
    const env = envAvec(undefined);
    expect((await appel(env, '/api/admin/check', { token: 'tok-admin' })).status).toBe(503);
  });
});

describe('/api/soumissions (session requise, pseudo forcé = token)', () => {
  it('POST sans token -> 401 ; avec token -> pseudo forcé = compte du token', async () => {
    const { db, soumissions } = fakeD1();
    const env = envAvec(db);
    const sansToken = await appel(env, '/api/soumissions', {
      method: 'POST',
      body: JSON.stringify({
        id: 's1',
        pseudo: 'Usurpateur',
        themeId: 'cuisine',
        q: '2+2 ?',
        reponses: ['3', '4'],
        bonne: 1,
        niveau: 'facile',
      }),
    });
    expect(sansToken.status).toBe(401);
    const post = await appel(env, '/api/soumissions', {
      method: 'POST',
      token: 'tok-user',
      body: JSON.stringify({
        id: 's1',
        pseudo: 'Usurpateur', // ignoré côté serveur
        themeId: 'cuisine',
        q: '2+2 ?',
        reponses: ['3', '4'],
        bonne: 1,
        niveau: 'facile',
      }),
    });
    expect(post.status).toBe(200);
    expect(soumissions.get('s1')![1]).toBe('testeur'); // pseudo du token, pas du body
  });

  it('POST invalide (bonne hors plage) -> 400 ; GET sans admin -> 403, admin -> 200', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    const invalide = await appel(env, '/api/soumissions', {
      method: 'POST',
      token: 'tok-user',
      body: JSON.stringify({ id: 's2', q: 'x', reponses: ['a'], bonne: 5 }),
    });
    expect(invalide.status).toBe(400);
    expect((await appel(env, '/api/soumissions?etat=attente', { token: 'tok-user' })).status).toBe(403);
    const get = await appel(env, '/api/soumissions?etat=attente', { token: 'tok-admin' });
    expect(get.status).toBe(200);
    expect(Array.isArray(get.data.soumissions)).toBe(true);
  });
});

describe('/api/parties (session requise, pseudo forcé = token)', () => {
  it('POST avec token -> colonne pseudo = pseudo normalisé du token, pas du body', async () => {
    const { db, parties } = fakeD1();
    const env = envAvec(db);
    await appel(env, '/api/parties', {
      method: 'POST',
      token: 'tok-user',
      body: JSON.stringify({
        mode: 'solo',
        niveau: 'facile',
        themeId: 'cuisine',
        pseudo: 'AutrePseudo',
        players: [{ nom: 'Testeur', score: 8, bonnes: 8 }],
        scores: [8],
        bonnes: [8],
        total: 8,
      }),
    });
    const ligne = [...parties.values()][0];
    expect(ligne[4]).toBe('testeur'); // colonne pseudo = token, pas 'autrepseudo'
    // GET filtré par pseudo indexé
    const res = await appel(env, '/api/parties?pseudo=TESTEUR', { token: 'tok-admin' });
    expect((res.data.games as unknown[]).length).toBe(1);
    const vide = await appel(env, '/api/parties?pseudo=personne', { token: 'tok-admin' });
    expect((vide.data.games as unknown[]).length).toBe(0);
  });

  it('GET/POST sans token -> 401', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    expect((await appel(env, '/api/parties')).status).toBe(401);
    expect(
      (
        await appel(env, '/api/parties', {
          method: 'POST',
          body: JSON.stringify({ mode: 'solo' }),
        })
      ).status
    ).toBe(401);
  });
});
