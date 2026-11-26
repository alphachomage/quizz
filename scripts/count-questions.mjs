// Compte exact des questions par thème depuis content/ (themes.json + questions/<theme>.json).
import { readAll } from './lib/content.mjs';
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
const retiresIds = new Set();
const vus = new Set();
let total = 0,
  doublons = 0,
  invalides = 0;
for (const t of readAll()) {
  perTheme[t.id] = t.questions.length;
  if (t.actif) total += t.questions.length; // total = thèmes servis
  else retiresIds.add(t.id);
  meta[t.id] = { nom: t.nom, icone: t.icone, couleur: t.couleur };
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
const actifs = Object.keys(perTheme).filter((k) => !retiresIds.has(k));
const retires = Object.keys(perTheme).filter((k) => retiresIds.has(k));
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
