// Tests des titres de profil (src/lib/titles.ts) : 50 titres calculés depuis la
// progression, et prochain titre proposé avec sa progression (porté du legacy).
import { beforeEach, describe, expect, it } from 'vitest';

import { computeTitles, nextTitle } from '@/lib/titles.js';

beforeEach(() => {
  window.localStorage.clear();
});

describe('titres', () => {
  it('50 titres définis', () => {
    expect(computeTitles()).toHaveLength(50);
  });

  it('nextTitle propose un titre verrouillé avec sa progression (palier 3, niveau 1 au départ)', () => {
    const t = nextTitle();
    expect(t).toBeTruthy();
    expect(t?.target).toBe(3);
    expect(t?.current).toBe(1);
  });
});
