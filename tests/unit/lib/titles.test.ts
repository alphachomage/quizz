// Tests des titres de profil (src/lib/titles.ts) : 62 titres calculés depuis la
// progression, et prochain titre proposé avec sa progression (porté du legacy).
import { beforeEach, describe, expect, it } from 'vitest';

import { computeTitles, nextTitle } from '@/lib/titles.js';

beforeEach(() => {
  window.localStorage.clear();
});

describe('titres', () => {
  it('62 titres définis (50 historiques + 12 pour les 4 nouveaux thèmes)', () => {
    expect(computeTitles()).toHaveLength(62);
  });

  it('nextTitle propose un titre verrouillé avec sa progression (palier 3, niveau 1 au départ)', () => {
    const t = nextTitle();
    expect(t).toBeTruthy();
    expect(t?.target).toBe(3);
    expect(t?.current).toBe(1);
  });
});
