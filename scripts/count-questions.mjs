// Compte exact des questions par theme en important chaque fichier questions-*.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const files = fs.readdirSync(dir).filter((f) => /^questions-.*\.js$/.test(f));
// Thèmes retirés du jeu : comptés à part (info) mais exclus du total servi.
const RETIRED = ['insolite', 'pop-culture'];
function norm(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
const perTheme = {};
const meta = {};
const vus = new Set();
let total = 0,
  doublons = 0,
  invalides = 0;
for (const f of files) {
  const mod = await import(pathToFileURL(path.join(dir, f)).href + '?t=' + Date.now());
  const lot = Object.values(mod)[0];
  if (!Array.isArray(lot)) continue;
  for (const t of lot) {
    perTheme[t.id] = (perTheme[t.id] || 0) + t.questions.length;
    if (!RETIRED.includes(t.id)) total += t.questions.length; // total = thèmes servis
    if (!meta[t.id])
      meta[t.id] = {
        nom: t.nom,
        icone: t.icone,
        couleur: t.couleur,
      };
    else {
      // Complète si le 1er fichier avait des métadonnées vides (redistribution.js).
      const m = meta[t.id];
      if (t.nom && !m.nom) m.nom = t.nom;
      if (t.icone && !m.icone) m.icone = t.icone;
      if (t.couleur && !m.couleur) m.couleur = t.couleur;
    }
    for (const q of t.questions) {
      const ok =
        Array.isArray(q.reponses) &&
        q.reponses.length >= 2 &&
        q.reponses.length <= 4 &&
        Number.isInteger(q.bonne) &&
        q.bonne >= 0 &&
        q.bonne < q.reponses.length &&
        typeof q.q === 'string' &&
        q.q.length > 0 &&
        ['facile', 'moyen', 'dur'].includes(q.niveau);
      if (!ok) invalides++;
      const key = t.id + '|' + norm(q.q);
      if (vus.has(key)) doublons++;
      vus.add(key);
    }
  }
}
const actifs = Object.keys(perTheme).filter((k) => !RETIRED.includes(k));
const retires = Object.keys(perTheme).filter((k) => RETIRED.includes(k));
for (const k of actifs.sort()) {
  const m = meta[k] || {};
  console.log(
    k + ' : ' + perTheme[k] + '  (' + (m.nom || '?') + ' | icone=' + (m.icone || '?') + ' | ' + (m.couleur || '?') + ')'
  );
}
for (const k of retires.sort()) {
  console.log(k + ' : ' + perTheme[k] + '  [RETIRÉ du jeu]');
}
console.log('TOTAL servi : ' + total + ' | themes actifs : ' + actifs.length + ' | retirés : ' + retires.length);
console.log('doublons exacts : ' + doublons + ' | invalides : ' + invalides);
