import { readFileSync, readdirSync, writeFileSync } from 'fs';
const lines = [];
for (const f of readdirSync('./src/data')) {
  if (!f.startsWith('questions-') || f.startsWith('questions-mangas4-') || !f.endsWith('.js')) continue;
  const src = readFileSync('./src/data/' + f, 'utf8');
  for (const m of src.matchAll(/q:\s*"((?:[^"\\]|\\.)*)"/g)) lines.push(f + ' :: ' + m[1]);
}
writeFileSync('./existing-q-all.txt', lines.join('\n'), 'utf8');
console.log('total q extraites:', lines.length);
console.log('fichiers contributeurs:');
const byFile = {};
for (const l of lines) { const f = l.split(' :: ')[0]; byFile[f] = (byFile[f] || 0) + 1; }
console.log(byFile);
