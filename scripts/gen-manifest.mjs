// scripts/gen-manifest.mjs — génère src/data/theme-manifest.js :
// la liste des thèmes (id, nom, icône, couleur) SANS les questions, pour que
// l'appli démarre avec un petit chunk initial et charge les questions à la demande.
// Lancé automatiquement avant `npm run dev` et `npm run build` (predev/prebuild),
// et à la main avec `npm run gen:manifest` après ajout de fichiers questions-*.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const files = fs
  .readdirSync(dir)
  .filter((f) => /^questions-.*\.js$/.test(f))
  .sort();
// Thèmes retirés du jeu (leurs questions restent dans les fichiers source, règle 7,
// mais ils ne figurent plus dans le manifeste ni le corpus servi) :
const RETIRED = ['insolite', 'pop-culture'];
// Version du corpus = hash des noms + tailles des fichiers questions-*.js :
// change dès qu'un fichier est ajouté/modifié/supprimé -> invalidation du cache IndexedDB.
const corpusHash = crypto
  .createHash('sha256')
  .update(files.map((f) => `${f}:${fs.statSync(path.join(dir, f)).size}`).join('|'))
  .digest('hex')
  .slice(0, 16);
const CORPUS_VERSION = corpusHash;
const metas = new Map(); // id -> { id, nom, icone, couleur }
for (const f of files) {
  const mod = await import(pathToFileURL(path.join(dir, f)).href + '?t=' + Date.now());
  const lot = Object.values(mod)[0];
  if (!Array.isArray(lot)) continue;
  for (const t of lot) {
    if (!t || !t.id) continue;
    if (RETIRED.includes(t.id)) continue; // thème retiré : pas dans le manifeste
    if (!metas.has(t.id)) {
      metas.set(t.id, {
        id: t.id,
        nom: t.nom || t.id,
        icone: t.icone || 'question',
        couleur: t.couleur || '#8b5cf6',
      });
    } else if (t.nom) {
      // Complète les métadonnées si le 1er fichier les avait laissées vides
      // (ex: questions-redistribution.js déclare sciences avec nom: undefined).
      const ex = metas.get(t.id);
      if (ex.nom === t.id) ex.nom = t.nom;
      if (ex.icone === 'question' && t.icone) ex.icone = t.icone;
      if (ex.couleur === '#8b5cf6' && t.couleur) ex.couleur = t.couleur;
    }
  }
}
const contenu = `// theme-manifest.js — GÉNÉRÉ par scripts/gen-manifest.mjs (ne pas éditer à la main).
// Métadonnées des thèmes SANS les questions : chunk initial léger, questions lazy.
export const THEME_MANIFEST = ${JSON.stringify([...metas.values()], null, 2)};
// Version du corpus (hash des fichiers questions-*.js) : invalidation du cache IndexedDB.
export const CORPUS_VERSION = ${JSON.stringify(CORPUS_VERSION)};
`;
fs.writeFileSync(path.join(dir, 'theme-manifest.js'), contenu);
console.log(`theme-manifest.js : ${metas.size} thèmes, ${files.length} fichiers, version=${CORPUS_VERSION}`);
