// scripts/gen-manifest.mjs — génère src/data/theme-manifest.js :
// la liste des thèmes (id, nom, icône, couleur) SANS les questions, pour que
// l'appli démarre avec un petit chunk initial et charge les questions à la demande.
// Lancé automatiquement avant `npm run dev` et `npm run build` (predev/prebuild),
// et à la main avec `npm run gen:manifest` après ajout de fichiers questions-*.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const fichiers = fs.readdirSync(dir).filter((f) => /^questions-.*\.js$/.test(f)).sort();

const metas = new Map(); // id -> { id, nom, icone, couleur }
for (const f of fichiers) {
  const mod = await import(pathToFileURL(path.join(dir, f)).href + '?t=' + Date.now());
  const lot = Object.values(mod)[0];
  if (!Array.isArray(lot)) continue;
  for (const t of lot) {
    if (!t || !t.id) continue;
    if (!metas.has(t.id)) {
      metas.set(t.id, { id: t.id, nom: t.nom || t.id, icone: t.icone || 'question', couleur: t.couleur || '#8b5cf6' });
    }
  }
}

const contenu = `// theme-manifest.js — GÉNÉRÉ par scripts/gen-manifest.mjs (ne pas éditer à la main).
// Métadonnées des thèmes SANS les questions : chunk initial léger, questions lazy.
export const THEME_MANIFEST = ${JSON.stringify([...metas.values()], null, 2)};
`;
fs.writeFileSync(path.join(dir, 'theme-manifest.js'), contenu);
console.log(`theme-manifest.js : ${metas.size} thèmes, ${fichiers.length} fichiers`);
