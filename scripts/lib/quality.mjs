// scripts/lib/quality.mjs — règles qualité du corpus (fonctions pures, sans accès disque).
// checkQuestion(q, ctx) -> [{ code, message }] ; codes stables, documentés dans docs/ajouter-questions.md.
import { normalizeQuestionText } from './content.mjs';
import { schemaQuestion } from '../../src/lib/schema.ts';

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
  'format',
];

const REPONSES_BOOLEENNES = new Set(['vrai', 'faux']);

// Mot entier (ou suite de mots entiers) : « paris » ne matche pas « parisien ».
function contientMotEntier(texteNorm, motifNorm) {
  return ` ${texteNorm} `.includes(` ${motifNorm} `);
}

// ctx.seen : Set des textes normalisés déjà vus dans le thème (le 1er exemplaire n'est pas en faute).
// Le Set n'est PAS modifié ici : l'appelant l'alimente (voir checkQuestions).
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
  return out;
}

// Vérifie une liste dans l'ordre ; `seen` (optionnel) = textes normalisés déjà présents avant la liste.
// Renvoie [{ question, index, violations }] pour les seules questions fautives.
export function checkQuestions(questions, seen = new Set()) {
  const res = [];
  questions.forEach((question, index) => {
    const violations = checkQuestion(question, { seen });
    if (violations.length) res.push({ question, index, violations });
    seen.add(normalizeQuestionText(question && question.q));
  });
  return res;
}
