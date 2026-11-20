// Tests des comptes locaux et de la modération des pseudos
// (src/lib/comptes.js + src/lib/moderation.js).
import { describe, expect, it } from 'vitest';

import {
  chargerComptes,
  connecter,
  creerCompte,
  deconnecter,
  demarrerInvite,
  estInvite,
  pseudoExiste,
  sessionActuelle,
} from '@/lib/comptes.js';

import { normaliserPseudo, pseudoValide, trouverTermeBloque } from '@/lib/moderation.js';

describe('modération des pseudos', () => {
  // pseudoValide renvoie null si OK, sinon le message d'erreur.
  it('accepte un pseudo correct', () => {
    expect(pseudoValide('Joris')).toBeNull();
    expect(pseudoValide('Cassandra')).toBeNull(); // pas de faux positif
  });

  it('rejette les termes bloqués, y compris en leetspeak', () => {
    expect(pseudoValide('nazi')).toBeTruthy();
    expect(pseudoValide('n4z1')).toBeTruthy(); // leetspeak décodé
    expect(trouverTermeBloque('n4z1')).toBeTruthy();
  });

  it('normalise le pseudo pour la comparaison', () => {
    expect(normaliserPseudo('  N4z1 ')).toBe('nazi');
  });
});

describe('comptes locaux', () => {
  it('crée un compte : mot de passe jamais stocké en clair', async () => {
    const res = await creerCompte({ pseudo: 'testeur', email: 't@example.com', mdp: 'secret123' });
    expect(res.ok).toBe(true);
    const compte = chargerComptes().find((c) => c.pseudo === 'testeur');
    expect(compte).toBeTruthy();
    expect(JSON.stringify(chargerComptes())).not.toContain('secret123');
    expect(compte.hash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex
    expect(compte.sel).toBeTruthy(); // sel présent, hash salé
  });

  it('refuse un e-mail invalide et un pseudo pris', async () => {
    await creerCompte({ pseudo: 'testeur', email: 't@example.com', mdp: 'secret123' });
    expect((await creerCompte({ pseudo: 'testeur', email: 'autre@example.com', mdp: 'secret123' })).ok).toBe(false);
    expect((await creerCompte({ pseudo: 'autre', email: 'pas-un-email', mdp: 'secret123' })).ok).toBe(false);
    expect(pseudoExiste('testeur')).toBe(true);
  });

  it('connexion : bon mot de passe = session, mauvais = refus', async () => {
    await creerCompte({ pseudo: 'testeur', email: 't@example.com', mdp: 'secret123' });
    expect((await connecter('testeur', 'mauvais')).ok).toBe(false);
    const res = await connecter('testeur', 'secret123');
    expect(res.ok).toBe(true);
    expect(sessionActuelle().pseudo).toBe('testeur');
    deconnecter();
    expect(sessionActuelle()).toBe(null);
  });

  it('mode invité : session jetable, pseudo auto, estInvite à true', () => {
    const pseudo = demarrerInvite(); // renvoie le pseudo, pas la session
    expect(pseudo).toMatch(/^user-[a-z2-9]{7}$/);
    expect(sessionActuelle()).toEqual({ pseudo, invite: true, avatar: null });
    expect(estInvite()).toBe(true);
  });
});
