// scripts/questions-apply.mjs — applique un fichier de corrections sur des questions EXISTANTES.
// Format : { "corrections": [ { "id": "<id existant>", "q"?, "reponses"?, "bonne"?, "niveau"?, "info"?, "remplacer"? } ] }
// - correction (défaut) : champs fusionnés, l'id est CONSERVÉ, la question reste à sa place (règle 7) ;
// - "remplacer": true : nouvelle question à la même place (ex. un doublon remplacé), nouvel id.
// Garde-fous : une correction ne doit ajouter AUCUN défaut qualité qu'elle n'avait pas ; une question
// remplacée doit les respecter tous (comme l'import) et ne pas être un (quasi-)doublon du thème.
// Tout ou rien : au moindre refus, rien n'est écrit. Ensuite : npm run questions:lint -- --update-dette.
// Usage : npm run questions:apply -- <fichier.json> [--dry-run]
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { CONTENT_DIR, normalizeQuestionText, readAll, writeThemeQuestions } from './lib/content.mjs';
import { attribuerId } from './lib/ids.mjs';
import { checkQuestion, creerIndexSimilarite } from './lib/quality.mjs';

const CHAMPS = ['q', 'reponses', 'bonne', 'niveau', 'info'];

// Défauts qualité d'une question (doublon-exact et quasi-doublon calculés contre TOUTES les autres
// questions du thème : plus strict que le lint, qui ne regarde que les précédentes).
function defauts(question, autres) {
  const seen = new Set(autres.map((o) => normalizeQuestionText(o.q)));
  return new Set(checkQuestion(question, { seen, similar: creerIndexSimilarite(autres) }).map((v) => v.code));
}

/** @param {{ file: string, dir?: string, dryRun?: boolean, log?: (m: string) => void }} options */
export function run({ file, dir = CONTENT_DIR, dryRun = false, log = console.log }) {
  let patch;
  try {
    patch = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    log(`Fichier de corrections illisible (${file}) : ${e.message}`);
    return { code: 1 };
  }
  const corrections = Array.isArray(patch?.corrections) ? patch.corrections : null;
  if (!corrections) {
    log('Format attendu : { "corrections": [ { "id": "...", ... } ] }');
    return { code: 1 };
  }

  const themes = readAll({ dir });
  const ids = new Set(themes.flatMap((t) => t.questions.map((q) => q.id)));
  const ou = new Map(); // id -> { theme, index }
  themes.forEach((t) => t.questions.forEach((q, index) => ou.set(q.id, { theme: t, index })));

  const refus = [];
  const vus = new Set();
  let modifies = 0;
  let remplaces = 0;
  for (const c of corrections) {
    const pos = c && ou.get(c.id);
    if (!pos) {
      refus.push(`${c?.id ?? '(sans id)'} : id introuvable`);
      continue;
    }
    if (vus.has(c.id)) {
      refus.push(`${c.id} : corrigé deux fois dans le même fichier`);
      continue;
    }
    vus.add(c.id);
    const { theme, index } = pos;
    const avant = theme.questions[index];
    const autres = theme.questions.filter((_, i) => i !== index);
    const apres = { id: avant.id };
    for (const k of CHAMPS) {
      const v = k in c ? c[k] : c.remplacer ? undefined : avant[k];
      if (v !== undefined && v !== null && v !== '') apres[k] = v;
    }

    const nouveaux = defauts(apres, autres);
    if (c.remplacer) {
      if (nouveaux.size) refus.push(`${c.id} : la question de remplacement a des défauts (${[...nouveaux].join(', ')})`);
      if (nouveaux.size) continue;
      ids.delete(avant.id);
      const occurrence = 1 + autres.filter((o) => normalizeQuestionText(o.q) === normalizeQuestionText(apres.q)).length;
      apres.id = attribuerId(theme.id, normalizeQuestionText(apres.q), ids, occurrence);
      remplaces++;
    } else {
      const anciens = defauts(avant, autres);
      const ajoutes = [...nouveaux].filter((code) => !anciens.has(code));
      if (ajoutes.length) {
        refus.push(`${c.id} : la correction ajoute des défauts (${ajoutes.join(', ')})`);
        continue;
      }
      modifies++;
    }
    theme.questions[index] = apres;
  }

  if (refus.length) {
    log(`${refus.length} refus, RIEN n'a été écrit :`);
    for (const r of refus) log(`  ${r}`);
    return { code: 1 };
  }
  if (!dryRun) {
    const touches = new Set(corrections.map((c) => ou.get(c.id).theme));
    for (const t of touches) writeThemeQuestions(t.id, t.questions, dir);
  }
  log(`${modifies} question(s) corrigée(s), ${remplaces} remplacée(s)${dryRun ? ' (dry-run : rien écrit)' : ''}.`);
  if (!dryRun) log('Ensuite : npm run questions:lint -- --update-dette');
  return { code: 0 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) {
    console.error('Usage : npm run questions:apply -- <fichier.json> [--dry-run]');
    process.exitCode = 1;
  } else {
    process.exitCode = run({ file, dryRun: args.includes('--dry-run') }).code;
  }
}
