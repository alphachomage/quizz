// reset.js — remises à zéro manuelles de la version d'essai (via URL, aucun bouton).
// - ?reset=1        : scores, records, historique, XP, séries mémorisées.
// - ?resetcompte=1  : reset TOTAL de la progression (streak du jour, badge favori,
//   titre actif en plus). Les questions perso sont CONSERVÉES : un offset est posé
//   pour que les badges « proposer/valider » repartent de zéro (voir statsBadges).
import { RecordsRepo, GamesRepo, XpRepo, SeriesRepo, DailyStreakRepo, FavoriteBadgeRepo, ActiveTitleRepo, ResetSubmissionsRepo } from './repositories.js';
import { loadSubmissions, loadApproved } from './submissions.js';

export function reinitialiserScores() {
  RecordsRepo.vider();
  GamesRepo.vider();
  XpRepo.vider();
  SeriesRepo.vider();
}

export function reinitialiserProgression() {
  reinitialiserScores();
  DailyStreakRepo.vider();
  FavoriteBadgeRepo.vider();
  ActiveTitleRepo.vider();
  ResetSubmissionsRepo.sauver({
    proposees: loadSubmissions().length,
    validees: loadApproved().length,
  });
}
