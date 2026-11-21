// draw.ts — mélange, diversité des sujets/thèmes, tirage seedé du quizz du jour.
// Module PUR : le générateur aléatoire est injectable (rand = Math.random par défaut).
import { todayDate } from './dates.js';
import { DAILY_QUESTIONS } from './scoring.js';
import type { TaggedQuestion, Theme } from './types.js';

/** Générateur de nombres pseudo-aléatoires dans [0, 1[ (injectable pour des tirages déterministes). */
export type Rand = () => number;

// Hachage simple d'un texte en nombre (pour rendre le tirage du jour déterministe).
export function hashText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Générateur pseudo-aléatoire déterministe (mulberry32) : même graine = même tirage.
function seededRandom(graine: number): Rand {
  let a = graine >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Mélange déterministe (Fisher-Yates avec le générateur fourni).
export { seededRandom };
export function shuffleSeeded<T>(items: T[], rand: Rand): T[] {
  const t = [...items];
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

// Mélange un tableau (algorithme de Fisher-Yates), sans modifier l'original.
export function shuffle<T>(items: T[]): T[] {
  return shuffleSeeded(items, Math.random);
}

// --- Diversité des sujets dans une série ---
// Détecte le « sujet » d'une question : le premier groupe de mots en capitales
// (nom propre / franchise) qui n'est PAS en début de phrase,
// ex. « One Piece », « Naruto », « Dragon Ball », « Zelda ».
interface Mot {
  w: string;
  i: number;
}
function subjectOf(text: string): string {
  const t = String(text || '');
  const re = /[A-ZÀ-Þ][\p{L}0-9’'-]*/gu;
  const mots: Mot[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null)
    mots.push({
      w: m[0],
      i: m.index,
    });
  const groupes: Mot[][] = [];
  let cur: Mot[] = [];
  for (const mot of mots) {
    const prev = cur[cur.length - 1];
    if (prev && mot.i <= prev.i + prev.w.length + 2) cur.push(mot);
    else {
      if (cur.length) groupes.push(cur);
      cur = [mot];
    }
  }
  if (cur.length) groupes.push(cur);
  const g = groupes.find(
    (gr) =>
      gr[0].i > 0 &&
      gr
        .map((x) => x.w)
        .join(' ')
        .replace(/[^\p{L}]/giu, '').length >= 4
  );
  return g
    ? g
        .map((x) => x.w)
        .join(' ')
        .toLowerCase()
    : '';
}

// --- Tirage diversifié ---
/** Question tirable : au minimum un texte ; `themeId` présent en modes multi-thèmes. */
export interface DrawableQuestion {
  q: string;
  themeId?: string;
}

// Tire nb questions au hasard dans le pool en diversifiant :
// - au maximum maxParSujet questions du même SUJET détecté (ex. pas 3x One Piece),
// - au maximum maxPerTheme questions du même THEME (si les questions ont un themeId,
//   ex. survie / quizz du jour : pas 5 questions de Géographie dans la même série).
// Tant qu'il reste assez de questions différentes ; sinon on complète avec le reste.
// `rand` permet un tirage déterministe (quizz du jour : même tirage pour tous le même jour).
export { subjectOf };
export function drawSeries<T extends DrawableQuestion>(
  pool: T[],
  countN: number,
  maxParSujet = 2,
  maxPerTheme = 0,
  rand: Rand = Math.random
): T[] {
  const ordre = shuffleSeeded(pool, rand);
  const choisie: T[] = [];
  const accountSubjects = new Map<string, number>();
  const accountThemes = new Map<string, number>();
  const remainingN: T[] = [];
  for (const q of ordre) {
    if (choisie.length >= countN) break;
    const s = subjectOf(q.q);
    const th = q.themeId || '';
    if (s && (accountSubjects.get(s) || 0) >= maxParSujet) {
      remainingN.push(q);
      continue;
    }
    if (th && maxPerTheme > 0 && (accountThemes.get(th) || 0) >= maxPerTheme) {
      remainingN.push(q);
      continue;
    }
    if (s) accountSubjects.set(s, (accountSubjects.get(s) || 0) + 1);
    if (th) accountThemes.set(th, (accountThemes.get(th) || 0) + 1);
    choisie.push(q);
  }
  for (const q of shuffleSeeded(remainingN, rand)) {
    if (choisie.length >= countN) break;
    choisie.push(q);
  }
  return choisie;
}

// Tirage du quizz du jour : 10 questions parmi TOUS les thèmes et TOUS les niveaux,
// identique pour tout le monde le même jour (graine = hash de la date).
// Chaque question repart avec ses réponses mélangées (mélange aussi seedé).
export function dailyQuestions(themes: Theme[], date: string = todayDate()): TaggedQuestion[] {
  const rand = seededRandom(hashText(`voltquiz-quotidien-${date}`));
  const all: TaggedQuestion[] = [];
  for (const t of themes) {
    for (const q of t.questions) {
      all.push({
        ...q,
        themeId: t.id,
        themeName: t.nom,
        themeColor: t.couleur,
        themeIcon: t.icone,
      });
    }
  }
  // tirage seedé MAIS diversifié : max 2 questions du même sujet et max 2 du même thème
  const tirage = drawSeries(all, DAILY_QUESTIONS, 2, 2, rand);
  return tirage.map((q) => {
    const ordre = shuffleSeeded(
      q.reponses.map((_, i) => i),
      rand
    );
    return {
      ...q,
      reponses: ordre.map((i) => q.reponses[i]),
      bonne: ordre.indexOf(q.bonne),
    };
  });
}
