// Compare le contenu de backups/<snapshot> avec le projet actuel.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = __dirname;
const snap = path.join(root, 'backups', process.argv[2] || 'snapshot-20261120-145147');

const IGNORES = new Set(['backups', 'node_modules', 'dist', 'dev-dist', '.git']);

function walk(dir, base, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORES.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out);
    else out[path.relative(base, p)] = crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');
  }
  return out;
}

const a = walk(snap, snap, {});           // snapshot
const bFilt = walk(root, root, {});       // projet actuel (dossiers ignores exclus du walk)

let changed = [], onlySnap = [], onlyCur = [];
for (const k of Object.keys(a)) {
  if (!(k in bFilt)) onlySnap.push(k);
  else if (a[k] !== bFilt[k]) changed.push(k);
}
for (const k of Object.keys(bFilt)) if (!(k in a)) onlyCur.push(k);

console.log('== modifies depuis le snapshot (' + changed.length + ') :');
changed.forEach((k) => console.log('  ~ ' + k));
console.log('== presents dans le snapshot mais plus dans le projet (' + onlySnap.length + ') :');
onlySnap.forEach((k) => console.log('  - ' + k));
console.log('== ajoutes depuis le snapshot (' + onlyCur.length + ') :');
onlyCur.slice(0, 30).forEach((k) => console.log('  + ' + k));
if (onlyCur.length > 30) console.log('  ... et ' + (onlyCur.length - 30) + ' autres');
