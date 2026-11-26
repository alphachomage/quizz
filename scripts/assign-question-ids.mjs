// scripts/assign-question-ids.mjs — ajoute un id aux questions de content/questions/<theme>.json
// qui n'en ont pas (ajouts manuels en fin de fichier). Les ids existants ne sont JAMAIS touchés.
// Id = "<theme>-" + 6 premiers hex de sha1(texte normalisé), allongé (8, 10...) si l'id existe
// déjà ; un doublon exact de texte reçoit sha1("texte#n"). Usage : npm run questions:ids
import crypto from 'node:crypto';
import { normalizeQuestionText, readThemes, readThemeQuestions, writeThemeQuestions } from './lib/content.mjs';

const donnees = readThemes().map((t) => ({ t, questions: readThemeQuestions(t.id) }));
const ids = new Set();
for (const { questions } of donnees) for (const q of questions) if (q.id) ids.add(q.id);

let ajoutes = 0;
for (const { t, questions } of donnees) {
  let modifie = false;
  const vus = new Map();
  const result = questions.map((q) => {
    const norm = normalizeQuestionText(q.q);
    vus.set(norm, (vus.get(norm) || 0) + 1);
    if (q.id) return q;
    for (let n = vus.get(norm); ; n++) {
      const hex = crypto.createHash('sha1').update(n === 1 ? norm : `${norm}#${n}`).digest('hex');
      let len = 6;
      while (ids.has(`${t.id}-${hex.slice(0, len)}`) && len < hex.length) len += 2;
      const id = `${t.id}-${hex.slice(0, len)}`;
      if (ids.has(id)) continue;
      ids.add(id);
      ajoutes++;
      modifie = true;
      return { id, ...q };
    }
  });
  if (modifie) writeThemeQuestions(t.id, result);
}
console.log(`${ajoutes} id(s) attribué(s)`);
