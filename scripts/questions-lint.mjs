// scripts/questions-lint.mjs — lint qualité du corpus avec liste de dette (ratchet).
// Les violations historiques sont listées dans content/qualite-dette.json ({ code: [ids triés] }).
// Échec si : (1) une violation n'est pas dans la dette (nouvelle dette interdite) ;
// (2) la dette contient une entrée qui ne viole plus la règle ou dont l'id n'existe plus (périmée).
// Usage : npm run questions:lint [-- --init-dette | --update-dette]
//   --init-dette   crée la dette depuis l'état actuel (refuse d'écraser un fichier existant)
//   --update-dette retire les entrées périmées (ne rajoute JAMAIS rien)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CONTENT_DIR, readAll } from './lib/content.mjs';
import { CODES, checkQuestions } from './lib/quality.mjs';

export const DETTE_FILE = path.join(CONTENT_DIR, 'qualite-dette.json');

export function readDette(file = DETTE_FILE) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
}

export function serializeDette(dette) {
  const triee = {};
  for (const code of Object.keys(dette).sort()) triee[code] = [...new Set(dette[code])].sort();
  return JSON.stringify(triee, null, 2) + '\n';
}

// Fonction pure : themes = [{ id, questions }], dette = { code: [ids] }.
// -> { parCode (nb en dette par code), violations (toutes), nouvelles, perimees }
export function analyser(themes, dette) {
  const violations = []; // { code, id, theme, message, extrait }
  const ids = new Set();
  const sansId = [];
  for (const t of themes) {
    for (const r of checkQuestions(t.questions)) {
      for (const v of r.violations) {
        violations.push({
          code: v.code,
          id: r.question.id,
          theme: t.id,
          message: v.message,
          extrait: String((r.question && r.question.q) || '').slice(0, 80),
        });
      }
    }
    for (const q of t.questions) {
      if (q.id) ids.add(q.id);
      else sansId.push({ theme: t.id, extrait: String(q.q || '').slice(0, 80) });
    }
  }

  const enDette = new Set();
  for (const [code, liste] of Object.entries(dette)) for (const id of liste) enDette.add(`${code}\u0000${id}`);
  const violees = new Set(violations.map((v) => `${v.code}\u0000${v.id}`));

  const nouvelles = violations.filter((v) => !v.id || !enDette.has(`${v.code}\u0000${v.id}`));
  const perimees = [];
  for (const [code, liste] of Object.entries(dette)) {
    for (const id of liste) {
      if (!CODES.includes(code)) perimees.push({ code, id, raison: 'code inconnu' });
      else if (!ids.has(id)) perimees.push({ code, id, raison: "la question n'existe plus" });
      else if (!violees.has(`${code}\u0000${id}`)) perimees.push({ code, id, raison: 'ne viole plus la règle' });
    }
  }
  const parCode = {};
  for (const code of CODES) parCode[code] = (dette[code] || []).length;
  return { parCode, violations, nouvelles, perimees, sansId };
}

// Dette initiale = toutes les violations actuelles.
export function detteDepuis(violations) {
  const dette = {};
  for (const v of violations) if (v.id) (dette[v.code] ||= []).push(v.id);
  return dette;
}

// Retire les entrées périmées, n'ajoute jamais rien.
export function retirerPerimees(dette, perimees) {
  const out = {};
  for (const [code, liste] of Object.entries(dette)) {
    const retirer = new Set(perimees.filter((p) => p.code === code).map((p) => p.id));
    const reste = liste.filter((id) => !retirer.has(id));
    if (reste.length) out[code] = reste;
  }
  return out;
}

// Retourne le code de sortie (0 = ok). `dir`/`detteFile` paramétrables pour les tests.
/** @param {{ args?: string[], dir?: string, detteFile?: string, log?: (m: string) => void }} [options] */
export function run({ args = [], dir = CONTENT_DIR, detteFile = path.join(dir, 'qualite-dette.json'), log = console.log } = {}) {
  const themes = readAll({ dir });

  if (args.includes('--init-dette')) {
    if (fs.existsSync(detteFile)) {
      log(`${path.basename(detteFile)} existe déjà : --init-dette ne l'écrase pas (la dette ne doit jamais grossir).`);
      return 1;
    }
    const { violations } = analyser(themes, {});
    fs.writeFileSync(detteFile, serializeDette(detteDepuis(violations)));
    log(`Dette initiale écrite (${violations.length} entrées) : ${detteFile}`);
    return 0;
  }

  let dette = readDette(detteFile);
  let res = analyser(themes, dette);

  if (args.includes('--update-dette')) {
    dette = retirerPerimees(dette, res.perimees);
    fs.writeFileSync(detteFile, serializeDette(dette));
    log(`${res.perimees.length} entrée(s) périmée(s) retirée(s) de la dette.`);
    res = analyser(themes, dette);
  }

  log('Dette qualité par code :');
  for (const [code, n] of Object.entries(res.parCode)) log(`  ${code.padEnd(30)} ${n}`);

  let echec = false;
  if (res.sansId.length) {
    echec = true;
    log(`\n${res.sansId.length} question(s) sans id : lancez npm run questions:ids`);
    for (const s of res.sansId.slice(0, 10)) log(`  [${s.theme}] ${s.extrait}`);
  }
  if (res.nouvelles.length) {
    echec = true;
    log(`\n${res.nouvelles.length} NOUVELLE(S) violation(s) (la dette ne peut pas grossir, corrigez la question) :`);
    for (const v of res.nouvelles.slice(0, 50)) log(`  ${v.code} | ${v.id || '(sans id)'} | ${v.theme} | ${v.extrait} | ${v.message}`);
    if (res.nouvelles.length > 50) log(`  ... et ${res.nouvelles.length - 50} autre(s)`);
  }
  if (res.perimees.length) {
    echec = true;
    log(`\n${res.perimees.length} entrée(s) de dette périmée(s) : lancez npm run questions:lint -- --update-dette`);
    for (const p of res.perimees.slice(0, 10)) log(`  ${p.code} | ${p.id} | ${p.raison}`);
  }
  if (!echec) log('\nLint qualité OK.');
  return echec ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = run({ args: process.argv.slice(2) });
}
