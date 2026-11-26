// overrides.ts — couche d'"overrides" admin : modifier ou supprimer une question du
// corpus SANS toucher aux fichiers source (règle 7 : jamais éditer questions-*.js).
// Stocké via OverridesRepo (clé voltquiz_overrides, synchronisée D1 en mode 'd1'),
// indexé par le texte normalisé de la question (normalizeQuestionText).
//
// Deux actions :
//   { action: 'supprimer' }                  -> la question est retirée du pool
//   { action: 'modifier', question: {...} }  -> la question est remplacée par celle-ci
//
// Appliqué dans loadThemes() (src/data/questions.ts) après les exclusions.
import { OverridesRepo } from './repositories.js';
import { normalizeQuestionText } from './text.js';
import type { OverrideEntry, Question, Theme } from './types.js';

export type { OverrideEntry };
export type OverridesMap = Record<string, OverrideEntry>;

export function loadOverrides(): OverridesMap {
  return OverridesRepo.all();
}
function saveOverrides(map: OverridesMap): void {
  OverridesRepo.save(map);
}

// Pose un override sur la question d'origine (clé = texte normalisé).
export function setOverride(qOriginale: string, entry: OverrideEntry): void {
  const map = loadOverrides();
  map[normalizeQuestionText(qOriginale)] = entry;
  saveOverrides(map);
}

// Applique les overrides à un catalogue de thèmes : supprime ou remplace les questions
// concernées. Ne modifie pas le tableau d'entrée (copie défensive).
export function applyOverrides(themes: Theme[]): Theme[] {
  const map = loadOverrides();
  if (Object.keys(map).length === 0) return themes;
  return themes.map((t) => ({
    ...t,
    questions: t.questions.flatMap((q): Question[] => {
      const entry = map[normalizeQuestionText(q.q)];
      if (!entry) return [q];
      if (entry.action === 'supprimer') return [];
      return [entry.question];
    }),
  }));
}
