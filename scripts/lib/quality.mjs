// scripts/lib/quality.mjs — règles qualité du corpus (fonctions pures, sans accès disque).
// checkQuestion(q, ctx) -> [{ code, message }] ; codes stables, documentés dans docs/ajouter-questions.md.
import { normalizeQuestionText } from './content.mjs';
import { schemaQuestion } from '../../src/lib/schema.ts';
// Node retire les types TS : même algorithme (et même seuil) que l'appli et que l'import.
import { buildIndex, trouverSimilairesIndex } from '../../src/lib/similarity.ts';

export const LIMITS = {
  questionMax: 150,
  reponseMax: 60,
  nombreReponses: 4,
  reponseDansQuestionMin: 4, // longueur minimale (normalisée) de la bonne réponse pour la règle
  trahieRatio: 3, // bonne réponse >= 3x la plus longue des mauvaises...
  trahieEcart: 20, // ...ET >= 20 caractères de plus (seuils mesurés sur le corpus : 2x/15 = trop de bruit)
};

export const CODES = [
  'reponse-dans-question',
  'question-trop-longue',
  'reponse-trop-longue',
  'reponses-en-double',
  'nombre-reponses',
  'reponse-trahie-par-longueur',
  'doublon-exact',
  'quasi-doublon',
  'reponse-annotee',
  'encodage',
  'format',
];

const REPONSES_BOOLEENNES = new Set(['vrai', 'faux']);

// Mot entier (ou suite de mots entiers) : « paris » ne matche pas « parisien ».
function contientMotEntier(texteNorm, motifNorm) {
  return ` ${texteNorm} `.includes(` ${motifNorm} `);
}

// Commentaire entre parenthèses ou crochets dans une réponse : il trahit ou disqualifie un leurre.
const ANNOTATION = /[(\[]([^)\]]*)[)\]]/g;
// Exemption : le contenu est un symbole chimique / une formule courte (Fe, H2, G2V) ou un sigle en
// majuscules de 2 à 6 caractères (NATO, CPU) : « Fer (Fe) », « OTAN (NATO) » ne trahissent rien.
const SIGLE = /^(?:[A-Z][a-z]?\d{0,3}|[A-Z][A-Z0-9]{1,5})$/;

export function estAnnotee(reponse) {
  for (const m of String(reponse).matchAll(ANNOTATION)) if (!SIGLE.test(m[1].trim())) return true;
  return false;
}

// Index de similarité incrémental (même algorithme que l'import : buildIndex / trouverSimilairesIndex).
// Un index inversé par mot significatif écarte les candidats : un score >= 0.4 (et a fortiori >= QUASI_SEUIL) exige au
// moins un mot en commun (0.35 de bigrammes seuls < 0.4), donc le résultat est identique au scan complet.
const MOJIBAKE = /Ã[\u0080-\u00BF]|Å[\u0080-\u00BF\u0152\u0153\u201C\u201D]|â€/;

export const QUASI_SEUIL = 0.6;

export function creerIndexSimilarite(questions = []) {
  const parMot = new Map(); // mot -> entrées d'index
  const ajouterEntree = (e) => {
    for (const mot of e.prep.setMots) {
      const liste = parMot.get(mot);
      if (liste) liste.push(e);
      else parMot.set(mot, [e]);
    }
  };
  const ajouter = (question) => {
    for (const e of buildIndex([{ q: String((question && question.q) || '') }])) {
      e.question = question;
      ajouterEntree(e);
    }
  };
  questions.forEach(ajouter);
  // Question proche de `texte` ayant la MÊME bonne réponse : { question, score } ou null.
  // Seuil corpus QUASI_SEUIL (et non THRESHOLD_SIMILAR = 0.4 de l'appli) + même bonne réponse :
  // mesuré sur le corpus, 0.4 seul signalait surtout des questions de même gabarit sur des sujets
  // différents (« PS3 / PS4 sortie au Japon », « Wimbledon messieurs / dames »), pas des doublons.
  const chercher = (texte, bonneReponse) => {
    const [cible] = buildIndex([{ q: String(texte || '') }]);
    const candidats = new Set();
    for (const mot of cible.prep.setMots) for (const e of parMot.get(mot) || []) candidats.add(e);
    // Texte strictement identique sans mot significatif : score 1 sans mot commun.
    if (!cible.prep.setMots.size && cible.prep.n) for (const liste of parMot.values()) for (const e of liste) if (e.prep.n === cible.prep.n) candidats.add(e);
    const cibleRep = normalizeQuestionText(bonneReponse);
    const proches = trouverSimilairesIndex(String(texte || ''), [...candidats], QUASI_SEUIL, 10);
    return proches.find((p) => normalizeQuestionText(p.question.reponses?.[p.question.bonne]) === cibleRep) || null;
  };
  return { ajouter, chercher };
}

// ctx.seen : Set des textes normalisés déjà vus dans le thème (le 1er exemplaire n'est pas en faute).
// ctx.similar : index de creerIndexSimilarite() des questions PRÉCÉDENTES (règle quasi-doublon, optionnelle).
// Les Set / index ne sont PAS modifiés ici : l'appelant l'alimente (voir checkQuestions).
export function checkQuestion(q, ctx = {}) {
  const out = [];
  const add = (code, message) => out.push({ code, message });

  const parsed = schemaQuestion.safeParse(q);
  if (!parsed.success) {
    add('format', parsed.error.issues.map((i) => `${i.path.join('.') || 'question'} : ${i.message}`).join(' ; '));
    return out; // les autres règles supposent un schéma valide
  }
  const { q: texte, reponses, bonne } = q;

  if (reponses.length !== LIMITS.nombreReponses) {
    add('nombre-reponses', `${reponses.length} réponse(s) au lieu de ${LIMITS.nombreReponses}`);
  }
  if (texte.length > LIMITS.questionMax) {
    add('question-trop-longue', `${texte.length} caractères (max ${LIMITS.questionMax})`);
  }
  const longue = reponses.find((r) => r.length > LIMITS.reponseMax);
  if (longue !== undefined) {
    add('reponse-trop-longue', `réponse de ${longue.length} caractères (max ${LIMITS.reponseMax})`);
  }

  const normReponses = reponses.map(normalizeQuestionText);
  if (new Set(normReponses).size < normReponses.length) {
    add('reponses-en-double', 'deux réponses identiques après normalisation');
  }

  const bonneNorm = normReponses[bonne];
  const normQ = normalizeQuestionText(texte);
  // « Vrai ou faux : ... » contient forcément « vrai » : réponses vrai/faux exemptées.
  if (!REPONSES_BOOLEENNES.has(bonneNorm) && bonneNorm.length >= LIMITS.reponseDansQuestionMin && contientMotEntier(normQ, bonneNorm)) {
    add('reponse-dans-question', `la bonne réponse « ${reponses[bonne]} » apparaît dans la question`);
  }

  const mauvaises = reponses.filter((_, i) => i !== bonne);
  const maxMauvaise = Math.max(...mauvaises.map((r) => r.length));
  const lb = reponses[bonne].length;
  if (lb >= LIMITS.trahieRatio * maxMauvaise && lb - maxMauvaise >= LIMITS.trahieEcart) {
    add('reponse-trahie-par-longueur', `bonne réponse de ${lb} caractères, les autres font ${maxMauvaise} au plus`);
  }

  if (ctx.seen && ctx.seen.has(normQ)) {
    add('doublon-exact', "même question (texte normalisé) qu'une question précédente du thème");
  }
  // Texte UTF-8 relu en Windows-1252 (« dÃ©esse », « sÅ“ur ») : 49 questions d'un lot l'étaient.
  if ([texte, ...reponses, q.info || ''].some((t) => MOJIBAKE.test(t))) {
    add('encodage', 'texte mal encodé (UTF-8 relu en Windows-1252, ex. « Ã© » au lieu de « é »)');
  }
  if (reponses.some(estAnnotee)) {
    add('reponse-annotee', 'une réponse contient un commentaire entre parenthèses ou crochets');
  }

  if (ctx.similar) {
    const proche = ctx.similar.chercher(texte, reponses[q.bonne]);
    // Un doublon exact (score 1) est déjà signalé par `doublon-exact` : pas de second signalement.
    if (proche && normalizeQuestionText(proche.question.q) !== normQ) {
      add('quasi-doublon', `ressemble à « ${String(proche.question.q).slice(0, 80)} » (score ${proche.score.toFixed(2)})`);
    }
  }
  return out;
}

// Vérifie une liste dans l'ordre ; `seen` (optionnel) = textes normalisés déjà présents avant la liste.
// Renvoie [{ question, index, violations }] pour les seules questions fautives.
export function checkQuestions(questions, seen = new Set(), similar = creerIndexSimilarite()) {
  const res = [];
  questions.forEach((question, index) => {
    const violations = checkQuestion(question, { seen, similar });
    if (violations.length) res.push({ question, index, violations });
    seen.add(normalizeQuestionText(question && question.q));
    if (question && typeof question.q === 'string') similar.ajouter(question);
  });
  return res;
}
