// scripts/gen-corpus-json.mjs — génère public/corpus.json : le corpus servi (thèmes actifs de
// content/themes.json, questions de content/questions/<theme>.json, ids inclus) en UN seul
// fichier JSON minifié, avec la version du corpus (hash de content/, même que gen-manifest.mjs).
//
// Au premier lancement, le client fetch /corpus.json (1 requête, précaché par la PWA car dans
// public/) puis l'indexe dans IndexedDB. Fallback sur les chunks content/questions/*.json si le
// fetch échoue. Lancé automatiquement au démarrage de Vite (plugin generateCorpus de vite.config.ts).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, contentHash, readAll } from './lib/content.mjs';

const version = contentHash();
const themes = readAll({ actifsSeulement: true }).map(({ id, nom, icone, couleur, questions }) => ({
  id, nom, icone, couleur, questions,
}));
const out = path.join(ROOT, 'public', 'corpus.json');
fs.writeFileSync(out, JSON.stringify({ version, themes }));
const ko = (fs.statSync(out).size / 1024).toFixed(0);
console.log(`corpus.json : ${themes.length} thèmes, ${ko} Ko, version=${version}`);
