// Tests du tirage diversifié (src/lib (modules)) : max 2 questions du même sujet,
// plafond par thème, anti-répétition de la série précédente, mélange déterministe.
import { describe, expect, it } from 'vitest';

import {
  cleSerie,
  generateurGraine,
  hashTexte,
  melanger,
  melangerSeed,
  poolSansSeriePrecedente,
  sauverSerie,
  chargerSerie,
  sujetDe,
  tirerSerie,
} from '@lib/index.js';

import { makeQuestion, mulberry32 } from '../../fixtures/questions.fixture.js';

describe('sujetDe', () => {
  it('détecte un nom propre en milieu de phrase', () => {
    expect(sujetDe('Quel est le héros de One Piece ?')).toBe('one piece');
    expect(sujetDe('Le manga Naruto suit quel héros ?')).toBe('naruto');
  });

  it('ignore une capitale isolée en début de phrase', () => {
    expect(sujetDe('Zelda est un jeu vidéo ?')).toBe('');
  });

  it('renvoie une chaîne vide sans nom propre', () => {
    expect(sujetDe('Combien font deux plus deux ?')).toBe('');
  });
});

describe('tirerSerie', () => {
  it('tire le nombre de questions demandé', () => {
    const pool = Array.from({ length: 30 }, (_, i) => makeQuestion({ q: `Question ${i} ?` }));
    const serie = tirerSerie(pool, 10, 2, 0, mulberry32(42));
    expect(serie).toHaveLength(10);
  });

  it('limite à 2 questions du même sujet', () => {
    const pool = [
      ...Array.from({ length: 6 }, (_, i) => makeQuestion({ q: `Question ${i} de One Piece ?` })),
      ...Array.from({ length: 10 }, (_, i) => makeQuestion({ q: `Question ${i} de Zelda ?` })),
      ...Array.from({ length: 10 }, (_, i) => makeQuestion({ q: `Question ${i} diverse ${i} ?` })),
    ];
    const serie = tirerSerie(pool, 10, 2, 0, mulberry32(7));
    const compte = (sujet) => serie.filter((q) => sujetDe(q.q) === sujet).length;
    expect(compte('one piece')).toBeLessThanOrEqual(2);
    expect(compte('zelda')).toBeLessThanOrEqual(2);
  });

  it('respecte le plafond par thème quand maxParTheme est positif et le pool assez grand', () => {
    // 6 thèmes x 8 questions = 48 questions, tirage de 10, plafond 2/thème :
    // 6 x 2 = 12 >= 10, donc aucune question ne dépasse le plafond.
    const pool = Array.from({ length: 6 }, (_, t) =>
      Array.from({ length: 8 }, (_, i) => makeQuestion({ q: `Question T${t} ${i} ?`, themeId: `t${t}` }))
    ).flat();
    const serie = tirerSerie(pool, 10, 2, 2, mulberry32(3));
    const compte = new Map();
    for (const q of serie) compte.set(q.themeId, (compte.get(q.themeId) || 0) + 1);
    for (const [, n] of compte) expect(n).toBeLessThanOrEqual(2);
  });

  it('est déterministe avec un générateur seedé', () => {
    const pool = Array.from({ length: 30 }, (_, i) => makeQuestion({ q: `Question ${i} ?` }));
    const a = tirerSerie(pool, 10, 2, 0, generateurGraine(123));
    const b = tirerSerie(pool, 10, 2, 0, generateurGraine(123));
    expect(a.map((q) => q.q)).toEqual(b.map((q) => q.q));
  });

  it('ne modifie pas le pool d\'origine', () => {
    const pool = Array.from({ length: 10 }, (_, i) => makeQuestion({ q: `Q${i}` }));
    const copie = [...pool];
    tirerSerie(pool, 5, 2, 0, mulberry32(1));
    expect(pool).toEqual(copie);
  });
});

describe('melanger / melangerSeed / hash', () => {
  it('melanger conserve les éléments', () => {
    const t = [1, 2, 3, 4, 5, 6, 7, 8];
    const m = melanger(t);
    expect([...m].sort()).toEqual(t);
    expect(t).toEqual([1, 2, 3, 4, 5, 6, 7, 8]); // original intact
  });

  it('melangerSeed est déterministe et conserve les éléments', () => {
    const t = [1, 2, 3, 4, 5];
    const a = melangerSeed(t, generateurGraine(9));
    const b = melangerSeed(t, generateurGraine(9));
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual(t);
  });

  it('hashTexte est stable et distinct pour deux textes', () => {
    expect(hashTexte('voltquiz-2026-01-01')).toBe(hashTexte('voltquiz-2026-01-01'));
    expect(hashTexte('a')).not.toBe(hashTexte('b'));
  });
});

describe('anti-répétition (séries mémorisées)', () => {
  it('sauvegarde et recharge une série (textes normalisés)', () => {
    const cle = cleSerie('solo', 'facile', 'test');
    sauverSerie(cle, [makeQuestion({ q: 'Question A ?' }), makeQuestion({ q: 'Question B ?' })]);
    // la série est stockée sous forme de textes normalisés (minuscules, sans ponctuation)
    expect(chargerSerie(cle)).toEqual(['question a', 'question b']);
  });

  it('retire du pool les questions de la dernière série jouée', () => {
    const pool = Array.from({ length: 20 }, (_, i) => makeQuestion({ q: `Q${i}` }));
    const cle = cleSerie('solo', 'facile', 'test');
    sauverSerie(cle, pool.slice(0, 10));
    const restant = poolSansSeriePrecedente(pool, cle, 10);
    expect(restant).toHaveLength(10);
    expect(restant.some((q) => q.q === 'Q0')).toBe(false);
  });
});
