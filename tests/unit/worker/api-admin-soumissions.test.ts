// Tests des routes /api/admin/check, /api/soumissions et du filtre par pseudo de
// /api/parties (worker-api.ts) avec une D1 factice en mémoire.
/* global Env */
import { describe, expect, it } from 'vitest';
import { apiRouter } from '../../../worker-api.js';

// D1 factice ciblée : stocke les lignes de soumissions/parties (tableau de params bind).
function fakeD1(): { db: Env['DB']; tables: Record<string, Map<string, unknown[]>> } {
  const tables: Record<string, Map<string, unknown[]>> = {
    soumissions: new Map(),
    parties: new Map(),
  };
  const db = {
    prepare(sql: string) {
      let params: unknown[] = [];
      const self = {
        bind(...p: unknown[]) {
          params = p;
          return self;
        },
        async first() {
          return null;
        },
        async all() {
          if (sql.includes('FROM soumissions')) {
            let rows = [...tables.soumissions.values()];
            if (sql.includes('WHERE etat')) rows = rows.filter((r) => r[8] === params[0]);
            return { results: rows, success: true };
          }
          if (sql.includes('FROM parties')) {
            let rows = [...tables.parties.values()];
            if (sql.includes('WHERE pseudo')) rows = rows.filter((r) => r[4] === params[0]);
            return { results: rows, success: true };
          }
          return { results: [], success: true };
        },
        async run() {
          if (sql.startsWith('INSERT INTO soumissions')) tables.soumissions.set(String(params[0]), params);
          if (sql.startsWith('INSERT INTO parties')) tables.parties.set(String(params[0]), params);
          return { success: true };
        },
      };
      return self;
    },
  } as unknown as Env['DB'];
  return { db, tables };
}

function envAvec(db: Env['DB'], adminPseudos = ''): Env {
  return {
    DB: db,
    ENVIRONMENT: 'production',
    APP_VERSION: '0.1.0',
    ADMIN_PSEUDOS: adminPseudos,
    ALLOWED_ORIGINS: '',
  } as unknown as Env;
}

async function appel(env: Env, chemin: string, init?: { method?: string; body?: string }) {
  const req = new Request(`https://voltquiz.test${chemin}`, {
    method: init?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: init?.body,
  });
  const res = await apiRouter(req, env, new URL(req.url));
  return { status: res.status, data: (await res.json()) as Record<string, unknown> };
}

describe('GET /api/admin/check', () => {
  it('200 admin:true si le pseudo normalisé est dans ADMIN_PSEUDOS', async () => {
    const env = envAvec(fakeD1().db, 'Joris, Léa');
    const res = await appel(env, '/api/admin/check?pseudo=joris');
    expect(res.status).toBe(200);
    expect(res.data.admin).toBe(true);
    // normalisation : accents/espaces ignorés
    const res2 = await appel(env, '/api/admin/check?pseudo=%20L%C3%A9a%20');
    expect(res2.status).toBe(200);
  });

  it('403 si le pseudo n’est pas dans la liste, 400 sans pseudo, 403 si liste vide', async () => {
    const env = envAvec(fakeD1().db, 'joris');
    expect((await appel(env, '/api/admin/check?pseudo=intrus')).status).toBe(403);
    expect((await appel(env, '/api/admin/check')).status).toBe(400);
    const envVide = envAvec(fakeD1().db, '');
    expect((await appel(envVide, '/api/admin/check?pseudo=joris')).status).toBe(403);
  });
});

describe('/api/soumissions', () => {
  it('POST valide -> 200, GET ?etat=attente -> la soumission est listée', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    const post = await appel(env, '/api/soumissions', {
      method: 'POST',
      body: JSON.stringify({
        id: 's1',
        pseudo: 'Testeur',
        themeId: 'cuisine',
        q: '2+2 ?',
        reponses: ['3', '4'],
        bonne: 1,
        niveau: 'facile',
        date: '2026-01-01',
      }),
    });
    expect(post.status).toBe(200);
    const get = await appel(env, '/api/soumissions?etat=attente');
    expect(get.status).toBe(200);
    const liste = get.data.soumissions as unknown[][];
    expect(liste).toHaveLength(1);
    expect(liste[0][0]).toBe('s1'); // id
    expect(liste[0][1]).toBe('testeur'); // pseudo normalisé
    expect(liste[0][8]).toBe('attente'); // etat forcé
  });

  it('POST invalide (bonne hors plage) -> 400', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    const res = await appel(env, '/api/soumissions', {
      method: 'POST',
      body: JSON.stringify({ id: 's2', q: 'x', reponses: ['a'], bonne: 5 }),
    });
    expect(res.status).toBe(400);
  });
});

describe('/api/parties — filtre par colonne pseudo', () => {
  it('POST avec pseudo -> GET ?pseudo= ne renvoie que ses parties (pseudo normalisé)', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    await appel(env, '/api/parties', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'solo',
        niveau: 'facile',
        themeId: 'cuisine',
        pseudo: 'Testeur',
        players: [{ nom: 'Testeur', score: 8, bonnes: 8 }],
        scores: [8],
        bonnes: [8],
        total: 8,
      }),
    });
    await appel(env, '/api/parties', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'solo',
        themeId: 'cinema',
        pseudo: 'Autre',
        players: [{ nom: 'Autre', score: 3, bonnes: 3 }],
        scores: [3],
        bonnes: [3],
        total: 3,
      }),
    });
    const res = await appel(env, '/api/parties?pseudo=TESTEUR');
    expect(res.status).toBe(200);
    const games = res.data.games as unknown[][];
    expect(games).toHaveLength(1);
    expect(games[0][4]).toBe('testeur'); // colonne pseudo normalisée (index 4 du INSERT)
    expect(games[0][2]).toBe('facile');
    const vide = await appel(env, '/api/parties?pseudo=personne');
    expect((vide.data.games as unknown[]).length).toBe(0);
  });
});
