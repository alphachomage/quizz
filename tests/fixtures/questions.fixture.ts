// tests/fixtures/questions.fixture.ts — fabrique de questions/thèmes de test.
// RÈGLE : aucun test unitaire/intégration ne charge les 264 vrais fichiers de
// src/data/ (trop lourd) ; seul tests/data/questions-schema.test.ts le fait.
import type { Prefs, Question, TaggedQuestion, Theme } from '@lib/types.js';

// Une question factice, avec des réponses uniques et traçables.
// `over` peut aussi poser un themeId (modes multi-thèmes : survie, quotidien).
export function makeQuestion(
  over: Partial<Question> & Partial<TaggedQuestion> = {}
): Question & Partial<TaggedQuestion> {
  return {
    q: 'Question factice ?',
    reponses: ['Alpha', 'Beta', 'Gamma', 'Delta'],
    bonne: 0,
    niveau: 'facile',
    info: '',
    ...over,
  };
}

// Fabrique un thème de test avec `perLevel` questions par niveau de difficulté.
// Chaque question a un texte unique ("Question T-N ?") et des réponses uniques
// ("R<T-N>-0".."R<T-N>-3"), bonne réponse = index 0 : facile à cliquer en test.
export function makeTheme({
  id = 'test',
  nom = 'Thème test',
  couleur = '#38bdf8',
  perLevel = 10,
}: {
  id?: string;
  nom?: string;
  couleur?: string;
  perLevel?: number;
} = {}): Theme {
  const questions: Question[] = [];
  for (const niveau of ['facile', 'moyen', 'dur'] as const) {
    for (let i = 0; i < perLevel; i++) {
      const tag = `${id}-${niveau}-${i}`;
      questions.push(
        makeQuestion({
          q: `Question ${tag} ?`,
          reponses: [`R${tag}-0`, `R${tag}-1`, `R${tag}-2`, `R${tag}-3`],
          bonne: 0,
          niveau,
        })
      );
    }
  }
  return {
    id,
    nom,
    icone: 'question',
    couleur,
    questions,
  };
}

// Plusieurs thèmes pour les modes multi-thèmes (survie, quizz du jour).
export function makeThemes(countN = 3, perLevel = 10): Theme[] {
  return Array.from(
    {
      length: countN,
    },
    (_, i) =>
      makeTheme({
        id: `theme-${i}`,
        nom: `Thème ${i}`,
        couleur: '#38bdf8',
        perLevel: perLevel,
      })
  );
}

// PRNG déterministe (mulberry32) : remplace Math.random dans les tests
// pour des tirages reproductibles.
export function mulberry32(graine: number): () => number {
  let a = graine >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Préférances de test : tout coupé (pas de son, pas d'animation) pour des tests silencieux.
export const TEST_PREFS: Prefs = {
  sons: false,
  music: false,
  animations: false,
  vibrations: false,
  themeClair: false,
  daltonien: false,
  dys: false,
};
