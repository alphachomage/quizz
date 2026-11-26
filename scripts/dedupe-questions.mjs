// Supprime les doublons EXACTS (même question normalisée dans le même thème) de
// content/questions/<theme>.json, en gardant la première occurrence : l'ordre et les ids des
// questions conservées ne changent pas (le Quizz du jour dépend de l'ordre). Ne réécrit que les
// fichiers concernés. Sauvegarde préalable recommandée (backups/) ; à relire dans le diff git.
import { normalizeQuestionText, readThemes, readThemeQuestions, writeThemeQuestions } from './lib/content.mjs';

let totalSuppr = 0;
const rapport = [];
for (const t of readThemes()) {
  const vus = new Set();
  const questions = readThemeQuestions(t.id);
  const gardees = questions.filter((q) => {
    const key = normalizeQuestionText(q.q);
    if (vus.has(key)) return false;
    vus.add(key);
    return true;
  });
  const suppr = questions.length - gardees.length;
  if (suppr) {
    writeThemeQuestions(t.id, gardees);
    totalSuppr += suppr;
    rapport.push(`${t.id} : -${suppr}`);
  }
}
console.log(rapport.join('\n'));
console.log('TOTAL doublons supprimés : ' + totalSuppr);
