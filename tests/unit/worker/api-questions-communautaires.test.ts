// Tests des routes du corpus communautaire (worker-api.ts) avec une D1 factice :
// GET /api/questions (session requise, paginé, etat='validee' uniquement, filtre themeId),
// POST /api/soumissions/valider|refuser (admin requis, UPDATE etat).
/* global Env */
import { describe, expect, it } from 'vitest';
import { apiRouter } from '../../../worker-api.js';

// D1 factice : sessions (token -> pseudo), comptes (pseudo_normalise -> admin),
// soumissions (id -> ligne complète, index 8 = etat comme dans le INSERT).
function fakeD1(): {
  db: Env['DB'];
  sessions: Map<string, string>;
  comptes: Map<string, number>;
  soumissions: Map<string, Record<string, unknown>>;
} {
  const sessions = new Map<string, string>();
  const comptes = new Map<string, number>();
  const soumissions = new Map<string, Record<string, unknown>>();
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
          if (sql.includes('COUNT(*)')) {
            let n = 0;
            for (const r of soumissions.values()) {
              if (r.etat !== 'validee') continue;
              if (sql.includes('theme_id') && r.theme_id !== params[1]) continue;
              n++;
            }
            return { n };
          }
          return null;
        },
        async all() {
          if (sql.includes('FROM soumissions')) {
            let rows = [...soumissions.values()].filter((r) => r.etat === params[0]);
            if (sql.includes('theme_id')) rows = rows.filter((r) => r.theme_id === params[1]);
            if (sql.includes('LIMIT')) {
              const limit = Number(params[params.length - 2]);
              const offset = Number(params[params.length - 1]);
              rows = rows.slice(offset, offset + limit);
            }
            return { results: rows, success: true };
          }
          return { results: [], success: true };
        },
        async run() {
          if (sql.startsWith('UPDATE soumissions SET etat')) {
            const row = soumissions.get(String(params[1]));
            if (row) row.etat = params[0];
            return { success: true };
          }
          return { success: true };
        },
      };
      return self;
    },
  } as unknown as Env['DB'];
  return { db, sessions, comptes, soumissions };
}

function envAvec(db?: Env['DB']): Env {
  return {
    DB: db,
    ENVIRONMENT: 'production',
    APP_VERSION: '0.1.0',
    ALLOWED_ORIGINS: '',
  } as unknown as Env;
}

function req(chemin: string, token?: string, init?: { method?: string; body?: string }): Request {
  return new Request(`https://x.test${chemin}`, {
    method: init?.method || 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init?.body,
  });
}

function ligne(id: string, etat: string, themeId = 'histoire'): Record<string, unknown> {
  return {
    id,
    pseudo: 'testeur',
    theme_id: themeId,
    q: `Question ${id} ?`,
    reponses: JSON.stringify(['a', 'b']),
    bonne: 0,
    niveau: 'moyen',
    info: null,
    etat,
    date: '2025-01-01',
  };
}

describe('GET /api/questions — corpus communautaire validé', () => {
  it('401 sans token', async () => {
    const { db } = fakeD1();
    const r = await apiRouter(req('/api/questions'), envAvec(db), new URL('https://x.test/api/questions'));
    expect(r.status).toBe(401);
  });

  it("renvoie uniquement les etat='validee', reponses parsé, avec total", async () => {
    const { db, soumissions } = fakeD1();
    soumissions.set('q1', ligne('q1', 'validee'));
    soumissions.set('q2', ligne('q2', 'attente'));
    soumissions.set('q3', ligne('q3', 'validee', 'sport'));
    const r = await apiRouter(req('/api/questions', 'tok-user'), envAvec(db), new URL('https://x.test/api/questions'));
    expect(r.status).toBe(200);
    const data = await r.json();
    expect(data.ok).toBe(true);
    expect(data.total).toBe(2);
    expect(data.questions).toHaveLength(2);
    expect(data.questions[0].reponses).toEqual(['a', 'b']); // parsé
    expect(data.questions.every((q: Record<string, unknown>) => q.etat === 'validee')).toBe(true);
  });

  it('filtre par themeId et pagine (limit/offset)', async () => {
    const { db, soumissions } = fakeD1();
    for (let i = 0; i < 5; i++) soumissions.set(`h${i}`, ligne(`h${i}`, 'validee', 'histoire'));
    soumissions.set('s0', ligne('s0', 'validee', 'sport'));
    const url = new URL('https://x.test/api/questions?themeId=histoire&page=1&limit=2');
    const r = await apiRouter(req('/api/questions?themeId=histoire&page=1&limit=2', 'tok-user'), envAvec(db), url);
    const data = await r.json();
    expect(data.total).toBe(5);
    expect(data.questions).toHaveLength(2); // page 1, limit 2
  });

  it('ignore une ligne dont reponses est un JSON illisible', async () => {
    const { db, soumissions } = fakeD1();
    const bad = ligne('bad', 'validee');
    bad.reponses = 'pas-du-json';
    soumissions.set('bad', bad);
    soumissions.set('ok', ligne('ok', 'validee'));
    const r = await apiRouter(req('/api/questions', 'tok-user'), envAvec(db), new URL('https://x.test/api/questions'));
    const data = await r.json();
    expect(data.questions).toHaveLength(1);
    expect(data.questions[0].id).toBe('ok');
  });
});

describe('POST /api/soumissions/valider|refuser — admin requis', () => {
  it('403 pour un non-admin', async () => {
    const { db, soumissions } = fakeD1();
    soumissions.set('q1', ligne('q1', 'attente'));
    const r = await apiRouter(
      req('/api/soumissions/valider', 'tok-user', { method: 'POST', body: JSON.stringify({ id: 'q1' }) }),
      envAvec(db),
      new URL('https://x.test/api/soumissions/valider')
    );
    expect(r.status).toBe(403);
    expect(soumissions.get('q1')!.etat).toBe('attente');
  });

  it("admin : valider passe etat à 'validee'", async () => {
    const { db, soumissions } = fakeD1();
    soumissions.set('q1', ligne('q1', 'attente'));
    const r = await apiRouter(
      req('/api/soumissions/valider', 'tok-admin', { method: 'POST', body: JSON.stringify({ id: 'q1' }) }),
      envAvec(db),
      new URL('https://x.test/api/soumissions/valider')
    );
    expect(r.status).toBe(200);
    const data = await r.json();
    expect(data.etat).toBe('validee');
    expect(soumissions.get('q1')!.etat).toBe('validee');
  });

  it("admin : refuser passe etat à 'refusee'", async () => {
    const { db, soumissions } = fakeD1();
    soumissions.set('q1', ligne('q1', 'attente'));
    const r = await apiRouter(
      req('/api/soumissions/refuser', 'tok-admin', { method: 'POST', body: JSON.stringify({ id: 'q1' }) }),
      envAvec(db),
      new URL('https://x.test/api/soumissions/refuser')
    );
    expect(r.status).toBe(200);
    expect(soumissions.get('q1')!.etat).toBe('refusee');
  });

  it('400 sans id', async () => {
    const { db } = fakeD1();
    const r = await apiRouter(
      req('/api/soumissions/valider', 'tok-admin', { method: 'POST', body: JSON.stringify({}) }),
      envAvec(db),
      new URL('https://x.test/api/soumissions/valider')
    );
    expect(r.status).toBe(400);
  });
});
