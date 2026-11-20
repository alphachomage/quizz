// Compte exact des questions par theme en important chaque fichier questions-*.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'src', 'data');
const files = fs.readdirSync(dir).filter((f) => /^questions-.*\.js$/.test(f));

function norm(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

const parTheme = {};
const meta = {};
const vus = new Set();
let total = 0, doublons = 0, invalides = 0;

for (const f of files) {
  const mod = await import(pathToFileURL(path.join(dir, f)).href + '?t=' + Date.now());
  const lot = Object.values(mod)[0];
  if (!Array.isArray(lot)) continue;
  for (const t of lot) {
    parTheme[t.id] = (parTheme[t.id] || 0) + t.questions.length;
    total += t.questions.length;
    if (!meta[t.id]) meta[t.id] = { nom: t.nom, icone: t.icone, couleur: t.couleur };
    for (const q of t.questions) {
      const ok = Array.isArray(q.reponses) && q.reponses.length >= 2 && q.reponses.length <= 4 &&
        Number.isInteger(q.bonne) && q.bonne >= 0 && q.bonne < q.reponses.length &&
        typeof q.q === 'string' && q.q.length > 0 && ['facile', 'moyen', 'dur'].includes(q.niveau);
      if (!ok) invalides++;
      const cle = t.id + '|' + norm(q.q);
      if (vus.has(cle)) doublons++;
      vus.add(cle);
    }
  }
}

for (const k of Object.keys(parTheme).sort()) {
  const m = meta[k] || {};
  console.log(k + ' : ' + parTheme[k] + '  (' + m.nom + ' | icone=' + m.icone + ' | ' + m.couleur + ')');
}
console.log('TOTAL : ' + total + ' | themes : ' + Object.keys(parTheme).length);
console.log('doublons exacts : ' + doublons + ' | invalides : ' + invalides);
