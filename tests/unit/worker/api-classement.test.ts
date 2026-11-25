// Tests de GET /api/classement (worker-api.ts) : top 20 global agrégé sur la table D1
// « parties » (meilleur score par joueur), avec filtres mode / niveau / periode.
/* global Env */
import { describe, expect, it } from 'vitest';
import { apiRouter } from '../../../worker-api.js';

// D1 factice : sessions (token -> pseudo) + parties (lignes du SELECT *).
// La requête de classement (json_each) est ré-agrégée en JS de façon équivalente.
function fakeD1(): { db: Env['DB']; parties: Record<string, unknown>[] } {
  const sessions = new Map([
    ['tok-user', 'Testeur'],
    ['tok-admin', 'Boss'],
  ]);
  const parties: Record<string, unknown>[] = [];
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
          return null;
        },
        async all() {
          if (sql.includes('json_each')) {
            const mode = String(params[0]);
            let niveau: string | null = null;
            let depuis: string | null = null;
            const aNiveau = sql.includes('niveau = ?');
            const aDate = sql.includes('date >= ?');
            if (aNiveau) niveau = String(params[1]);
            if (aDate) depuis = String(params[aNiveau ? 2 : 1]);
            const parNom = new Map<string, Record<string, unknown>>();
            for (const p of parties) {
              if (p.mode !== mode) continue;
              if (niveau && p.niveau !== niveau) continue;
              if (depuis && String(p.date) < depuis) continue;
              const joueurs = JSON.parse(String(p.joueurs || '[]')) as {
                nom: string;
                score: number;
                bonnes: number;
              }[];
              for (const j of joueurs) {
                const nom = String(p.pseudo || j.nom);
                const cur = parNom.get(nom) as { score: number } | undefined;
                if (!cur || j.score > cur.score) {
                  parNom.set(nom, {
                    nom,
                    score: j.score,
                    bonnes: j.bonnes,
                    total: Number(p.total) || 0,
                    themeId: p.theme_id,
                    niveau: p.niveau,
                    date: p.date,
                  });
                }
              }
            }
            const results = [...parNom.values()].sort((a, b) => Number(b.score) - Number(a.score)).slice(0, 20);
            return { results, success: true };
          }
          if (sql.includes('FROM parties')) return { results: parties, success: true };
          return { results: [], success: true };
        },
        async run() {
          if (sql.startsWith('INSERT INTO parties')) {
            parties.push({
              id: params[0],
              mode: params[1],
              niveau: params[2],
              theme_id: params[3],
              pseudo: params[4],
              joueurs: params[5],
              scores: params[6],
              bonnes: params[7],
              total: params[8],
              details: params[9],
              date: params[10],
            });
          }
          return { success: true };
        },
      };
      return self;
    },
  } as unknown as Env['DB'];
  return { db, parties };
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

async function posterPartie(
  env: Env,
  token: string,
  partie: Record<string, unknown>
): Promise<void> {
  await appel(env, '/api/parties', { method: 'POST', token, body: JSON.stringify(partie) });
}

describe('GET /api/classement (classement global D1)', () => {
  it('401 sans token, 503 sans binding DB, 400 mode inconnu', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    expect((await appel(env, '/api/classement?mode=solo')).status).toBe(401);
    expect((await appel(envAvec(undefined), '/api/classement?mode=solo', { token: 'tok-user' })).status).toBe(503);
    expect((await appel(env, '/api/classement?mode=triche', { token: 'tok-user' })).status).toBe(400);
  });

  it('agrège le meilleur score par joueur, trié desc, filtré par mode', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    await posterPartie(env, 'tok-user', {
      mode: 'solo', niveau: 'facile', themeId: 'histoire', total: 10,
      players: [{ nom: 'Testeur', score: 120, bonnes: 8 }], scores: [120], bonnes: [8],
      date: '2026-11-20T10:00:00.000Z',
    });
    await posterPartie(env, 'tok-user', {
      mode: 'solo', niveau: 'facile', themeId: 'histoire', total: 10,
      players: [{ nom: 'Testeur', score: 180, bonnes: 9 }], scores: [180], bonnes: [9],
      date: '2026-11-21T10:00:00.000Z',
    });
    await posterPartie(env, 'tok-admin', {
      mode: 'solo', niveau: 'dur', themeId: 'espace', total: 10,
      players: [{ nom: 'Boss', score: 200, bonnes: 10 }], scores: [200], bonnes: [10],
      date: '2026-11-21T11:00:00.000Z',
    });
    await posterPartie(env, 'tok-admin', {
      mode: 'rogue', niveau: 'mix', themeId: 'tous', total: 12,
      players: [{ nom: 'Boss', score: 90, bonnes: 7 }], scores: [90], bonnes: [7],
      date: '2026-11-21T12:00:00.000Z',
    });
    const res = await appel(env, '/api/classement?mode=solo', { token: 'tok-user' });
    expect(res.status).toBe(200);
    const rows = res.data.rows as { nom: string; score: number; niveau: string | null }[];
    expect(rows.map((r) => r.nom)).toEqual(['boss', 'testeur']); // tri score desc (pseudo normalise)
    expect(rows[0].score).toBe(200);
    expect(rows[1].score).toBe(180); // meilleur score de Testeur, pas la 1re partie
    const rogue = await appel(env, '/api/classement?mode=rogue', { token: 'tok-user' });
    expect((rogue.data.rows as unknown[]).length).toBe(1);
  });

  it('filtre par niveau (solo) et par periode=semaine', async () => {
    const { db } = fakeD1();
    const env = envAvec(db);
    await posterPartie(env, 'tok-user', {
      mode: 'solo', niveau: 'dur', themeId: 'espace', total: 10,
      players: [{ nom: 'Testeur', score: 200, bonnes: 10 }], scores: [200], bonnes: [10],
      date: new Date().toISOString(), // aujourd'hui
    });
    await posterPartie(env, 'tok-user', {
      mode: 'solo', niveau: 'facile', themeId: 'histoire', total: 10,
      players: [{ nom: 'Testeur', score: 150, bonnes: 9 }], scores: [150], bonnes: [9],
      date: '2026-01-05T10:00:00.000Z', // janvier : hors semaine en cours
    });
    const dur = await appel(env, '/api/classement?mode=solo&niveau=dur', { token: 'tok-user' });
    expect((dur.data.rows as { score: number }[]).map((r) => r.score)).toEqual([200]);
    const semaine = await appel(env, '/api/classement?mode=solo&periode=semaine', { token: 'tok-user' });
    expect((semaine.data.rows as { score: number }[]).map((r) => r.score)).toEqual([200]);
    const tout = await appel(env, '/api/classement?mode=solo&periode=tout', { token: 'tok-user' });
    expect((tout.data.rows as { score: number }[]).length).toBe(1); // 1 joueur, son meilleur score
  });
});
