// Garde-fous automatiques lancés par `npm run lint` (donc impossibles à oublier).
// Chaque contrôle correspond à une erreur réellement commise par un agent (audit du 2026-11-26) :
// une règle écrite seulement dans AGENTS.md ne suffit pas, elle doit casser le lint.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const rel = (f) => path.relative(root, f);

const tracked = execSync('git ls-files', { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((f) => fs.existsSync(path.join(root, f)));

// 1. Chaque fichier cité par un script npm existe (les tests:* pointaient vers des .jsx supprimés).
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const [name, cmd] of Object.entries(pkg.scripts)) {
  for (const m of cmd.matchAll(/(?:^|\s)((?:tests|scripts|src)\/[\w./-]+\.\w+)/g)) {
    if (!fs.existsSync(path.join(root, m[1]))) {
      errors.push(`package.json : le script "${name}" cite ${m[1]} qui n'existe pas`);
    }
  }
}

// 2. Aucun emoji ni pictogramme (règle 1) dans le code, les styles et la doc.
//    content/questions/*.json est exclu : le corpus contient des emojis dans ses textes.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{FE0F}]/u;
// corpus.json est généré depuis les questions ; veille-quizup.md est une archive figée.
const SKIP_EMOJI = new Set(['package-lock.json', 'public/corpus.json', 'docs/veille-quizup.md']);
const textFile = /\.(ts|tsx|js|mjs|css|html|md|json|toml)$/;
for (const f of tracked) {
  if (!textFile.test(f) || /^content\/questions\//.test(f) || SKIP_EMOJI.has(f)) continue;
  const lines = fs.readFileSync(path.join(root, f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (EMOJI.test(line)) errors.push(`${f}:${i + 1} : emoji ou pictogramme interdit (règle 1, utiliser Icon.tsx)`);
  });
}

// 2b. Ancien format de questions (src/data/questions-*.js) : ces fichiers seraient ignorés
//     silencieusement par la génération du corpus (qui lit content/).
const ancien = fs.existsSync(path.join(root, 'src/data'))
  ? fs.readdirSync(path.join(root, 'src/data')).filter((f) => /^questions-.*\.js$/.test(f))
  : [];
for (const f of ancien) {
  errors.push(
    `src/data/${f} : ancien format interdit, ajouter les questions dans content/questions/<theme>.json (voir docs/ajouter-questions.md)`,
  );
}

// 3. Les chemins cités entre backticks dans la doc agents existent sur le disque
//    (règle 12 : la doc décrivait des fichiers renommés ou supprimés).
const docs = ['AGENTS.md', 'README.md', ...tracked.filter((f) => /^docs\/.*\.md$/.test(f))].filter(
  (f) => f !== 'docs/veille-quizup.md', // archive volontairement figée
);
const PATH_RE = /`((?:src|tests|scripts|api|durable-objects|migrations|public|docs|content)\/[\w./@-]+\.\w+)`/g;
for (const f of docs) {
  const lines = fs.readFileSync(path.join(root, f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(PATH_RE)) {
      const p = m[1];
      if (p.includes('*') || /^public\/corpus\.json$/.test(p)) continue; // motifs et fichier généré
      if (!fs.existsSync(path.join(root, p))) errors.push(`${f}:${i + 1} : chemin cité introuvable ${p}`);
    }
  });
}

// 4. Termes périmés : modes ou fichiers supprimés qui ne doivent plus apparaître dans la doc agents.
const STALE = [
  [/(?<!ancien mode |l’ancien mode |l'ancien mode )\bSurvie\b|test:game:survival/, 'le mode Survie a été remplacé par Rogue Quizz'],
  [/\b\d{3} fichiers\b.*questions-/, 'nombre de fichiers de questions en dur (utiliser npm run count:questions)'],
  [/src\/data\/questions-/, 'les questions vivent dans content/ (themes.json + questions/<theme>.json)'],
  [/\.test\.jsx?\b/, 'les tests sont en .ts/.tsx'],
];
for (const f of docs) {
  const lines = fs.readFileSync(path.join(root, f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const [re, why] of STALE) if (re.test(line)) errors.push(`${f}:${i + 1} : terme périmé (${why})`);
  });
}

// 5. Le manifeste versionné (src/data/theme-manifest.js) doit correspondre au contenu : sinon les
//    tests et le typecheck tournent sur une CORPUS_VERSION périmée (oubli constaté après une correction).
{
  const { contentHash } = await import('./lib/content.mjs');
  const manifeste = fs.readFileSync(path.join(root, 'src/data/theme-manifest.js'), 'utf8');
  const version = manifeste.match(/CORPUS_VERSION = "([0-9a-f]+)"/)?.[1];
  if (version !== contentHash()) {
    errors.push('src/data/theme-manifest.js : CORPUS_VERSION périmée, lancez npm run gen:manifest et commitez le fichier');
  }
}

// 6. Un nom de @keyframes est global : deux définitions du même nom, la dernière importée écrase
//    l'autre sans erreur (`pop` d'apparition remplacé par un simple battement dans tout le jeu).
{
  const vus = new Map();
  for (const f of tracked.filter((t) => /^src\/.*\.css$/.test(t))) {
    const lines = fs.readFileSync(path.join(root, f), 'utf8').split('\n');
    lines.forEach((line, i) => {
      const nom = line.match(/@keyframes\s+([\w-]+)/)?.[1];
      if (!nom) return;
      if (vus.has(nom)) errors.push(`${f}:${i + 1} : @keyframes ${nom} déjà défini dans ${vus.get(nom)} (renommer l'un des deux)`);
      else vus.set(nom, `${f}:${i + 1}`);
    });
  }
}

if (errors.length) {
  for (const e of errors) console.error(`check-repo : ${e}`);
  console.error(`check-repo : ${errors.length} problème(s). Voir scripts/check-repo.mjs pour le pourquoi.`);
  process.exit(1);
}
console.log(`check-repo : OK (${tracked.length} fichiers suivis vérifiés)`);
