// tests/data/questions-schema.test.ts — SEUL test qui charge le vrai corpus
// (les 264 fichiers src/data/questions-*.js). Vérifie le schéma de chaque
// question et compte les doublons exacts connus (hérités des premiers lots).
import { describe, expect, it } from 'vitest';

import { LEVELS } from '@lib/scoring.js';
import { loadThemes } from '@/data/questions.js';

// Charge le vrai corpus (chunks lazy) une fois pour toute la suite.
const THEMES = await loadThemes();

const NIVEAUX_VALIDES = LEVELS.map((n) => n.id);

// Les 12 thèmes historiques doivent rester >= 1000 questions ; les 4 thèmes ajoutés
// en 2026-11 (technologie, nature, economie, auto) démarrent avec un pack de 40 et
// sont complétés jusqu'à 1000 par vagues (sous-agents, fichiers questions-vague-*.js).
const THEMES_HISTORIQUES = [
  'culture-generale',
  'cinema-series',
  'musique',
  'sport',
  'jeux-videos',
  'geographie',
  'cuisine',
  'espace',
  'histoire',
  'mythologie',
  'sciences',
  'mangas-animes',
];
const NOUVEAUX_THEMES = ['technologie', 'nature', 'economie', 'auto'];

describe('corpus de questions intégré', () => {
  it('contient 16 thèmes actifs (12 historiques + 4 nouveaux)', () => {
    expect(THEMES.length).toBe(16);
    for (const id of NOUVEAUX_THEMES) expect(THEMES.some((t) => t.id === id)).toBe(true);
  });

  it('chaque thème a un id, un nom, une icône et une couleur', () => {
    for (const t of THEMES) {
      expect(typeof t.id).toBe('string');
      expect(t.id.length).toBeGreaterThan(0);
      expect(typeof t.nom).toBe('string');
      expect(typeof t.icone).toBe('string');
      expect(t.couleur).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('les 12 thèmes historiques comptent au moins 1000 questions, les 4 nouveaux au moins 40 (pack de départ)', () => {
    for (const t of THEMES) {
      if (THEMES_HISTORIQUES.includes(t.id)) expect(t.questions.length).toBeGreaterThanOrEqual(1000);
      else expect(t.questions.length).toBeGreaterThanOrEqual(40);
    }
  });

  it('chaque question respecte le schéma (q, 2-4 réponses, bonne valide, niveau connu)', () => {
    const niveauxValides = new Set(NIVEAUX_VALIDES);
    let total = 0;
    for (const t of THEMES) {
      for (const q of t.questions) {
        total++;
        expect(typeof q.q, `question dans ${t.id}`).toBe('string');
        expect(q.q.trim().length).toBeGreaterThan(3);
        expect(Array.isArray(q.reponses), q.q).toBe(true);
        expect(q.reponses.length, q.q).toBeGreaterThanOrEqual(2);
        expect(q.reponses.length, q.q).toBeLessThanOrEqual(4);
        expect(Number.isInteger(q.bonne), q.q).toBe(true);
        expect(q.bonne >= 0 && q.bonne < q.reponses.length, q.q).toBe(true);
        expect(niveauxValides.has(q.niveau), `${q.q} (niveau ${q.niveau})`).toBe(true);
        for (const r of q.reponses) expect(typeof r).toBe('string');
      }
    }
    expect(total).toBeGreaterThan(13300);
  });

  it('compte les doublons exacts (héritage des premiers lots, < 150 tolérés)', () => {
    const vus = new Set<string>();
    let doublons = 0;
    for (const t of THEMES) {
      for (const q of t.questions) {
        const key = `${t.id}|${q.q.trim().toLowerCase()}`;
        if (vus.has(key)) doublons++;
        else vus.add(key);
      }
    }
    // Les tout premiers fichiers de base contiennent quelques doublons connus ;
    // les lots rédigés ensuite sont garantis sans doublon.
    expect(doublons).toBeLessThan(150);
  });
});
