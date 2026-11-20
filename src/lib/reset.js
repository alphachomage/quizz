// reset.js — remises à zéro manuelles de la version d'essai (via URL, aucun bouton).
// - ?reset=1        : scores, records, historique, XP, séries mémorisées.
// - ?resetcompte=1  : reset TOTAL de la progression (streak du jour, badge favori,
//   titre actif en plus). Les questions perso sont CONSERVÉES : un offset est posé
//   pour que les badges « proposer/valider » repartent de zéro (voir statsBadges).
import { CLES, supprimer, ecrire } from './storage.js';
import { chargerSoumissions, chargerValidees } from './soumissions.js';

export function reinitialiserScores() {
  supprimer(CLES.records);
  supprimer(CLES.parties);
  supprimer(CLES.xp);
  supprimer(CLES.series);
}

export function reinitialiserProgression() {
  reinitialiserScores();
  supprimer(CLES.streakJour);
  supprimer(CLES.badgeFavori);
  supprimer(CLES.titreActif);
  ecrire(CLES.resetSoum, {
    proposees: chargerSoumissions().length,
    validees: chargerValidees().length,
  });
}
