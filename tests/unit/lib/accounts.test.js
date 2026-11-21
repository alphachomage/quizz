// Tests des comptes locaux et de la modération des pseudos
// (src/lib/comptes.js + src/lib/moderation.js).
import { describe, expect, it } from 'vitest';
import {
  loadAccounts,
  connect,
  createAccount,
  disconnect,
  startGuest,
  isGuest,
  pseudoExists,
  currentSession,
} from '@/lib/accounts.js';
import { normalizePseudo, isValidPseudo, trouverTermeBloque } from '@/lib/moderation.js';
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
});
describe('comptes locaux', () => {
  it('crée un compte : mot de passe jamais stocké en clair', async () => {
    const res = await createAccount({
      pseudo: 'testeur',
      email: 't@example.com',
      password: 'secret123',
    });
    expect(res.ok).toBe(true);
    const account = loadAccounts().find((c) => c.pseudo === 'testeur');
    expect(account).toBeTruthy();
    expect(JSON.stringify(loadAccounts())).not.toContain('secret123');
    expect(account.hash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex
    expect(account.sel).toBeTruthy(); // sel présent, hash salé
  });
  it('refuse un e-mail invalide et un pseudo pris', async () => {
    await createAccount({
      pseudo: 'testeur',
      email: 't@example.com',
      password: 'secret123',
    });
    expect(
      (
        await createAccount({
          pseudo: 'testeur',
          email: 'autre@example.com',
          password: 'secret123',
        })
      ).ok
    ).toBe(false);
    expect(
      (
        await createAccount({
          pseudo: 'autre',
          email: 'pas-un-email',
          password: 'secret123',
        })
      ).ok
    ).toBe(false);
    expect(pseudoExists('testeur')).toBe(true);
  });
  it('connexion : bon mot de passe = session, mauvais = refus', async () => {
    await createAccount({
      pseudo: 'testeur',
      email: 't@example.com',
      password: 'secret123',
    });
    expect((await connect('testeur', 'mauvais')).ok).toBe(false);
    const res = await connect('testeur', 'secret123');
    expect(res.ok).toBe(true);
    expect(currentSession().pseudo).toBe('testeur');
    disconnect();
    expect(currentSession()).toBe(null);
  });
  it('mode invité : session jetable, pseudo auto, estInvite à true', () => {
    const pseudo = startGuest(); // renvoie le pseudo, pas la session
    expect(pseudo).toMatch(/^user-[a-z2-9]{7}$/);
    expect(currentSession()).toEqual({
      pseudo,
      guest: true,
      avatar: null,
    });
    expect(isGuest()).toBe(true);
  });
});
