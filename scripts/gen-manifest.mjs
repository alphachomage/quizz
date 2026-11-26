// scripts/gen-manifest.mjs — génère src/data/theme-manifest.js :
// la liste des thèmes actifs (id, nom, icône, couleur) SANS les questions, pour que
// l'appli démarre avec un petit chunk initial et charge les questions à la demande.
// Source : content/themes.json (actif:false = thème retiré, absent du manifeste).
// Lancé automatiquement au démarrage de Vite (plugin generateCorpus de vite.config.ts),
// et à la main avec `npm run gen:manifest`.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, contentHash, readThemes } from './lib/content.mjs';

// Version du corpus = hash de content/ : change dès qu'une question ou un thème change
// -> invalidation du cache IndexedDB.
const version = contentHash();
const actifs = readThemes()
  .filter((t) => t.actif)
  .map(({ id, nom, icone, couleur }) => ({ id, nom, icone, couleur }));
const contenu = `// theme-manifest.js — GÉNÉRÉ par scripts/gen-manifest.mjs (ne pas éditer à la main).
// Métadonnées des thèmes SANS les questions : chunk initial léger, questions lazy.
export const THEME_MANIFEST = ${JSON.stringify(actifs, null, 2)};
// Version du corpus (hash de content/) : invalidation du cache IndexedDB.
export const CORPUS_VERSION = ${JSON.stringify(version)};
`;
fs.writeFileSync(path.join(ROOT, 'src', 'data', 'theme-manifest.js'), contenu);
console.log(`theme-manifest.js : ${actifs.length} thèmes, version=${version}`);
