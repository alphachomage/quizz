// tests/data/questions-schema.test.ts — SEUL test qui charge le vrai corpus
// (les 264 fichiers src/data/questions-*.js). Vérifie le schéma de chaque
// question et compte les doublons exacts connus (hérités des premiers lots).
import { describe, expect, it } from 'vitest';

import { LEVELS } from '@lib/scoring.js';
import { loadThemes } from '@/data/questions.js';

// Charge le vrai corpus (chunks lazy) une fois pour toute la suite.
const THEMES = await loadThemes();

const NIVEAUX_VALIDES = LEVELS.map((n) => n.id);

// 16 thèmes actifs, chacun >= 1000 questions (objectif 1400 par thème en cours).
// youtube-streaming est retiré du jeu (actif:false, qualité insuffisante) : absent du corpus servi.
describe('corpus de questions intégré', () => {
  it('contient 16 thèmes actifs', () => {
    expect(THEMES.length).toBe(16);
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

  it('chaque thème compte au moins 1000 questions', () => {
    for (const t of THEMES) {
      expect(t.questions.length, `thème ${t.id}`).toBeGreaterThanOrEqual(1000); // objectif final : 1400 partout
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
    expect(total).toBeGreaterThan(17000);
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
