// scripts/gen-corpus-json.mjs — génère public/corpus.json :
// tout le corpus fusionné (par id de thème) en UN seul fichier JSON minifié,
// avec la version du corpus (même hash que gen-manifest.mjs).
//
// Au premier lancement, le client fetch /corpus.json (1 requête, précaché par la PWA
// car dans public/) au lieu de charger 263 chunks JS. Fallback sur les chunks si le
// fetch échoue. Lancé automatiquement avant dev/build (predev/prebuild).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const files = fs
  .readdirSync(dir)
  .filter((f) => /^questions-.*\.js$/.test(f))
  .sort();
const corpusHash = crypto
  .createHash('sha256')
  .update(files.map((f) => `${f}:${fs.statSync(path.join(dir, f)).size}`).join('|'))
  .digest('hex')
  .slice(0, 16);

// Fusion par id de thème (même id = questions ajoutées).
const map = new Map();
for (const f of files) {
  const mod = await import(pathToFileURL(path.join(dir, f)).href + '?t=' + Date.now());
  const lot = Object.values(mod)[0];
  if (!Array.isArray(lot)) continue;
  for (const t of lot) {
    if (!t || !t.id || !Array.isArray(t.questions)) continue;
    const ex = map.get(t.id);
    if (ex) {
      ex.questions.push(...t.questions);
      if (!ex.nom && t.nom) {
        ex.nom = t.nom;
        ex.icone = t.icone;
        ex.couleur = t.couleur;
      }
    } else {
      map.set(t.id, { id: t.id, nom: t.nom, icone: t.icone, couleur: t.couleur, questions: [...t.questions] });
    }
  }
}
const corpus = { version: corpusHash, themes: [...map.values()] };
const json = JSON.stringify(corpus);
fs.writeFileSync(path.join(publicDir, 'corpus.json'), json);
const ko = (fs.statSync(path.join(publicDir, 'corpus.json')).size / 1024).toFixed(0);
console.log(`corpus.json : ${map.size} thèmes, ${files.length} fichiers fusionnés, ${ko} Ko, version=${corpusHash}`);
