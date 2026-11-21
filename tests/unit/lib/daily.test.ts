// Tests du quizz du jour (src/lib (modules)) : tirage seedé identique pour tous
// le même jour, diversifié (max 2 par sujet, max 2 par thème), et qui change de jour.
import { describe, expect, it } from 'vitest';
import { DAILY_QUESTIONS } from '@lib/scoring.js';
import { isThisWeek, localDayKey, todayDate } from '@lib/dates.js';
import { dailyQuestions, subjectOf } from '@lib/draw.js';
import { makeThemes } from '../../fixtures/questions.fixture.js';
const themes = makeThemes(6, 10); // 6 thèmes x 30 questions = 180 questions

describe('questionsQuotidien', () => {
  it('tire exactement 10 questions', () => {
    const q = dailyQuestions(themes, '2026-01-15');
    expect(q).toHaveLength(DAILY_QUESTIONS);
  });
  it('est déterministe : même date = même tirage (mêmes questions, même ordre)', () => {
    const a = dailyQuestions(themes, '2026-01-15');
    const b = dailyQuestions(themes, '2026-01-15');
    expect(a.map((x) => x.q)).toEqual(b.map((x) => x.q));
    expect(a.map((x) => x.bonne)).toEqual(b.map((x) => x.bonne));
  });
  it('change de tirage le jour suivant', () => {
    const a = dailyQuestions(themes, '2026-01-15');
    const b = dailyQuestions(themes, '2026-01-16');
    expect(a.map((x) => x.q)).not.toEqual(b.map((x) => x.q));
  });
  it('diversifie : max 2 questions du même sujet et 2 du même thème', () => {
    const q = dailyQuestions(themes, '2026-02-02');
    const accountSubjects = new Map<string, number>();
    const accountThemes = new Map<string, number>();
    for (const x of q) {
      const s = subjectOf(x.q);
      if (s) accountSubjects.set(s, (accountSubjects.get(s) || 0) + 1);
      accountThemes.set(x.themeId, (accountThemes.get(x.themeId) || 0) + 1);
    }
    for (const [, n] of accountSubjects) expect(n).toBeLessThanOrEqual(2);
    for (const [, n] of accountThemes) expect(n).toBeLessThanOrEqual(2);
  });
  it('chaque question a ses réponses mélangées mais une bonne réponse valide', () => {
    const q = dailyQuestions(themes, '2026-03-03');
    for (const x of q) {
      expect(x.reponses).toHaveLength(4);
      expect(x.bonne).toBeGreaterThanOrEqual(0);
      expect(x.bonne).toBeLessThan(x.reponses.length);
      expect(x.reponses[x.bonne]).toMatch(/^R/); // la bonne réponse vient bien du fixture
    }
  });
  it('dateAujourdhui est au format AAAA-MM-JJ', () => {
    expect(todayDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('semaine en cours (lundi -> dimanche)', () => {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const tenDaysAgo = new Date(now);
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
  const nextMonday = new Date(monday);
  nextMonday.setDate(nextMonday.getDate() + 7);

  it('aujourd’hui et lundi de cette semaine sont dedans', () => {
    expect(isThisWeek(now.toISOString())).toBe(true);
    expect(isThisWeek(monday.toISOString())).toBe(true);
  });
  it('il y a 10 jours et lundi prochain sont dehors', () => {
    expect(isThisWeek(tenDaysAgo.toISOString())).toBe(false);
    expect(isThisWeek(nextMonday.toISOString())).toBe(false);
  });
  it('localDayKey est au format AAAA-MM-JJ', () => {
    expect(localDayKey(now)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
