const files = ['questions-mangas4-a1.js','questions-mangas4-a2.js','questions-mangas4-b1.js','questions-mangas4-b2.js','questions-mangas4-c1.js'];
let allQ = [];
for (const f of files) {
  const mod = await import('./src/data' + f);
  const arr = Object.values(mod)[0];
  if (!Array.isArray(arr) || arr.length !== 1) console.log(f, 'ATTENTION: export non conforme', arr.length);
  const theme = arr[0];
  console.log(f, '| themes:', arr.length, '| id:', theme.id, '| nom:', theme.nom, '| icone:', theme.icone, '| couleur:', theme.couleur, '| nb questions:', theme.questions.length);
  let errors = [];
  theme.questions.forEach((q, i) => {
    if (typeof q.q !== 'string' || !q.q.trim()) errors.push(i + ': q invalide');
    if (!Array.isArray(q.reponses) || q.reponses.length !== 4) errors.push(i + ': reponses != 4 (' + (q.reponses && q.reponses.length) + ')');
    if (!Number.isInteger(q.bonne) || q.bonne < 0 || q.bonne > 3) errors.push(i + ': bonne invalide ' + q.bonne);
    const attendu = f.includes('-a') ? 'facile' : f.includes('-b') ? 'moyen' : 'dur';
    if (q.niveau !== attendu) errors.push(i + ': niveau ' + q.niveau + ' != ' + attendu);
    if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(JSON.stringify(q))) errors.push(i + ': emoji detecte');
    allQ.push(q.q.trim().toLowerCase().replace(/\s+/g, ' '));
  });
  console.log('  erreurs format:', errors.length ? errors : 'aucune');
}
const seen = new Map(); let dups = [];
allQ.forEach((q, i) => { if (seen.has(q)) dups.push([seen.get(q), i, q]); else seen.set(q, i); });
console.log('TOTAL questions nouvelles:', allQ.length, '| doublons internes:', dups.length ? dups : 'aucun');

// comparaison avec toutes les questions existantes
import { readFileSync, readdirSync } from 'fs';
const existing = [];
for (const f of readdirSync('./src/data')) {
  if (!f.startsWith('questions-') || f.startsWith('questions-mangas4-') || !f.endsWith('.js')) continue;
  const src = readFileSync('./src/data' + f, 'utf8');
  for (const m of src.matchAll(/q:\s*"((?:[^"\\]|\\.)*)"/g)) existing.push(m[1].trim().toLowerCase().replace(/\s+/g, ' '));
}
console.log('questions existantes (hors nouveaux lots):', existing.length);
const exSet = new Set(existing);
const collisions = allQ.filter(q => exSet.has(q));
console.log('collisions exactes avec existantes:', collisions.length ? collisions : 'aucune');
// quasi-doublons: normalisation plus forte (sans ponctuation)
const norm = s => s.replace(/[^a-z0-9àâäéèêëîïôöùûüç\s]/gi, '').replace(/\s+/g, ' ').trim();
const exNorm = new Set(existing.map(norm));
const quasi = allQ.filter(q => exNorm.has(norm(q)));
console.log('quasi-doublons (normalises) avec existantes:', quasi.length ? quasi : 'aucun');
