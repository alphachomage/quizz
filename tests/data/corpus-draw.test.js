// tests/data/corpus-draw.test.js — diversité du tirage vérifiée sur le VRAI corpus
// (chargé via loadThemes(), comme questions-schema.test.js). Porté depuis l'ancienne
// suite legacy : max 2 questions du même sujet en solo, plafond par thème en survie,
// quizz du jour déterministe et max 2 questions du même thème.
import { describe, expect, it } from 'vitest';

import { dailyQuestions, drawSeries, subjectOf } from '@lib/draw.js';
import { loadThemes } from '@/data/questions.js';

const THEMES = await loadThemes();

describe('tirage sur le vrai corpus', () => {
  it('solo (thème mangas) : 300 séries de 10 questions, jamais 3+ du même sujet', () => {
    const mangas = THEMES.find((t) => t.id === 'mangas-animes');
    let maxPerSubject = 0;
    let series3plus = 0;
    for (let i = 0; i < 300; i++) {
      const serie = drawSeries(mangas.questions, 10, 2, 0);
      expect(serie).toHaveLength(10);
      const count = new Map();
      for (const q of serie) {
        const s = subjectOf(q.q);
        if (s) count.set(s, (count.get(s) || 0) + 1);
      }
      const mx = count.size ? Math.max(...count.values()) : 0;
      maxPerSubject = Math.max(maxPerSubject, mx);
      if (mx >= 3) series3plus++;
    }
    expect(maxPerSubject).toBeLessThanOrEqual(2);
    expect(series3plus).toBe(0);
  });

  it('survie (tous thèmes) : 200 séries de 30, plafond par thème respecté, 8+ thèmes touchés', () => {
    const pool = THEMES.flatMap((t) => t.questions.map((q) => ({ ...q, themeId: t.id })));
    const N = 30;
    const maxPerTheme = Math.max(2, Math.ceil(N / THEMES.length) + 1);
    let over = 0;
    let minThemesHit = 99;
    for (let i = 0; i < 200; i++) {
      const serie = drawSeries(pool, N, 2, maxPerTheme);
      const count = new Map();
      for (const q of serie) count.set(q.themeId, (count.get(q.themeId) || 0) + 1);
      const mx = Math.max(...count.values());
      if (mx > maxPerTheme) over++;
      minThemesHit = Math.min(minThemesHit, count.size);
    }
    expect(over).toBe(0);
    expect(minThemesHit).toBeGreaterThanOrEqual(8);
  });

  it('quotidien : même tirage le même jour, différent le lendemain, max 2/theme', () => {
    const a = dailyQuestions(THEMES, '2026-11-19').map((q) => q.q).join('|');
    const b = dailyQuestions(THEMES, '2026-11-19').map((q) => q.q).join('|');
    const c = dailyQuestions(THEMES, '2026-11-20').map((q) => q.q).join('|');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    const count = new Map();
    for (const q of dailyQuestions(THEMES, '2026-11-19')) {
      count.set(q.themeId, (count.get(q.themeId) || 0) + 1);
    }
    expect(Math.max(...count.values())).toBeLessThanOrEqual(2);
  });
});
