// Tests du quizz du jour (src/lib/logique.js) : tirage seedé identique pour tous
// le même jour, diversifié (max 2 par sujet, max 2 par thème), et qui change de jour.
import { describe, expect, it } from 'vitest';

import { QUESTIONS_QUOTIDIEN, dateAujourdhui, questionsQuotidien, sujetDe } from '@/lib/logique.js';

import { makeThemes } from '../../fixtures/questions.fixture.js';

const themes = makeThemes(6, 10); // 6 thèmes x 30 questions = 180 questions

describe('questionsQuotidien', () => {
  it('tire exactement 10 questions', () => {
    const q = questionsQuotidien(themes, '2026-01-15');
    expect(q).toHaveLength(QUESTIONS_QUOTIDIEN);
  });

  it('est déterministe : même date = même tirage (mêmes questions, même ordre)', () => {
    const a = questionsQuotidien(themes, '2026-01-15');
    const b = questionsQuotidien(themes, '2026-01-15');
    expect(a.map((x) => x.q)).toEqual(b.map((x) => x.q));
    expect(a.map((x) => x.bonne)).toEqual(b.map((x) => x.bonne));
  });

  it('change de tirage le jour suivant', () => {
    const a = questionsQuotidien(themes, '2026-01-15');
    const b = questionsQuotidien(themes, '2026-01-16');
    expect(a.map((x) => x.q)).not.toEqual(b.map((x) => x.q));
  });

  it('diversifie : max 2 questions du même sujet et 2 du même thème', () => {
    const q = questionsQuotidien(themes, '2026-02-02');
    const compteSujets = new Map();
    const compteThemes = new Map();
    for (const x of q) {
      const s = sujetDe(x.q);
      if (s) compteSujets.set(s, (compteSujets.get(s) || 0) + 1);
      compteThemes.set(x.themeId, (compteThemes.get(x.themeId) || 0) + 1);
    }
    for (const [, n] of compteSujets) expect(n).toBeLessThanOrEqual(2);
    for (const [, n] of compteThemes) expect(n).toBeLessThanOrEqual(2);
  });

  it('chaque question a ses réponses mélangées mais une bonne réponse valide', () => {
    const q = questionsQuotidien(themes, '2026-03-03');
    for (const x of q) {
      expect(x.reponses).toHaveLength(4);
      expect(x.bonne).toBeGreaterThanOrEqual(0);
      expect(x.bonne).toBeLessThan(x.reponses.length);
      expect(x.reponses[x.bonne]).toMatch(/^R/); // la bonne réponse vient bien du fixture
    }
  });

  it('dateAujourdhui est au format AAAA-MM-JJ', () => {
    expect(dateAujourdhui()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
