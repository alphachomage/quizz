// features/game/draw.js — tirage des questions d'une partie (fonction PURE, testable hors React).
// testable hors React) : solo (niveau choisi), duel (6/joueur), survie (tous
// thèmes/niveaux, 1 vie), quizz du jour (tirage seedé par la date).
import { todayDate } from '@lib/dates.js';
import { DUEL_QUESTIONS, SOLO_QUESTIONS, SURVIVAL_MAX } from '@lib/scoring.js';
import { seriesKey, poolWithoutPreviousSeries } from '@lib/series.js';
import { shuffle, dailyQuestions, drawSeries } from '@lib/draw.js';

// Mélange l'ordre des réponses d'une question ET recalcule l'index de la bonne
// réponse : la position de la bonne réponse change à chaque partie.
export function withShuffledAnswers(q) {
  const ordre = shuffle(q.reponses.map((_, i) => i));
  return {
    ...q,
    reponses: ordre.map((i) => q.reponses[i]),
    bonne: ordre.indexOf(q.bonne),
  };
}

// Ajoute à chaque question son thème d'origine (utile en mode « tous thèmes »).
function tagTheme(q, t) {
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
export function drawGameQuestions(config) {
  const { mode, niveau, theme } = config;
  const nbJoueurs = mode === 'duel' ? 2 : 1;
  let pool;
  let countN;
  if (mode === 'solo') {
    pool = theme.questions.filter((q) => q.niveau === niveau);
    countN = SOLO_QUESTIONS;
  } else if (mode === 'duel') {
    pool = theme.questions;
    countN = DUEL_QUESTIONS;
  } else if (mode === 'survie') {
    // tous les thèmes ET tous les niveaux (facile/moyen/dur) mélangés
    pool = (config.allThemes || []).flatMap((t) => t.questions.map((q) => tagTheme(q, t)));
    countN = Math.min(SURVIVAL_MAX, pool.length);
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
  // 1) on mélange les réponses de chaque question, 2) on tire l'ordre des questions au
  // hasard avec diversité : max 2 questions du même sujet et, en mode multi-thèmes
  // (survie), un plafond par thème (sauf quizz du jour : tirage seedé + diversifié).
  const randomPool = mode === 'quotidien' ? pool : pool.map(withShuffledAnswers);
  const themeCount = (config.allThemes || []).length || 1;
  const maxPerTheme = mode === 'survie' ? Math.max(2, Math.ceil(countN / themeCount) + 1) : 0;
  return Array.from(
    {
      length: nbJoueurs,
    },
    () =>
      mode === 'quotidien'
        ? shuffle(randomPool).slice(0, countN)
        : drawSeries(randomPool, countN, 2, maxPerTheme)
  );
}
