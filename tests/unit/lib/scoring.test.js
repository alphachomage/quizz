// Tests du scoring arcade et des manches (src/lib (modules)).
import { describe, expect, it } from 'vitest';

import { roundInfo, pointsFor, SECONDS_PER_QUESTION } from '@lib/scoring.js';

describe('pointsPour', () => {
  it('vaut 20 pts pour une bonne réponse instantanée', () => {
    expect(pointsFor(true, 0)).toBe(20);
  });

  it('perd 1 point par seconde écoulée', () => {
    expect(pointsFor(true, 5)).toBe(15);
    expect(pointsFor(true, 9)).toBe(11);
  });

  it('est plafonné à 10 pts minimum', () => {
    expect(pointsFor(true, 10)).toBe(10);
    expect(pointsFor(true, 999)).toBe(10);
  });

  it('vaut 0 pour une mauvaise réponse, même instantanée', () => {
    expect(pointsFor(false, 0)).toBe(0);
    expect(pointsFor(false, 3)).toBe(0);
  });

  it('est doublé en manche bonus', () => {
    expect(pointsFor(true, 0, true)).toBe(40);
    expect(pointsFor(true, 5, true)).toBe(30);
    expect(pointsFor(true, 10, true)).toBe(20);
    expect(pointsFor(false, 0, true)).toBe(0);
  });

  it('utilise un plancher sur les secondes (partie entière)', () => {
    expect(pointsFor(true, 2.9)).toBe(18);
    expect(pointsFor(true, 3.0)).toBe(17);
  });
});

describe('infoManche', () => {
  it('découpe une partie de 10 questions en 3 manches (4 + 4 + 2)', () => {
    expect(roundInfo(0, 10)).toEqual({ manche: 1, bonus: false });
    expect(roundInfo(3, 10)).toEqual({ manche: 1, bonus: false });
    expect(roundInfo(4, 10)).toEqual({ manche: 2, bonus: false });
    expect(roundInfo(7, 10)).toEqual({ manche: 2, bonus: false });
    expect(roundInfo(8, 10)).toEqual({ manche: 3, bonus: true });
    expect(roundInfo(9, 10)).toEqual({ manche: 3, bonus: true });
  });

  it('ne dépasse jamais la manche 3', () => {
    expect(roundInfo(50, 10).manche).toBe(3);
  });

  it('marque la dernière manche bonus en duel (6 questions : 2 + 2 + 2)', () => {
    expect(roundInfo(4, 6)).toEqual({ manche: 3, bonus: true });
    expect(roundInfo(5, 6)).toEqual({ manche: 3, bonus: true });
  });
});

describe('constantes du jeu', () => {
  it('définit un minuteur de 10 secondes', () => {
    expect(SECONDS_PER_QUESTION).toBe(10);
  });
});
