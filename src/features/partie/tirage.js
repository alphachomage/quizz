// features/partie/tirage.js — tirage des questions d'une partie (fonction PURE,
// testable hors React) : solo (niveau choisi), duel (6/joueur), survie (tous
// thèmes/niveaux, 1 vie), quizz du jour (tirage seedé par la date).
import { dateAujourdhui } from '@lib/dates.js';
import { QUESTIONS_DUEL, QUESTIONS_SOLO, QUESTIONS_SURVIE_MAX } from '@lib/scoring.js';
import { cleSerie, poolSansSeriePrecedente } from '@lib/series.js';
import { melanger, questionsQuotidien, tirerSerie } from '@lib/tirage.js';

// Mélange l'ordre des réponses d'une question ET recalcule l'index de la bonne
// réponse : la position de la bonne réponse change à chaque partie.
export function avecReponsesAleatoires(q) {
  const ordre = melanger(q.reponses.map((_, i) => i));
  return { ...q, reponses: ordre.map((i) => q.reponses[i]), bonne: ordre.indexOf(q.bonne) };
}

// Ajoute à chaque question son thème d'origine (utile en mode « tous thèmes »).
export function taguerTheme(q, t) {
  return { ...q, themeId: t.id, themeNom: t.nom, themeCouleur: t.couleur, themeIcone: t.icone };
}

// Tire les questions de chaque joueur pour la config donnée.
export function tirerQuestionsPartie(config) {
  const { mode, niveau, theme } = config;
  const nbJoueurs = mode === 'duel' ? 2 : 1;

  let pool;
  let nb;
  if (mode === 'solo') {
    pool = theme.questions.filter((q) => q.niveau === niveau);
    nb = QUESTIONS_SOLO;
  } else if (mode === 'duel') {
    pool = theme.questions;
    nb = QUESTIONS_DUEL;
  } else if (mode === 'survie') {
    // tous les thèmes ET tous les niveaux (facile/moyen/dur) mélangés
    pool = (config.tousThemes || []).flatMap((t) => t.questions.map((q) => taguerTheme(q, t)));
    nb = Math.min(QUESTIONS_SURVIE_MAX, pool.length);
  } else {
    // quizz du jour : tirage déterministe (même questions pour tout le monde aujourd'hui)
    pool = questionsQuotidien(config.tousThemes || [], niveau || dateAujourdhui());
    nb = pool.length;
  }
  // Anti-répétition : on retire du tirage les questions de la DERNIÈRE série jouée
  // (clé mode:niveau:thème), pour que « Rejouer » ne retombe jamais sur la même série.
  if (mode !== 'quotidien') {
    pool = poolSansSeriePrecedente(pool, cleSerie(mode, niveau, theme.id), nb);
  }
  // 1) on mélange les réponses de chaque question, 2) on tire l'ordre des questions au
  // hasard avec diversité : max 2 questions du même sujet et, en mode multi-thèmes
  // (survie), un plafond par thème (sauf quizz du jour : tirage seedé + diversifié).
  const poolAleatoire = mode === 'quotidien' ? pool : pool.map(avecReponsesAleatoires);
  const nbThemes = (config.tousThemes || []).length || 1;
  const maxParTheme = mode === 'survie' ? Math.max(2, Math.ceil(nb / nbThemes) + 1) : 0;
  return Array.from({ length: nbJoueurs }, () =>
    mode === 'quotidien' ? melanger(poolAleatoire).slice(0, nb) : tirerSerie(poolAleatoire, nb, 2, maxParTheme)
  );
}
