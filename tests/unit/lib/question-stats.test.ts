// Tests de src/lib/question-stats.ts : stats de qualité par question (taux de réussite
// depuis l'historique des parties) et filtre automatique du pool de tirage.
import { beforeEach, describe, expect, it } from 'vitest';
import type { GameDetail, Question } from '@lib/types.js';
import {
  MIN_EVALS,
  loadQuestionStats,
  recordResults,
  successRate,
  isSuspecte,
  filterByQuality,
} from '@lib/question-stats.js';

function detail(q: string, correct: boolean): GameDetail {
  return { themeId: 'culture-generale', niveau: 'moyen', correct, gain: 10, q };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('question-stats — enregistrement et taux de réussite', () => {
  it('recordResults cumule total/correct par texte normalisé', () => {
    recordResults([detail('Capitale de la France ?', true), detail('Capitale de la France ?', false)]);
    recordResults([detail('  CAPITALE de la france ! ', true)]);
    const stats = loadQuestionStats();
    const k = Object.keys(stats)[0];
    expect(stats[k].total).toBe(3);
    expect(stats[k].correct).toBe(2);
    expect(successRate('Capitale de la France ?')).toBeCloseTo(2 / 3);
  });

  it('successRate renvoie null sans assez de données', () => {
    expect(successRate('Question inconnue ?')).toBeNull();
    recordResults([detail('Une question ?', true)]);
    expect(successRate('Une question ?', MIN_EVALS)).toBeNull();
    expect(successRate('Une question ?', 1)).toBe(1);
  });

  it('les détails sans q sont ignorés', () => {
    recordResults([{ themeId: 'x', niveau: 'moyen', correct: true, gain: 10 }]);
    expect(loadQuestionStats()).toEqual({});
  });
});

describe('question-stats — filtre qualité du pool', () => {
  const pool: Question[] = [
    { q: 'Question fausse ?', reponses: ['a', 'b'], bonne: 0, niveau: 'moyen' },
    { q: 'Question normale ?', reponses: ['a', 'b'], bonne: 0, niveau: 'moyen' },
    { q: 'Question facile ?', reponses: ['a', 'b'], bonne: 0, niveau: 'dur' },
  ];

  function remplir(q: string, correct: boolean, n: number): void {
    recordResults(Array.from({ length: n }, () => detail(q, correct)));
  }

  it('retire une question probablement fausse (taux < 5 % après MIN_EVALS)', () => {
    remplir('Question fausse ?', false, MIN_EVALS); // 0 %
    remplir('Question normale ?', true, MIN_EVALS); // 100 %
    const out = filterByQuality(pool, 'moyen', 1);
    expect(out.find((q) => q.q === 'Question fausse ?')).toBeUndefined();
    expect(out.find((q) => q.q === 'Question normale ?')).toBeDefined();
  });

  it('en niveau dur, retire aussi une question trop facile (taux > 98 %)', () => {
    remplir('Question facile ?', true, MIN_EVALS); // 100 % en dur
    const out = filterByQuality(pool, 'dur', 1);
    expect(out.find((q) => q.q === 'Question facile ?')).toBeUndefined();
    // en niveau moyen, la même question reste (pas considérée comme trop facile)
    const out2 = filterByQuality(pool, 'moyen', 1);
    expect(out2.find((q) => q.q === 'Question facile ?')).toBeDefined();
  });

  it('ne juge pas une question avec moins de MIN_EVALS évaluations', () => {
    remplir('Question fausse ?', false, MIN_EVALS - 1); // 0 % mais pas assez joué
    const out = filterByQuality(pool, 'moyen', 1);
    expect(out.find((q) => q.q === 'Question fausse ?')).toBeDefined();
  });

  it('garde le pool d’origine si le filtre le vide trop (moins que nbMin)', () => {
    remplir('Question fausse ?', false, MIN_EVALS);
    remplir('Question normale ?', false, MIN_EVALS);
    remplir('Question facile ?', false, MIN_EVALS);
    // nbMin = 4 > pool.length -> on garde tout plutôt que de vider
    const out = filterByQuality(pool, 'moyen', 4);
    expect(out).toHaveLength(3);
  });

  it('isSuspecte reflète le taux après MIN_EVALS', () => {
    remplir('Question fausse ?', false, MIN_EVALS);
    expect(isSuspecte('Question fausse ?', 'moyen')).toBe(true);
    expect(isSuspecte('Question normale ?', 'moyen')).toBe(false);
  });
});
