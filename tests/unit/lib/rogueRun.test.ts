// tests/unit/lib/rogueRun.test.ts — fonctions pures du mode Rogue Quizz.
import { describe, expect, it } from 'vitest';
import { emptyRogueBonus } from '@lib/relics.js';
import type { RelicEffet } from '@lib/relics.js';
import {
  appliquerEffetPalier,
  appliquerEffetVies,
  appliquerMasquees,
  candidates,
  carrySuivant,
  dureeRogue,
  meilleurTheme,
  melangerReponses,
  niveauInferieur,
  niveauSuperieur,
  palierInitial,
  palierVide,
  questionDansPalier,
  reponsesAMasquer,
  viesPerdues,
  votePublicPcts,
} from '@lib/rogueRun.js';
import type { Question, Theme } from '@lib/types.js';

const q: Question = { q: 'Q ?', reponses: ['a', 'b', 'c', 'd'], bonne: 2, niveau: 'facile' } as Question;
const theme = (id: string, qs: Question[]): Theme => ({ id, nom: id, icone: 'x', couleur: '#000', questions: qs }) as Theme;
const fixe = (v: number) => () => v;

describe('palier', () => {
  it('palierVide est parfait et sans jackpot', () => {
    expect(palierVide()).toMatchObject({ parfait: true, jackpot: -1, erreurs: 0, reserve: 0 });
  });
  it('palierInitial pose le jackpot dans le palier et la réserve Marathon', () => {
    const b = { ...emptyRogueBonus(), jackpotMult: 2, marathon: { reserve: 80, mult: 3 } };
    const p = palierInitial(b, [], 10, fixe(0.5));
    expect(p.jackpot).toBe(15);
    expect(p.reserve).toBe(80);
  });
  it('questionDansPalier va de 1 à 10', () => {
    expect([questionDansPalier(0), questionDansPalier(9), questionDansPalier(10)]).toEqual([1, 10, 1]);
  });
});

describe('masquage des réponses', () => {
  it('50/50 retire 2 mauvaises, Domino ne garde que la bonne + 1 mauvaise', () => {
    const m = reponsesAMasquer(q, { cinquante: true, domino: false }, fixe(0));
    expect(m).toHaveLength(2);
    expect(m).not.toContain(q.bonne);
    const d = reponsesAMasquer(q, { cinquante: false, domino: true });
    expect(d).toHaveLength(2);
  });
  it('appliquerMasquees recale la bonne réponse', () => {
    const r = appliquerMasquees(q, [0, 1]);
    expect(r.reponses).toEqual(['c', 'd']);
    expect(r.bonne).toBe(0);
  });
  it('melangerReponses conserve la bonne réponse', () => {
    const r = melangerReponses(q, () => Math.random());
    expect(r.reponses[r.bonne]).toBe('c');
  });
  it('votePublicPcts met la bonne en tête quand le tirage est fiable', () => {
    const pcts = votePublicPcts(q, fixe(0.1));
    expect(pcts[q.bonne]).toBeGreaterThan(Math.max(...pcts.filter((_, i) => i !== q.bonne)));
  });
});

describe('thèmes et candidats', () => {
  const t1 = theme('a', [q, { ...q, q: 'Q2', niveau: 'dur' } as Question]);
  const t2 = theme('b', [{ ...q, q: 'Q3', niveau: 'dur' } as Question]);
  it('meilleurTheme compte les bonnes, repli sur le 1er thème', () => {
    expect(meilleurTheme([{ themeId: 'b', correct: true }, { themeId: 'a', correct: false }], [t1, t2])).toBe('b');
    expect(meilleurTheme([], [t1, t2])).toBe('a');
    expect(meilleurTheme([], [])).toBeNull();
  });
  it('candidates filtre par niveau, déjà jouées exclues, et tague le thème', () => {
    const c = candidates([t1, t2], 'dur', (x) => x === 'Q3');
    expect(c.map((x) => x.q)).toEqual(['Q2']);
    expect(c[0].themeId).toBe('a');
  });
  it('niveaux voisins', () => {
    expect(niveauInferieur('dur')).toBe('moyen');
    expect(niveauInferieur('facile')).toBe('facile');
    expect(niveauSuperieur('facile')).toBe('moyen');
    expect(niveauSuperieur('dur')).toBe('dur');
  });
});

describe('durée, carry, vies', () => {
  const base = { b: emptyRogueBonus(), niveau: 'facile', index: 0, carryBonus: 0, retourArriereMalus: 0, reserve: 0, streak: 0, fievreRestant: 0 };
  it('durée Marathon = réserve restante (min 1)', () => {
    expect(dureeRogue({ ...base, b: { ...base.b, marathon: { reserve: 80, mult: 3 } }, reserve: 42 })).toBe(42);
    expect(dureeRogue({ ...base, b: { ...base.b, marathon: { reserve: 80, mult: 3 } }, reserve: 0 })).toBe(1);
  });
  it('durée Fièvre remplace la durée', () => {
    expect(dureeRogue({ ...base, b: { ...base.b, fievre: { n: 3, s: 4, mult: 2 } }, fievreRestant: 2 })).toBe(4);
  });
  it('carry : nul sur erreur, plafonné par Horloge partagée', () => {
    const b = { ...emptyRogueBonus(), carryMax: 5 };
    expect(carrySuivant(b, false, 3, 20, 5)).toBe(0);
    expect(carrySuivant(b, true, 0, 20, 5)).toBe(5);
  });
  it('viesPerdues : Domino, Pari, Temps mort', () => {
    const b = { ...emptyRogueBonus(), dominoVies: 2, pari: true, tempsMort: true };
    expect(viesPerdues(b, { domino: true, pariPlace: true, tempsEcoule: false })).toBe(3);
    expect(viesPerdues(b, { domino: false, pariPlace: false, tempsEcoule: true })).toBe(0);
    expect(viesPerdues(emptyRogueBonus(), { domino: true, pariPlace: true, tempsEcoule: true })).toBe(1);
  });
});

describe('effets de relique', () => {
  it('appliquerEffetVies : cœur, verre cristal, pacte', () => {
    expect(appliquerEffetVies({ t: 'vie', n: 1, soin: 1 } as RelicEffet, 2, 3)).toEqual({ vies: 3, viesMax: 4 });
    expect(appliquerEffetVies({ t: 'verreCristal' } as RelicEffet, 3, 3)).toEqual({ vies: 1, viesMax: 1 });
    expect(appliquerEffetVies({ t: 'pacteVies', vies: 2, choix: 2 } as RelicEffet, 3, 3)).toEqual({ vies: 3, viesMax: 5 });
    expect(appliquerEffetVies({ t: 'echo' } as RelicEffet, 3, 3)).toEqual({ vies: 3, viesMax: 3 });
  });
  it('appliquerEffetPalier débloque les compteurs du palier courant', () => {
    const p = appliquerEffetPalier(palierVide(), { t: 'cinquante', n: 2, div: 2 } as RelicEffet, 4);
    expect(p.cinquante).toBe(2);
    const j = appliquerEffetPalier(palierVide(), { t: 'jackpotPalier' } as RelicEffet, 4, fixe(0));
    expect(j.jackpot).toBe(5);
    const m = appliquerEffetPalier(palierVide(), { t: 'marathon', reserve: 80, mult: 3 } as RelicEffet, 0);
    expect(m.reserve).toBe(80);
  });
});
