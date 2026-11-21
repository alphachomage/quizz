// Détection de questions similaires — 100 % local, aucune donnée envoyée ailleurs.
//
// Principe : on "normalise" les textes (minuscules, sans accents, sans ponctuation,
// sans mots vides comme "le", "est", "dans"...), puis on compare :
//   - les mots significatifs (indice de Jaccard)
//   - les groupes de 2 mots consécutifs ("bigrams"), pour capter la tournure de phrase
// Score final entre 0 et 1.

const STOPWORDS = new Set(
  ("le la les l un une des du de d au aux et ou mais donc car ni que quoi quel quelle quelles quels " +
    "est sont a ont été être avoir fait fait font faire plus moins très dans sur sous pour par avec sans en " +
    "ce cet cette ces son sa ses leur leurs mon ma mes ton ta tes notre nos votre vos ne pas aussi tout tous " +
    "toute toutes même autres autre chaque environ entre dès lors quand si y as il elle ils elles on nous vous " +
    "son sa ses au aux du de la le").split(" ")
);

export function normalize(texte) {
  return (texte || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // supprime les accents
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(texte) {
  return normalize(texte)
    .split(" ")
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function bigrams(texte) {
  const t = normalize(texte).split(" ");
  const set = new Set();
  for (let i = 0; i < t.length - 1; i++) set.add(t[i] + " " + t[i + 1]);
  if (t.length === 1 && t[0]) set.add(t[0]);
  return set;
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// Pré-calcul d'un texte : normalisation + mots significatifs + bigrammes.
// Sert à l'index (construireIndex) pour ne calculer ça qu'UNE fois par question.
function prep(texte) {
  const n = normalize(texte);
  return { n, setMots: new Set(tokens(texte)), setBigrams: bigrams(texte) };
}

// Score entre deux textes PRÉ-CALCULÉS (prep), entre 0 et 1.
function prevScore(pa, pb) {
  if (!pa.n || !pb.n) return 0;
  if (pa.n === pb.n) return 1; // texte strictement identique
  const sMots = jaccard(pa.setMots, pb.setMots);
  const sBigrammes = jaccard(pa.setBigrams, pb.setBigrams);
  return 0.65 * sMots + 0.35 * sBigrammes;
}

// Score de similarité entre deux textes, entre 0 et 1.
export function similarityScore(a, b) {
  return prevScore(prep(a), prep(b));
}

export const THRESHOLD_SIMILAR = 0.4; // à partir de là, on avertit l'utilisateur
export const THRESHOLD_IDENTICAL = 0.85; // à partir de là, on dit « quasi identique »

// Index pré-calculé des questions (normalisation + mots + bigrammes de CHAQUE
// question calculés UNE SEULE FOIS) : indispensable avec 13 000+ questions,
// sinon chaque frappe recalculerait tout. Interroger ensuite avec
// trouverSimilairesIndex(texte, index, ...).
export function buildIndex(questions) {
  return questions.map((q) => ({ question: q, prep: prep(q.q) }));
}

// Cherche dans un INDEX (voir construireIndex) les questions les plus proches.
// Retourne [{ question, score }] triés du plus au moins similaire.
export function trouverSimilairesIndex(texte, index, seuil = THRESHOLD_SIMILAR, max = 5) {
  const p = prep(texte);
  return index
    .map((e) => ({ question: e.question, score: prevScore(p, e.prep) }))
    .filter((x) => x.score >= seuil)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
}

// Cherche les questions les plus proches d'un texte donné (construit l'index à
// la volée : pour un usage ponctuel, ex. la validation du formulaire).
// `questions` : liste d'objets contenant au moins { q, themeNom, themeCouleur }
export function trouverSimilaires(texte, questions, seuil = THRESHOLD_SIMILAR, max = 5) {
  return trouverSimilairesIndex(texte, buildIndex(questions), seuil, max);
}
