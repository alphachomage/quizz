// Tests des badges (src/lib/badges.ts) : calcul depuis l'historique local.
import { describe, expect, it } from 'vitest';
import { addGame } from '@lib/game-history.js';
import type { NewGame } from '@lib/game-history.js';
import { BADGES, computeBadges, nextBadge } from '@/lib/badges.js';
describe('calculerBadges', () => {
  it('aucune partie = tous les badges verrouillés', () => {
    const badges = computeBadges();
    expect(badges).toHaveLength(39); // 30 historiques + 9 liés aux 4 nouveaux thèmes
    expect(badges).toHaveLength(BADGES.length);
    expect(badges.every((b) => !b.debloque)).toBe(true);
  });
  it('une partie jouée débloque le badge "première partie"', () => {
    // players/scores/bonnes sont au format GameResult (pas StoredGame) : cast pour la fixture.
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
    } as unknown as NewGame);
    const badges = computeBadges();
    const premiere = badges.find((b) => b.id === 'parties-1');
    expect(premiere?.debloque).toBe(true);
  });
  it('prochainBadge propose un badge verrouillé avec sa progression', () => {
    const p = nextBadge();
    expect(p).toBeTruthy();
    expect(p?.id).toBeTruthy();
    expect(p?.target).toBeGreaterThan(0);
    expect(p?.current).toBeGreaterThanOrEqual(0);
    expect(p?.pct).toBeGreaterThanOrEqual(0);
    expect(p?.pct).toBeLessThan(1); // verrouillé
  });
});
