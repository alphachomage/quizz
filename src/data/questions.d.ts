// questions.d.ts — contrat de types du manifeste généré src/data/theme-manifest.js (JS pur,
// GÉNÉRÉ par scripts/gen-manifest.mjs, ne pas éditer à la main) : métadonnées seules des
// thèmes actifs de content/themes.json (id, nom, icône, couleur), SANS les questions.
// La validation runtime du contenu reste assurée par zod (src/lib/schema.ts) et par
// tests/data/content.test.ts.
declare module '*/theme-manifest.js' {
  export const THEME_MANIFEST: Array<{
    id: string;
    nom: string;
    icone: string;
    couleur: string;
  }>;
}
