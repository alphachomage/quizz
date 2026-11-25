// tests/unit/lib/relics.test.ts — le catalogue des 60 reliques et le moteur de bonus.
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import {
  RELICS,
  RARETE_POIDS,
  computeRogueBonus,
  drawRelicChoices,
  emptyRogueBonus,
  gainRogue,
  nbAPrendre,
  nbPropositions,
  scoreFinalRogue,
} from '@lib/relics.js';
import { mulberry32 } from '../../fixtures/questions.fixture.js';

describe('catalogue des reliques', () => {
  it('contient exactement 60 reliques, ids uniques, raretés 24/18/12/6', () => {
    expect(RELICS).toHaveLength(60);
    expect(new Set(RELICS.map((r) => r.id)).size).toBe(60);
    const compte: Record<string, number> = {};
    for (const r of RELICS) compte[r.rarete] = (compte[r.rarete] || 0) + 1;
    expect(compte).toEqual({ commun: 24, rare: 18, epique: 12, legendaire: 6 });
    for (const r of RELICS) {
      expect(r.nom.length).toBeGreaterThan(0);
      expect(r.desc.length).toBeGreaterThan(0);
      expect(r.icone.length).toBeGreaterThan(0);
      expect(RARETE_POIDS[r.rarete]).toBeGreaterThan(0);
    }
  });
});

describe('tirage des propositions', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(7));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('propose 3 reliques distinctes, sans remise avec les déjà prises', () => {
    const deja = ['cuillere-or', 'sablier'];
    const choix = drawRelicChoices(deja, 3);
    expect(choix).toHaveLength(3);
    expect(new Set(choix.map((r) => r.id)).size).toBe(3);
    for (const r of choix) expect(deja).not.toContain(r.id);
    // deuxième tirage : toujours disjoint du premier
    const choix2 = drawRelicChoices([...deja, ...choix.map((r) => r.id)], 3);
    for (const r of choix2) expect(choix.map((c) => c.id)).not.toContain(r.id);
  });
  it('ne propose plus rien quand le pool est épuisé', () => {
    const tout = RELICS.map((r) => r.id);
    expect(drawRelicChoices(tout, 3)).toHaveLength(0);
  });
});

describe('bonus agrégés et gains', () => {
  it('sans relique : bonus neutres, gain = base arcade', () => {
    const b = emptyRogueBonus();
    expect(gainRogue(b, { correct: true, secondesEcoulees: 0, mancheBonus: false, streak: 1, bonnesAvant: 0, index: 0, niveau: 'facile', themeId: 't', themePrecedent: null, themeDejaVu: false, themeCibleId: null }, 0)).toBe(20);
    // 5 s écoulées -> 15 pts
    expect(gainRogue(b, { correct: true, secondesEcoulees: 5, mancheBonus: false, streak: 1, bonnesAvant: 0, index: 0, niveau: 'facile', themeId: 't', themePrecedent: null, themeDejaVu: false, themeCibleId: null }, 0)).toBe(15);
    // mauvaise réponse -> 0
    expect(gainRogue(b, { correct: false, secondesEcoulees: 0, mancheBonus: false, streak: 0, bonnesAvant: 0, index: 0, niveau: 'facile', themeId: 't', themePrecedent: null, themeDejaVu: false, themeCibleId: null }, 0)).toBe(0);
  });
  it('computeRogueBonus cumule les effets (flat + pct + timer)', () => {
    const cuillere = RELICS.find((r) => r.id === 'cuillere-or')!; // flat +5
    const piece = RELICS.find((r) => r.id === 'petite-piece')!; // pct +25
    const sablier = RELICS.find((r) => r.id === 'sablier')!; // timer +3
    const b = computeRogueBonus([cuillere, piece, sablier]);
    expect(b.flat).toBe(5);
    expect(b.pct).toBe(25);
    expect(b.timerBonus).toBe(3);
    const g = gainRogue(b, { correct: true, secondesEcoulees: 0, mancheBonus: false, streak: 1, bonnesAvant: 0, index: 0, niveau: 'facile', themeId: 't', themePrecedent: null, themeDejaVu: false, themeCibleId: null }, 0);
    expect(g).toBe(Math.round(20 * 1.25 + 5)); // 30
  });
  it('Assurance = plancher de 500 pts sur le score final', () => {
    const assurance = RELICS.find((r) => r.id === 'assurance')!;
    const b = computeRogueBonus([assurance]);
    expect(b.plancher).toBe(500);
    expect(scoreFinalRogue(b, 120, false, 3)).toBe(500); // plancher
    expect(scoreFinalRogue(b, 900, false, 3)).toBe(900); // au-dessus, inchangé
  });
  it('Fusée : score final ×2 si run gagnée à 100', () => {
    const fusee = RELICS.find((r) => r.id === 'fusee')!;
    const b = computeRogueBonus([fusee]);
    expect(scoreFinalRogue(b, 1000, true, 99)).toBe(2000);
    expect(scoreFinalRogue(b, 1000, false, 42)).toBe(1000);
  });
  it('jackpot remplace le gain de la question', () => {
    const b = emptyRogueBonus();
    expect(gainRogue(b, { correct: true, secondesEcoulees: 0, mancheBonus: false, streak: 1, bonnesAvant: 0, index: 0, niveau: 'facile', themeId: 't', themePrecedent: null, themeDejaVu: false, themeCibleId: null }, 500)).toBe(500);
  });
  it('choixPlus / doubleChoix / choixMax modifient le nombre de propositions', () => {
    const b0 = emptyRogueBonus();
    expect(nbPropositions(b0)).toBe(3);
    expect(nbAPrendre(b0)).toBe(1);
    const des = RELICS.find((r) => r.id === 'des-fortune')!; // choixPlus +1
    const b1 = computeRogueBonus([des]);
    expect(nbPropositions(b1)).toBe(4);
    const double = RELICS.find((r) => r.id === 'double-choix')!;
    const b2 = computeRogueBonus([double]);
    expect(nbAPrendre(b2)).toBe(2);
    const x4 = RELICS.find((r) => r.id === 'relique-x4')!;
    const b3 = computeRogueBonus([x4]);
    expect(nbPropositions(b3)).toBe(6);
    expect(nbAPrendre(b3)).toBe(2);
  });
});
