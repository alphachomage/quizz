// Supprime les doublons EXACTS (même question normalisée dans le même thème),
// en gardant la première occurrence (ordre alphabétique des fichiers).
// Réécrit uniquement les fichiers concernés, en conservant l'en-tête (commentaires)
// et le nom d'export. Sauvegarde préalable recommandée (backups/).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const files = fs.readdirSync(dir).filter((f) => /^questions-.*\.js$/.test(f)).sort();

function norm(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const vus = new Set(); // "themeId|question normalisée"
let totalSuppr = 0;
const rapport = [];

for (const f of files) {
  const file = path.join(dir, f);
  const mod = await import(pathToFileURL(file).href + '?t=' + Date.now() + Math.random());
  const lot = Object.values(mod)[0];
  if (!Array.isArray(lot)) continue;

  let modifie = false;
  const nouveau = lot.map((t) => {
    const questions = [];
    let suppr = 0;
    for (const q of t.questions) {
      const key = t.id + '|' + norm(q.q);
      if (vus.has(key)) { suppr++; modifie = true; continue; }
      vus.add(key);
      questions.push(q);
    }
    totalSuppr += suppr;
    if (suppr) rapport.push(f + ' (' + t.id + ') : -' + suppr);
    return { ...t, questions };
  });

  if (modifie) {
    const texte = fs.readFileSync(file, 'utf8');
    const lignes = texte.split(/\r?\n/);
    const header = [];
    let i = 0;
    while (i < lignes.length && (lignes[i].startsWith('//') || lignes[i].trim() === '')) { header.push(lignes[i]); i++; }
    const name = (texte.match(/export const (\w+)/) || [])[1];
    if (!name) { rapport.push('ERREUR: pas d\'export const dans ' + f); continue; }
    const body = ['export const ' + name + ' = ['];
    for (const t of nouveau) {
      body.push('  {');
      for (const k of ['id', 'nom', 'icone', 'couleur']) body.push('    ' + k + ': ' + JSON.stringify(t[k]) + ',');
      body.push('    questions: [');
      for (const q of t.questions) {
        const parts = Object.keys(q).map((k) => JSON.stringify(k) + ': ' + JSON.stringify(q[k]));
        body.push('      { ' + parts.join(', ') + ' },');
      }
      body.push('    ],');
      body.push('  },');
    }
    body.push('];', '');
    fs.writeFileSync(file, header.join('\n') + '\n' + body.join('\n'));
  }
}

console.log(rapport.join('\n'));
console.log('TOTAL doublons supprimés : ' + totalSuppr);
