// questions.d.ts — contrat de types des modules de données restés en JS pur (règle 7) :
// les 263 chunks src/data/questions-*.js (NE JAMAIS modifier, ajout uniquement) et le
// manifeste généré src/data/theme-manifest.js (scripts/gen-manifest.mjs, ne pas éditer).
// La validation runtime du contenu reste assurée par zod (src/lib/schema.ts) et par
// tests/data/questions-schema.test.js ; ce fichier ne déclare que la FORME des modules.

// Chaque chunk questions-*.js exporte UN SEUL tableau de thèmes. Dans les faits c'est
// un export nommé propre au fichier (export const QUESTIONS_BASE, QUESTIONS_CUISINE_A,
// ...) ; questions.ts le consomme via import.meta.glob puis Object.values(module)[0],
// d'où le contrat déclaré ici sous forme d'export default.
declare module '*/questions-*.js' {
  import type { Theme } from '@lib/types.js';
  const themes: Theme[];
  export default themes;
}

// theme-manifest.js — GÉNÉRÉ par scripts/gen-manifest.mjs (ne pas éditer à la main) :
// métadonnées seules des thèmes (id, nom, icône, couleur), SANS les questions.
declare module '*/theme-manifest.js' {
  export const THEME_MANIFEST: Array<{
    id: string;
    nom: string;
    icone: string;
    couleur: string;
  }>;
}
