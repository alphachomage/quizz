// tests/scripts/quality.test.ts — règles qualité du corpus (scripts/lib/quality.mjs).
import { describe, expect, it } from 'vitest';
import { normalizeQuestionText as normalizeApp } from '../../src/lib/text';
import { normalizeQuestionText as normalizeScript } from '../../scripts/lib/content.mjs';
import { checkQuestion, checkQuestions } from '../../scripts/lib/quality.mjs';

type Q = { q: string; reponses: string[]; bonne: number; niveau: string; info?: string };
const bonne = (): Q => ({
  q: 'Quelle est la capitale de la France ?',
  reponses: ['Lyon', 'Paris', 'Nice', 'Lille'],
  bonne: 1,
  niveau: 'facile',
});
const codes = (q: unknown, seen?: Set<string>) =>
  (checkQuestion(q, { seen }) as { code: string }[]).map((v) => v.code);

describe('normalisation partagée avec l’appli', () => {
  it('scripts/lib/content.mjs et src/lib/text.ts donnent le même résultat', () => {
    for (const s of ["Qu'est-ce que l'Élysée ?", '  Œuvre  d’art — 3,14 ', 'ÀÉÎÕÜ ça va', '', 'Fate/stay night']) {
      expect(normalizeScript(s)).toBe(normalizeApp(s));
    }
  });
});

describe('checkQuestion', () => {
  it('une bonne question n’a aucune violation', () => {
    expect(codes(bonne())).toEqual([]);
  });

  it('reponse-dans-question : mot entier, >= 4 caractères', () => {
    expect(codes({ ...bonne(), q: 'Paris est la capitale de quel pays ?', reponses: ['Italie', 'Paris', 'Chine', 'Inde'] })).toContain(
      'reponse-dans-question',
    );
    // réponse composée de plusieurs mots
    expect(codes({ ...bonne(), q: 'Quelle cité, la Rome antique, fut fondée sur sept collines ?', reponses: ['Rome antique', 'Athènes', 'Carthage', 'Sparte'], bonne: 0 })).toContain(
      'reponse-dans-question',
    );
  });

  it('reponse-dans-question : pas de faux positif (mot partiel, réponse courte, vrai/faux)', () => {
    expect(codes({ ...bonne(), q: 'Quel est le gentilé de Paris : parisien ou autre ?', reponses: ['Lyonnais', 'Pari', 'Niçois', 'Lillois'], bonne: 1 })).not.toContain(
      'reponse-dans-question',
    );
    expect(codes({ ...bonne(), q: 'Quel mot désigne la Mer Noire, la mer Rouge ?', reponses: ['Mer', 'Eau', 'Lac', 'Rio'], bonne: 0 })).not.toContain(
      'reponse-dans-question',
    );
    expect(codes({ q: 'Vrai ou faux : la Terre est ronde.', reponses: ['Vrai', 'Faux'], bonne: 0, niveau: 'facile' })).not.toContain('reponse-dans-question');
  });

  it('question-trop-longue : > 150 caractères', () => {
    expect(codes({ ...bonne(), q: 'a'.repeat(150) })).not.toContain('question-trop-longue');
    expect(codes({ ...bonne(), q: 'a'.repeat(151) })).toContain('question-trop-longue');
  });

  it('reponse-trop-longue : une réponse > 60 caractères', () => {
    expect(codes({ ...bonne(), reponses: ['Lyon', 'b'.repeat(60), 'Nice', 'Lille'], bonne: 0 })).not.toContain('reponse-trop-longue');
    expect(codes({ ...bonne(), reponses: ['Lyon', 'b'.repeat(61), 'Nice', 'Lille'], bonne: 0 })).toContain('reponse-trop-longue');
  });

  it('reponses-en-double : identiques après normalisation', () => {
    expect(codes({ ...bonne(), reponses: ['Lyon', 'Paris', 'LYON !', 'Lille'] })).toContain('reponses-en-double');
    expect(codes(bonne())).not.toContain('reponses-en-double');
  });

  it('nombre-reponses : != 4', () => {
    expect(codes({ ...bonne(), reponses: ['Lyon', 'Paris', 'Nice'] })).toContain('nombre-reponses');
    expect(codes({ q: 'Vrai ou faux : le feu brûle ?', reponses: ['Vrai', 'Faux'], bonne: 0, niveau: 'facile' })).toContain('nombre-reponses');
    expect(codes(bonne())).not.toContain('nombre-reponses');
  });

  it('reponse-trahie-par-longueur : bonne >= 3x les autres et >= 20 caractères d’écart', () => {
    const trahie = { ...bonne(), reponses: ['Lyon', 'Un orchestrateur de conteneurs très pratique', 'Nice', 'Lille'], bonne: 1 };
    expect(codes(trahie)).toContain('reponse-trahie-par-longueur');
    // longue mais pas assez par rapport aux autres
    expect(codes({ ...bonne(), reponses: ['Un long mot ici', 'Un orchestrateur de conteneurs', 'Un autre truc long', 'Un dernier truc'], bonne: 1 })).not.toContain(
      'reponse-trahie-par-longueur',
    );
    // ratio atteint mais écart trop faible
    expect(codes({ ...bonne(), reponses: ['Lyon', 'Paris-sur-mer', 'Nice', 'Lille'], bonne: 1 })).not.toContain('reponse-trahie-par-longueur');
  });

  it('doublon-exact : seul le 2e exemplaire est en faute', () => {
    const seen = new Set<string>();
    expect(codes(bonne(), seen)).not.toContain('doublon-exact');
    seen.add(normalizeApp(bonne().q));
    expect(codes({ ...bonne(), q: 'QUELLE est la capitale de la France' }, seen)).toContain('doublon-exact');
  });

  it('format : schéma invalide', () => {
    expect(codes({ ...bonne(), bonne: 4 })).toEqual(['format']);
    expect(codes({ ...bonne(), niveau: 'impossible' })).toEqual(['format']);
    expect(codes({ ...bonne(), reponses: ['Lyon', '', 'Nice', 'Lille'] })).toEqual(['format']);
    expect(codes({ ...bonne(), q: '' })).toEqual(['format']);
    expect(codes({ q: 'Une question sans réponses ?' })).toEqual(['format']);
    expect(codes(null)).toEqual(['format']);
  });
});

describe('checkQuestions', () => {
  it('signale le doublon sur la 2e occurrence et tient compte de `seen`', () => {
    const res = checkQuestions([bonne(), bonne()]);
    expect(res).toHaveLength(1);
    expect(res[0].index).toBe(1);
    expect(res[0].violations.map((v: { code: string }) => v.code)).toEqual(['doublon-exact']);
    expect(checkQuestions([bonne()], new Set([normalizeApp(bonne().q)]))).toHaveLength(1);
  });
});
