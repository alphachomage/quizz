// Tests des badges (src/lib/badges.js) : calcul depuis l'historique local.
import { describe, expect, it } from 'vitest';

import { addGame } from '@lib/game-history.js';

import { BADGES, computeBadges, prochainBadge } from '@/lib/badges.js';

describe('calculerBadges', () => {
  it('aucune partie = tous les badges verrouillés', () => {
    const badges = computeBadges();
    expect(badges).toHaveLength(BADGES.length);
    expect(badges.every((b) => !b.debloque)).toBe(true);
  });

  it('une partie jouée débloque le badge "première partie"', () => {
    addGame({
      mode: 'solo',
      niveau: 'facile',
      themeId: 'test',
      players: ['testeur'],
      scores: [100],
      bonnes: [8],
      total: 10,
      details: [],
      date: new Date().toISOString(),
    });
    const badges = computeBadges();
    const premiere = badges.find((b) => b.id === 'parties-1');
    expect(premiere.debloque).toBe(true);
  });

  it('prochainBadge propose un badge verrouillé avec sa progression', () => {
    const p = prochainBadge();
    expect(p).toBeTruthy();
    expect(p.id).toBeTruthy();
    expect(p.cible).toBeGreaterThan(0);
    expect(p.actuel).toBeGreaterThanOrEqual(0);
    expect(p.pct).toBeGreaterThanOrEqual(0);
    expect(p.pct).toBeLessThan(1); // verrouillé
  });
});
