// Tests de la détection de similarité (src/lib/similarity.ts) : normalisation
// sans accents/ponctuation, score de Jaccard mots + bigrammes, seuils.
import { describe, expect, it } from 'vitest';
import {
  normalize,
  THRESHOLD_IDENTICAL,
  THRESHOLD_SIMILAR,
  buildIndex,
  trouverSimilairesIndex,
} from '@/lib/similarity.js';
describe('normaliser', () => {
  it('met en minuscules, sans accents ni ponctuation', () => {
    expect(normalize("Élégant, l'Été à Paris !")).toBe('elegant l ete a paris');
  });
  it('renvoie une chaîne vide pour un texte vide', () => {
    expect(normalize('')).toBe('');
    expect(normalize(null)).toBe('');
  });
});
// Score entre deux textes via l'index (seule API publique de l'appli).
function score(a: string, b: string): number {
  const res = trouverSimilairesIndex(a, buildIndex([{ q: b }]), 0, 1);
  return res.length ? res[0].score : 0;
}
describe('scoreSimilarite', () => {
  it('vaut 1 pour deux textes identiques', () => {
    expect(
      score(
        'Quelle est la capitale de la France ?',
        'Quelle est la capitale de la France ?'
      )
    ).toBe(1);
  });
  it('vaut 1 même avec accents/ponctuation/casse différents', () => {
    expect(
      score(
        'Quelle est la capitale de la France ?',
        'quelle est la capitale de la france'
      )
    ).toBe(1);
  });
  it('dépasse le seuil de similarité pour une reformulation proche', () => {
    const a = 'En quelle année a eu lieu la Révolution française ?';
    const b = 'En quelle année la Révolution française a-t-elle eu lieu ?';
    expect(score(a, b)).toBeGreaterThan(THRESHOLD_SIMILAR);
  });
  it('reste sous le seuil pour deux sujets sans rapport', () => {
    const a = 'Quelle est la capitale du Japon ?';
    const b = 'Qui a peint la Joconde ?';
    expect(score(a, b)).toBeLessThan(THRESHOLD_SIMILAR);
  });
  it('vaut 0 si un texte est vide', () => {
    expect(score('', 'quelque chose')).toBe(0);
  });
});
describe('trouverSimilairesIndex', () => {
  const pool = [
    {
      q: 'Quelle est la capitale de la France ?',
      themeName: 'Géographie',
      themeColor: '#2dd4bf',
    },
    {
      q: 'Quelle est la capitale de la France en Europe ?',
      themeName: 'Géographie',
      themeColor: '#2dd4bf',
    },
    {
      q: 'Qui a peint la Joconde ?',
      themeName: 'Cinéma',
      themeColor: '#fb7185',
    },
  ];
  it('trouve les questions proches triées par score décroissant', () => {
    const res = trouverSimilairesIndex('Quelle est la capitale de la France ?', buildIndex(pool));
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].question.q).toContain('capitale de la France');
    expect(res[0].score).toBeGreaterThanOrEqual(res[res.length - 1].score);
  });
  it('le seuil quasi-identique est supérieur au seuil de similarité', () => {
    expect(THRESHOLD_IDENTICAL).toBeGreaterThan(THRESHOLD_SIMILAR);
  });
});
describe('index pré-calculé (construireIndex + trouverSimilairesIndex)', () => {
  const pool = [
    {
      q: 'Quelle est la capitale de la France ?',
      themeName: 'Géographie',
    },
    {
      q: 'Quelle est la capitale de la France en Europe ?',
      themeName: 'Géographie',
    },
    {
      q: 'Qui a peint la Joconde ?',
      themeName: 'Cinéma',
    },
    {
      q: 'En quelle année a eu lieu la Révolution française ?',
      themeName: 'Histoire',
    },
  ];
  it('respecte le seuil et la limite max', () => {
    const index = buildIndex(pool);
    const res = trouverSimilairesIndex('capitale de la France', index, 0.4, 1);
    expect(res).toHaveLength(1);
    expect(res[0].score).toBeGreaterThanOrEqual(0.4);
  });
});
