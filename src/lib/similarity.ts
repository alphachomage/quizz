// Détection de questions similaires — 100 % local, aucune donnée envoyée ailleurs.
//
// Principe : on "normalise" les textes (minuscules, sans accents, sans ponctuation,
// sans mots vides comme "le", "est", "dans"...), puis on compare :
//   - les mots significatifs (indice de Jaccard)
//   - les groupes de 2 mots consécutifs ("bigrams"), pour capter la tournure de phrase
// Score final entre 0 et 1.

const STOPWORDS = new Set(
  (
    'le la les l un une des du de d au aux et ou mais donc car ni que quoi quel quelle quelles quels ' +
    'est sont a ont été être avoir fait fait font faire plus moins très dans sur sous pour par avec sans en ' +
    'ce cet cette ces son sa ses leur leurs mon ma mes ton ta tes notre nos votre vos ne pas aussi tout tous ' +
    'toute toutes même autres autre chaque environ entre dès lors quand si y as il elle ils elles on nous vous ' +
    'son sa ses au aux du de la le'
  ).split(' ')
);
export function normalize(text: string | null | undefined): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // supprime les accents
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function tokens(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}
function bigrams(text: string): Set<string> {
  const t = normalize(text).split(' ');
  const set = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) set.add(t[i] + ' ' + t[i + 1]);
  if (t.length === 1 && t[0]) set.add(t[0]);
  return set;
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// Texte pré-calculé : normalisation + mots significatifs + bigrammes.
interface Prep {
  n: string;
  setMots: Set<string>;
  setBigrams: Set<string>;
}

// Pré-calcul d'un texte : normalisation + mots significatifs + bigrammes.
// Sert à l'index (buildIndex) pour ne calculer ça qu'UNE fois par question.
function prep(text: string | null | undefined): Prep {
  const n = normalize(text);
  return {
    n,
    setMots: new Set(tokens(text || '')),
    setBigrams: bigrams(text || ''),
  };
}

// Score entre deux textes PRÉ-CALCULÉS (prep), entre 0 et 1.
function prevScore(pa: Prep, pb: Prep): number {
  if (!pa.n || !pb.n) return 0;
  if (pa.n === pb.n) return 1; // texte strictement identique
  const sMots = jaccard(pa.setMots, pb.setMots);
  const sBigrammes = jaccard(pa.setBigrams, pb.setBigrams);
  return 0.65 * sMots + 0.35 * sBigrammes;
}

// Score de similarité entre deux textes, entre 0 et 1.
export function similarityScore(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  return prevScore(prep(a), prep(b));
}
export const THRESHOLD_SIMILAR = 0.4; // à partir de là, on avertit l'utilisateur
export const THRESHOLD_IDENTICAL = 0.85; // à partir de là, on dit « quasi identique »

// Entrée d'index pré-calculé : la question d'origine + son texte pré-calculé.
// Générique sur Q pour conserver le type exact des questions indexées.
interface IndexEntry<Q extends { q: string }> {
  question: Q;
  prep: Prep;
}

// Index pré-calculé des questions (normalisation + mots + bigrammes de CHAQUE
// question calculés UNE SEULE FOIS) : indispensable avec 13 000+ questions,
// sinon chaque frappe recalculerait tout. Interroger ensuite avec
// trouverSimilairesIndex(texte, index, ...).
export function buildIndex<Q extends { q: string }>(questions: Q[]): IndexEntry<Q>[] {
  return questions.map((q) => ({
    question: q,
    prep: prep(q.q),
  }));
}

// Résultat d'une recherche de similarité.
interface SimilarHit<Q> {
  question: Q;
  score: number;
}

// Cherche dans un INDEX (voir buildIndex) les questions les plus proches.
// Retourne [{ question, score }] triés du plus au moins similaire.
export function trouverSimilairesIndex<Q extends { q: string }>(
  text: string,
  index: IndexEntry<Q>[],
  threshold: number = THRESHOLD_SIMILAR,
  max: number = 5
): SimilarHit<Q>[] {
  const p = prep(text);
  return index
    .map((e) => ({
      question: e.question,
      score: prevScore(p, e.prep),
    }))
    .filter((x) => x.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
}

// Cherche les questions les plus proches d'un texte donné (construit l'index à
// la volée : pour un usage ponctuel, ex. la validation du formulaire).
// `questions` : liste d'objets contenant au moins { q, themeNom, themeCouleur }
export function trouverSimilaires<Q extends { q: string }>(
  text: string,
  questions: Q[],
  threshold: number = THRESHOLD_SIMILAR,
  max: number = 5
): SimilarHit<Q>[] {
  return trouverSimilairesIndex(text, buildIndex(questions), threshold, max);
}
