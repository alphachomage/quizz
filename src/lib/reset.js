// reset.js — remises à zéro manuelles de la version d'essai (via URL, aucun bouton).
// - ?reset=1        : scores, records, historique, XP, séries mémorisées.
// - ?resetcompte=1  : reset TOTAL de la progression (streak du jour, badge favori,
//   titre actif en plus). Les questions perso sont CONSERVÉES : un offset est posé
//   pour que les badges « proposer/valider » repartent de zéro (voir statsBadges).
import { RecordsRepo, PartiesRepo, XpRepo, SeriesRepo, StreakJourRepo, BadgeFavoriRepo, TitreActifRepo, ResetSoumRepo } from './repositories.js';
import { chargerSoumissions, chargerValidees } from './soumissions.js';

export function reinitialiserScores() {
  RecordsRepo.vider();
  PartiesRepo.vider();
  XpRepo.vider();
  SeriesRepo.vider();
}

export function reinitialiserProgression() {
  reinitialiserScores();
  StreakJourRepo.vider();
  BadgeFavoriRepo.vider();
  TitreActifRepo.vider();
  ResetSoumRepo.sauver({
    proposees: chargerSoumissions().length,
    validees: chargerValidees().length,
  });
}
