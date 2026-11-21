// reset.js — remises à zéro manuelles de la version d'essai (via URL, aucun bouton).
// - ?reset=1        : scores, records, historique, XP, séries mémorisées.
// - ?resetcompte=1  : reset TOTAL de la progression (streak du jour, badge favori,
//   titre actif en plus). Les questions personal sont CONSERVÉES : un offset est posé
//   pour que les badges « proposer/valider » repartent de zéro (voir statsBadges).
import {
  RecordsRepo,
  GamesRepo,
  XpRepo,
  SeriesRepo,
  DailyStreakRepo,
  FavoriteBadgeRepo,
  ActiveTitleRepo,
  ResetSubmissionsRepo,
} from './repositories.js';
import { loadSubmissions, loadApproved } from './submissions.js';
function resetScores() {
  RecordsRepo.clear();
  GamesRepo.clear();
  XpRepo.clear();
  SeriesRepo.clear();
}
export { resetScores };
function resetProgress() {
  resetScores();
  DailyStreakRepo.clear();
  FavoriteBadgeRepo.clear();
  ActiveTitleRepo.clear();
  ResetSubmissionsRepo.save({
    proposees: loadSubmissions().length,
    validees: loadApproved().length,
  });
}
export { resetProgress };
