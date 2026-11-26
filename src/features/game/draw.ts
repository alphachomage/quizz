// features/game/draw.ts — tirage des questions d'une partie (fonction PURE, testable hors React).
// solo (niveau choisi), duel (6/joueur), rogue (tous thèmes, paliers de
// difficulté progressifs, 3 vies au départ), quizz du jour (tirage seedé par la date).
import { todayDate } from '@lib/dates.js';
import { filterByQuality } from '@lib/question-stats.js';
import { DUEL_QUESTIONS, ROGUE_MAX, ROGUE_STEP, SOLO_QUESTIONS } from '@lib/scoring.js';
import { seriesKey, poolWithoutPreviousSeries } from '@lib/series.js';
import { shuffle, dailyQuestions, drawSeries, shuffleSeeded, subjectOf } from '@lib/draw.js';
import type { Rand } from '@lib/draw.js';
import type { GameMode, LevelId, Question, TaggedQuestion, Theme } from '@lib/types.js';

/** Config de lancement d'une partie (GameConfig élargi : `players` ajouté par l'accueil,
    et `niveau` peut valoir 'mix' ou une date AAAA-MM-JJ pour rogue / quizz du jour). */
export interface GameLaunchConfig {
  mode: GameMode;
  niveau: LevelId | string | null;
  theme: Theme;
  players?: string[];
  /** Rogue / quizz du jour : tous les thèmes mélangés. */
  allThemes?: Theme[];
}

/** Question tirée pour une partie : une Question, éventuellement taguée de son thème
    d'origine (modes multi-thèmes : rogue, quizz du jour). */
export type DrawnQuestion = Question & Partial<TaggedQuestion>;

// Mélange l'ordre des réponses d'une question ET recalcule l'index de la bonne
// réponse : la position de la bonne réponse change à chaque partie.
export function withShuffledAnswers<T extends Question>(q: T): T {
  const ordre = shuffle(q.reponses.map((_, i) => i));
  return {
    ...q,
    reponses: ordre.map((i) => q.reponses[i]),
    bonne: ordre.indexOf(q.bonne),
  };
}

// Ajoute à chaque question son thème d'origine (utile en mode « tous thèmes »).
function tagTheme(q: Question, t: Theme): TaggedQuestion {
  return {
    ...q,
    themeId: t.id,
    themeName: t.nom,
    themeColor: t.couleur,
    themeIcon: t.icone,
  };
}

// Tire les questions de chaque joueur pour la config donnée.
export { tagTheme };
export function drawGameQuestions(config: GameLaunchConfig): DrawnQuestion[][] {
  const { mode, niveau, theme } = config;
  const nbJoueurs = mode === 'duel' ? 2 : 1;
  let pool: DrawnQuestion[];
  let countN: number;
  if (mode === 'solo') {
    pool = theme.questions.filter((q) => q.niveau === niveau);
    countN = SOLO_QUESTIONS;
  } else if (mode === 'duel') {
    pool = theme.questions;
    countN = DUEL_QUESTIONS;
  } else if (mode === 'rogue') {
    // Rogue Quizz : tous les thèmes mélangés, 100 questions max, tirées par paliers
    // de ROGUE_STEP questions dont la difficulté monte progressivement (voir drawRogueSeries).
    pool = (config.allThemes || []).flatMap((t) => t.questions.map((q) => tagTheme(q, t)));
    countN = Math.min(ROGUE_MAX, pool.length);
  } else {
    // quizz du jour : tirage déterministe (même questions pour tout le monde aujourd'hui)
    pool = dailyQuestions(config.allThemes || [], niveau || todayDate());
    countN = pool.length;
  }
  // Anti-répétition : on retire du tirage les questions de la DERNIÈRE série jouée
  // (clé mode:niveau:thème), pour que « Rejouer » ne retombe jamais sur la même série.
  if (mode !== 'quotidien') {
    pool = poolWithoutPreviousSeries(pool, seriesKey(mode, niveau, theme.id), countN);
  }
  // Filtre qualité : retire les questions suspectes (taux de réussite anormal après
  // assez d'évaluations — ex. question probablement fausse), si ça laisse assez de questions.
  pool = filterByQuality(pool, niveau, countN);
  // 1) on mélange les réponses de chaque question, 2) on tire l'ordre des questions au
  // hasard avec diversité : max 2 questions du même sujet et, en mode multi-thèmes
  // (rogue), un plafond par thème (sauf quizz du jour : tirage seedé + diversifié).
  const randomPool = mode === 'quotidien' ? pool : pool.map(withShuffledAnswers);
  const themeCount = (config.allThemes || []).length || 1;
  const maxPerTheme = mode === 'rogue' ? Math.max(2, Math.ceil(countN / themeCount) + 1) : 0;
  return Array.from({ length: nbJoueurs }, () => {
    if (mode === 'quotidien') return shuffle(randomPool).slice(0, countN);
    if (mode === 'rogue') return drawRogueSeries(randomPool, countN, maxPerTheme);
    return drawSeries(randomPool, countN, 2, maxPerTheme);
  });
}

// --- Tirage Rogue Quizz : paliers de difficulté progressifs ---
// Poids [facile, moyen, dur] par palier de ROGUE_STEP questions (10 paliers pour 100 questions) :
// le 1er palier est 100 % facile, le 5e 100 % moyen, les 2 derniers 100 % dur,
// avec des paliers mixtes entre les deux (transition douce).
const ROGUE_PALIER_POIDS: [number, number, number][] = [
  [4, 0, 0],
  [3, 1, 0],
  [2, 2, 0],
  [1, 3, 0],
  [0, 4, 0],
  [0, 3, 1],
  [0, 2, 2],
  [0, 1, 3],
  [0, 0, 4],
  [0, 0, 4],
];
const NIVEAUX: LevelId[] = ['facile', 'moyen', 'dur'];

/**
 * Tire `countN` questions en respectant la rampe de difficulté par paliers :
 * à chaque question, le niveau est tiré selon les poids du palier courant,
 * puis la question est piochée dans le sous-pool de ce niveau (sans doublon,
 * max 2 par sujet, max `maxPerTheme` par thème sur toute la run).
 */
export function drawRogueSeries(
  pool: DrawnQuestion[],
  countN: number,
  maxPerTheme = 0,
  rand: Rand = Math.random
): DrawnQuestion[] {
  const parNiveau = new Map<LevelId, DrawnQuestion[]>(
    NIVEAUX.map((n) => [n, pool.filter((q) => q.niveau === n)])
  );
  const deja = new Set<string>();
  const compteurTheme = new Map<string, number>();
  const compteurSujet = new Map<string, number>();
  const out: DrawnQuestion[] = [];
  for (let i = 0; i < countN; i++) {
    const palier = Math.min(ROGUE_PALIER_POIDS.length - 1, Math.floor(i / ROGUE_STEP));
    const poids = ROGUE_PALIER_POIDS[palier];
    const total = poids[0] + poids[1] + poids[2];
    let x = rand() * total;
    let niv: LevelId = 'dur';
    for (let k = 0; k < 3; k++) {
      x -= poids[k];
      if (x <= 0) {
        niv = NIVEAUX[k];
        break;
      }
    }
    let sousPool = (parNiveau.get(niv) || []).filter((q) => !deja.has(q.q));
    if (sousPool.length === 0) sousPool = pool.filter((q) => !deja.has(q.q)); // repli si niveau vide
    if (sousPool.length === 0) break;
    // Tirage rapide : index aléatoire (quelques essais), sinon scan du pool mélangé.
    const peutPrendre = (q: DrawnQuestion): boolean => {
      const th = q.themeId || '';
      const s = subjectOf(q.q);
      if (maxPerTheme > 0 && th && (compteurTheme.get(th) || 0) >= maxPerTheme) return false;
      if (s && (compteurSujet.get(s) || 0) >= 2) return false;
      return true;
    };
    let pick: DrawnQuestion | null = null;
    for (let essai = 0; essai < 12 && !pick; essai++) {
      const cand = sousPool[Math.floor(rand() * sousPool.length)];
      if (deja.has(cand.q) || !peutPrendre(cand)) continue;
      pick = cand;
    }
    if (!pick) {
      for (const q of shuffleSeeded(sousPool, rand)) {
        if (peutPrendre(q)) {
          pick = q;
          break;
        }
      }
    }
    if (!pick) pick = sousPool[0];
    deja.add(pick.q);
    const th = pick.themeId || '';
    if (th) compteurTheme.set(th, (compteurTheme.get(th) || 0) + 1);
    const s = subjectOf(pick.q);
    if (s) compteurSujet.set(s, (compteurSujet.get(s) || 0) + 1);
    out.push(pick);
  }
  // Compléter si le pool était trop petit (ne devrait pas arriver avec le corpus complet).
  for (const q of shuffleSeeded(pool, rand)) {
    if (out.length >= countN) break;
    if (deja.has(q.q)) continue;
    deja.add(q.q);
    out.push(q);
  }
  return out;
}
