// scripts/assign-question-ids.mjs — ajoute un id aux questions de content/questions/<theme>.json
// qui n'en ont pas (ajouts manuels en fin de fichier). Les ids existants ne sont JAMAIS touchés.
// Règle d'attribution : scripts/lib/ids.mjs. Usage : npm run questions:ids
import { normalizeQuestionText, readThemes, readThemeQuestions, writeThemeQuestions } from './lib/content.mjs';
import { attribuerId } from './lib/ids.mjs';

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
    ajoutes++;
    modifie = true;
    return { id: attribuerId(t.id, norm, ids, vus.get(norm)), ...q };
  });
  if (modifie) writeThemeQuestions(t.id, result);
}
console.log(`${ajoutes} id(s) attribué(s)`);
