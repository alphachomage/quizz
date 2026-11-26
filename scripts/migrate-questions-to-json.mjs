// scripts/migrate-questions-to-json.mjs — migration ONE-SHOT (déjà exécutée, conservée pour
// la traçabilité) : lit les anciens src/data/questions-*.js (supprimés depuis, voir l'historique
// git) et écrit content/themes.json + content/questions/<theme>.json avec un id stable par
// question. Ne pas relancer : les ids existants ne sont jamais recalculés.
// Id = "<theme>-" + 6 premiers hex de sha1(texte normalisé) ; en cas de doublon exact dans le
// même thème (même hash complet), le n-ième exemplaire hache "texte#n" ; collision de préfixe : on allonge.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import {
  ROOT, QUESTIONS_DIR, THEMES_FILE, normalizeQuestionText, serializeThemes, writeThemeQuestions,
} from './lib/content.mjs';

const dir = path.join(ROOT, 'src', 'data');
const files = fs.readdirSync(dir).filter((f) => /^questions-.*\.js$/.test(f)).sort();
const RETIRED = ['insolite', 'pop-culture'];

// Même fusion que l'ancien gen-corpus-json.mjs (correction des métadonnées vides incluse).
const map = new Map();
for (const f of files) {
  const mod = await import(pathToFileURL(path.join(dir, f)).href);
  const lot = Object.values(mod)[0];
  if (!Array.isArray(lot)) continue;
  for (const t of lot) {
    if (!t || !t.id || !Array.isArray(t.questions)) continue;
    const ex = map.get(t.id);
    if (ex) {
      ex.questions.push(...t.questions);
      if (t.nom && (!ex.nom || ex.nom === t.id)) ex.nom = t.nom;
      if (t.icone && (!ex.icone || ex.icone === 'question')) ex.icone = t.icone;
      if (t.couleur && (!ex.couleur || ex.couleur === '#8b5cf6')) ex.couleur = t.couleur;
    } else {
      map.set(t.id, { id: t.id, nom: t.nom, icone: t.icone, couleur: t.couleur, questions: [...t.questions] });
    }
  }
}

const tous = [...map.values()];
const ordre = [...tous.filter((t) => !RETIRED.includes(t.id)), ...tous.filter((t) => RETIRED.includes(t.id))];

fs.mkdirSync(QUESTIONS_DIR, { recursive: true });
const themes = [];
const idsGlobaux = new Set();
for (const t of ordre) {
  themes.push({
    id: t.id,
    nom: t.nom || t.id,
    icone: t.icone || 'question',
    couleur: t.couleur || '#8b5cf6',
    actif: !RETIRED.includes(t.id),
  });
  const vus = new Map(); // texte normalisé -> nombre d'occurrences déjà vues
  const questions = t.questions.map((q) => {
    const norm = normalizeQuestionText(q.q);
    const n = (vus.get(norm) || 0) + 1;
    vus.set(norm, n);
    const hex = crypto.createHash('sha1').update(n === 1 ? norm : `${norm}#${n}`).digest('hex');
    let len = 6;
    while (idsGlobaux.has(`${t.id}-${hex.slice(0, len)}`)) len += 2;
    const id = `${t.id}-${hex.slice(0, len)}`;
    idsGlobaux.add(id);
    return { id, ...q };
  });
  writeThemeQuestions(t.id, questions);
}
fs.writeFileSync(THEMES_FILE, serializeThemes(themes));
console.log(`${themes.length} thèmes, ${idsGlobaux.size} questions migrées`);
