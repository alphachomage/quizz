// scripts/questions-import.mjs — importe les lots déposés dans content/inbox/*.json.
// Format d'un fichier : { "theme": "<id de themes.json>", "questions": [ {q,reponses,bonne,niveau,info?} ] } (sans id).
// Toutes les règles qualité sont BLOQUANTES (aucune dette pour du contenu neuf), plus le doublon
// exact (thème + lot) et le quasi-doublon (même algorithme que l'appli, seuil THRESHOLD_SIMILAR).
// Acceptées : ajoutées EN FIN du fichier de thème, avec id. Refusées : le fichier inbox est réécrit
// avec les seules refusées, annotées "rejet" ; tout accepté = fichier supprimé. Sortie 1 s'il reste des refus.
// Usage : npm run questions:import [-- --dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CONTENT_DIR, normalizeQuestionText, readThemes, readThemeQuestions, serializeQuestions, writeThemeQuestions } from './lib/content.mjs';
import { attribuerId } from './lib/ids.mjs';
import { checkQuestion, creerIndexSimilarite } from './lib/quality.mjs';

const CLES = ['q', 'reponses', 'bonne', 'niveau', 'info'];

// Instruction de rejet : "code: message".
const rejet = (code, message) => `${code}: ${message}`;

// Examine une question du lot ; renvoie la liste des motifs de rejet ("code: message").
// Toutes les règles (dont quasi-doublon et reponse-annotee) viennent de checkQuestion : une seule logique.
function examiner(q, etat) {
  return checkQuestion(q, { seen: etat.seen, similar: etat.similar }).map((v) => rejet(v.code, v.message));
}

// Retourne { code, resume, fichiers } ; `dir` = racine de contenu (tests), `dryRun` = aucune écriture.
export function run({ dir = CONTENT_DIR, dryRun = false, log = console.log } = {}) {
  const inbox = path.join(dir, 'inbox');
  const fichiers = fs.existsSync(inbox) ? fs.readdirSync(inbox).filter((n) => n.endsWith('.json')).sort() : [];
  if (!fichiers.length) {
    log('Inbox vide : rien à importer.');
    return { code: 0, fichiers: [] };
  }

  const themes = new Map(readThemes(dir).map((t) => [t.id, t]));
  const etats = new Map(); // état par thème, partagé entre les fichiers du même passage
  const ids = new Set();
  for (const id of themes.keys()) for (const q of readThemeQuestions(id, dir)) if (q.id) ids.add(q.id);
  const etat = (themeId) => {
    if (!etats.has(themeId)) {
      const existantes = readThemeQuestions(themeId, dir);
      etats.set(themeId, {
        existantes,
        ajoutees: [],
        seen: new Set(existantes.map((q) => normalizeQuestionText(q.q))),
        similar: creerIndexSimilarite(existantes),
      });
    }
    return etats.get(themeId);
  };

  const rapport = [];
  let refus = 0;
  let erreurs = 0;
  for (const nom of fichiers) {
    const fichier = path.join(inbox, nom);
    let lot;
    try {
      lot = JSON.parse(fs.readFileSync(fichier, 'utf8'));
    } catch {
      log(`${nom} : JSON invalide, fichier laissé tel quel.`);
      erreurs++;
      continue;
    }
    if (!lot || typeof lot.theme !== 'string' || !Array.isArray(lot.questions)) {
      log(`${nom} : format attendu { "theme": "...", "questions": [...] }, fichier laissé tel quel.`);
      erreurs++;
      continue;
    }
    if (!themes.has(lot.theme)) {
      log(`${nom} : thème inconnu « ${lot.theme} » (voir content/themes.json), fichier refusé en entier.`);
      erreurs++;
      continue;
    }

    const e = etat(lot.theme);
    const acceptees = [];
    const refusees = [];
    for (const brut of lot.questions) {
      // On repart des seules clés du format : id et rejet d'un passage précédent sont ignorés.
      const q = brut && typeof brut === 'object' ? Object.fromEntries(CLES.filter((k) => k in brut).map((k) => [k, brut[k]])) : brut;
      const motifs = examiner(q, e);
      if (motifs.length) {
        refusees.push({ ...q, rejet: motifs });
        continue;
      }
      const norm = normalizeQuestionText(q.q);
      // Rang 1 : un doublon exact est refusé, donc ce texte est nouveau dans le thème.
      const complete = { id: attribuerId(lot.theme, norm, ids), ...q };
      e.ajoutees.push(complete);
      e.seen.add(norm);
      e.similar.ajouter(complete);
      acceptees.push(complete);
    }

    const motifsParCode = {};
    for (const r of refusees) for (const m of r.rejet) motifsParCode[m.split(':')[0]] = (motifsParCode[m.split(':')[0]] || 0) + 1;
    for (const r of refusees) log(`  [${nom}] ${String(r.q).slice(0, 60)} -> ${r.rejet.join(' | ')}`);
    rapport.push({ fichier: nom, theme: lot.theme, acceptees: acceptees.length, refusees: refusees.length, motifs: motifsParCode });
    refus += refusees.length;

    if (!dryRun) {
      if (refusees.length) fs.writeFileSync(fichier, serializeQuestions(lot.theme, refusees));
      else fs.unlinkSync(fichier);
    }
  }

  if (!dryRun) {
    for (const [themeId, e] of etats) {
      if (e.ajoutees.length) writeThemeQuestions(themeId, [...e.existantes, ...e.ajoutees], dir);
    }
  }

  log(dryRun ? 'Import (simulation, aucune écriture) :' : 'Import :');
  for (const r of rapport) {
    const detail = Object.entries(r.motifs).map(([c, n]) => `${c} x${n}`).join(', ');
    log(`  ${r.fichier} [${r.theme}] : ${r.acceptees} acceptée(s), ${r.refusees} refusée(s)${detail ? ` (${detail})` : ''}`);
  }
  if (refus && !dryRun) log('Les questions refusées restent dans leur fichier inbox, annotées "rejet" : corrigez-les puis relancez.');
  if (refus) log(`${refus} question(s) refusée(s).`);
  return { code: refus || erreurs ? 1 : 0, fichiers: rapport };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = run({ dryRun: process.argv.includes('--dry-run') }).code;
}
