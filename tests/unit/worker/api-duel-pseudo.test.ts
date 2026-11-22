// Test de la route /api/duel/:room (worker-api.ts) : le pseudo du joueur DOIT venir
// du token Bearer (?token=), jamais de la query string ?pseudo= — un client ne peut
// pas usurper l'identité d'un autre joueur dans la room. Le pseudo du token est posé
// en header x-voltquiz-pseudo sur la requête forwardée au Durable Object.
/* global Env */
import { describe, expect, it } from 'vitest';
import { apiRouter } from '../../../worker-api.js';

// D1 factice minimale : sessions (token -> pseudo).function fakeD1(): Env['DB'] {
function fakeD1(): Env['DB'] {
  const sessions = new Map<string, string>([['tok-alice', 'Alice']]);
  return {
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
          return { results: [], success: true };
        },
        async run() {
          return { success: true };
        },
      };
      return self;
    },
  } as unknown as Env['DB'];
}

// DO factice : capture le header x-voltquiz-pseudo reçu.
function doFactice(capture: { pseudo?: string | null }): Env['DUEL_ROOMS'] {
  return {
    idFromName: () => ({}),
    get: () => ({
      fetch: async (req: Request) => {
        capture.pseudo = req.headers.get('x-voltquiz-pseudo');
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    }),
  } as unknown as Env['DUEL_ROOMS'];
}

function envAvec(db: Env['DB'], doBinding: Env['DUEL_ROOMS']): Env {
  return {
    DB: db,
    DUEL_ROOMS: doBinding,
    ENVIRONMENT: 'production',
    APP_VERSION: '0.1.0',
    ALLOWED_ORIGINS: '',
  } as unknown as Env;
}

describe('/api/duel/:room — pseudo forcé = token', () => {
  it('401 sans token', async () => {
    const r = await apiRouter(
      new Request('https://x.test/api/duel/room1'),
      envAvec(fakeD1(), doFactice({})),
      new URL('https://x.test/api/duel/room1')
    );
    expect(r.status).toBe(401);
  });

  it('401 avec un token invalide', async () => {
    const r = await apiRouter(
      new Request('https://x.test/api/duel/room1?token=faux'),
      envAvec(fakeD1(), doFactice({})),
      new URL('https://x.test/api/duel/room1?token=faux')
    );
    expect(r.status).toBe(401);
  });

  it('le DO reçoit x-voltquiz-pseudo = pseudo du token, PAS le ?pseudo= de la query', async () => {
    const capture: { pseudo?: string | null } = {};
    // Un attaquant tente d'usurper "Victime" via la query string.
    const url = new URL('https://x.test/api/duel/room1?token=tok-alice&pseudo=Victime');
    const r = await apiRouter(
      new Request(url),
      envAvec(fakeD1(), doFactice(capture)),
      url
    );
    expect(r.status).toBe(200);
    expect(capture.pseudo).toBe('Alice'); // pseudo du token, pas "Victime"
  });
});
