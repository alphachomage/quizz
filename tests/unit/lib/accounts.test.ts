// Tests des comptes (src/lib/accounts.ts + src/lib/moderation.ts) dans les DEUX modes :
// - mode 'd1' (défaut) : inscription/connexion via /api/auth/* (fetch mocké, le serveur
//   fait le PBKDF2) ; le cache local ne contient JAMAIS de hash ni mot de passe ;
// - mode 'local' (?stockage=local) : hash SHA-256 salé 100 % local.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizePseudo, isValidPseudo, trouverTermeBloque } from '@/lib/moderation.js';

// Réponse fetch minimale conforme à ce que lit appel() (src/lib/api.ts).
function reponse(ok: boolean, data: unknown, status = ok ? 200 : 500): Response {
  return { ok, status, json: async () => data } as unknown as Response;
}

// "Serveur" factice : map pseudo (minuscule) -> compte. Le mot de passe attendu est
// 'secret123' (le vrai hash PBKDF2 est fait côté worker, hors périmètre de ce test).
let comptesServeur: Map<string, { pseudo: string }>;
let fetchMock: ReturnType<typeof vi.fn>;
let fetchEnPanne = false;

// Importe accounts.ts à neuf avec le mode de stockage voulu (STORAGE_MODE est lu
// au chargement du module via ?stockage=local).
async function importAccounts(mode: 'd1' | 'local') {
  window.history.replaceState(null, '', mode === 'local' ? '/?stockage=local' : '/');
  vi.resetModules();
  return import('@/lib/accounts.js');
}

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
  comptesServeur = new Map();
  fetchEnPanne = false;
  fetchMock = vi.fn(async (input: unknown, init?: { method?: string; body?: string }) => {
    if (fetchEnPanne) throw new TypeError('fetch failed');
    const url = String(input);
    if (url.startsWith('/api/auth/inscription')) {
      const body = JSON.parse(String(init?.body)) as { pseudo: string; email: string; password: string };
      const n = body.pseudo.toLowerCase();
      if (comptesServeur.has(n)) {
        return reponse(false, { ok: false, error: 'Ce pseudo est déjà pris.' }, 409);
      }
      comptesServeur.set(n, { pseudo: body.pseudo });
      return reponse(true, { ok: true, pseudo: body.pseudo, token: 'tok-inscription' });
    }
    if (url.startsWith('/api/auth/connexion')) {
      const body = JSON.parse(String(init?.body)) as { pseudo: string; password: string };
      const c = comptesServeur.get(body.pseudo.toLowerCase());
      if (!c) return reponse(false, { ok: false, error: 'Aucun compte avec ce pseudo.' }, 404);
      if (body.password !== 'secret123') {
        return reponse(false, { ok: false, error: 'Mot de passe incorrect.' }, 401);
      }
      return reponse(true, { ok: true, pseudo: c.pseudo, token: 'tok-connexion' });
    }
    // /api/kv/* (push du stockage) et autres routes : succès générique.
    return reponse(true, { ok: true });
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('modération des pseudos', () => {
  // pseudoValide renvoie null si OK, sinon le message d'erreur.
  it('accepte un pseudo correct', () => {
    expect(isValidPseudo('Joris')).toBeNull();
    expect(isValidPseudo('Cassandra')).toBeNull(); // pas de faux positif
  });
  it('rejette les termes bloqués, y compris en leetspeak', () => {
    expect(isValidPseudo('nazi')).toBeTruthy();
    expect(isValidPseudo('n4z1')).toBeTruthy(); // leetspeak décodé
    expect(trouverTermeBloque('n4z1')).toBeTruthy();
  });
  it('normalise le pseudo pour la comparaison', () => {
    expect(normalizePseudo('  N4z1 ')).toBe('nazi');
  });
  it('rejette les termes transphobes et anti-LGBTQ+', () => {
    expect(isValidPseudo('tr4nny')).toBeTruthy(); // leetspeak
    expect(isValidPseudo('shemale')).toBeTruthy();
    expect(isValidPseudo('transphobe')).toBeTruthy();
    expect(isValidPseudo('travelo')).toBeTruthy();
    expect(isValidPseudo('groomer')).toBeTruthy();
    expect(isValidPseudo('agendalgbt')).toBeTruthy();
    expect(isValidPseudo('ideologiedegenre')).toBeTruthy();
    expect(isValidPseudo('lesbophobe')).toBeTruthy();
    expect(isValidPseudo('biphobie')).toBeTruthy();
    // catégorie remontée
    const t = trouverTermeBloque('transphobe');
    expect(t?.categorie).toBe('transphobie');
  });
  it('ne bloque pas les faux positifs (travail, travesti légitime hors contexte haineux)', () => {
    expect(isValidPseudo('travail')).toBeNull(); // contient "trav" mais pas en exact
    expect(isValidPseudo('Cassandra')).toBeNull();
    expect(isValidPseudo('Thomas')).toBeNull();
  });
  it('bloque "trav" uniquement en égalité exacte', () => {
    expect(isValidPseudo('trav')).toBeTruthy();
    expect(isValidPseudo('travailleur')).toBeNull();
  });
});

describe('comptes en mode d1 (serveur, défaut)', () => {
  it('crée un compte via /api/auth/inscription : cache local SANS hash ni mot de passe', async () => {
    const accounts = await importAccounts('d1');
    const res = await accounts.createAccount({
      pseudo: 'testeur',
      email: 't@example.com',
      password: 'secret123',
    });
    expect(res.ok).toBe(true);
    expect(fetchMock.mock.calls.some(([u]) => String(u).startsWith('/api/auth/inscription'))).toBe(true);
    const cache = accounts.loadAccounts().find((c) => c.pseudo === 'testeur');
    expect(cache).toBeTruthy();
    expect(cache!.hash).toBeUndefined(); // jamais de hash en cache côté client en mode d1
    expect(cache!.sel).toBeUndefined();
    expect(JSON.stringify(accounts.loadAccounts())).not.toContain('secret123');
    expect(accounts.currentSession()!.pseudo).toBe('testeur');
    // le token de session serveur est persisté en clé locale (hors STORAGE_KEYS)
    expect(window.localStorage.getItem('voltquiz_token_local')).toBe('tok-inscription');
  });

  it('refuse un pseudo déjà pris (409 serveur) et propage le message', async () => {
    const accounts = await importAccounts('d1');
    await accounts.createAccount({ pseudo: 'testeur', email: 't@example.com', password: 'secret123' });
    const res = await accounts.createAccount({
      pseudo: 'testeur',
      email: 'autre@example.com',
      password: 'secret123',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('déjà pris');
  });

  it('serveur injoignable -> erreur claire (pas de crash)', async () => {
    const accounts = await importAccounts('d1');
    fetchEnPanne = true;
    const res = await accounts.createAccount({
      pseudo: 'testeur',
      email: 't@example.com',
      password: 'secret123',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('injoignable');
  });

  it('connexion : bon mot de passe = session + token stocké, mauvais = 401 propagé', async () => {
    const accounts = await importAccounts('d1');
    await accounts.createAccount({ pseudo: 'testeur', email: 't@example.com', password: 'secret123' });
    expect((await accounts.connect('testeur', 'mauvais')).ok).toBe(false);
    const res = await accounts.connect('testeur', 'secret123');
    expect(res.ok).toBe(true);
    expect(accounts.currentSession()!.pseudo).toBe('testeur');
    expect(window.localStorage.getItem('voltquiz_token_local')).toBe('tok-connexion');
    accounts.disconnect();
    expect(accounts.currentSession()).toBe(null);
    expect(window.localStorage.getItem('voltquiz_token_local')).toBe(null); // token révoqué côté client
  });
});

describe('comptes en mode local (?stockage=local, hors-ligne)', () => {
  it('crée un compte : mot de passe jamais stocké en clair (hash SHA-256 salé local)', async () => {
    const accounts = await importAccounts('local');
    const res = await accounts.createAccount({
      pseudo: 'testeur',
      email: 't@example.com',
      password: 'secret123',
    });
    expect(res.ok).toBe(true);
    // pas d'appel serveur en mode local
    expect(fetchMock.mock.calls.some(([u]) => String(u).startsWith('/api/auth/'))).toBe(false);
    const account = accounts.loadAccounts().find((c) => c.pseudo === 'testeur');
    expect(account).toBeTruthy();
    expect(JSON.stringify(accounts.loadAccounts())).not.toContain('secret123');
    expect(account!.hash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex
    expect(account!.sel).toBeTruthy(); // sel présent, hash salé
    expect(window.localStorage.getItem('voltquiz_token_local')).toBe(null); // pas de token serveur en local
  });
  it('refuse un e-mail invalide et un pseudo pris localement', async () => {
    const accounts = await importAccounts('local');
    await accounts.createAccount({ pseudo: 'testeur', email: 't@example.com', password: 'secret123' });
    expect(
      (
        await accounts.createAccount({
          pseudo: 'testeur',
          email: 'autre@example.com',
          password: 'secret123',
        })
      ).ok
    ).toBe(false);
    expect(
      (
        await accounts.createAccount({
          pseudo: 'autre',
          email: 'pas-un-email',
          password: 'secret123',
        })
      ).ok
    ).toBe(false);
    expect(accounts.pseudoExists('testeur')).toBe(true);
  });
  it('connexion locale : bon mot de passe = session, mauvais = refus', async () => {
    const accounts = await importAccounts('local');
    await accounts.createAccount({ pseudo: 'testeur', email: 't@example.com', password: 'secret123' });
    expect((await accounts.connect('testeur', 'mauvais')).ok).toBe(false);
    const res = await accounts.connect('testeur', 'secret123');
    expect(res.ok).toBe(true);
    expect(accounts.currentSession()!.pseudo).toBe('testeur');
  });
});

describe('mode invité (identique dans les deux modes)', () => {
  it('session jetable, pseudo auto, isGuest à true', async () => {
    const accounts = await importAccounts('d1');
    const pseudo = accounts.startGuest(); // renvoie le pseudo, pas la session
    expect(pseudo).toMatch(/^user-[a-z2-9]{7}$/);
    expect(accounts.currentSession()).toEqual({
      pseudo,
      guest: true,
      avatar: null,
    });
    expect(accounts.isGuest()).toBe(true);
  });
});
