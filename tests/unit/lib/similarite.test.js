// Tests de la détection de similarité (src/lib/similarite.js) : normalisation
// sans accents/ponctuation, score de Jaccard mots + bigrammes, seuils.
import { describe, expect, it } from 'vitest';

import {
  normaliser,
  scoreSimilarite,
  SEUIL_IDENTIQUE,
  SEUIL_SIMILAIRE,
  trouverSimilaires,
} from '@/lib/similarite.js';

describe('normaliser', () => {
  it('met en minuscules, sans accents ni ponctuation', () => {
    expect(normaliser('Élégant, l\'Été à Paris !')).toBe('elegant l ete a paris');
  });

  it('renvoie une chaîne vide pour un texte vide', () => {
    expect(normaliser('')).toBe('');
    expect(normaliser(null)).toBe('');
  });
});

describe('scoreSimilarite', () => {
  it('vaut 1 pour deux textes identiques', () => {
    expect(scoreSimilarite('Quelle est la capitale de la France ?', 'Quelle est la capitale de la France ?')).toBe(1);
  });

  it('vaut 1 même avec accents/ponctuation/casse différents', () => {
    expect(scoreSimilarite('Quelle est la capitale de la France ?', 'quelle est la capitale de la france')).toBe(1);
  });

  it('dépasse le seuil de similarité pour une reformulation proche', () => {
    const a = 'En quelle année a eu lieu la Révolution française ?';
    const b = 'En quelle année la Révolution française a-t-elle eu lieu ?';
    expect(scoreSimilarite(a, b)).toBeGreaterThan(SEUIL_SIMILAIRE);
  });

  it('reste sous le seuil pour deux sujets sans rapport', () => {
    const a = 'Quelle est la capitale du Japon ?';
    const b = 'Qui a peint la Joconde ?';
    expect(scoreSimilarite(a, b)).toBeLessThan(SEUIL_SIMILAIRE);
  });

  it('vaut 0 si un texte est vide', () => {
    expect(scoreSimilarite('', 'quelque chose')).toBe(0);
  });
});

describe('trouverSimilaires', () => {
  const pool = [
    { q: 'Quelle est la capitale de la France ?', themeNom: 'Géographie', themeCouleur: '#2dd4bf' },
    { q: 'Quelle est la capitale de la France en Europe ?', themeNom: 'Géographie', themeCouleur: '#2dd4bf' },
    { q: 'Qui a peint la Joconde ?', themeNom: 'Cinéma', themeCouleur: '#fb7185' },
  ];

  it('trouve les questions proches triées par score décroissant', () => {
    const res = trouverSimilaires('Quelle est la capitale de la France ?', pool);
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].question.q).toContain('capitale de la France');
    expect(res[0].score).toBeGreaterThanOrEqual(res[res.length - 1].score);
  });

  it('le seuil quasi-identique est supérieur au seuil de similarité', () => {
    expect(SEUIL_IDENTIQUE).toBeGreaterThan(SEUIL_SIMILAIRE);
  });
});
