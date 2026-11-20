// Tests de la validation zod des données externes (src/lib/schema.js).
import { describe, expect, it } from 'vitest';

import { schemaQuestion, validerFichierPerso, validerSoumissions } from '@/lib/schema.js';

describe('schemaQuestion', () => {
  it('accepte une question valide', () => {
    expect(
      schemaQuestion.safeParse({ q: 'Capitale de la France ?', reponses: ['Paris', 'Lyon'], bonne: 0, niveau: 'facile' }).success
    ).toBe(true);
  });

  it('rejette une bonne réponse hors limites', () => {
    expect(
      schemaQuestion.safeParse({ q: 'Capitale ?', reponses: ['Paris', 'Lyon'], bonne: 5, niveau: 'facile' }).success
    ).toBe(false);
  });

  it('rejette moins de 2 réponses et un niveau inconnu', () => {
    expect(schemaQuestion.safeParse({ q: 'Q ?', reponses: ['a'], bonne: 0, niveau: 'facile' }).success).toBe(false);
    expect(schemaQuestion.safeParse({ q: 'Q ?', reponses: ['a', 'b'], bonne: 0, niveau: 'expert' }).success).toBe(false);
  });
});

describe('validerFichierPerso', () => {
  it('valide un fichier perso correct', () => {
    const data = {
      themes: [
        {
          id: 'mon-theme',
          nom: 'Mon thème',
          icone: 'question',
          couleur: '#ff6600',
          questions: [{ q: 'Ma question ?', reponses: ['A', 'B'], bonne: 1, niveau: 'moyen' }],
        },
      ],
    };
    const res = validerFichierPerso(data);
    expect(res).toBeTruthy();
    expect(res.themes[0].id).toBe('mon-theme');
  });

  it('renvoie null sur un fichier invalide (thème sans questions, mauvaise couleur...)', () => {
    expect(validerFichierPerso(null)).toBe(null);
    expect(validerFichierPerso({ themes: [] })).toBe(null);
    expect(validerFichierPerso({ themes: [{ id: 'x', questions: [] }] })).toBe(null);
    expect(validerFichierPerso({ themes: [{ id: 'Bad Id!', couleur: 'rouge', questions: [{ q: 'Q ?', reponses: ['a', 'b'], bonne: 0, niveau: 'facile' }] }] })).toBe(null);
  });
});

describe('validerSoumissions', () => {
  it('ne garde que les soumissions valides', () => {
    const liste = [
      { themeId: 'cuisine', q: 'Question valide ?', reponses: ['a', 'b'], bonne: 0, niveau: 'dur', id: '1' },
      { themeId: 'cuisine', q: 'Bonne hors limites', reponses: ['a'], bonne: 9, niveau: 'dur' },
      'pas un objet',
    ];
    const res = validerSoumissions(liste);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('1');
    expect(validerSoumissions(null)).toEqual([]);
  });
});
