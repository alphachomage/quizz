// tests/fixtures/questions.fixture.js — fabrique de questions/thèmes de test.
// RÈGLE : aucun test unitaire/intégration ne charge les 264 vrais fichiers de
// src/data/ (trop lourd) ; seul tests/data/questions-schema.test.js le fait.

// Une question factice, avec des réponses uniques et traçables.
export function makeQuestion(over = {}) {
  return {
    q: 'Question factice ?',
    reponses: ['Alpha', 'Beta', 'Gamma', 'Delta'],
    bonne: 0,
    niveau: 'facile',
    info: '',
    ...over,
  };
}

// Fabrique un thème de test avec `parNiveau` questions par niveau de difficulté.
// Chaque question a un texte unique ("Question T-N ?") et des réponses uniques
// ("R<T-N>-0".."R<T-N>-3"), bonne réponse = index 0 : facile à cliquer en test.
export function makeTheme({ id = 'test', nom = 'Thème test', couleur = '#38bdf8', parNiveau = 10 } = {}) {
  const questions = [];
  for (const niveau of ['facile', 'moyen', 'dur']) {
    for (let i = 0; i < parNiveau; i++) {
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
  return { id, nom, icone: 'question', couleur, questions };
}

// Plusieurs thèmes pour les modes multi-thèmes (survie, quizz du jour).
export function makeThemes(nb = 3, parNiveau = 10) {
  return Array.from({ length: nb }, (_, i) =>
    makeTheme({ id: `theme-${i}`, nom: `Thème ${i}`, couleur: '#38bdf8', parNiveau })
  );
}

// PRNG déterministe (mulberry32) : remplace Math.random dans les tests
// pour des tirages reproductibles.
export function mulberry32(graine) {
  let a = graine >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Préférations de test : tout coupé (pas de son, pas d'animation) pour des tests silencieux.
export const TEST_PREFS = {
  sons: false,
  music: false,
  animations: false,
  vibrations: false,
  themeClair: false,
  daltonien: false,
  dys: false,
};
