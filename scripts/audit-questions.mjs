// scripts/audit-questions.mjs — AUDIT des questions à risque de péremption.
// Liste les questions contenant une année >= 2024 ou des marqueurs temporels
// ("actuellement", "en 2026", "dernier", "record actuel"...) pour relecture humaine.
// Usage : node scripts/audit-questions.mjs [--theme sport]
import { readAll } from './lib/content.mjs';

const filtreTheme = process.argv.includes('--theme')
  ? process.argv[process.argv.indexOf('--theme') + 1]
  : null;

const ANNEES = /(20(2[4-9]|[3-9][0-9]))/; // 2024 et après
const TEMPOREL = /actuellement|en ce moment|dernier en date|dernier sorti|record actuel|dernier album|dernier tome|dernière saison|prochaine|à venir/i;

let total = 0;
const parTheme = {};
for (const t of readAll({ actifsSeulement: true })) {
  if (filtreTheme && t.id !== filtreTheme) continue;
  for (const q of t.questions) {
    total++;
    const texte = q.q + ' ' + (q.info || '');
    const annee = texte.match(ANNEES);
    const tempo = TEMPOREL.test(texte);
    if (annee || tempo) {
      if (!parTheme[t.id]) parTheme[t.id] = [];
      parTheme[t.id].push({
        id: q.id,
        annee: annee ? annee[0] : null,
        tempo,
        q: q.q.slice(0, 120),
        bonne: q.reponses[q.bonne],
      });
    }
  }
}

let n = 0;
for (const [theme, liste] of Object.entries(parTheme).sort()) {
  console.log(`\n=== ${theme} (${liste.length} questions à risque) ===`);
  for (const item of liste) {
    n++;
    const flags = [item.annee && `annee=${item.annee}`, item.tempo && 'temporel'].filter(Boolean).join(' ');
    console.log(`  [${flags}] ${item.q}`);
    console.log(`    -> bonne: "${item.bonne}"  (${item.id})`);
  }
}
console.log(`\nTOTAL questions analysées: ${total} | à risque: ${n}`);
