import { readFileSync, readdirSync } from 'fs';
const newFiles = ['questions-mangas4-a1.js','questions-mangas4-a2.js','questions-mangas4-b1.js','questions-mangas4-b2.js','questions-mangas4-c1.js'];
const mine = [];
for (const f of newFiles) {
  const mod = await import('./src/data' + f);
  const qs = Object.values(mod)[0][0].questions;
  qs.forEach((q, i) => mine.push({ f, i, q: q.q, norm: q.q.trim().toLowerCase().replace(/\s+/g, ' ') }));
}
const norm = s => s.replace(/[^a-z0-9àâäéèêëîïôöùûüç\s]/gi, '').replace(/\s+/g, ' ').trim();
const existing = [];
for (const f of readdirSync('./src/data')) {
  if (!f.startsWith('questions-') || f.startsWith('questions-mangas4-') || !f.endsWith('.js')) continue;
  const src = readFileSync('./src/data' + f, 'utf8');
  for (const m of src.matchAll(/q:\s*"((?:[^"\\]|\\.)*)"/g)) existing.push({ f, q: m[1] });
}
for (const e of existing) e.norm = norm(e.q.trim().toLowerCase());
const exMap = new Map(existing.map(e => [norm(e.norm), e]));
for (const m of mine) {
  const hit = exMap.get(norm(m.norm));
  if (hit) console.log('COLLISION | mon fichier:', m.f, 'index', m.i, '\n  MINE :', m.q, '\n  EXISTANTE (' + hit.f + ') :', hit.q, '\n');
}
// aussi: recherche de quasi-doublons par mots-clés communs (hors collisions exactes)
const stop = new Set(['dans','le','la','les','un','une','des','du','de','et','est','que','quel','quelle','comment',"s'appelle",'sappelle','compte','en','au','aux','pour','par','qui','ce','cette','son','sa','ses','aujourdhui','monde','serie','manga','anime','film','studio']);
function keys(s) { return new Set(norm(s.toLowerCase()).split(' ').filter(w => w.length > 3 && !stop.has(w))); }
const exKeys = existing.map(e => ({ e, k: keys(e.q) }));
let quasiCount = 0;
for (const m of mine) {
  if (exMap.has(norm(m.norm))) continue;
  const km = keys(m.q);
  for (const { e, k } of exKeys) {
    let inter = 0; for (const w of km) if (k.has(w)) inter++;
    if (inter >= 6 && km.size >= 6) { console.log('QUASI | ' + m.f + ' idx ' + m.i + ' (' + inter + ' mots communs)\n  MINE :', m.q, '\n  EXIST :', e.q, ' (' + e.f + ')\n'); quasiCount++; break; }
  }
}
console.log('quasi candidats:', quasiCount);
