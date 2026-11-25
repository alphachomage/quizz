// tests/unit/lib/scoring.test.ts — durées par niveau et score ramené à la durée réelle.
import { describe, expect, it } from 'vitest';
import { DUR_BONUS_DUR, dureePourNiveau, pointsFor, SECONDS_PER_QUESTION } from '@lib/scoring.js';

describe('durée des questions', () => {
  it('10 s de base, +3 s si niveau « dur »', () => {
    expect(SECONDS_PER_QUESTION).toBe(10);
    expect(DUR_BONUS_DUR).toBe(3);
    expect(dureePourNiveau('facile')).toBe(10);
    expect(dureePourNiveau('moyen')).toBe(10);
    expect(dureePourNiveau('dur')).toBe(13);
    expect(dureePourNiveau(null)).toBe(10);
  });
});

describe('pointsFor avec duration', () => {
  it('à duration = 10 s, identique à l’ancienne formule (20 - elapsed, min 10)', () => {
    expect(pointsFor(true, 0, false)).toBe(20);
    expect(pointsFor(true, 5, false)).toBe(15);
    expect(pointsFor(true, 10, false)).toBe(10);
    expect(pointsFor(true, 25, false)).toBe(10); // min
    expect(pointsFor(false, 0, false)).toBe(0);
    expect(pointsFor(true, 0, true)).toBe(40); // manche bonus x2
  });
  it('question « dur » (13 s) : le chrono des points est recalé sur 13 s', () => {
    // réponse instantanée -> 20 pts dans tous les cas
    expect(pointsFor(true, 0, false, 13)).toBe(20);
    // 6,5 s écoulées sur 13 -> 20 - floor(6.5*10/13) = 20 - 5 = 15 pts
    expect(pointsFor(true, 6.5, false, 13)).toBe(15);
    // toute la durée écoulée -> min 10 (et pas moins)
    expect(pointsFor(true, 13, false, 13)).toBe(10);
    // 10 s écoulées sur un timer de 13 s -> 20 - floor(10*10/13) = 20 - 7 = 13 pts
    expect(pointsFor(true, 10, false, 13)).toBe(13);
  });
});
