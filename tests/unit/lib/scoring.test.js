// Tests du scoring arcade et des manches (src/lib (modules)).
import { describe, expect, it } from 'vitest';

import { infoManche, pointsPour, TEMPS_PAR_QUESTION } from '@lib/index.js';

describe('pointsPour', () => {
  it('vaut 20 pts pour une bonne réponse instantanée', () => {
    expect(pointsPour(true, 0)).toBe(20);
  });

  it('perd 1 point par seconde écoulée', () => {
    expect(pointsPour(true, 5)).toBe(15);
    expect(pointsPour(true, 9)).toBe(11);
  });

  it('est plafonné à 10 pts minimum', () => {
    expect(pointsPour(true, 10)).toBe(10);
    expect(pointsPour(true, 999)).toBe(10);
  });

  it('vaut 0 pour une mauvaise réponse, même instantanée', () => {
    expect(pointsPour(false, 0)).toBe(0);
    expect(pointsPour(false, 3)).toBe(0);
  });

  it('est doublé en manche bonus', () => {
    expect(pointsPour(true, 0, true)).toBe(40);
    expect(pointsPour(true, 5, true)).toBe(30);
    expect(pointsPour(true, 10, true)).toBe(20);
    expect(pointsPour(false, 0, true)).toBe(0);
  });

  it('utilise un plancher sur les secondes (partie entière)', () => {
    expect(pointsPour(true, 2.9)).toBe(18);
    expect(pointsPour(true, 3.0)).toBe(17);
  });
});

describe('infoManche', () => {
  it('découpe une partie de 10 questions en 3 manches (4 + 4 + 2)', () => {
    expect(infoManche(0, 10)).toEqual({ manche: 1, bonus: false });
    expect(infoManche(3, 10)).toEqual({ manche: 1, bonus: false });
    expect(infoManche(4, 10)).toEqual({ manche: 2, bonus: false });
    expect(infoManche(7, 10)).toEqual({ manche: 2, bonus: false });
    expect(infoManche(8, 10)).toEqual({ manche: 3, bonus: true });
    expect(infoManche(9, 10)).toEqual({ manche: 3, bonus: true });
  });

  it('ne dépasse jamais la manche 3', () => {
    expect(infoManche(50, 10).manche).toBe(3);
  });

  it('marque la dernière manche bonus en duel (6 questions : 2 + 2 + 2)', () => {
    expect(infoManche(4, 6)).toEqual({ manche: 3, bonus: true });
    expect(infoManche(5, 6)).toEqual({ manche: 3, bonus: true });
  });
});

describe('constantes du jeu', () => {
  it('définit un minuteur de 10 secondes', () => {
    expect(TEMPS_PAR_QUESTION).toBe(10);
  });
});
